import { Candidate } from './types';

const chipPool = ['更高級', '更便宜', '更耐用', '不要太塑膠', '更適合小空間', '更有設計感', '更安靜', '不要像大賣場', '韓系感', '更低調'];

export function buildRefinementChips() {
  return chipPool;
}

export function refineCandidates(candidates: Candidate[], refinementText?: string) {
  if (!refinementText) return candidates;
  const text = refinementText.toLowerCase();
  const scored = candidates.map((candidate) => {
    let score = 0;
    if (text.includes('高級') || text.includes('質感')) score += candidate.title.includes('Premium') ? 2 : 0;
    if (text.includes('便宜') || text.includes('平價')) score += candidate.price?.includes('$') ? 1 : 0;
    if (text.includes('小空間')) score += candidate.snippet.includes('小空間') ? 2 : 0;
    if (text.includes('安靜')) score += candidate.snippet.includes('安靜') ? 2 : 0;
    return { candidate, score };
  });

  return scored.sort((a, b) => b.score - a.score).map((x) => x.candidate);
}

export function shortConciergeReply(refinementText?: string) {
  if (!refinementText) return '我先幫你整理一輪，下面這批是目前最值得先看的。';
  if (refinementText.includes('高級') || refinementText.includes('質感')) {
    return '我幫你往更有質感、較不像量販通路的方向縮小了。';
  }
  if (refinementText.includes('小空間')) return '我幫你優先留下更適合小空間使用的選項。';
  if (refinementText.includes('安靜')) return '我先把偏安靜取向的選項往前排了。';
  if (/哪裡買|購買|商城|商店|商品連結|可以買/.test(refinementText)) return '我幫你改往可購買頁面找，優先看商城、官方商店和商品頁。';
  if (/商城的網址|官方販售頁|販售/.test(refinementText)) return '我再把文章和社群結果往後放，優先找商城或官方販售頁。';
  if (/便宜|平價|價格低/.test(refinementText)) return '我幫你往價格較低、比較容易入手的商品結果縮小。';
  return '收到，我幫你往更可下單的商品方向再縮小一輪。';
}
