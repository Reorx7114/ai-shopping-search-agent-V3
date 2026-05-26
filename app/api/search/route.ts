import { NextResponse } from 'next/server';
import { buildRefinementChips, refineCandidates, shortConciergeReply } from '@/lib/refinement';
import { postParseSafetyCheck, preParseSafetyCheck, preSerpSafetyCheck } from '@/lib/safety';
import { fetchSerpCandidates } from '@/lib/serp';
import { SearchRequest, SearchResponse } from '@/lib/types';

function buildQueries(query: string, refinement?: string) {
  const base = [query];
  if (refinement) {
    base.push(`${query} ${refinement}`);
  }

  if (query.includes('怪物獵人') || query.includes('魔物獵人') || query.toLowerCase().includes('monster hunter')) {
    base.push(`${query} 艾路貓 玩偶`);
    base.push(`${query} palico plush`);
  }

  return Array.from(new Set(base)).slice(0, 4);
}

export async function POST(req: Request) {
  const body = (await req.json()) as SearchRequest;
  const query = body.query?.trim();

  if (!query) {
    return NextResponse.json<SearchResponse>({ blocked: false, error: '請先輸入想找的內容。', candidates: [], refinementChips: [] }, { status: 400 });
  }

  console.log('[V3 search] has SERPAPI_API_KEY:', Boolean(process.env.SERPAPI_API_KEY));

  const firstSafety = preParseSafetyCheck(query);
  console.log('[V3 search] pre-parse (query):', firstSafety.safe ? 'pass' : `fail (${firstSafety.reason})`);
  if (!firstSafety.safe) {
    return NextResponse.json({ blocked: true, blockReason: firstSafety.reason, candidates: [], refinementChips: [] });
  }

  if (body.conversationalRefinementText) {
    const refinementSafety = preParseSafetyCheck(body.conversationalRefinementText);
    console.log('[V3 search] pre-parse (refinement):', refinementSafety.safe ? 'pass' : `fail (${refinementSafety.reason})`);
    if (!refinementSafety.safe) {
      return NextResponse.json({ blocked: true, blockReason: refinementSafety.reason, candidates: [], refinementChips: [] });
    }
  }

  const generatedQueries = buildQueries(query, body.conversationalRefinementText);
  const parsedSignals = {
    features: [], keywords: [query], englishKeywords: [], coreClues: [], negativeTerms: [],
    searchQueries: generatedQueries, generatedQueries, conversationalRefinementText: body.conversationalRefinementText ?? ''
  };

  const secondSafety = postParseSafetyCheck(parsedSignals);
  console.log('[V3 search] post-parse semantic:', secondSafety.safe ? 'pass' : `fail (${secondSafety.reason})`);
  if (!secondSafety.safe) {
    return NextResponse.json({ blocked: true, blockReason: secondSafety.reason, candidates: [], refinementChips: [] });
  }

  const thirdSafety = preSerpSafetyCheck(generatedQueries);
  console.log('[V3 search] pre-serp:', thirdSafety.safe ? 'pass' : `fail (${thirdSafety.reason})`);
  if (!thirdSafety.safe) {
    return NextResponse.json({ blocked: true, blockReason: thirdSafety.reason, candidates: [], refinementChips: [] });
  }

  console.log('[V3 search] generated search queries:', generatedQueries);

  try {
    const serp = await fetchSerpCandidates(generatedQueries);
    console.log('[V3 search] serp status:', serp.status);
    console.log('[V3 search] raw candidates count:', serp.candidates.length);

    const ranked = refineCandidates(serp.candidates, body.conversationalRefinementText);
    console.log('[V3 search] returned candidates count:', ranked.length);

    return NextResponse.json<SearchResponse>({
      blocked: false,
      assistantMessage: shortConciergeReply(body.conversationalRefinementText),
      candidates: ranked,
      refinementChips: buildRefinementChips()
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'SerpAPI request failed';
    console.error('[V3 search] SerpAPI error:', message);
    return NextResponse.json<SearchResponse>({
      blocked: false,
      error: '目前搜尋服務暫時不穩定，請稍後再試一次。',
      candidates: [],
      refinementChips: buildRefinementChips()
    }, { status: 502 });
  }
}
