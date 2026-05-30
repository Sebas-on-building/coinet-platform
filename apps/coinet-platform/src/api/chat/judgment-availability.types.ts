/**
 * BTAR-003 — Judgment Availability Type Contract
 *
 * Defines the JudgmentAvailabilityState used by the live chat path to honestly
 * carry the structured-judgment truth-state of every chat turn.
 *
 * Authority:
 *   Plan 2.0 §5  (judgment availability state)
 *   Plan 2.1 §4  (availability law — non-negotiable rule)
 *   Plan 2.2 §7.3 (P2-S10 new file)
 *   BTAR-003 §9   (this type contract)
 *
 * SCOPE LIMITS (per Plan 2.3 OOS):
 *   - No L13/L14 type imports.
 *   - No full telemetry / calibration object.
 *   - No prompt package fields (that is BTAR-004's CoinetJudgmentPromptPackage).
 *   - No AI output safety gate decisions (that is BTAR-005).
 */

export type JudgmentAvailabilityState = 'AVAILABLE' | 'DEGRADED' | 'UNAVAILABLE';

export type JudgmentUnavailableReason =
  | 'JUDGMENT_ENGINE_THROW'
  | 'JUDGMENT_ENGINE_TIMEOUT'
  | 'JUDGMENT_RESULT_EMPTY'
  | 'JUDGMENT_RESULT_UNUSABLE'
  | 'SIGNAL_SNAPSHOT_UNAVAILABLE'
  | 'UNKNOWN_JUDGMENT_FAILURE';

export type JudgmentDegradedReason =
  | 'PARTIAL_CONTEXT_FAILURE'
  | 'MISSING_NON_CRITICAL_FIELD'
  | 'LOW_CONFIDENCE_INPUTS'
  | 'STALE_CONTEXT'
  | 'SOURCE_CONTEXT_PARTIAL';

export interface JudgmentAvailabilityResult {
  state: JudgmentAvailabilityState;
  canUseStructuredJudgment: boolean;
  userDisclosureRequired: boolean;
  reasons: string[];
  unavailableReasons: JudgmentUnavailableReason[];
  degradedReasons: JudgmentDegradedReason[];
  failedComponents: string[];
  degradedComponents: string[];
  policyVersion: 'judgment-availability.v1';
  errorMessage?: string;
}
