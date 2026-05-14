/**
 * L10.9 — Rollout Phase
 *
 * §10.9.11.2 — Ordered rollout phases for Layer 10. Used by the
 * rollout gate, enable/disable policy, and the failure playbooks to
 * constrain how Layer 10 may transition from not-live to fully-live.
 */

export enum L10RolloutPhase {
  PRE_ROLLOUT = 'PRE_ROLLOUT',
  SHADOW = 'SHADOW',
  CANARY = 'CANARY',
  PARTIAL_LIVE = 'PARTIAL_LIVE',
  FULL_LIVE = 'FULL_LIVE',
  ROLLBACK = 'ROLLBACK',
  FROZEN_LIVE = 'FROZEN_LIVE',
}

export const ALL_L10_ROLLOUT_PHASES: readonly L10RolloutPhase[] =
  Object.values(L10RolloutPhase);

/**
 * Canonical order for forward rollout. ROLLBACK and FROZEN_LIVE are
 * terminal side-phases not reachable by linear progression.
 */
export const L10_ROLLOUT_FORWARD_ORDER: readonly L10RolloutPhase[] =
  Object.freeze([
    L10RolloutPhase.PRE_ROLLOUT,
    L10RolloutPhase.SHADOW,
    L10RolloutPhase.CANARY,
    L10RolloutPhase.PARTIAL_LIVE,
    L10RolloutPhase.FULL_LIVE,
    L10RolloutPhase.FROZEN_LIVE,
  ]);

export const L10_ROLLOUT_PHASE_DESCRIPTION: Readonly<Record<
  L10RolloutPhase,
  string
>> = Object.freeze({
  [L10RolloutPhase.PRE_ROLLOUT]:
    'L10 runtime is absent or disabled; no reads/writes accepted.',
  [L10RolloutPhase.SHADOW]:
    'L10 runs against live inputs but emits no governed read surface ' +
    'to downstream consumers; outputs are audit-only.',
  [L10RolloutPhase.CANARY]:
    'A small, bounded subset of hypothesis subjects is serving ' +
    'production read surfaces with observability heightened.',
  [L10RolloutPhase.PARTIAL_LIVE]:
    'A majority of hypothesis subjects are live; remaining subjects ' +
    'continue in SHADOW or CANARY.',
  [L10RolloutPhase.FULL_LIVE]:
    'All ratified hypothesis subjects serve production read surfaces.',
  [L10RolloutPhase.ROLLBACK]:
    'Active rollback of a previously-live phase back to SHADOW or ' +
    'PRE_ROLLOUT; writes continue, but downstream surfaces are ' +
    'fenced off per rollback policy.',
  [L10RolloutPhase.FROZEN_LIVE]:
    'L10 has been ratified, frozen, and is running in production; ' +
    'only governed extensions under the extension policy may ship.',
});

/**
 * Which phases permit downstream consumption at all. Shadow surfaces
 * are not downstream-visible.
 */
export const L10_DOWNSTREAM_VISIBLE_PHASES: readonly L10RolloutPhase[] =
  Object.freeze([
    L10RolloutPhase.CANARY,
    L10RolloutPhase.PARTIAL_LIVE,
    L10RolloutPhase.FULL_LIVE,
    L10RolloutPhase.FROZEN_LIVE,
  ]);

/**
 * Which phases are forward-linear (shadow → canary → partial →
 * full). Used by the rollout gate to detect invalid transitions.
 */
export function isL10ForwardPhaseTransitionLegal(
  from: L10RolloutPhase,
  to: L10RolloutPhase,
): boolean {
  const a = L10_ROLLOUT_FORWARD_ORDER.indexOf(from);
  const b = L10_ROLLOUT_FORWARD_ORDER.indexOf(to);
  if (a < 0 || b < 0) return false;
  return b === a + 1;
}
