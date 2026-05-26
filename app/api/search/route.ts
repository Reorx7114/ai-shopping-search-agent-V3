import { NextResponse } from 'next/server';
import { buildRefinementChips, refineCandidates, shortConciergeReply } from '@/lib/refinement';
import { postParseSafetyCheck, preParseSafetyCheck, preSerpSafetyCheck } from '@/lib/safety';
import { fetchSerpCandidates } from '@/lib/serp';
import { SearchRequest, SearchResponse, Candidate } from '@/lib/types';
import { buildSemanticQueries } from '@/lib/query-intent';

function purchaseFocused(text: string) {
  return /哪裡買|購買|商城|商店|商品連結|可以買|販售|buy|shop|store|price|product/.test(text.toLowerCase());
}

function buildFitReason(candidate: Candidate, query: string, refinement?: string) {
  const t = `${candidate.title} ${candidate.snippet} ${candidate.source}`.toLowerCase();
  if (candidate.price && candidate.isProductPage) return '有價格資訊，且是可直接購買的商品頁。';
  if (candidate.isProductPage) return '偏向商城／官方商品頁，方便直接下單。';
  if (refinement && /便宜|平價/.test(refinement) && candidate.price) return '這個結果有價格資訊，較方便比較預算。';
  if (t.includes('official') || t.includes('官方')) return '看起來是官方或品牌通路，資訊較穩定。';
  return '和你描述的需求相近，先列入優先比較。';
}

function summarizeShortlist(query: string, count: number, refinement?: string) {
  if (refinement && purchaseFocused(refinement)) {
    return `我幫你改往可購買頁面縮小，目前先看 ${count} 個可下單的重點選項。`;
  }
  if (/印表機|printer/i.test(query)) return '我先幫你往家用、預算 1 萬左右、比較穩定好維護的方向縮小。';
  if (/wifi|網路|路由|router|mesh/i.test(query)) return `我先幫你縮成 ${count} 個偏向 Mesh／延伸覆蓋的可購買方案。`;
  return `我先幫你縮小成 ${count} 個比較值得先看的選項。`;
}

function shortlist(candidates: Candidate[], query: string, refinement?: string) {
  const focused = purchaseFocused(`${query} ${refinement ?? ''}`);
  const productFirst = [...candidates].sort((a, b) => Number(Boolean(b.isProductPage)) - Number(Boolean(a.isProductPage)));
  const high = productFirst.filter((c) => c.isProductPage);
  const base = focused && high.length > 0 ? high : productFirst;

  let size = 5;
  if (base.length <= 3) size = base.length;
  else if (base.length >= 10) size = focused ? 4 : 5;
  else size = 5;

  const picked = base.slice(0, Math.min(6, Math.max(3, size))).map((c) => ({
    ...c,
    fitReason: buildFitReason(c, query, refinement),
    snippet: (c.snippet || '').slice(0, 80)
  }));

  return { picked, summary: summarizeShortlist(query, picked.length, refinement) };
}

export async function POST(req: Request) {
  const body = (await req.json()) as SearchRequest;
  const query = body.query?.trim();
  if (!query) return NextResponse.json<SearchResponse>({ blocked: false, error: '請先輸入想找的內容。', candidates: [], refinementChips: [] }, { status: 400 });

  const firstSafety = preParseSafetyCheck(query);
  if (!firstSafety.safe) return NextResponse.json({ blocked: true, blockReason: firstSafety.reason, candidates: [], refinementChips: [] });
  if (body.conversationalRefinementText) {
    const refinementSafety = preParseSafetyCheck(body.conversationalRefinementText);
    if (!refinementSafety.safe) return NextResponse.json({ blocked: true, blockReason: refinementSafety.reason, candidates: [], refinementChips: [] });
  }

  const intent = buildSemanticQueries(query, body.conversationalRefinementText);
  const generatedQueries = intent.generatedQueries;
  const parsedSignals = { features: [], keywords: [query], englishKeywords: [], coreClues: [], negativeTerms: [], searchQueries: generatedQueries, generatedQueries, conversationalRefinementText: body.conversationalRefinementText ?? '' };
  const secondSafety = postParseSafetyCheck(parsedSignals);
  if (!secondSafety.safe) return NextResponse.json({ blocked: true, blockReason: secondSafety.reason, candidates: [], refinementChips: [] });
  const thirdSafety = preSerpSafetyCheck(generatedQueries);
  if (!thirdSafety.safe) return NextResponse.json({ blocked: true, blockReason: thirdSafety.reason, candidates: [], refinementChips: [] });

  try {
    const serp = await fetchSerpCandidates(generatedQueries);
    const ranked = refineCandidates(serp.candidates, body.conversationalRefinementText);
    const { picked, summary } = shortlist(ranked, query, body.conversationalRefinementText);

    return NextResponse.json<SearchResponse>({
      blocked: false,
      assistantMessage: shortConciergeReply(body.conversationalRefinementText),
      shortlistSummary: summary,
      candidates: picked,
      refinementChips: buildRefinementChips()
    });
  } catch {
    return NextResponse.json<SearchResponse>({ blocked: false, error: '目前搜尋服務暫時不穩定，請稍後再試一次。', candidates: [], refinementChips: buildRefinementChips() }, { status: 502 });
  }
}
