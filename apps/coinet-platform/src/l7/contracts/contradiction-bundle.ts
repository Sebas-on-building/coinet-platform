/**
 * L7.2 — Contradiction Bundle Contract
 *
 * §7.2.6.2 — A ContradictionBundle is the immutable record of every
 * material contradiction observed while evaluating a claim. Each record
 * is typed against a registered contradiction family so bundles are
 * never arbitrary text arrays (§7.2.7.4).
 */

export enum L7ContradictionSeverity {
  INFO = 'INFO',
  MINOR = 'MINOR',
  MATERIAL = 'MATERIAL',
  SEVERE = 'SEVERE',
  BLOCKING = 'BLOCKING',
}

export const ALL_CONTRADICTION_SEVERITIES: readonly L7ContradictionSeverity[] =
  Object.values(L7ContradictionSeverity);

/**
 * §7.2.7.4 — ContradictionFamilyRegistry reference. These families are
 * the object-model placeholders for the full L7.x contradiction ontology.
 */
export enum L7ContradictionFamily {
  SUPPORT_CHALLENGE_DISAGREEMENT = 'SUPPORT_CHALLENGE_DISAGREEMENT',
  PRIMITIVE_INCONSISTENCY = 'PRIMITIVE_INCONSISTENCY',
  SENTIMENT_FUNDAMENTAL_DIVERGENCE = 'SENTIMENT_FUNDAMENTAL_DIVERGENCE',
  PRICE_FLOW_DIVERGENCE = 'PRICE_FLOW_DIVERGENCE',
  SIGNAL_STALENESS = 'SIGNAL_STALENESS',
  REGIME_MISMATCH = 'REGIME_MISMATCH',
  MATERIAL_RISK_OVERHANG = 'MATERIAL_RISK_OVERHANG',
  STRUCTURAL_WEAKNESS = 'STRUCTURAL_WEAKNESS',
  REVENUE_ACTIVITY_DIVERGENCE = 'REVENUE_ACTIVITY_DIVERGENCE',
  CROSS_SOURCE_DISAGREEMENT = 'CROSS_SOURCE_DISAGREEMENT',
}

export const ALL_CONTRADICTION_FAMILIES: readonly L7ContradictionFamily[] =
  Object.values(L7ContradictionFamily);

export interface L7ContradictionRecord {
  readonly contradiction_record_id: string;
  readonly family: L7ContradictionFamily;
  readonly severity: L7ContradictionSeverity;
  readonly support_ref: string;
  readonly challenge_ref: string;
  readonly detected_at: string;
  readonly stale_support: boolean;
  readonly missing_support: boolean;
  readonly evidence_ref: string | null;
  readonly rationale: string;
}

/**
 * §7.2.6.2 — Complete contradiction bundle.
 */
export interface L7ContradictionBundle {
  readonly contradiction_bundle_id: string;
  readonly validation_subject_id: string;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly as_of: string;
  readonly contradiction_records: readonly L7ContradictionRecord[];
  readonly contradiction_cluster_count: number;
  readonly highest_severity: L7ContradictionSeverity;
  readonly dominant_contradiction_family: L7ContradictionFamily;
  readonly blocked_confirmation_surfaces: readonly string[];
  readonly stale_support_refs: readonly string[];
  readonly missing_support_refs: readonly string[];
  readonly lineage_refs: {
    readonly trace_id: string;
    readonly manifest_id: string;
  };
  readonly compute_run_id: string;
  readonly replay_hash: string;
}

const SEVERITY_ORDER: Record<L7ContradictionSeverity, number> = {
  [L7ContradictionSeverity.INFO]: 0,
  [L7ContradictionSeverity.MINOR]: 1,
  [L7ContradictionSeverity.MATERIAL]: 2,
  [L7ContradictionSeverity.SEVERE]: 3,
  [L7ContradictionSeverity.BLOCKING]: 4,
};

export function compareSeverity(
  a: L7ContradictionSeverity,
  b: L7ContradictionSeverity,
): number {
  return SEVERITY_ORDER[a] - SEVERITY_ORDER[b];
}

export function computeHighestSeverity(
  records: readonly L7ContradictionRecord[],
): L7ContradictionSeverity {
  if (records.length === 0) return L7ContradictionSeverity.INFO;
  let max = records[0].severity;
  for (const r of records) if (compareSeverity(r.severity, max) > 0) max = r.severity;
  return max;
}

export function computeDominantFamily(
  records: readonly L7ContradictionRecord[],
): L7ContradictionFamily {
  if (records.length === 0) return L7ContradictionFamily.PRIMITIVE_INCONSISTENCY;
  const counts = new Map<L7ContradictionFamily, number>();
  for (const r of records) counts.set(r.family, (counts.get(r.family) ?? 0) + 1);
  let best: L7ContradictionFamily = records[0].family;
  let bestCount = -1;
  for (const [fam, c] of counts) {
    if (c > bestCount) {
      best = fam;
      bestCount = c;
    }
  }
  return best;
}

function fnv1aHex(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function buildContradictionBundleId(
  validation_subject_id: string,
  as_of: string,
  compute_run_id: string,
): string {
  return `cb_${fnv1aHex(`${validation_subject_id}|${as_of}|${compute_run_id}`)}`;
}
