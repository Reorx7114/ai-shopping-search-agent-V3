import { NextResponse } from 'next/server';
import { buildRefinementChips, refineCandidates, shortConciergeReply } from '@/lib/refinement';
import { postParseSafetyCheck, preParseSafetyCheck, preSerpSafetyCheck } from '@/lib/safety';
import { Candidate, SearchRequest, SearchResponse } from '@/lib/types';

const mockCandidates: Candidate[] = [
  { id: '1', title: 'Premium 北歐收納櫃', snippet: '木質感設計，適合小空間租屋。', price: '$$', source: 'Mock Mall' },
  { id: '2', title: '靜音空氣清淨機', snippet: '夜間低噪音，適合臥室。', price: '$$$', source: 'Mock Mall' },
  { id: '3', title: '日系極簡立燈', snippet: '低調線條，非網紅感。', price: '$$', source: 'Mock Mall' }
];

export async function POST(req: Request) {
  const body = (await req.json()) as SearchRequest;
  const query = body.query?.trim();
  if (!query) return NextResponse.json<SearchResponse>({ blocked: false, candidates: [], refinementChips: [] }, { status: 400 });

  const firstSafety = preParseSafetyCheck(query);
  if (!firstSafety.safe) {
    return NextResponse.json({ blocked: true, blockReason: firstSafety.reason, candidates: [], refinementChips: [] });
  }

  if (body.conversationalRefinementText) {
    const refinementSafety = preParseSafetyCheck(body.conversationalRefinementText);
    if (!refinementSafety.safe) {
      return NextResponse.json({ blocked: true, blockReason: refinementSafety.reason, candidates: [], refinementChips: [] });
    }
  }

  const parsedSignals = {
    features: [], keywords: [query], englishKeywords: [], coreClues: [], negativeTerms: [],
    searchQueries: [query], generatedQueries: [query], conversationalRefinementText: body.conversationalRefinementText ?? ''
  };

  const secondSafety = postParseSafetyCheck(parsedSignals);
  if (!secondSafety.safe) {
    return NextResponse.json({ blocked: true, blockReason: secondSafety.reason, candidates: [], refinementChips: [] });
  }

  const finalQueries = [query, body.conversationalRefinementText].filter(Boolean) as string[];
  const thirdSafety = preSerpSafetyCheck(finalQueries);
  if (!thirdSafety.safe) {
    return NextResponse.json({ blocked: true, blockReason: thirdSafety.reason, candidates: [], refinementChips: [] });
  }

  const ranked = refineCandidates(body.currentCandidates?.length ? body.currentCandidates : mockCandidates, body.conversationalRefinementText);
  return NextResponse.json<SearchResponse>({
    blocked: false,
    assistantMessage: shortConciergeReply(body.conversationalRefinementText),
    candidates: ranked,
    refinementChips: buildRefinementChips()
  });
}
