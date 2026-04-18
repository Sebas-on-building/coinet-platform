/**
 * L7.3 — Contradiction Bundle Contract
 *
 * §7.3.4 — Adds versioning, materiality class, cluster summary, hard/soft
 * record distinction, and aggregate-penalty law on top of the L7.2 object.
 */

import type { L7MaterialityClass } from './validation-materiality';
import {
  L7ContradictionFamily,
  L7ContradictionSeverity,
} from './contradiction-bundle';

// L7ContradictionFamily and L7ContradictionSeverity are not re-exported
// here; consumers import directly from `./contradiction-bundle` (L7.2).

/**
 * §7.3.4.4 — Each contradiction record. Adds explicit `hard_contradiction`,
 * `blocked_confirmation`, `capped_confidence_only` semantics so a bundle
 * carries enough data to reproduce the verdict without re-running engines.
 */
export interface L7ContradictionRecordContract {
  readonly contradiction_record_id: string;
  readonly family: L7ContradictionFamily;
  readonly severity: L7ContradictionSeverity;
  readonly support_ref: string;
  readonly challenge_ref: string;
  readonly temporal_status: 'CURRENT' | 'STALE' | 'MISSING';
  readonly hard_contradiction: boolean;
  readonly blocked_confirmation: boolean;
  readonly capped_confidence_only: boolean;
  readonly evidence_refs: readonly string[];
  readonly lineage_refs: { readonly trace_id: string; readonly upstream_refs: readonly string[] };
  readonly rationale: string;
  readonly detected_at: string;
}

export interface L7ContradictionClusterSummary {
  readonly cluster_id: string;
  readonly family: L7ContradictionFamily;
  readonly record_count: number;
  readonly highest_severity: L7ContradictionSeverity;
  readonly aggregate_penalty: number;
}

export interface L7ContradictionBundleContract {
  // Identity
  readonly contradiction_bundle_id: string;
  readonly validation_subject_id: string;

  // Versioning (§7.3.4.3)
  readonly contradiction_contract_version: string;
  readonly schema_version: string;

  // Scope/time
  readonly scope_type: string;
  readonly scope_id: string;
  readonly as_of: string;

  // Records and aggregation (§7.3.4.2 + §7.3.4.3)
  readonly contradiction_records: readonly L7ContradictionRecordContract[];
  readonly contradiction_cluster_count: number;
  readonly cluster_summary: readonly L7ContradictionClusterSummary[];
  readonly highest_severity: L7ContradictionSeverity;
  readonly dominant_contradiction_family: L7ContradictionFamily;

  // Surface refs (§7.3.4.2 + §7.3.4.3)
  readonly blocked_confirmation_surfaces: readonly string[];
  readonly stale_support_refs: readonly string[];
  readonly missing_support_refs: readonly string[];
  readonly challenge_surface_refs: readonly string[];

  // Aggregate posture (§7.3.4.3)
  readonly bundle_materiality_class: L7MaterialityClass;
  readonly aggregate_penalty_score: number;
  readonly critical_contradiction_flag: boolean;
  readonly degraded_evidence_flag: boolean;

  // Materialization + lineage
  readonly materialization_mode: 'EAGER' | 'ON_DEMAND' | 'REPLAY_ONLY';
  readonly lineage_refs: { readonly trace_id: string; readonly manifest_id: string };
  readonly compute_run_id: string;
  readonly replay_hash: string;
}

export const L7_CONTRADICTION_BUNDLE_CONTRACT_REQUIRED_FIELDS: readonly string[] = [
  'contradiction_bundle_id', 'validation_subject_id',
  'contradiction_contract_version', 'schema_version',
  'scope_type', 'scope_id', 'as_of',
  'contradiction_records', 'contradiction_cluster_count',
  'highest_severity', 'dominant_contradiction_family',
  'bundle_materiality_class',
  'lineage_refs', 'compute_run_id', 'replay_hash',
];

const SEVERITY_ORDER_FULL: Record<L7ContradictionSeverity, number> = {
  [L7ContradictionSeverity.INFO]: 0,
  [L7ContradictionSeverity.MINOR]: 1,
  [L7ContradictionSeverity.MATERIAL]: 2,
  [L7ContradictionSeverity.SEVERE]: 3,
  [L7ContradictionSeverity.BLOCKING]: 4,
};

export function compareSeverityFull(a: L7ContradictionSeverity, b: L7ContradictionSeverity): number {
  return SEVERITY_ORDER_FULL[a] - SEVERITY_ORDER_FULL[b];
}

export function computeRecordHighestSeverity(
  records: readonly L7ContradictionRecordContract[],
): L7ContradictionSeverity {
  if (records.length === 0) return L7ContradictionSeverity.INFO;
  let max = records[0].severity;
  for (const r of records) if (compareSeverityFull(r.severity, max) > 0) max = r.severity;
  return max;
}

export function computeRecordDominantFamily(
  records: readonly L7ContradictionRecordContract[],
): L7ContradictionFamily {
  if (records.length === 0) return L7ContradictionFamily.PRIMITIVE_INCONSISTENCY;
  const counts = new Map<L7ContradictionFamily, number>();
  for (const r of records) counts.set(r.family, (counts.get(r.family) ?? 0) + 1);
  let best = records[0].family;
  let bestCount = -1;
  for (const [fam, c] of counts) if (c > bestCount) { best = fam; bestCount = c; }
  return best;
}
