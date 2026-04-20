/**
 * L9.2 — ChangePoint Contract
 *
 * §9.2.4.7 — A governed temporal break. A change point is not just a
 * new data point; it marks a sequence-state shift, phase shift,
 * lead-lag inversion, shock impact, transition from support to
 * crowding, or transition from continuation to digestion. Change
 * points must be typed, not generic.
 */

/**
 * §9.2.4.7 — Canonical change-point classes. Frozen vocabulary.
 */
export enum L9ChangePointClass {
  INITIATING = 'INITIATING',
  CONFIRMING = 'CONFIRMING',
  REINFORCING = 'REINFORCING',
  REVERSING = 'REVERSING',
  LATE_PARTICIPATION = 'LATE_PARTICIPATION',
  CROWDING_ONSET = 'CROWDING_ONSET',
  REFLEXIVE_ACCELERATION = 'REFLEXIVE_ACCELERATION',
  CONTRADICTION_SHOCK = 'CONTRADICTION_SHOCK',
  UNLOCK_EVENT = 'UNLOCK_EVENT',
  LIQUIDATION_EVENT = 'LIQUIDATION_EVENT',
  SECURITY_SHOCK = 'SECURITY_SHOCK',
  LEAD_LAG_INVERSION = 'LEAD_LAG_INVERSION',
  PHASE_SHIFT = 'PHASE_SHIFT',
  DECAY_ONSET = 'DECAY_ONSET',
}

export const ALL_L9_CHANGE_POINT_CLASSES: readonly L9ChangePointClass[] =
  Object.values(L9ChangePointClass);

/**
 * §9.2.4.7 — Severity band. Paired with `severity_score` so downstream
 * consumers do not have to rederive it.
 */
export enum L9ChangePointSeverity {
  MINOR = 'MINOR',
  MODERATE = 'MODERATE',
  MAJOR = 'MAJOR',
  DECISIVE = 'DECISIVE',
}

export const ALL_L9_CHANGE_POINT_SEVERITIES: readonly L9ChangePointSeverity[] =
  Object.values(L9ChangePointSeverity);

/**
 * §9.2.4.7 — The full ChangePoint object.
 *
 * `prior_phase_ref` and `next_phase_ref` may be null for change points
 * that are not phase-boundary events (e.g. a lead-lag inversion that
 * does not change phase).
 */
export interface L9ChangePoint {
  readonly change_point_id: string;
  readonly sequence_subject_id: string;
  readonly change_point_class: L9ChangePointClass;
  readonly change_point_at: string;
  readonly prior_phase_ref: string | null;
  readonly next_phase_ref: string | null;
  readonly triggering_refs: readonly string[];
  readonly severity_score: number; // 0..1
  readonly severity_class: L9ChangePointSeverity;
  readonly lineage_refs: readonly string[];
}
