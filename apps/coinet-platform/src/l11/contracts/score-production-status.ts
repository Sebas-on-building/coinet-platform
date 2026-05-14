/**
 * L11.2 — Production-status law (§11.2.4)
 *
 * A score family's production status determines whether it may emit
 * current authoritative score outputs. Only PRODUCTION_ENABLED and
 * FROZEN families may serve current production outputs.
 *
 * RESERVED families may exist in registries but may not emit current
 * scores or appear in production aggregates (§11.2.4.3).
 */

export enum L11ScoreProductionStatus {
  PRODUCTION_ENABLED = 'PRODUCTION_ENABLED',
  RESERVED = 'RESERVED',
  EXPERIMENTAL_BLOCKED = 'EXPERIMENTAL_BLOCKED',
  DEPRECATED = 'DEPRECATED',
  FROZEN = 'FROZEN',
}

export const ALL_L11_SCORE_PRODUCTION_STATUSES:
  readonly L11ScoreProductionStatus[] =
  Object.values(L11ScoreProductionStatus);

/**
 * §11.2.4.2 — Statuses under which a score family may serve current
 * authoritative production output. PRODUCTION_ENABLED is the only
 * mutable-current status; FROZEN is current-readable post-ratification.
 */
export function statusAllowsCurrentEmission(s: L11ScoreProductionStatus): boolean {
  return (
    s === L11ScoreProductionStatus.PRODUCTION_ENABLED ||
    s === L11ScoreProductionStatus.FROZEN
  );
}

/**
 * §11.2.4.2 — Whether a status permits historical readability.
 * DEPRECATED keeps history readable but blocks new current emission.
 */
export function statusAllowsHistoricalReadability(
  s: L11ScoreProductionStatus,
): boolean {
  return (
    s === L11ScoreProductionStatus.PRODUCTION_ENABLED ||
    s === L11ScoreProductionStatus.FROZEN ||
    s === L11ScoreProductionStatus.DEPRECATED
  );
}

/**
 * §11.2.4.3 — Reserved-family hard rule. RESERVED and
 * EXPERIMENTAL_BLOCKED both forbid current production emission.
 */
export function statusForbidsProductionEmission(
  s: L11ScoreProductionStatus,
): boolean {
  return (
    s === L11ScoreProductionStatus.RESERVED ||
    s === L11ScoreProductionStatus.EXPERIMENTAL_BLOCKED ||
    s === L11ScoreProductionStatus.DEPRECATED
  );
}
