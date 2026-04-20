/**
 * L9.4 — Shared runtime type vocabulary
 *
 * §9.4.6.2 / §9.4.7.2 / §9.4.17.2 — Enums used across the L9 runtime
 * that are not tied to a specific contract object. They are
 * deliberately small and additive so the certification test suite can
 * pin them.
 */

/**
 * §9.4.6.2 — Output classes from the `TemporalInputResolver` + the
 * general-purpose runtime readiness class from §9.4.17.2. The same
 * enum is reused by the classification engine so that its final
 * "readiness_class" mirrors the input resolver's classification.
 */
export enum L9TemporalInputReadinessClass {
  READY_CURRENT = 'READY_CURRENT',
  READY_HISTORICAL = 'READY_HISTORICAL',
  PARTIAL_RESTRICTED = 'PARTIAL_RESTRICTED',
  STALE_NARROWED = 'STALE_NARROWED',
  DEGRADED_NARROWED = 'DEGRADED_NARROWED',
  BLOCKED = 'BLOCKED',
}

export const ALL_L9_TEMPORAL_INPUT_READINESS_CLASSES:
  readonly L9TemporalInputReadinessClass[] =
    Object.values(L9TemporalInputReadinessClass);

/**
 * §9.4.7.2 — OrderedSignalResolver temporal role classes. Timestamps
 * alone are not enough; each governed node in the chain must carry a
 * typed role.
 */
export enum L9OrderedSignalRoleClass {
  INITIATOR = 'INITIATOR',
  CONFIRMER = 'CONFIRMER',
  REINFORCER = 'REINFORCER',
  LAGGING_CONFIRMER = 'LAGGING_CONFIRMER',
  LATE_ENTRANT = 'LATE_ENTRANT',
  CONTRADICTION_INTRUDER = 'CONTRADICTION_INTRUDER',
  POST_EVENT_STABILIZER = 'POST_EVENT_STABILIZER',
  DECAYED_PREDECESSOR = 'DECAYED_PREDECESSOR',
}

export const ALL_L9_ORDERED_SIGNAL_ROLE_CLASSES:
  readonly L9OrderedSignalRoleClass[] =
    Object.values(L9OrderedSignalRoleClass);
