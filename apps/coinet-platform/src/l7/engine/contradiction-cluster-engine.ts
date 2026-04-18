/**
 * L7.4 — ContradictionClusterEngine
 *
 * §7.4.5.4–§7.4.5.9 — Groups typed `L7ContradictionCandidate`s into a
 * contract-valid `L7ContradictionBundleContract`. Clustering is
 * deterministic: candidates cluster by
 *   (subject_id, contradiction_family, temporal overlap, blocking-role).
 *
 * Critical contradictions must remain explicitly visible (§7.4.5.7) and
 * cannot be folded into soft-tension clusters.
 */

import type { L7ValidationSubjectContract } from '../contracts/validation-subject.contract';
import type { L7ContradictionCandidate } from '../runtime/l7-execution-context';
import type {
  L7ContradictionBundleContract,
  L7ContradictionRecordContract,
  L7ContradictionClusterSummary,
} from '../contracts/contradiction-bundle.contract';
import { L7ContradictionFamily, L7ContradictionSeverity, compareSeverity } from '../contracts/contradiction-bundle';
import { canonicalValidationReplayHash } from '../validation/validation-replay-hash';
import { L7ReplayIdentityMode } from '../contracts/validation-runtime-status';
import { RUN_MODE_TO_REPLAY_IDENTITY, L7ValidationRunMode } from '../runtime/l7-validation-run';
import { L7RuntimeViolation, L7RuntimeViolationCode } from '../validation/l7-runtime-violation-codes';
import { L7EngineResult, fail, ok } from './engine-types';

export interface ClusterInput {
  readonly subject: L7ValidationSubjectContract;
  readonly candidates: readonly L7ContradictionCandidate[];
  readonly stale_support_refs: readonly string[];
  readonly missing_support_refs: readonly string[];
  readonly run_id: string;
  readonly run_mode: L7ValidationRunMode;
  readonly trace_id: string;
  readonly manifest_id: string;
  readonly input_snapshot_ref: string;
  readonly contradiction_contract_version: string;
  readonly schema_version: string;
  readonly materialization_mode: 'EAGER' | 'ON_DEMAND' | 'REPLAY_ONLY';
}

