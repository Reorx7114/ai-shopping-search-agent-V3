export type QueryIntent = {
  purchaseTarget: string[];
  ipClues: string[];
  visualClues: string[];
  contextWords: string[];
  generatedQueries: string[];
};

const PURCHASE_TERMS = ['玩偶', '公仔', '周邊', '模型', '吊飾', '玩具', '機器人', 'plush', 'doll', 'figure', 'merchandise', 'toy'];
const DIRECT_IP_TERMS = ['魔物獵人', '怪物獵人', 'monster hunter', 'capcom', '艾路貓', 'palico'];
const VISUAL_TERMS = ['龍', '恐龍', '猩猩', '貓咪', '貓', '小小的', '可愛', '怪物', 'monster', 'cat', '變形', '變成'];
const CONTEXT_TERMS = ['男朋友', '女朋友', '送禮', '不知道名字', '電動', '遊戲', '他說', '我只知道', '好像', '男友', '情侶', '兒子', '女兒'];

function includesAny(text: string, terms: string[]) {
  return terms.filter((t) => text.includes(t));
}

function extractUnknownClues(rawQuery: string) {
  const chunks = rawQuery
    .replace(/[，。！？?]/g, ' ')
    .split(/\s+/)
    .map((x) => x.trim())
    .filter(Boolean);

  return chunks.filter((c) => c.length >= 2 && !CONTEXT_TERMS.some((t) => c.includes(t))).slice(0, 2);
}

function hasDirectMonsterHunterEvidence(text: string) {
  const t = text.toLowerCase();
  return ['魔物獵人', '怪物獵人', 'monster hunter', '艾路貓', 'palico', 'capcom'].some((k) => t.includes(k));
}

export function buildSemanticQueries(rawQuery: string, refinement?: string): QueryIntent {
  const source = `${rawQuery} ${refinement ?? ''}`.toLowerCase();
  const purchaseTarget = includesAny(source, PURCHASE_TERMS);
  const ipClues = includesAny(source, DIRECT_IP_TERMS);
  const visualClues = includesAny(source, VISUAL_TERMS);
  const contextWords = includesAny(source, CONTEXT_TERMS);
  const unknownClues = extractUnknownClues(rawQuery);

  const purchase = purchaseTarget.length ? purchaseTarget : ['玩具', '周邊'];

  const queries: string[] = [];

  // keep original clue first (V2-style: preserve user clue)
  queries.push(`${unknownClues.join(' ')} ${purchase.join(' ')} ${visualClues.join(' ')}`.trim());

  // generic shopping formulations
  queries.push(`${purchase[0]} ${visualClues[0] ?? ''} ${visualClues.includes('恐龍') || visualClues.includes('龍') ? '變恐龍' : ''}`.trim());
  queries.push(`變形恐龍 機器人 玩具`);
  queries.push(`兒童 變形 恐龍 機器人 玩具`);
  queries.push(`transforming dinosaur robot toy`);
  queries.push(`robot toy transforms into dinosaur`);
  queries.push(`kids dinosaur robot toy`);

  // only add MH expansions when direct evidence exists
  if (hasDirectMonsterHunterEvidence(source)) {
    queries.push('魔物獵人 艾路貓 玩偶');
    queries.push('怪物獵人 貓咪 周邊');
    queries.push('Monster Hunter Palico plush');
    queries.push('Capcom Monster Hunter Palico figure');
  }

  if (refinement?.trim()) queries.unshift(`${rawQuery} ${refinement.trim()}`);

  const cleaned = queries.map((q) => q.replace(/\s+/g, ' ').trim()).filter((q) => q.length > 0);

  return {
    purchaseTarget: Array.from(new Set(purchaseTarget)),
    ipClues: Array.from(new Set(ipClues)),
    visualClues: Array.from(new Set(visualClues)),
    contextWords: Array.from(new Set(contextWords)),
    generatedQueries: Array.from(new Set(cleaned)).slice(0, 7)
  };
}
