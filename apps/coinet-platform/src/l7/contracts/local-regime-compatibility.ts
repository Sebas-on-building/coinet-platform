/**
 * L7.6 — Local Regime-Compatibility Policy
 *
 * §7.6.6 — A LOCAL regime-compatibility factor is allowed inside L7.6
 * because validation may legitimately weaken or strengthen reliance
 * based on currently observable regime conditions. The factor is
 * intentionally bounded:
 *
 *   - it must never emit a final regime classification (§7.6.6.3)
 *   - it must never override contradiction, staleness, or degradation
 *     law (§7.6.6.3)
 *   - it must consume only currently legal regime-relevant primitives
 *     (§7.6.6.4)
 *
 * The dedicated regime engine (a later layer) remains authoritative.
 */

export enum L7LocalRegimePosture {
  COMPATIBLE = 'COMPATIBLE',
  PARTIALLY_COMPATIBLE = 'PARTIALLY_COMPATIBLE',
  NEUTRAL = 'NEUTRAL',
  PARTIALLY_INCOMPATIBLE = 'PARTIALLY_INCOMPATIBLE',
  INCOMPATIBLE = 'INCOMPATIBLE',
  UNDETERMINED = 'UNDETERMINED',
}

export const ALL_L7_LOCAL_REGIME_POSTURES: readonly L7LocalRegimePosture[] =
  Object.values(L7LocalRegimePosture);

export type L7LocalRegimeInputClass =
  | 'VOLATILITY'
  | 'TREND'
  | 'CROWDING'
  | 'PARTICIPATION'
  | 'BREADTH'
  | 'TIMING'
  | 'MATURITY';

export const ALL_L7_LOCAL_REGIME_INPUT_CLASSES: readonly L7LocalRegimeInputClass[] = [
  'VOLATILITY',
  'TREND',
  'CROWDING',
  'PARTICIPATION',
  'BREADTH',
  'TIMING',
  'MATURITY',
];

export interface L7LocalRegimeInput {
  readonly subject_id: string;
  /**
   * Subject MUST declare which regime input classes it consumes
   * (§7.6.6.5 — regime factor use without declared subject
   * compatibility is illegal).
   */
  readonly declared_input_classes: readonly L7LocalRegimeInputClass[];
  /**
   * Per-class scores in [0,1]. Missing entries are treated as
   * UNDETERMINED (i.e. neutral, weight 0).
   */
  readonly observations: Readonly<Partial<Record<L7LocalRegimeInputClass, number>>>;
}

export interface L7LocalRegimeResult {
  readonly subject_id: string;
  /**
   * Bounded score in [0,1] that may feed the
   * `REGIME_COMPATIBILITY` factor group of the confidence model.
   */
  readonly compatibility_score: number;
  readonly posture: L7LocalRegimePosture;
  /** True if the subject did not declare any regime-input classes. */
  readonly used_without_declaration: boolean;
  readonly inputs_considered: readonly L7LocalRegimeInputClass[];
  readonly rationale: string;
}

/** §7.6.6.2 — bounded influence on confidence in [0,1]. */
export const L7_LOCAL_REGIME_MAX_CONFIDENCE_INFLUENCE = 0.15;

export function postureForCompatibilityScore(score: number): L7LocalRegimePosture {
  if (!isFinite(score)) return L7LocalRegimePosture.UNDETERMINED;
  if (score >= 0.85) return L7LocalRegimePosture.COMPATIBLE;
  if (score >= 0.65) return L7LocalRegimePosture.PARTIALLY_COMPATIBLE;
  if (score >= 0.4) return L7LocalRegimePosture.NEUTRAL;
  if (score >= 0.2) return L7LocalRegimePosture.PARTIALLY_INCOMPATIBLE;
  return L7LocalRegimePosture.INCOMPATIBLE;
}

export function isL7LocalRegimePosture(raw: string): raw is L7LocalRegimePosture {
  return (ALL_L7_LOCAL_REGIME_POSTURES as readonly string[]).includes(raw);
}

export function isL7LocalRegimeInputClass(raw: string): raw is L7LocalRegimeInputClass {
  return (ALL_L7_LOCAL_REGIME_INPUT_CLASSES as readonly string[]).includes(raw);
}
