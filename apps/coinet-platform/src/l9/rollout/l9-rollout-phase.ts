/**
 * L9.9 — Rollout Phase
 *
 * §9.9.1.4 / §9.9.7.3 — Ordered rollout phases for Layer 9. Used by
 * the rollout gate, enable/disable policy, and the failure playbooks
 * to constrain how Layer 9 may transition from not-live to
 * fully-live.
 */

export enum L9RolloutPhase {
  PRE_ROLLOUT = 'PRE_ROLLOUT',
  SHADOW = 'SHADOW',
  CANARY = 'CANARY',
  PARTIAL_LIVE = 'PARTIAL_LIVE',
  FULL_LIVE = 'FULL_LIVE',
  ROLLBACK = 'ROLLBACK',
  FROZEN_LIVE = 'FROZEN_LIVE',
}

export const ALL_L9_ROLLOUT_PHASES: readonly L9RolloutPhase[] =
  Object.values(L9RolloutPhase);

/**
 * Canonical order for forward rollout. ROLLBACK and FROZEN_LIVE are
 * terminal side-phases not reachable by linear progression.
 */
export const L9_ROLLOUT_FORWARD_ORDER: readonly L9RolloutPhase[] =
  Object.freeze([
    L9RolloutPhase.PRE_ROLLOUT,
    L9RolloutPhase.SHADOW,
    L9RolloutPhase.CANARY,
    L9RolloutPhase.PARTIAL_LIVE,
    L9RolloutPhase.FULL_LIVE,
    L9RolloutPhase.FROZEN_LIVE,
  ]);

export const L9_ROLLOUT_PHASE_DESCRIPTION: Readonly<Record<
  L9RolloutPhase,
  string
>> = Object.freeze({
  [L9RolloutPhase.PRE_ROLLOUT]:
    'L9 runtime is absent or disabled; no reads/writes accepted.',
  [L9RolloutPhase.SHADOW]:
    'L9 runs against live inputs but emits no governed read surface ' +
    'to downstream consumers; outputs are audit-only.',
  [L9RolloutPhase.CANARY]:
    'A small, bounded subset of sequence subjects is serving ' +
    'production read surfaces with observability heightened.',
  [L9RolloutPhase.PARTIAL_LIVE]:
    'A majority of sequence subjects are live; remaining subjects ' +
    'continue in SHADOW or CANARY.',
  [L9RolloutPhase.FULL_LIVE]:
    'All ratified sequence subjects serve production read surfaces.',
  [L9RolloutPhase.ROLLBACK]:
    'Active rollback of a previously-live phase back to SHADOW or ' +
    'PRE_ROLLOUT; writes continue, but downstream surfaces are ' +
    'fenced off per rollback policy.',
  [L9RolloutPhase.FROZEN_LIVE]:
    'L9 has been ratified, frozen, and is running in production; ' +
    'only governed extensions under the extension policy may ship.',
});

/**
 * Which phases permit downstream consumption at all. Shadow surfaces
 * are not downstream-visible.
 */
export const L9_DOWNSTREAM_VISIBLE_PHASES: readonly L9RolloutPhase[] =
  Object.freeze([
    L9RolloutPhase.CANARY,
    L9RolloutPhase.PARTIAL_LIVE,
    L9RolloutPhase.FULL_LIVE,
    L9RolloutPhase.FROZEN_LIVE,
  ]);

/**
 * Which phases are forward-linear (shadow → canary → partial → full).
 * Used by the rollout gate to detect invalid transitions.
 */
export function isL9ForwardPhaseTransitionLegal(
  from: L9RolloutPhase,
  to: L9RolloutPhase,
): boolean {
  const a = L9_ROLLOUT_FORWARD_ORDER.indexOf(from);
  const b = L9_ROLLOUT_FORWARD_ORDER.indexOf(to);
  if (a < 0 || b < 0) return false;
  return b === a + 1;
}
