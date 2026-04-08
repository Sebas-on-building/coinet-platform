/**
 * L1.3 Substitution Types — the formal type system for continuity legality.
 *
 * A substitution is allowed only when it passes all eight legality gates.
 * Even legal substitution carries an explicit semantic cost.
 * Illegal substitution is blocked, logged, and prevented from laundering
 * uncertainty into continuity.
 */

import type { TruthClass } from '../registry';

export const L13_PLATFORM_VERSION = '1.0.0' as const;

// ═══════════════════════════════════════════════════════════════════════════════
// SEMANTIC LOSS LADDER
// ═══════════════════════════════════════════════════════════════════════════════

export type SemanticLossLevel =
  | 'S0_full_equivalent'
  | 'S1_near_equivalent'
  | 'S2_degraded_equivalent'
  | 'S3_partial_view_only'
  | 'S4_enrichment_only'
  | 'S5_illegal';

export const SEMANTIC_LOSS_LABELS: Record<SemanticLossLevel, string> = {
  S0_full_equivalent: 'Full equivalent — same field, scope, method, freshness class',
  S1_near_equivalent: 'Near equivalent — same field, slight freshness or aggregation difference',
  S2_degraded_equivalent: 'Degraded equivalent — same truth domain, meaningful methodology or coverage loss',
  S3_partial_view_only: 'Partial view — can inform the field but cannot replace it',
  S4_enrichment_only: 'Enrichment only — may annotate, may not claim the field',
  S5_illegal: 'Illegal substitution — different truth domain, must be blocked',
};

export const SEMANTIC_LOSS_PENALTY_RANGE: Record<SemanticLossLevel, [number, number]> = {
  S0_full_equivalent: [0.00, 0.05],
  S1_near_equivalent: [0.05, 0.12],
  S2_degraded_equivalent: [0.12, 0.25],
  S3_partial_view_only: [0.25, 0.45],
  S4_enrichment_only: [0.45, 1.00],
  S5_illegal: [1.00, 1.00],
};

// ═══════════════════════════════════════════════════════════════════════════════
// SUBSTITUTION OUTCOMES
// ═══════════════════════════════════════════════════════════════════════════════

export type SubstitutionOutcome =
  | 'USE_PRIMARY'
  | 'USE_SUBSTITUTE_FULL'
  | 'USE_SUBSTITUTE_DEGRADED'
  | 'PARTIAL_VIEW_ONLY'
  | 'PRESERVE_CONTRADICTION'
  | 'SUPPRESS_CLAIM'
  | 'ILLEGAL_SUBSTITUTION_BLOCKED';

// ═══════════════════════════════════════════════════════════════════════════════
// LEGALITY GATES
// ═══════════════════════════════════════════════════════════════════════════════

export type LegalityGate =
  | 'truth_domain_equivalence'
  | 'field_identity_equivalence'
  | 'semantic_granularity_equivalence'
  | 'scope_equivalence'
  | 'methodology_compatibility'
  | 'freshness_legality'
  | 'validation_legality'
  | 'declared_epistemic_cost';

export interface GateResult {
  gate: LegalityGate;
  passed: boolean;
  reason: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FIELD SUBSTITUTION RULE
// ═══════════════════════════════════════════════════════════════════════════════

export interface SubstituteCandidate {
  providerId: string;
  semanticLoss: SemanticLossLevel;
  confidencePenalty: number;
  conditions: string[];
  methodologyNote?: string;
}

export interface FieldSubstitutionRule {
  fieldId: string;
  truthClass: TruthClass;
  primaryOwner: string;

  legalSubstitutes: SubstituteCandidate[];
  illegalSubstitutes: { providerId: string; reason: string }[];

  noFallbackCondition: string;
  freshnessToleranceMs: number;
  methodologyCompatibilityRequired: boolean;

  disclosureTemplate: string;
  downstreamBlockers: string[];

  version: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUBSTITUTION RESOLUTION RECORD
// ═══════════════════════════════════════════════════════════════════════════════

export interface SubstitutionResolutionRecord {
  fieldId: string;
  truthClass: TruthClass;
  outcome: SubstitutionOutcome;
  selectedProvider: string | null;
  semanticLoss: SemanticLossLevel;
  confidencePenalty: number;
  gateResults: GateResult[];
  disclosure: string;
  downstreamBlocked: string[];
  reason: string[];
  version: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ILLEGAL SUBSTITUTION INCIDENT
// ═══════════════════════════════════════════════════════════════════════════════

export interface IllegalSubstitutionIncident {
  timestamp: string;
  fieldId: string;
  truthClass: TruthClass;
  attemptedProvider: string;
  reason: string;
  gatesFailed: LegalityGate[];
  severity: 'warning' | 'critical';
}

// ═══════════════════════════════════════════════════════════════════════════════
// DIAGNOSTICS
// ═══════════════════════════════════════════════════════════════════════════════

export interface SubstitutionDiagnostics {
  totalFields: number;
  primaryUsed: number;
  substituted: number;
  degradedSubstituted: number;
  partialViewOnly: number;
  suppressed: number;
  illegalBlocked: number;
  totalPenalty: number;
  incidents: IllegalSubstitutionIncident[];
  records: SubstitutionResolutionRecord[];
  version: string;
}
