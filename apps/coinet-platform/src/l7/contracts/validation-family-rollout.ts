/**
 * L7.5 — Validation Family Rollout
 *
 * §7.5.7 — L7.5 must define rollout phases and enforce a rollout order
 * that is explicit, comparable, and enforceable. Families may not be
 * production-enabled unless their prerequisites (subject classes,
 * contradiction families/templates, support/challenge patterns,
 * certification, runtime integration, restriction posture) are satisfied.
 */

export enum L7ValidationRolloutPhase {
  P1_FOUNDATIONAL = 'P1_FOUNDATIONAL',
  P2_CORE_MARKET = 'P2_CORE_MARKET',
  P3_CORE_SUBSTANCE = 'P3_CORE_SUBSTANCE',
  P4_BEHAVIORAL = 'P4_BEHAVIORAL',
  P5_RISK = 'P5_RISK',
  P6_ALIGNMENT = 'P6_ALIGNMENT',
}

export const ALL_L7_VALIDATION_ROLLOUT_PHASES: readonly L7ValidationRolloutPhase[] =
  Object.values(L7ValidationRolloutPhase);

/**
 * §7.5.7.1 — Phase ordering. Lower index means earlier.
 */
export const L7_ROLLOUT_PHASE_ORDER: Record<L7ValidationRolloutPhase, number> = {
  [L7ValidationRolloutPhase.P1_FOUNDATIONAL]: 1,
  [L7ValidationRolloutPhase.P2_CORE_MARKET]: 2,
  [L7ValidationRolloutPhase.P3_CORE_SUBSTANCE]: 3,
  [L7ValidationRolloutPhase.P4_BEHAVIORAL]: 4,
  [L7ValidationRolloutPhase.P5_RISK]: 5,
  [L7ValidationRolloutPhase.P6_ALIGNMENT]: 6,
};

export function compareRolloutPhase(
  a: L7ValidationRolloutPhase,
  b: L7ValidationRolloutPhase,
): number {
  return L7_ROLLOUT_PHASE_ORDER[a] - L7_ROLLOUT_PHASE_ORDER[b];
}

export function isL7ValidationRolloutPhase(
  code: string,
): code is L7ValidationRolloutPhase {
  return (ALL_L7_VALIDATION_ROLLOUT_PHASES as readonly string[]).includes(code);
}
