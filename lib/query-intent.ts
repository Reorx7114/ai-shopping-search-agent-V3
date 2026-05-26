export type QueryIntent = {
  purchaseTarget: string[];
  ipClues: string[];
  visualClues: string[];
  contextWords: string[];
  generatedQueries: string[];
  purchaseIntentStrong: boolean;
};

const PURCHASE_TERMS = ['玩偶', '公仔', '周邊', '模型', '吊飾', '玩具', '機器人', '購買', '哪裡買', '商品', '商城', '商店', '販售', 'plush', 'doll', 'figure', 'merchandise', 'toy', 'buy', 'shop', 'store', 'price', 'product'];
const DIRECT_IP_TERMS = ['魔物獵人', '怪物獵人', 'monster hunter', 'capcom', '艾路貓', 'palico'];
const VISUAL_TERMS = ['龍', '恐龍', '猩猩', '貓咪', '貓', '小小的', '可愛', '怪物', 'monster', 'cat', '變形', '變成', '金色', '打火機'];
const CONTEXT_TERMS = ['男朋友', '女朋友', '送禮', '不知道名字', '電動', '遊戲', '他說', '我只知道', '好像', '男友', '情侶', '兒子', '女兒'];
const BUY_MODIFIERS = ['購買', '哪裡買', '價格', '商品', '官方商店', '商城', '販售', 'buy', 'shop', 'store', 'price', 'product', 'official store', 'toy', 'figure', 'plush', 'merchandise', '購入', '通販'];

const includesAny = (t:string, arr:string[]) => arr.filter(x=>t.includes(x));

export function buildSemanticQueries(rawQuery: string, refinement?: string): QueryIntent {
  const source = `${rawQuery} ${refinement ?? ''}`.toLowerCase();
  const purchaseTarget = includesAny(source, PURCHASE_TERMS);
  const ipClues = includesAny(source, DIRECT_IP_TERMS);
  const visualClues = includesAny(source, VISUAL_TERMS);
  const contextWords = includesAny(source, CONTEXT_TERMS);
  const purchaseIntentStrong = /哪裡買|購買|商城|商店|商品連結|可以買|販售|buy|shop|store|price|product/.test(source);

  const queries: string[] = [];
  queries.push(`${rawQuery} ${refinement ?? ''}`.trim());
  if (purchaseTarget.length || visualClues.length) queries.push(`${purchaseTarget.join(' ')} ${visualClues.join(' ')} 商品 價格`.trim());
  if (source.includes('打火機') && source.includes('機器人')) {
    queries.push('gold lighter robot toy');
    queries.push('ゴールドライタン 玩具');
  }
  if (purchaseIntentStrong) {
    for (const mod of BUY_MODIFIERS.slice(0, 8)) queries.push(`${rawQuery} ${mod}`);
  }

  return {
    purchaseTarget: Array.from(new Set(purchaseTarget)),
    ipClues: Array.from(new Set(ipClues)),
    visualClues: Array.from(new Set(visualClues)),
    contextWords: Array.from(new Set(contextWords)),
    generatedQueries: Array.from(new Set(queries.map(q=>q.replace(/\s+/g,' ').trim()).filter(Boolean))).slice(0, 8),
    purchaseIntentStrong
  };
}
