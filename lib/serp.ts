import { Candidate } from './types';

const SERP_ENDPOINT = 'https://serpapi.com/search.json';

type SerpShoppingResult = {
  position?: number;
  title?: string;
  source?: string;
  price?: string;
  thumbnail?: string;
  product_link?: string;
};

type SerpOrganicResult = {
  position?: number;
  title?: string;
  source?: string;
  snippet?: string;
  thumbnail?: string;
  link?: string;
};

function toCandidateFromShopping(item: SerpShoppingResult): Candidate | null {
  if (!item.title) return null;
  return {
    id: `shopping-${item.position ?? Math.random()}`,
    title: item.title,
    snippet: item.source ?? 'Shopping result',
    price: item.price,
    imageUrl: item.thumbnail,
    source: item.source ?? 'SerpAPI'
  };
}

function toCandidateFromOrganic(item: SerpOrganicResult): Candidate | null {
  if (!item.title) return null;
  return {
    id: `organic-${item.position ?? Math.random()}`,
    title: item.title,
    snippet: item.snippet ?? item.source ?? 'Organic result',
    imageUrl: item.thumbnail,
    source: item.source ?? 'SerpAPI'
  };
}

export async function fetchSerpCandidates(queries: string[]): Promise<{ candidates: Candidate[]; status: number }> {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) {
    throw new Error('SERPAPI_API_KEY is missing');
  }

  const allCandidates: Candidate[] = [];
  let lastStatus = 200;

  for (const query of queries.slice(0, 4)) {
    const url = new URL(SERP_ENDPOINT);
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('engine', 'google');
    url.searchParams.set('q', query);
    url.searchParams.set('hl', 'zh-tw');
    url.searchParams.set('gl', 'tw');
    url.searchParams.set('num', '10');

    const response = await fetch(url.toString(), { cache: 'no-store' });
    lastStatus = response.status;

    if (!response.ok) {
      throw new Error(`SerpAPI request failed for "${query}" with status ${response.status}`);
    }

    const data = await response.json() as {
      shopping_results?: SerpShoppingResult[];
      organic_results?: SerpOrganicResult[];
    };

    const shopping = (data.shopping_results ?? []).map(toCandidateFromShopping).filter(Boolean) as Candidate[];
    const organic = (data.organic_results ?? []).map(toCandidateFromOrganic).filter(Boolean) as Candidate[];
    allCandidates.push(...shopping, ...organic);
  }

  const deduped = Array.from(new Map(allCandidates.map((c) => [c.title, c])).values());
  return { candidates: deduped.slice(0, 20), status: lastStatus };
}
