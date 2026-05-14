/**
 * L11.4 — Attribution Materiality (§11.4.11)
 *
 * Materiality classes and threshold law that govern which
 * contributions are visible in attribution.
 */

export enum L11AttributionMaterialityClass {
  CRITICAL = 'CRITICAL',
  MAJOR = 'MAJOR',
  MATERIAL = 'MATERIAL',
  MINOR = 'MINOR',
  TRACE = 'TRACE',
}

export const ALL_L11_ATTRIBUTION_MATERIALITY_CLASSES:
  readonly L11AttributionMaterialityClass[] =
  Object.values(L11AttributionMaterialityClass);

/**
 * §11.4.11.2 — Default thresholds. Versioned via `policy_version`
 * on every attribution object so future policy changes do not
 * silently mutate historic attributions.
 */
export interface L11AttributionMaterialityThresholds {
  readonly policy_version: string;
  readonly critical_min: number;
  readonly major_min: number;
  readonly material_min: number;
  readonly minor_min: number;
}

export const L11_DEFAULT_MATERIALITY_THRESHOLDS:
  L11AttributionMaterialityThresholds = {
  policy_version: 'l11.4.materiality.v1',
  critical_min: 0.30,
  major_min: 0.20,
  material_min: 0.10,
  minor_min: 0.05,
};

/**
 * Classify a normalized impact value (in [0,1]) into a materiality
 * class using the thresholds.
 */
export function classifyL11Materiality(
  normalized_impact: number,
  thresholds: L11AttributionMaterialityThresholds = L11_DEFAULT_MATERIALITY_THRESHOLDS,
): L11AttributionMaterialityClass {
  const m = Math.abs(normalized_impact);
  if (!Number.isFinite(m)) return L11AttributionMaterialityClass.TRACE;
  if (m >= thresholds.critical_min) return L11AttributionMaterialityClass.CRITICAL;
  if (m >= thresholds.major_min) return L11AttributionMaterialityClass.MAJOR;
  if (m >= thresholds.material_min) return L11AttributionMaterialityClass.MATERIAL;
  if (m >= thresholds.minor_min) return L11AttributionMaterialityClass.MINOR;
  return L11AttributionMaterialityClass.TRACE;
}

/**
 * §11.4.11.3 — Material-or-above bar. Used by validators and the
 * top-driver selector to determine visibility requirements.
 */
export function isL11MaterialOrAbove(
  c: L11AttributionMaterialityClass,
): boolean {
  return (
    c === L11AttributionMaterialityClass.CRITICAL ||
    c === L11AttributionMaterialityClass.MAJOR ||
    c === L11AttributionMaterialityClass.MATERIAL
  );
}

const CLASS_ORDER: Readonly<Record<L11AttributionMaterialityClass, number>> = {
  [L11AttributionMaterialityClass.CRITICAL]: 4,
  [L11AttributionMaterialityClass.MAJOR]: 3,
  [L11AttributionMaterialityClass.MATERIAL]: 2,
  [L11AttributionMaterialityClass.MINOR]: 1,
  [L11AttributionMaterialityClass.TRACE]: 0,
};

export function compareL11Materiality(
  a: L11AttributionMaterialityClass,
  b: L11AttributionMaterialityClass,
): number {
  return CLASS_ORDER[b] - CLASS_ORDER[a];
}
