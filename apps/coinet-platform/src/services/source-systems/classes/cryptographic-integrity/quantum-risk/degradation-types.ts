/**
 * L1.6 — Source Degradation Semantics for BTC Quantum Loop
 *
 * Core doctrine: Do not chase continuity. Chase epistemic honesty.
 *
 * When source truth weakens, Coinet must not behave as if the world
 * stayed equally knowable. Source degradation is a change in what the
 * system is allowed to observe, infer, score, explain, and claim.
 */

export const L16_QR_VERSION = '1.0.0' as const;

export type DegradationType =
  | 'missing'
  | 'stale'
  | 'invalid'
  | 'conflicted'
  | 'weak_substituted'
  | 'unresolved';

export type DegradationSeverity =
  | 'advisory'    // minor, truth mostly intact
  | 'partial'     // some truth weakened, field still usable
  | 'degraded'    // truth materially weakened
  | 'critical'    // field no longer safe for strong downstream use
  | 'unresolved'; // system cannot maintain the field's meaning claim

export type TruthDomain =
  | 'exposure_truth'
  | 'dormant_supply_truth'
  | 'migration_truth'
  | 'denominator_truth'
  | 'market_context_truth'
  | 'calibration_truth';

export type ClaimRestrictionClass =
  | 'R1_exactness'     // no precise numbers, only bounded/qualitative
  | 'R2_currentness'   // no "current" or "right now" language
  | 'R3_directional'   // no bullish/bearish or actionable implication
  | 'R4_structural'    // no structural posture claims
  | 'R5_evaluation';   // no edge/calibration claims

export type CalibrationHandling = 'none' | 'downweight' | 'exclude';

export interface FeatureImpact {
  feature: string;
  penalty: number;
  state: 'healthy' | 'weakened' | 'degraded' | 'unresolved';
}

export interface ScoreImpact {
  score: string;
  penalty: number;
  state: 'healthy' | 'weakened' | 'degraded' | 'unresolved';
}

export interface ScenarioImpact {
  scenario: string;
  penalty: number;
  restricted: boolean;
}

export interface DegradationEvent {
  fieldName: string;
  sourceId?: string;
  degradationType: DegradationType;
  severity: DegradationSeverity;
  truthDomain: TruthDomain;
  visibilityLoss: string[];
  fieldConfidencePenalty: number;
  featureImpacts: FeatureImpact[];
  scoreImpacts: ScoreImpact[];
  scenarioImpacts: ScenarioImpact[];
  claimRestrictions: ClaimRestrictionClass[];
  calibrationHandling: CalibrationHandling;
  userDisclosure: string;
  reasoningDisclosure: string;
  diagnosticsDisclosure: string[];
  policyVersion: string;
}

export interface DegradationDiagnostics {
  timestamp: string;
  events: DegradationEvent[];
  totalEvents: number;
  advisory: number;
  partial: number;
  degraded: number;
  critical: number;
  unresolvedCount: number;
  totalFieldPenalty: number;
  totalFeaturePenalty: number;
  totalScorePenalty: number;
  activeRestrictions: ClaimRestrictionClass[];
  userDisclosures: string[];
  reasoningDisclosures: string[];
  forceInsufficientData: boolean;
  calibrationExclusions: string[];
  version: string;
}
