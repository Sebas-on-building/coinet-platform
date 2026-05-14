/**
 * L11.5 — Score Visibility Class & Readiness Effect (§11.5.5.3 / §11.5.5.4)
 *
 * Two intertwined enums describing the runtime posture of a score's
 * input visibility and the readiness effect that posture forces.
 * The visibility class is consumed by attribution (L11.4) and audit;
 * the readiness effect drives whether a score is emitted, capped,
 * penalised, blocked, or evidence-only.
 */

export enum L11ScoreVisibilityClass {
  FULL_VISIBILITY = 'FULL_VISIBILITY',
  PARTIAL_VISIBILITY = 'PARTIAL_VISIBILITY',
  DEGRADED_VISIBILITY = 'DEGRADED_VISIBILITY',
  RESTRICTED_VISIBILITY = 'RESTRICTED_VISIBILITY',
  CONFLICTING_VISIBILITY = 'CONFLICTING_VISIBILITY',
  EVIDENCE_ONLY_VISIBILITY = 'EVIDENCE_ONLY_VISIBILITY',
  INSUFFICIENT_VISIBILITY = 'INSUFFICIENT_VISIBILITY',
  BLOCKED_VISIBILITY = 'BLOCKED_VISIBILITY',
}

export const ALL_L11_SCORE_VISIBILITY_CLASSES:
  readonly L11ScoreVisibilityClass[] =
  Object.values(L11ScoreVisibilityClass);

export enum L11MissingDataReadinessEffect {
  NO_EFFECT = 'NO_EFFECT',
  DISCLOSURE_REQUIRED = 'DISCLOSURE_REQUIRED',
  SCORE_CAPPED = 'SCORE_CAPPED',
  SCORE_PENALIZED = 'SCORE_PENALIZED',
  CONFIDENCE_REDUCED = 'CONFIDENCE_REDUCED',
  EVIDENCE_ONLY = 'EVIDENCE_ONLY',
  SCORE_BLOCKED = 'SCORE_BLOCKED',
}

export const ALL_L11_MISSING_DATA_READINESS_EFFECTS:
  readonly L11MissingDataReadinessEffect[] =
  Object.values(L11MissingDataReadinessEffect);

/**
 * §11.5.5.3 — Severity ladder for visibility (lower index = healthier).
 * Used by the visibility validator and engine combiner so that a
 * combined posture takes the worst observed class.
 */
const VISIBILITY_SEVERITY: readonly L11ScoreVisibilityClass[] = [
  L11ScoreVisibilityClass.FULL_VISIBILITY,
  L11ScoreVisibilityClass.PARTIAL_VISIBILITY,
  L11ScoreVisibilityClass.DEGRADED_VISIBILITY,
  L11ScoreVisibilityClass.RESTRICTED_VISIBILITY,
  L11ScoreVisibilityClass.CONFLICTING_VISIBILITY,
  L11ScoreVisibilityClass.EVIDENCE_ONLY_VISIBILITY,
  L11ScoreVisibilityClass.INSUFFICIENT_VISIBILITY,
  L11ScoreVisibilityClass.BLOCKED_VISIBILITY,
];

export function compareL11VisibilityClass(
  a: L11ScoreVisibilityClass,
  b: L11ScoreVisibilityClass,
): number {
  return VISIBILITY_SEVERITY.indexOf(a) - VISIBILITY_SEVERITY.indexOf(b);
}

export function worstL11VisibilityClass(
  classes: readonly L11ScoreVisibilityClass[],
): L11ScoreVisibilityClass {
  if (classes.length === 0) return L11ScoreVisibilityClass.FULL_VISIBILITY;
  let worst = classes[0];
  for (let i = 1; i < classes.length; i++) {
    if (compareL11VisibilityClass(classes[i], worst) > 0) worst = classes[i];
  }
  return worst;
}

/**
 * §11.5.5.3 — A score whose visibility is BLOCKED_VISIBILITY may
 * not be emitted as a production score. Other classes may emit
 * with appropriate readiness effects and disclosures.
 */
export function isL11ScoreVisibilityEmissible(
  v: L11ScoreVisibilityClass,
): boolean {
  return v !== L11ScoreVisibilityClass.BLOCKED_VISIBILITY;
}

const READINESS_SEVERITY: readonly L11MissingDataReadinessEffect[] = [
  L11MissingDataReadinessEffect.SCORE_BLOCKED,
  L11MissingDataReadinessEffect.EVIDENCE_ONLY,
  L11MissingDataReadinessEffect.SCORE_CAPPED,
  L11MissingDataReadinessEffect.SCORE_PENALIZED,
  L11MissingDataReadinessEffect.CONFIDENCE_REDUCED,
  L11MissingDataReadinessEffect.DISCLOSURE_REQUIRED,
  L11MissingDataReadinessEffect.NO_EFFECT,
];

/**
 * Most-restrictive readiness wins. Index 0 is most restrictive.
 */
export function compareL11ReadinessEffect(
  a: L11MissingDataReadinessEffect,
  b: L11MissingDataReadinessEffect,
): number {
  return READINESS_SEVERITY.indexOf(a) - READINESS_SEVERITY.indexOf(b);
}

export function mostRestrictiveL11ReadinessEffect(
  effects: readonly L11MissingDataReadinessEffect[],
): L11MissingDataReadinessEffect {
  if (effects.length === 0) return L11MissingDataReadinessEffect.NO_EFFECT;
  let best = effects[0];
  for (let i = 1; i < effects.length; i++) {
    if (compareL11ReadinessEffect(effects[i], best) < 0) best = effects[i];
  }
  return best;
}
