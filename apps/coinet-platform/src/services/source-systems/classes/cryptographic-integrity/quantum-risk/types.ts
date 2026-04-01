/**
 * Quantum Risk V1 Loop — exact input/output contracts.
 *
 * Rule 1: Every module defines exact input, exact output, failure behavior.
 * Rule 2: No silent fallback — missing data → degrade, never guess.
 * Rule 3: Everything versioned.
 * Rule 4: Everything logged — no output without snapshot.
 */

export const LOGIC_VERSION = 'q_v1.0' as const;

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1 — DATA INPUTS
// ═══════════════════════════════════════════════════════════════════════════════

export interface ScriptDistribution {
  p2pk: number;
  p2pkh: number;
  p2wpkh: number;
  p2tr: number;
  p2sh: number;
  unknown: number;
  total: number;
}

export interface DormantCohorts {
  gt_5y: number;
  gt_7y: number;
  gt_10y: number;
}

export interface PQEvidence {
  hasProposal: boolean;
  hasImplementation: boolean;
  hasDeployment: boolean;
  lastUpdate: string;
}

export type DegradationState = 'healthy' | 'partial' | 'degraded';

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2 — PARSING OUTPUT
// ═══════════════════════════════════════════════════════════════════════════════

export interface ExposureClassification {
  exposed: number;
  semi_exposed: number;
  safe: number;
  unknown: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3 — FEATURE OUTPUTS
// ═══════════════════════════════════════════════════════════════════════════════

export interface FeatureOutput {
  value: number;
  confidence: number;
  freshness: number;
  degradation_state: DegradationState;
}

export interface DormantSupplyFeature {
  base: number;
  lower: number;
  upper: number;
  normalized: number;
  confidence: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4 — SCORING OUTPUT
// ═══════════════════════════════════════════════════════════════════════════════

export interface QuantumRiskScore {
  value: number;
  confidence: number;
  components: {
    exposure: number;
    dormant: number;
    migration: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5 — SCENARIO OUTPUT
// ═══════════════════════════════════════════════════════════════════════════════

export interface Scenario {
  id: 'fast_quantum' | 'slow_quantum';
  triggered: boolean;
  trigger_reason: string;
  output: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6 — JUDGMENT OUTPUT
// ═══════════════════════════════════════════════════════════════════════════════

export interface QuantumJudgment {
  state: 'insufficient_data' | 'structurally_fragile' | 'watchlist' | 'secure';
  explanation: string;
  cause: string;
  contradiction: string;
  timing: string;
  scenarios: Scenario[];
  confidence: number;
  prohibit_directional_claims: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7 — SNAPSHOT
// ═══════════════════════════════════════════════════════════════════════════════

export interface SnapshotRawInputs {
  scriptDistribution: ScriptDistribution | null;
  dormantCohorts: DormantCohorts | null;
  pqEvidence: PQEvidence | null;
  totalSupply: number;
}

export interface QuantumRiskSnapshot {
  id: string;
  timestamp: string;
  asset: string;
  raw_inputs: SnapshotRawInputs;
  features: {
    key_exposure_rate: FeatureOutput;
    dormant_vulnerable_supply: DormantSupplyFeature;
    pq_migration_progress: FeatureOutput;
  };
  score: QuantumRiskScore;
  scenarios: Scenario[];
  judgment: QuantumJudgment;
  logic_version: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 8 — OUTCOME TRACKING
// ═══════════════════════════════════════════════════════════════════════════════

export interface OutcomeData {
  snapshot_id: string;
  window: '24h' | '7d';
  price_change: number;
  volatility: number;
  event_flags: string[];
  recorded_at: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PIPELINE INPUT — everything the pipeline needs
// ═══════════════════════════════════════════════════════════════════════════════

export interface QuantumRiskPipelineInput {
  asset: string;
  scriptDistribution: ScriptDistribution | null;
  dormantCohorts: DormantCohorts | null;
  pqEvidence: PQEvidence | null;
  totalSupply: number;
}
