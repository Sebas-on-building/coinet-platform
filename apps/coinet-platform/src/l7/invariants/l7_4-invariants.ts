/**
 * L7.4 — Constitutional Invariants
 *
 * §7.4.10 — INV-7.4-A through INV-7.4-H as executable functions.
 * Each returns a typed `L7_4InvariantResult` carrying the runtime
 * artifacts inspected and evidence strings.
 */

import type { L7ValidationOutputContract } from '../contracts/validation-output.contract';
import type { L7ContradictionBundleContract } from '../contracts/contradiction-bundle.contract';
import type { L7ConfidenceAssessmentContract } from '../contracts/confidence-assessment.contract';
import type { L7ClaimRestrictionProfileContract } from '../contracts/restriction-profile.contract';
import type { L7EvidencePack } from '../runtime/l7-execution-context';
import type { DagBuildResult } from '../runtime/l7-dag-builder';
import type { L7ValidationRun } from '../runtime/l7-validation-run';
import { validateValidationRun } from '../runtime/l7-validation-run';
import { L7ContradictionSeverity, compareSeverity } from '../contracts/contradiction-bundle';
import { outputRequiresContradictionBundle, outputViolatesCleanliness } from '../contracts/validation-output.contract';

export interface L7_4InvariantResult {
  readonly invariant: string;
  readonly satisfied: boolean;
  readonly evidence: readonly string[];
}

/**
 * INV-7.4-A — Every run's DAG is legal, acyclic, and deterministically
 * ordered. DAG violations surface here as invariant failures.
 */
export function checkInvariantA_dagLegality(
  builds: readonly DagBuildResult[],
): L7_4InvariantResult {
  const evidence: string[] = [];
  for (const b of builds) {
    if (b.dag === null || b.violations.length > 0) {
      for (const v of b.violations) evidence.push(`dag ${v.code}: ${v.detail}`);
    }
  }
  return {
    invariant: 'INV-7.4-A',
    satisfied: evidence.length === 0,
    evidence,
  };
}

/**
 * INV-7.4-B — Every validation run carries a complete lineage header
 * (run id, DAG version, engine/contract version sets, mode, trace id).
 */
export function checkInvariantB_runLineageComplete(
  runs: readonly L7ValidationRun[],
): L7_4InvariantResult {
  const evidence: string[] = [];
  for (const r of runs) {
    const res = validateValidationRun(r);
    if (!res.valid) {
      evidence.push(`run ${r.validation_run_id ?? '<unknown>'}: ${res.issues.map(i => i.code).join(', ')}`);
    }
  }
  return {
    invariant: 'INV-7.4-B',
    satisfied: evidence.length === 0,
    evidence,
  };
}

/**
 * INV-7.4-C — No output declares CONFIRMED / WEAKLY_CONFIRMED while a
 * SEVERE or BLOCKING contradiction remains in the bundle (§7.4.7.3).
 */
export function checkInvariantC_classificationRespectsContradiction(
  outputs: readonly L7ValidationOutputContract[],
  bundlesById: ReadonlyMap<string, L7ContradictionBundleContract>,
): L7_4InvariantResult {
  const evidence: string[] = [];
  for (const o of outputs) {
    if (o.validation_class !== 'CONFIRMED' && o.validation_class !== 'WEAKLY_CONFIRMED') continue;
    if (!o.contradiction_bundle_ref) continue;
    const bundle = bundlesById.get(o.contradiction_bundle_ref);
    if (!bundle) continue;
    if (compareSeverity(bundle.highest_severity, L7ContradictionSeverity.SEVERE) >= 0) {
      evidence.push(`output ${o.validation_result_id}: class ${o.validation_class} with ${bundle.highest_severity} contradiction`);
    }
  }
  return {
    invariant: 'INV-7.4-C',
    satisfied: evidence.length === 0,
    evidence,
  };
}

/**
 * INV-7.4-D — Cleanliness law enforced at runtime: output cannot declare
 * CLEAN while any cleanliness dimension is materially active.
 */
export function checkInvariantD_cleanlinessRuntime(
  outputs: readonly L7ValidationOutputContract[],
): L7_4InvariantResult {
  const evidence: string[] = [];
  for (const o of outputs) {
    if (outputViolatesCleanliness(o)) {
      evidence.push(`output ${o.validation_result_id}: cleanliness violated under status ${o.validation_status}`);
    }
  }
  return {
    invariant: 'INV-7.4-D',
    satisfied: evidence.length === 0,
    evidence,
  };
}

/**
 * INV-7.4-E — Confidence scores must reflect a contradiction penalty when
 * contradictions exist, and must never exceed the declared cap chain.
 */
export function checkInvariantE_confidenceRespectsContradiction(
  confidences: readonly L7ConfidenceAssessmentContract[],
  bundlesByValidationSubjectId: ReadonlyMap<string, L7ContradictionBundleContract>,
): L7_4InvariantResult {
  const evidence: string[] = [];
  for (const c of confidences) {
    const bundle = bundlesByValidationSubjectId.get(c.validation_subject_id);
    if (bundle && bundle.contradiction_records.length > 0) {
      if (c.components.contradiction_penalty_component <= 0) {
        evidence.push(`confidence ${c.confidence_assessment_id}: no contradiction penalty despite ${bundle.contradiction_records.length} record(s)`);
      }
    }
    if (c.capped_score > c.raw_score + 1e-9) {
      evidence.push(`confidence ${c.confidence_assessment_id}: capped_score > raw_score`);
    }
    if (Math.abs(c.capped_score - c.confidence_score) > 1e-9) {
      evidence.push(`confidence ${c.confidence_assessment_id}: confidence_score diverges from capped_score`);
    }
  }
  return {
    invariant: 'INV-7.4-E',
    satisfied: evidence.length === 0,
    evidence,
  };
}

