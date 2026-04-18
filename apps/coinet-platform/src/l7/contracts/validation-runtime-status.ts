/**
 * L7.3 — Validation Runtime Status and Intent
 *
 * §7.3.2.4 — `validation_intent` and `staleness_policy`.
 * §7.3.8.2 — `L7RuntimeStatusClass`, `L7ValidationIntent`,
 *            `L7StalenessPolicyClass`, `L7MaterializationReadinessState`,
 *            `L7ReplayIdentityMode`.
 *
 * All enums are string-backed and disjoint across L7 sublayers.
 */

/**
 * What a validation subject is *explicitly* trying to validate. Required
 * in the L7.3 subject contract (§7.3.2.4). Prevents the same subject class
 * from being used vaguely across engines.
 */
export enum L7ValidationIntent {
  SUPPORT_CONFIRMATION = 'SUPPORT_CONFIRMATION',
  OVERHANG_CHALLENGE = 'OVERHANG_CHALLENGE',
  ALIGNMENT_CHECK = 'ALIGNMENT_CHECK',
  DIVERGENCE_TEST = 'DIVERGENCE_TEST',
  STRUCTURAL_SUPPORT_TEST = 'STRUCTURAL_SUPPORT_TEST',
  SUBSTANCE_TEST = 'SUBSTANCE_TEST',
  FLOW_TEST = 'FLOW_TEST',
  NARRATIVE_BREADTH_TEST = 'NARRATIVE_BREADTH_TEST',
  STALENESS_PROBE = 'STALENESS_PROBE',
  AMBIGUITY_PROBE = 'AMBIGUITY_PROBE',
}
export const ALL_VALIDATION_INTENTS: readonly L7ValidationIntent[] = Object.values(L7ValidationIntent);

/**
 * How later runtime layers must treat stale support. Required per-subject
 * in the L7.3 contract (§7.3.2.4 `staleness_policy`).
 */
export enum L7StalenessPolicyClass {
  BLOCK = 'BLOCK',
  DOWNGRADE = 'DOWNGRADE',
  MODIFIER_ONLY = 'MODIFIER_ONLY',
  EVIDENCE_ONLY = 'EVIDENCE_ONLY',
}
export const ALL_STALENESS_POLICY_CLASSES: readonly L7StalenessPolicyClass[] = Object.values(L7StalenessPolicyClass);

/**
 * Top-level runtime status of a validation output. Must *not* be "CLEAN"
 * if any cleanliness dimension (staleness/incompleteness/ambiguity/
 * degradation/unresolved contradiction) is materially active
 * (§7.3.3.7 runtime cleanliness law).
 */
export enum L7RuntimeStatusClass {
  CLEAN = 'CLEAN',
  DOWNGRADED = 'DOWNGRADED',
  CAPPED = 'CAPPED',
  BLOCKED = 'BLOCKED',
  QUARANTINED = 'QUARANTINED',
  REPAIRED = 'REPAIRED',
}
export const ALL_RUNTIME_STATUS_CLASSES: readonly L7RuntimeStatusClass[] = Object.values(L7RuntimeStatusClass);

/**
 * Mode under which replay identity must be computed. Replay hash behaviour
 * depends on the mode (live includes compute_run_id; replay mode normalises
 * it out to allow hash equivalence with the original compute run).
 */
export enum L7ReplayIdentityMode {
  LIVE = 'LIVE',
  REPLAY = 'REPLAY',
  REPAIR = 'REPAIR',
  LATE_DATA = 'LATE_DATA',
}
export const ALL_REPLAY_IDENTITY_MODES: readonly L7ReplayIdentityMode[] = Object.values(L7ReplayIdentityMode);

/**
 * Materialization readiness state per §7.3.7.6.
 */
export enum L7MaterializationReadinessState {
  READY = 'READY',
  READY_WITH_MODIFIERS = 'READY_WITH_MODIFIERS',
  NOT_READY_INCOMPLETE_CONTRACT = 'NOT_READY_INCOMPLETE_CONTRACT',
  NOT_READY_MISSING_LINEAGE = 'NOT_READY_MISSING_LINEAGE',
  NOT_READY_MISSING_REPLAY_HASH = 'NOT_READY_MISSING_REPLAY_HASH',
  NOT_READY_CLEANLINESS_VIOLATION = 'NOT_READY_CLEANLINESS_VIOLATION',
  NOT_READY_VERSION_MISSING = 'NOT_READY_VERSION_MISSING',
  NOT_READY_EVIDENCE_MISSING = 'NOT_READY_EVIDENCE_MISSING',
}
export const ALL_MATERIALIZATION_READINESS_STATES: readonly L7MaterializationReadinessState[] =
  Object.values(L7MaterializationReadinessState);

export function isReadyState(state: L7MaterializationReadinessState): boolean {
  return (
    state === L7MaterializationReadinessState.READY ||
    state === L7MaterializationReadinessState.READY_WITH_MODIFIERS
  );
}

/**
 * §7.3.3.7 — The set of cleanliness dimensions a "CLEAN" status must avoid.
 */
export interface L7CleanlinessPosture {
  readonly stalenessMaterial: boolean;
  readonly incompletenessMaterial: boolean;
  readonly ambiguityMaterial: boolean;
  readonly degradationMaterial: boolean;
  readonly unresolvedContradictionPresent: boolean;
  readonly missingRequiredSupport: boolean;
}

export function cleanlinessIsClean(p: L7CleanlinessPosture): boolean {
  return (
    !p.stalenessMaterial &&
    !p.incompletenessMaterial &&
    !p.ambiguityMaterial &&
    !p.degradationMaterial &&
    !p.unresolvedContradictionPresent &&
    !p.missingRequiredSupport
  );
}
