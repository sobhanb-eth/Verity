export type VerificationStatus = 'verified' | 'partial' | 'unverified' | 'disputed' | 'gap';
export type MatchType = 'exact' | 'semantic' | 'partial' | 'contradicts';
export type SourceType = 'official' | 'academic' | 'news' | 'blog' | 'forum' | 'social' | 'unknown';
export type ResearchDepth = 'quick' | 'standard' | 'deep';

export interface Source {
  source_id: string;
  url: string;
  title: string;
  author?: string;
  publication_date?: string;
  source_type: SourceType;
  credibility_score: number;
  credibility_factors?: string[];
}

export interface ClaimSource {
  source_id: string;
  verbatim_quote: string;
  quote_context: string;
  match_type: MatchType;
}

export interface Claim {
  claim_id: string;
  claim_text: string;
  verification_status: VerificationStatus;
  confidence: number;
  sources: ClaimSource[];
  verification_chain: string;
}

export interface DisputePosition {
  position: string;
  supporting_sources: string[];
}

export interface Dispute {
  topic: string;
  positions: DisputePosition[];
  assessment: string;
}

export interface Summary {
  executive_summary: string;
  key_findings: string[];
  confidence_overall: number;
  gaps_identified: string[];
}

export interface ResearchMetadata {
  research_timestamp: string;
  sources_analyzed: number;
  claims_extracted: number;
  verification_rate: number;
  model_used?: string;
}

export interface VerityResponse {
  query: string;
  summary: Summary;
  claims: Claim[];
  sources: Source[];
  disputes?: Dispute[];
  metadata: ResearchMetadata;
  // Metadata added by the frontend wrapper from Gemini's raw response
  groundingMetadata?: {
    searchQueries: string[];
    webSources: Array<{ uri: string; title: string }>;
  };
}
