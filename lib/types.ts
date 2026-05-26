export type IntentMode = '找商品' | '找旅遊' | '找靈感' | '我不確定';

export type Candidate = {
  id: string;
  title: string;
  snippet: string;
  price?: string;
  imageUrl?: string;
  source: string;
};

export type SearchRequest = {
  query: string;
  intentMode?: IntentMode;
  conversationalRefinementText?: string;
  currentCandidates?: Candidate[];
  selectedCandidateId?: string;
};

export type SearchResponse = {
  blocked: boolean;
  blockReason?: string;
  assistantMessage?: string;
  refinementChips: string[];
  candidates: Candidate[];
};