/**
 * INV-7.4-F — Restriction profiles must match validation state: cannot
 * grant broader downstream rights than the verdict posture allows.
 */
export function checkInvariantF_restrictionsMatchState(
  outputs: readonly L7ValidationOutputContract[],
  restrictionsById: ReadonlyMap<string, L7ClaimRestrictionProfileContract>,
): L7_4InvariantResult {
  const evidence: string[] = [];
  for (const o of outputs) {
    const rp = o.restriction_profile ?? (o.restriction_profile_ref ? restrictionsById.get(o.restriction_profile_ref) ?? null : null);
    if (!rp) {
      evidence.push(`output ${o.validation_result_id}: no restriction profile resolvable`);
      continue;
    }
    const finalOk = rp.downstream_use_rights.includes('USABLE_FOR_FINAL_JUDGMENT' as never);
    if (finalOk && (o.validation_class === 'INSUFFICIENT' || o.validation_class === 'STALE' || o.validation_class === 'AMBIGUOUS' || o.validation_class === 'DEGRADED' || o.validation_class === 'CONFLICTING' || o.validation_class === 'WEAKLY_CONFIRMED')) {
      if (!rp.requires_additional_confirmation && !rp.requires_contradiction_disclosure) {
        evidence.push(`output ${o.validation_result_id}: final-judgment right granted under class ${o.validation_class} without guardrails`);
      }
    }
    if (rp.evidence_only_mode && (rp.allowed_for_final_judgment || rp.allowed_for_deterministic_scoring)) {
      evidence.push(`restriction ${rp.restriction_profile_id}: evidence-only mode but grants high downstream rights`);
    }
  }
  return {
    invariant: 'INV-7.4-F',
    satisfied: evidence.length === 0,
    evidence,
  };
}

/**
 * INV-7.4-G — Evidence packs are complete: every material artifact is
 * lineage-linked and the pack carries a replay hash.
 */
export function checkInvariantG_evidencePackIntegrity(
  packs: readonly L7EvidencePack[],
): L7_4InvariantResult {
  const evidence: string[] = [];
  for (const p of packs) {
    if (!p.evidence_pack_id) evidence.push('pack missing evidence_pack_id');
    if (!p.validation_subject_id) evidence.push(`pack ${p.evidence_pack_id}: missing validation_subject_id`);
    if (!p.replay_hash) evidence.push(`pack ${p.evidence_pack_id}: missing replay_hash`);
    if (p.compute_run_lineage.length === 0) {
      evidence.push(`pack ${p.evidence_pack_id}: empty compute_run_lineage`);
    }
    if (!p.classification_ref || !p.confidence_ref || !p.restriction_ref) {
      evidence.push(`pack ${p.evidence_pack_id}: verdict refs incomplete`);
    }
  }
  return {
    invariant: 'INV-7.4-G',
    satisfied: evidence.length === 0,
    evidence,
  };
}

/**
 * INV-7.4-H — Outputs requiring a contradiction bundle must actually
 * link one; every linked bundle must be resolvable.
 */
export function checkInvariantH_contradictionLinkage(
  outputs: readonly L7ValidationOutputContract[],
  bundlesById: ReadonlyMap<string, L7ContradictionBundleContract>,
): L7_4InvariantResult {
  const evidence: string[] = [];
  for (const o of outputs) {
    if (outputRequiresContradictionBundle(o)) {
      if (!o.contradiction_bundle_ref) {
        evidence.push(`output ${o.validation_result_id}: requires contradiction bundle but ref missing`);
      } else if (!bundlesById.has(o.contradiction_bundle_ref)) {
        evidence.push(`output ${o.validation_result_id}: bundle_ref ${o.contradiction_bundle_ref} unresolvable`);
      }
    }
  }
  return {
    invariant: 'INV-7.4-H',
    satisfied: evidence.length === 0,
    evidence,
  };
}

export function runAllL7_4Invariants(args: {
  runs: readonly L7ValidationRun[];
  dagBuilds: readonly DagBuildResult[];
  outputs: readonly L7ValidationOutputContract[];
  bundles: readonly L7ContradictionBundleContract[];
  confidences: readonly L7ConfidenceAssessmentContract[];
  restrictions: readonly L7ClaimRestrictionProfileContract[];
  evidencePacks: readonly L7EvidencePack[];
}): readonly L7_4InvariantResult[] {
  const bundlesById = new Map(args.bundles.map(b => [b.contradiction_bundle_id, b]));
  const bundlesBySubject = new Map(args.bundles.map(b => [b.validation_subject_id, b]));
  const restrictionsById = new Map(args.restrictions.map(r => [r.restriction_profile_id, r]));

  return [
    checkInvariantA_dagLegality(args.dagBuilds),
    checkInvariantB_runLineageComplete(args.runs),
    checkInvariantC_classificationRespectsContradiction(args.outputs, bundlesById),
    checkInvariantD_cleanlinessRuntime(args.outputs),
    checkInvariantE_confidenceRespectsContradiction(args.confidences, bundlesBySubject),
    checkInvariantF_restrictionsMatchState(args.outputs, restrictionsById),
    checkInvariantG_evidencePackIntegrity(args.evidencePacks),
    checkInvariantH_contradictionLinkage(args.outputs, bundlesById),
  ];
}
