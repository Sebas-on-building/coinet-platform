/**
 * L11.4 — Top Driver Selector (§11.4.10)
 *
 * Deterministic top-N selector for positive and negative drivers.
 * Operates on a `L11AttributionDriver[]` candidate pool produced by
 * the attribution engine.
 */

import {
  L11AttributionDriver,
  L11AttributionDriverClass,
  L11_NEGATIVE_DRIVER_CLASS_PRIORITY,
  L11_POSITIVE_DRIVER_CLASS_PRIORITY,
  L11AttributionMaterialityClass,
  compareL11Materiality,
  isPositiveDirection,
  isNegativeDirection,
  L11TopDriverSelectionPolicy,
  L11TopDriverTieBreakRule,
  L11_SOURCE_LAYER_PRIORITY,
  L11_DEFAULT_TOP_DRIVER_POLICY,
} from '../contracts';

export interface L11TopDriverSelectionResult {
  readonly top_positive_drivers: readonly L11AttributionDriver[];
  readonly top_negative_drivers: readonly L11AttributionDriver[];
}

function sourceLayerKey(d: L11AttributionDriver): string {
  // Drivers don't store a source-layer label directly. Derive from
  // driver class for deterministic ordering.
  switch (d.driver_class) {
    case L11AttributionDriverClass.HYPOTHESIS_DRIVER:
      return 'L10';
    case L11AttributionDriverClass.SEQUENCE_MODIFIER_DRIVER:
      return 'L9';
    case L11AttributionDriverClass.REGIME_MODIFIER_DRIVER:
      return 'L8';
    case L11AttributionDriverClass.VALIDATION_DRIVER:
    case L11AttributionDriverClass.CONTRADICTION_DRIVER:
      return 'L7';
    case L11AttributionDriverClass.CONFIDENCE_DRIVER:
      return 'L7';
    default:
      return 'N_A';
  }
}

function rank(
  a: L11AttributionDriver,
  b: L11AttributionDriver,
  classPriority: Readonly<Record<L11AttributionDriverClass, number>>,
  rules: readonly L11TopDriverTieBreakRule[],
): number {
  // Primary sort: normalized impact desc
  if (a.normalized_impact !== b.normalized_impact) {
    return b.normalized_impact - a.normalized_impact;
  }
  for (const rule of rules) {
    switch (rule) {
      case L11TopDriverTieBreakRule.MATERIALITY_CLASS: {
        const c = compareL11Materiality(a.materiality_class, b.materiality_class);
        if (c !== 0) return c;
        break;
      }
      case L11TopDriverTieBreakRule.DRIVER_CLASS_PRIORITY: {
        const ap = classPriority[a.driver_class] ?? 999;
        const bp = classPriority[b.driver_class] ?? 999;
        if (ap !== bp) return ap - bp;
        break;
      }
      case L11TopDriverTieBreakRule.CONTRIBUTION_MAGNITUDE: {
        const am = Math.abs(a.contribution_magnitude);
        const bm = Math.abs(b.contribution_magnitude);
        if (am !== bm) return bm - am;
        break;
      }
      case L11TopDriverTieBreakRule.SOURCE_LAYER_PRIORITY: {
        const ap = L11_SOURCE_LAYER_PRIORITY[sourceLayerKey(a)] ?? 99;
        const bp = L11_SOURCE_LAYER_PRIORITY[sourceLayerKey(b)] ?? 99;
        if (ap !== bp) return ap - bp;
        break;
      }
      case L11TopDriverTieBreakRule.DRIVER_ID_LEXICOGRAPHIC:
        return a.driver_id.localeCompare(b.driver_id);
    }
  }
  return a.driver_id.localeCompare(b.driver_id);
}

export function selectL11TopDrivers(
  candidates: readonly L11AttributionDriver[],
  policy: L11TopDriverSelectionPolicy = L11_DEFAULT_TOP_DRIVER_POLICY,
): L11TopDriverSelectionResult {
  const above = candidates.filter(d =>
    d.normalized_impact >= policy.min_materiality_threshold);

  const positives = above.filter(d => isPositiveDirection(d.contribution_direction));
  const negatives = above.filter(d => isNegativeDirection(d.contribution_direction));

  const positiveSorted = [...positives].sort((a, b) =>
    rank(a, b, L11_POSITIVE_DRIVER_CLASS_PRIORITY, policy.tie_break_order));
  const negativeSorted = [...negatives].sort((a, b) =>
    rank(a, b, L11_NEGATIVE_DRIVER_CLASS_PRIORITY, policy.tie_break_order));

  // §11.4.10.3 — caps / missing-data / modifiers always included if material.
  const ensureClasses: L11AttributionDriverClass[] = [];
  if (policy.include_caps_if_material) ensureClasses.push(L11AttributionDriverClass.CAP_DRIVER);
  if (policy.include_missing_data_if_material) ensureClasses.push(L11AttributionDriverClass.MISSING_DATA_DRIVER);
  if (policy.include_modifier_if_material) {
    ensureClasses.push(L11AttributionDriverClass.REGIME_MODIFIER_DRIVER);
    ensureClasses.push(L11AttributionDriverClass.SEQUENCE_MODIFIER_DRIVER);
    ensureClasses.push(L11AttributionDriverClass.HYPOTHESIS_DRIVER);
  }

  const negativeFinal = applyEnsuredClasses(negativeSorted, negatives, ensureClasses, policy.max_negative_drivers);

  return {
    top_positive_drivers: positiveSorted.slice(0, policy.max_positive_drivers),
    top_negative_drivers: negativeFinal,
  };
}

function applyEnsuredClasses(
  sorted: readonly L11AttributionDriver[],
  pool: readonly L11AttributionDriver[],
  ensureClasses: readonly L11AttributionDriverClass[],
  max: number,
): readonly L11AttributionDriver[] {
  // Take the top-N first, then ensure ensure-classes that satisfy
  // material-or-above are present (replacing the lowest-priority
  // entries when needed).
  const result: L11AttributionDriver[] = [...sorted].slice(0, max);
  const inResult = new Set(result.map(d => d.driver_id));

  for (const cls of ensureClasses) {
    const candidate = pool.find(d => d.driver_class === cls && !inResult.has(d.driver_id) &&
      isMaterialOrAbove(d.materiality_class));
    if (!candidate) continue;
    if (result.length < max) {
      result.push(candidate);
      inResult.add(candidate.driver_id);
      continue;
    }
    // Replace the last result that does NOT belong to an ensure-class
    const replaceIdx = [...result].reverse()
      .findIndex(d => !ensureClasses.includes(d.driver_class));
    if (replaceIdx >= 0) {
      const idx = result.length - 1 - replaceIdx;
      inResult.delete(result[idx].driver_id);
      result[idx] = candidate;
      inResult.add(candidate.driver_id);
    }
  }
  return result;
}

function isMaterialOrAbove(c: L11AttributionMaterialityClass): boolean {
  return (
    c === L11AttributionMaterialityClass.CRITICAL ||
    c === L11AttributionMaterialityClass.MAJOR ||
    c === L11AttributionMaterialityClass.MATERIAL
  );
}
