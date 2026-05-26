export type QueryIntent = {
  purchaseTarget: string[];
  ipClues: string[];
  visualClues: string[];
  contextWords: string[];
  generatedQueries: string[];
};

const PURCHASE_TERMS = ['玩偶', '公仔', '周邊', '模型', '吊飾', 'plush', 'doll', 'figure', 'merchandise', 'gift'];
const IP_TERMS = ['魔物獵人', '怪物獵人', 'monster hunter', 'capcom', '艾路貓', 'palico', '獵人'];
const VISUAL_TERMS = ['龍', '猩猩', '貓咪', '貓', '小小的', '可愛', '怪物', 'monster', 'cat'];
const CONTEXT_TERMS = ['男朋友', '女朋友', '送禮', '不知道名字', '電動', '遊戲', '他說', '我只知道', '好像', '男友', '情侶'];

function includesAny(text: string, terms: string[]) {
  return terms.filter((t) => text.includes(t));
}

function normalizeIp(ipClues: string[]) {
  const set = new Set(ipClues.map((x) => x.toLowerCase()));
  const out: string[] = [];
  if (set.has('魔物獵人') || set.has('怪物獵人') || set.has('monster hunter') || set.has('獵人')) {
    out.push('魔物獵人', 'Monster Hunter');
  }
  if (set.has('艾路貓') || set.has('palico') || set.has('貓咪') || set.has('貓')) {
    out.push('艾路貓', 'Palico');
  }
  if (set.has('capcom')) out.push('Capcom');
  return Array.from(new Set(out));
}

export function buildSemanticQueries(rawQuery: string, refinement?: string): QueryIntent {
  const source = `${rawQuery} ${refinement ?? ''}`.toLowerCase();
  const purchaseTarget = includesAny(source, PURCHASE_TERMS);
  const ipCluesRaw = includesAny(source, IP_TERMS);
  const visualClues = includesAny(source, VISUAL_TERMS);
  const contextWords = includesAny(source, CONTEXT_TERMS);

  const ipClues = normalizeIp([...ipCluesRaw, ...visualClues]);
  const purchase = purchaseTarget.length ? purchaseTarget : ['周邊', '玩偶', '公仔'];

  const queries: string[] = [];
  const ipPrimary = ipClues[0] ?? 'Monster Hunter';
  const ipSecondary = ipClues[1] ?? 'Palico';
  const visualPrimary = visualClues[0] ?? '貓咪';
  const itemPrimary = purchase[0] ?? '周邊';

  queries.push(`${ipPrimary} ${ipSecondary} ${itemPrimary}`);
  queries.push(`怪物獵人 ${visualPrimary} 周邊`);
  queries.push(`Monster Hunter Palico plush`);
  queries.push(`Capcom Monster Hunter Palico figure`);

  if (refinement?.trim()) queries.unshift(`${ipPrimary} ${itemPrimary} ${refinement.trim()}`);

  return {
    purchaseTarget: Array.from(new Set(purchaseTarget)),
    ipClues,
    visualClues: Array.from(new Set(visualClues)),
    contextWords: Array.from(new Set(contextWords)),
    generatedQueries: Array.from(new Set(queries)).slice(0, 5)
  };
}
