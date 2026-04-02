/**
 * L1.5 — Conflict Resolution Logic for BTC Quantum Loop
 *
 * Core doctrine: Do not chase consistency. Chase truth.
 *
 * When sources disagree, Coinet must prefer epistemic honesty over
 * synthetic harmony. Conflict is not a nuisance to hide — it is a
 * governed signal about uncertainty, timing, source weakness,
 * semantic mismatch, or real-world ambiguity.
 */

export const L15_QR_VERSION = '1.0.0' as const;

export type ConflictType =
  | 'structural'
  | 'numeric'
  | 'temporal'
  | 'semantic'
  | 'health_driven'
  | 'interpretive';

export type ConflictSeverity =
  | 'low'        // minor numeric drift, aligned semantics
  | 'moderate'   // nontrivial spread or mild temporal mismatch
  | 'high'       // material disagreement affecting score/scenario/judgment
  | 'critical';  // conflict makes exact output unsafe or breaks meaning claim

export type ConflictAction =
  | 'winner_a'
  | 'winner_b'
  | 'reconciled'
  | 'preserved_contradiction'
  | 'degraded_resolution'
  | 'unresolved';

export type AuthorityComparison = 'a_higher' | 'b_higher' | 'equal' | 'not_comparable';
export type SemanticComparability = 'aligned' | 'misaligned' | 'uncertain';
export type FreshnessComparison = 'a_fresher' | 'b_fresher' | 'equal' | 'unknown';
export type HealthComparison = 'a_healthier' | 'b_healthier' | 'equal' | 'unknown';

export type FieldConflictPolicy = 'numeric' | 'categorical' | 'stage';

export interface ConflictCandidate {
  sourceId: string;
  data: unknown;
  observedAt?: string;
  authorityLevel: number;      // 0–1, derived from L1.2/L1.4
  healthScore: number;         // from L1.4
  trustClass: string;
  semanticDefinition?: string; // e.g. 'circulating_supply' vs 'emitted_supply'
}

export interface ConflictResolutionRecord {
  fieldName: string;
  conflictType: ConflictType;
  sourceA: string;
  sourceB: string;
  valueA: unknown;
  valueB: unknown;
  authorityComparison: AuthorityComparison;
  semanticComparability: SemanticComparability;
  freshnessComparison: FreshnessComparison;
  healthComparison: HealthComparison;
  severity: ConflictSeverity;
  action: ConflictAction;
  resolvedValue: unknown;
  confidencePenalty: number;
  contradictionPreserved: boolean;
  outputRestrictionFlags: string[];
  reasonSummary: string[];
  policyVersion: string;
}

export interface PreservedContradiction {
  fieldName: string;
  sourceA: string;
  sourceB: string;
  valueA: unknown;
  valueB: unknown;
  conflictType: ConflictType;
  severity: ConflictSeverity;
  materialityNote: string;
  downstreamConsequence: string;
  interpretationConstraint: string;
}

export interface FieldConflictRule {
  fieldName: string;
  policy: FieldConflictPolicy;
  averagingAllowed: boolean;
  tolerancePct: number;          // for numeric: max % drift before material
  toleranceAbsolute?: number;    // for numeric: optional absolute threshold
  semanticAlignmentRequired: boolean;
  preserveContradictionAbove: ConflictSeverity;
  degradeAbove: ConflictSeverity;
  unresolvedAbove: ConflictSeverity;
  winnerRules: string[];
  downstreamRestrictions: string[];
}

export interface ConflictDiagnostics {
  timestamp: string;
  records: ConflictResolutionRecord[];
  contradictions: PreservedContradiction[];
  totalConflicts: number;
  resolved: number;
  reconciled: number;
  contradictionsPreserved: number;
  degraded: number;
  unresolved: number;
  totalConfidencePenalty: number;
  outputRestrictions: string[];
  version: string;
}
