/**
 * L8.6 — Regime Rollout Phase and Template State
 *
 * §8.6.6.3 — Rollout phases order which families become production-
 * enabled. §8.6.6.4 / §8.6.6.5 — Template state carries shadow /
 * certification / production status.
 */

/**
 * §8.6.6.3 — Canonical rollout phases.
 *
 *   PHASE_1_FOUNDATIONAL — macro family first
 *   PHASE_2_STRUCTURAL   — crypto-structure second
 *   PHASE_3_TOKEN_LIFECYCLE — token-specific third
 *   PHASE_4_ECOSYSTEM    — ecosystem last
 */
export enum L8RegimeRolloutPhase {
  PHASE_1_FOUNDATIONAL = 'PHASE_1_FOUNDATIONAL',
  PHASE_2_STRUCTURAL = 'PHASE_2_STRUCTURAL',
  PHASE_3_TOKEN_LIFECYCLE = 'PHASE_3_TOKEN_LIFECYCLE',
  PHASE_4_ECOSYSTEM = 'PHASE_4_ECOSYSTEM',
}

export const ALL_L8_REGIME_ROLLOUT_PHASES:
  readonly L8RegimeRolloutPhase[] = Object.values(L8RegimeRolloutPhase);

/**
 * §8.6.6.1 — Rollout ordering index. Higher is later in rollout.
 */
export const L8_REGIME_ROLLOUT_PHASE_INDEX: Readonly<
  Record<L8RegimeRolloutPhase, number>
> = {
  [L8RegimeRolloutPhase.PHASE_1_FOUNDATIONAL]: 1,
  [L8RegimeRolloutPhase.PHASE_2_STRUCTURAL]: 2,
  [L8RegimeRolloutPhase.PHASE_3_TOKEN_LIFECYCLE]: 3,
  [L8RegimeRolloutPhase.PHASE_4_ECOSYSTEM]: 4,
};

export function compareL8RegimeRolloutPhases(
  a: L8RegimeRolloutPhase,
  b: L8RegimeRolloutPhase,
): number {
  return L8_REGIME_ROLLOUT_PHASE_INDEX[a] -
    L8_REGIME_ROLLOUT_PHASE_INDEX[b];
}

/**
 * §8.6.6.5 — Template rollout state.
 *
 *   SHADOW_ONLY        — may execute, must not emit production-clean
 *   CERTIFICATION_ONLY — may run during certification only
 *   PRODUCTION_ENABLED — legal for production runtime
 *   BLOCKED            — not permitted to run
 */
export enum L8RegimeTemplateState {
  SHADOW_ONLY = 'SHADOW_ONLY',
  CERTIFICATION_ONLY = 'CERTIFICATION_ONLY',
  PRODUCTION_ENABLED = 'PRODUCTION_ENABLED',
  BLOCKED = 'BLOCKED',
}

export const ALL_L8_REGIME_TEMPLATE_STATES:
  readonly L8RegimeTemplateState[] = Object.values(L8RegimeTemplateState);

/**
 * §8.6.6.5 — Runtime-mode classifier. Runtime selects which template
 * states are legal given the runtime mode.
 */
export type L8RegimeRuntimeMode =
  | 'SHADOW'
  | 'CERTIFICATION'
  | 'PRODUCTION';

export const ALL_L8_REGIME_RUNTIME_MODES: readonly L8RegimeRuntimeMode[] = [
  'SHADOW', 'CERTIFICATION', 'PRODUCTION',
];

/**
 * §8.6.6.4 / §8.6.6.5 — Is this template state legal under this runtime
 * mode? Shadow mode accepts everything except BLOCKED; certification
 * accepts certification-only + production; production accepts only
 * production-enabled.
 */
export function isTemplateStateLegalForMode(
  state: L8RegimeTemplateState,
  mode: L8RegimeRuntimeMode,
): boolean {
  if (state === L8RegimeTemplateState.BLOCKED) return false;
  switch (mode) {
    case 'SHADOW':
      return true;
    case 'CERTIFICATION':
      return state === L8RegimeTemplateState.CERTIFICATION_ONLY ||
        state === L8RegimeTemplateState.PRODUCTION_ENABLED;
    case 'PRODUCTION':
      return state === L8RegimeTemplateState.PRODUCTION_ENABLED;
  }
}

/**
 * §8.6.6.7 — Shadow templates may execute but may never emit a
 * production-clean regime output.
 */
export function mayEmitProductionClean(
  state: L8RegimeTemplateState,
  mode: L8RegimeRuntimeMode,
): boolean {
  if (mode !== 'PRODUCTION') return false;
  return state === L8RegimeTemplateState.PRODUCTION_ENABLED;
}
