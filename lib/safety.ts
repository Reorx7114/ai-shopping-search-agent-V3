const blockedTerms = [
  'k他命', '海洛因', '大麻', '毒咖啡包', '喪屍菸彈', 'firearm', 'firearms', '槍', '爆裂物', '炸藥',
  '半套', '全套', '1s', '2s', '3s', 'darknet', 'onion', '洗錢', '人頭帳戶', '偽造文件', '盜刷', '藏刀'
];

const normalize = (value: string) => value.toLowerCase().trim();

export function preParseSafetyCheck(text: string) {
  const normalized = normalize(text);
  const hit = blockedTerms.find((term) => normalized.includes(term));
  return hit ? { safe: false, reason: `偵測到敏感詞：${hit}` } : { safe: true };
}

export function postParseSafetyCheck(payload: Record<string, unknown>) {
  const haystack = JSON.stringify(payload).toLowerCase();
  const hit = blockedTerms.find((term) => haystack.includes(term));
  return hit ? { safe: false, reason: `語意檢查攔截：${hit}` } : { safe: true };
}

export function preSerpSafetyCheck(queries: string[]) {
  const haystack = queries.join(' ').toLowerCase();
  const hit = blockedTerms.find((term) => haystack.includes(term));
  return hit ? { safe: false, reason: `查詢攔截：${hit}` } : { safe: true };
}
