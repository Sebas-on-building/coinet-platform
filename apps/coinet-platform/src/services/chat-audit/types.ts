export interface ChatAuditEntry {
  id: string;
  timestamp: string;
  asset: string;
  prompt: string;
  context_serialized: string;
  response: string;
  grounding_verdict: 'CLEAN' | 'MINOR_ISSUE' | 'HALLUCINATION_DETECTED';
  grounding_passed: number;
  grounding_failed: number;
  grounding_checks: GroundingCheckSummary[];
  quantum_score: number | null;
  quantum_state: string | null;
  quantum_confidence: number | null;
  sources_available: number;
  sources_total: number;
}

export interface GroundingCheckSummary {
  field: string;
  passed: boolean;
  hallucinated: boolean;
  detail: string;
}

export interface AuditStats {
  total_entries: number;
  clean_count: number;
  minor_count: number;
  hallucination_count: number;
  hallucination_rate: number;
  avg_grounding_score: number;
  most_common_failures: { field: string; count: number }[];
}
