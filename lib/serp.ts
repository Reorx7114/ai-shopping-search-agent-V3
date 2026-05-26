import { Candidate } from './types';

const SERP_ENDPOINT = 'https://serpapi.com/search.json';
const PRODUCT_HINTS = /(product|shop|store|商城|商店|購買|buy|price|商品|官方|mall|amazon|shopee|momo|pchome|rakuten|yahoo)/i;
const CONTENT_HINTS = /(youtube|reddit|instagram|facebook|ptt|dcard|news|article|blog)/i;

type AnyObj = Record<string, any>;

function pickDomain(link?: string) {
  if (!link) return undefined;
  try { return new URL(link).hostname.replace(/^www\./, ''); } catch { return undefined; }
}

function scoreProduct(c: Candidate) {
  const text = `${c.title} ${c.snippet} ${c.source} ${c.domain ?? ''}`;
  let s = 0;
  if (c.price) s += 4;
  if (c.merchant) s += 3;
  if (PRODUCT_HINTS.test(text)) s += 3;
  if (CONTENT_HINTS.test(text)) s -= 4;
  return s;
}

function mapShopping(item: AnyObj): Candidate | null {
  if (!item?.title) return null;
  const link = item.product_link || item.link;
  return {
    id: `shopping-${item.position ?? Math.random()}`,
    title: item.title,
    snippet: item.snippet || item.source || '商品結果',
    price: item.price,
    imageUrl: item.thumbnail,
    source: item.source || item.seller || 'SerpAPI',
    merchant: item.source || item.seller,
    link,
    domain: pickDomain(link),
    isProductPage: true
  };
}

function mapOrganic(item: AnyObj): Candidate | null {
  if (!item?.title) return null;
  const link = item.link;
  const domain = pickDomain(link);
  const base: Candidate = {
    id: `organic-${item.position ?? Math.random()}`,
    title: item.title,
    snippet: item.snippet || item.source || '搜尋結果',
    imageUrl: item.thumbnail,
    source: item.source || domain || 'SerpAPI',
    link,
    domain,
    merchant: item.source
  };
  base.isProductPage = scoreProduct(base) >= 3;
  return base;
}

export async function fetchSerpCandidates(queries: string[]): Promise<{ candidates: Candidate[]; status: number }> {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) throw new Error('SERPAPI_API_KEY is missing');

  let lastStatus = 200;
  const all: Candidate[] = [];
  for (const query of queries.slice(0, 4)) {
    const u = new URL(SERP_ENDPOINT);
    u.searchParams.set('api_key', apiKey);
    u.searchParams.set('engine', 'google');
    u.searchParams.set('q', query);
    u.searchParams.set('hl', 'zh-tw');
    u.searchParams.set('gl', 'tw');
    u.searchParams.set('num', '10');
    const r = await fetch(u.toString(), { cache: 'no-store' });
    lastStatus = r.status;
    if (!r.ok) throw new Error(`SerpAPI request failed for "${query}" with status ${r.status}`);
    const data = await r.json() as AnyObj;
    all.push(...(data.shopping_results ?? []).map(mapShopping).filter(Boolean) as Candidate[]);
    all.push(...(data.organic_results ?? []).map(mapOrganic).filter(Boolean) as Candidate[]);
  }

  const deduped = Array.from(new Map(all.map(c => [c.link || c.title, c])).values());
  deduped.sort((a,b)=>scoreProduct(b)-scoreProduct(a));
  return { candidates: deduped.slice(0, 24), status: lastStatus };
}