export function clusterContradictions(input: ClusterInput): L7EngineResult<L7ContradictionBundleContract> {
  const violations: L7RuntimeViolation[] = [];
  const s = input.subject;
  const records: L7ContradictionRecordContract[] = [];

  // Sort deterministically before clustering.
  const sorted = [...input.candidates].sort((a, b) =>
    a.candidate_id < b.candidate_id ? -1 : a.candidate_id > b.candidate_id ? 1 : 0,
  );

  for (const c of sorted) {
    const severity = c.severity_candidate as L7ContradictionSeverity;
    const record: L7ContradictionRecordContract = {
      contradiction_record_id: `cr:${s.validation_subject_id}:${c.candidate_id}`,
      family: c.contradiction_family as L7ContradictionFamily,
      severity,
      support_ref: c.support_ref,
      challenge_ref: c.challenge_ref,
      temporal_status: c.temporal_posture,
      hard_contradiction: c.contradiction_class === 'HARD_CONTRADICTION',
      blocked_confirmation: c.blocks_confirmation,
      capped_confidence_only: c.caps_confidence_only,
      evidence_refs: [c.challenge_ref],
      lineage_refs: { trace_id: input.trace_id, upstream_refs: [...c.lineage_refs].sort() },
      rationale: c.rationale,
      detected_at: s.as_of,
    };
    records.push(record);
  }

  // §7.4.5.7 — any BLOCKING/SEVERE record keeps its standalone cluster.
  const clusterMap = new Map<string, L7ContradictionRecordContract[]>();
  for (const r of records) {
    const isCritical = compareSeverity(r.severity, L7ContradictionSeverity.SEVERE) >= 0;
    const key = isCritical
      ? `${r.family}:CRITICAL:${r.contradiction_record_id}`
      : `${r.family}:${r.temporal_status}:${r.blocked_confirmation ? 'BLOCK' : 'CAP'}`;
    const list = clusterMap.get(key) ?? [];
    list.push(r);
    clusterMap.set(key, list);
  }

  const clusterSummaries: L7ContradictionClusterSummary[] = [];
  for (const [key, list] of [...clusterMap.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    let highest = list[0].severity;
    let aggregate = 0;
    for (const r of list) {
      if (compareSeverity(r.severity, highest) > 0) highest = r.severity;
      aggregate += severityScore(r.severity);
    }
    clusterSummaries.push({
      cluster_id: `cl:${s.validation_subject_id}:${key}`,
      family: list[0].family,
      record_count: list.length,
      highest_severity: highest,
      aggregate_penalty: Math.min(1, aggregate / 4),
    });
  }

  // §7.4.5.8 — aggregate penalty posture.
  let aggregateScore = 0;
  let highestSeverity: L7ContradictionSeverity = L7ContradictionSeverity.INFO;
  let dominantFamily: L7ContradictionFamily = L7ContradictionFamily.PRIMITIVE_INCONSISTENCY;
  let dominantCount = -1;
  const familyCounts = new Map<L7ContradictionFamily, number>();
  for (const r of records) {
    aggregateScore += severityScore(r.severity);
    if (compareSeverity(r.severity, highestSeverity) > 0) highestSeverity = r.severity;
    const c = (familyCounts.get(r.family) ?? 0) + 1;
    familyCounts.set(r.family, c);
    if (c > dominantCount) {
      dominantCount = c;
      dominantFamily = r.family;
    }
  }
  const aggregatePenalty = Math.min(1, aggregateScore / Math.max(4, records.length * 2));

  const critical = records.some(r => compareSeverity(r.severity, L7ContradictionSeverity.SEVERE) >= 0);

  // §7.4.5.9 — check that clustering was deterministic: re-running must
  // produce the same sort order. We enforce this by always sorting by id.
  const uniqueIds = new Set(records.map(r => r.contradiction_record_id));
  if (uniqueIds.size !== records.length) {
    violations.push(v(L7RuntimeViolationCode.CONTRADICTION_CLUSTERING_NON_DETERMINISTIC, s, 'duplicate record ids produced'));
  }

  if (violations.length > 0) return fail(violations);

  const bundleId = `cb:${s.validation_subject_id}:${input.run_id}`;
  const replayHash = canonicalValidationReplayHash({
    subject_contract_ref: s.validation_subject_id,
    scope_type: s.scope_type,
    scope_id: s.scope_id,
    as_of: s.as_of,
    contract_versions: {
      subject: s.subject_contract_version,
      contradiction: input.contradiction_contract_version,
    },
    material_inputs_canonical: records.map(r => ({
      id: r.contradiction_record_id,
      family: r.family,
      severity: r.severity,
      support: r.support_ref,
      challenge: r.challenge_ref,
      temporal: r.temporal_status,
    })),
    contradiction_bundle_id: bundleId,
    confidence_factor_signature: null,
    restriction_profile_id: null,
    mode: RUN_MODE_TO_REPLAY_IDENTITY[input.run_mode] as L7ReplayIdentityMode,
    compute_run_id: input.run_id,
  });

  const bundle: L7ContradictionBundleContract = {
    contradiction_bundle_id: bundleId,
    validation_subject_id: s.validation_subject_id,
    contradiction_contract_version: input.contradiction_contract_version,
    schema_version: input.schema_version,
    scope_type: s.scope_type,
    scope_id: s.scope_id,
    as_of: s.as_of,
    contradiction_records: records,
    contradiction_cluster_count: clusterSummaries.length,
    cluster_summary: clusterSummaries,
    highest_severity: highestSeverity,
    dominant_contradiction_family: dominantFamily,
    blocked_confirmation_surfaces: [
      ...new Set(records.filter(r => r.blocked_confirmation).map(r => r.challenge_ref)),
    ].sort(),
    stale_support_refs: [...input.stale_support_refs].sort(),
    missing_support_refs: [...input.missing_support_refs].sort(),
    challenge_surface_refs: [...new Set(records.map(r => r.challenge_ref))].sort(),
    bundle_materiality_class: s.materiality_class,
    aggregate_penalty_score: aggregatePenalty,
    critical_contradiction_flag: critical,
    degraded_evidence_flag: records.some(r => r.temporal_status === 'MISSING'),
    materialization_mode: input.materialization_mode,
    lineage_refs: { trace_id: input.trace_id, manifest_id: input.manifest_id },
    compute_run_id: input.run_id,
    replay_hash: replayHash,
  };

  return ok(bundle);
}

function severityScore(s: L7ContradictionSeverity): number {
  switch (s) {
    case L7ContradictionSeverity.INFO: return 0;
    case L7ContradictionSeverity.MINOR: return 0.25;
    case L7ContradictionSeverity.MATERIAL: return 0.5;
    case L7ContradictionSeverity.SEVERE: return 0.85;
    case L7ContradictionSeverity.BLOCKING: return 1.0;
  }
}

function v(code: L7RuntimeViolationCode, s: L7ValidationSubjectContract, detail: string): L7RuntimeViolation {
  return {
    code,
    source: 'contradiction-cluster-engine',
    nodeId: null,
    validation_run_id: null,
    validation_subject_id: s.validation_subject_id,
    detail,
    context: {},
  };
}
