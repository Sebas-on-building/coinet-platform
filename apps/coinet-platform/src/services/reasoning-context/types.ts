/**
 * Structured Reasoning Context — the single typed object the LLM receives.
 *
 * Every field maps to a real pipeline output.
 * No field may be invented. No field may be left ambiguous.
 * The serializer turns this into text; the grounding validator checks it.
 */

export interface QuantumReasoningBlock {
  score: number;
  state: 'insufficient_data' | 'structurally_fragile' | 'watchlist' | 'secure';
  confidence: number;
  prohibit_directional_claims: boolean;
  explanation: string;

  exposure_pct: number;
  dormant_supply_btc: number;
  migration_progress_pct: number;

  components: {
    exposure: number;
    dormant: number;
    migration: number;
  };

  scenarios: {
    fast_quantum: boolean;
    slow_quantum: boolean;
  };

  degradation: {
    state: 'healthy' | 'partial' | 'degraded';
    missing_inputs: string[];
  };

  version: string;
}

export interface TruthFingerprintEntry {
  truth_class: string;
  visibility: string;
  authority_level: string;
}

export interface TruthFingerprintBlock {
  entries: TruthFingerprintEntry[];
  blind_spots: string[];
  tensions: string[];
  overall_coverage: number;
}

export interface SystemStateBlock {
  sources_available: number;
  sources_total: number;
  failed_sources: string[];
  degraded_domains: string[];
  blind_domains: string[];
  truth_fingerprint?: TruthFingerprintBlock;
}

export interface ReasoningContext {
  asset: string;
  timestamp: string;
  quantum: QuantumReasoningBlock | null;
  system_state: SystemStateBlock;
}

export interface GroundingCheck {
  field: string;
  expected: string | number | boolean;
  found_in_response: boolean;
  hallucinated: boolean;
  detail: string;
}

export interface GroundingReport {
  prompt: string;
  total_checks: number;
  passed: number;
  failed: number;
  hallucinations: number;
  checks: GroundingCheck[];
  verdict: 'CLEAN' | 'MINOR_ISSUE' | 'HALLUCINATION_DETECTED';
}

export interface ChatAuditEntry {
  id: string;
  timestamp: string;
  asset: string;
  prompt: string;
  reasoning_context: ReasoningContext;
  response: string;
  grounding: GroundingReport;
}
