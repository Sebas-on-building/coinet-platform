/**
 * L7.3 — Constitutional Invariants
 *
 * §7.3.9.1 — INV-7.3-A through INV-7.3-G as executable functions.
 * Each returns a typed `L7_3InvariantResult` carrying the bound contracts
 * inspected and a list of evidence strings.
 */

import { validateValidationSubjectContractV3 } from '../validation/validation-subject.contract.validator';
import { validateValidationOutputContract } from '../validation/validation-output.contract.validator';
import { validateContradictionBundleContract } from '../validation/contradiction-bundle.contract.validator';
import { validateConfidenceAssessmentContract } from '../validation/confidence-assessment.contract.validator';
import { validateRestrictionProfileContract } from '../validation/restriction-profile.contract.validator';
import { validateValidationContractCompatibility } from '../validation/validation-contract-compatibility';
import { isValidationMaterializationReady } from '../validation/validation-replay-hash';
import { isReadyState } from '../contracts/validation-runtime-status';
import {
  outputViolatesCleanliness,
  outputRequiresContradictionBundle,
} from '../contracts/validation-output.contract';
import type { L7ValidationSubjectContract } from '../contracts/validation-subject.contract';
import type { L7ValidationOutputContract } from '../contracts/validation-output.contract';
import type { L7ContradictionBundleContract } from '../contracts/contradiction-bundle.contract';
import type { L7ConfidenceAssessmentContract } from '../contracts/confidence-assessment.contract';
import type { L7ClaimRestrictionProfileContract } from '../contracts/restriction-profile.contract';
import type { L7ContractDelta } from '../contracts/validation-contract-versioning';

export interface L7_3InvariantResult {
  readonly invariant: string;
  readonly satisfied: boolean;
  readonly evidence: readonly string[];
}

/**
 * INV-7.3-A — Every validation subject is contract-complete, versioned,
 * scope-bound, time-bound, and lineage-bearing.
 */
export function checkInvariantA_subjectContractComplete(
  subjects: readonly L7ValidationSubjectContract[],
): L7_3InvariantResult {
  const evidence: string[] = [];
  for (const s of subjects) {
    const r = validateValidationSubjectContractV3(s);
    if (!r.valid) {
      evidence.push(
        `subject ${s.validation_subject_id ?? '<unknown>'}: ${r.violations.map(v => v.code).join(', ')}`,
      );
    }
  }
  return {
    invariant: 'INV-7.3-A',
    satisfied: evidence.length === 0,
    evidence,
  };
}

/**
 * INV-7.3-B — Every validation output carries explicit contradiction,
 * confidence, and restriction linkage where required.
 */
export function checkInvariantB_outputLinkage(
  outputs: readonly L7ValidationOutputContract[],
): L7_3InvariantResult {
  const evidence: string[] = [];
  for (const o of outputs) {
    if (outputRequiresContradictionBundle(o) && !o.contradiction_bundle_ref) {
      evidence.push(`output ${o.validation_result_id}: contradiction implied but bundle missing`);
    }
    if (!o.confidence_assessment_ref) {
      evidence.push(`output ${o.validation_result_id}: confidence_assessment_ref missing`);
    }
    if (!o.restriction_profile && !o.restriction_profile_ref) {
      evidence.push(`output ${o.validation_result_id}: restriction profile missing`);
    }
  }
  return {
    invariant: 'INV-7.3-B',
    satisfied: evidence.length === 0,
    evidence,
  };
}

/**
 * INV-7.3-C — Contradiction bundles are typed, severity-consistent,
 * lineage-linked, and replay-safe.
 */
export function checkInvariantC_contradictionBundlesTyped(
  bundles: readonly L7ContradictionBundleContract[],
): L7_3InvariantResult {
  const evidence: string[] = [];
  for (const b of bundles) {
    const r = validateContradictionBundleContract(b);
    if (!r.valid) {
      evidence.push(
        `bundle ${b.contradiction_bundle_id ?? '<unknown>'}: ${r.violations.map(v => v.code).join(', ')}`,
      );
    }
  }
  return {
    invariant: 'INV-7.3-C',
    satisfied: evidence.length === 0,
    evidence,
  };
}

/**
 * INV-7.3-D — Confidence assessments may not exist without explicit factor
 * derivation and cap-chain legality.
 */
export function checkInvariantD_confidenceFactors(
  confidences: readonly L7ConfidenceAssessmentContract[],
): L7_3InvariantResult {
  const evidence: string[] = [];
  for (const c of confidences) {
    const r = validateConfidenceAssessmentContract(c);
    if (!r.valid) {
      evidence.push(
        `confidence ${c.confidence_assessment_id ?? '<unknown>'}: ${r.violations.map(v => v.code).join(', ')}`,
      );
    }
  }
  return {
    invariant: 'INV-7.3-D',
    satisfied: evidence.length === 0,
    evidence,
  };
}

/**
 * INV-7.3-E — Restriction profiles may not leave downstream use ambiguous.
 */
export function checkInvariantE_restrictionProfilesUnambiguous(
  profiles: readonly L7ClaimRestrictionProfileContract[],
): L7_3InvariantResult {
  const evidence: string[] = [];
  for (const p of profiles) {
    const r = validateRestrictionProfileContract(p);
    if (!r.valid) {
      evidence.push(
        `restriction ${p.restriction_profile_id ?? '<unknown>'}: ${r.violations.map(v => v.code).join(', ')}`,
      );
    }
    if (Array.isArray(p.downstream_use_rights) && p.downstream_use_rights.length === 0) {
      evidence.push(
        `restriction ${p.restriction_profile_id}: downstream_use_rights empty (downstream use ambiguous)`,
      );
    }
  }
  return {
    invariant: 'INV-7.3-E',
    satisfied: evidence.length === 0,
    evidence,
  };
}

/**
 * INV-7.3-F — Validation outputs may not appear clean when staleness,
 * contradiction, incompleteness, ambiguity, or degradation is material.
 */
export function checkInvariantF_noHiddenCleanliness(
  outputs: readonly L7ValidationOutputContract[],
): L7_3InvariantResult {
  const evidence: string[] = [];
  for (const o of outputs) {
    if (outputViolatesCleanliness(o)) {
      evidence.push(
        `output ${o.validation_result_id}: declared CLEAN but cleanliness violated`,
      );
    }
  }
  return {
    invariant: 'INV-7.3-F',
    satisfied: evidence.length === 0,
    evidence,
  };
}

/**
 * INV-7.3-G — All material L7 objects are compatibility-checkable,
 * replay-safe, and materialization-ready.
 */
export function checkInvariantG_compatibilityAndMaterialization(args: {
  outputs: readonly L7ValidationOutputContract[];
  subjectsById: Map<string, L7ValidationSubjectContract>;
  confidencesById: Map<string, L7ConfidenceAssessmentContract>;
  bundlesById: Map<string, L7ContradictionBundleContract>;
  restrictionsById: Map<string, L7ClaimRestrictionProfileContract>;
  deltas: readonly L7ContractDelta[];
}): L7_3InvariantResult {
  const evidence: string[] = [];

  for (const d of args.deltas) {
    const r = validateValidationContractCompatibility(d);
    if (!r.valid) {
      evidence.push(`compatibility ${d.surface} ${d.from}->${d.to}: ${r.violations.map(v => v.code).join(', ')}`);
    }
  }

  for (const o of args.outputs) {
    if (!o.replay_hash) evidence.push(`output ${o.validation_result_id}: missing replay_hash`);
    const subject = args.subjectsById.get(o.validation_subject_id) ?? null;
    const confidence = o.confidence_assessment_ref ? args.confidencesById.get(o.confidence_assessment_ref) ?? null : null;
    const bundle = o.contradiction_bundle_ref ? args.bundlesById.get(o.contradiction_bundle_ref) ?? null : null;
    const restriction = o.restriction_profile
      ? o.restriction_profile
      : (o.restriction_profile_ref ? args.restrictionsById.get(o.restriction_profile_ref) ?? null : null);

    const state = isValidationMaterializationReady({
      output: o,
      subjectContract: subject,
      confidence,
      contradiction: bundle,
      restriction,
      evidenceRequired: false,
      cleanlinessViolation: outputViolatesCleanliness(o),
    });
    if (!isReadyState(state)) {
      evidence.push(`output ${o.validation_result_id}: not materialization-ready (${state})`);
    }
  }

  return {
    invariant: 'INV-7.3-G',
    satisfied: evidence.length === 0,
    evidence,
  };
}

export function runAllL7_3Invariants(args: {
  subjects: readonly L7ValidationSubjectContract[];
  outputs: readonly L7ValidationOutputContract[];
  bundles: readonly L7ContradictionBundleContract[];
  confidences: readonly L7ConfidenceAssessmentContract[];
  restrictions: readonly L7ClaimRestrictionProfileContract[];
  deltas: readonly L7ContractDelta[];
}): readonly L7_3InvariantResult[] {
  const subjectsById = new Map(args.subjects.map(s => [s.validation_subject_id, s]));
  const confidencesById = new Map(args.confidences.map(c => [c.confidence_assessment_id, c]));
  const bundlesById = new Map(args.bundles.map(b => [b.contradiction_bundle_id, b]));
  const restrictionsById = new Map(args.restrictions.map(r => [r.restriction_profile_id, r]));

  return [
    checkInvariantA_subjectContractComplete(args.subjects),
    checkInvariantB_outputLinkage(args.outputs),
    checkInvariantC_contradictionBundlesTyped(args.bundles),
    checkInvariantD_confidenceFactors(args.confidences),
    checkInvariantE_restrictionProfilesUnambiguous(args.restrictions),
    checkInvariantF_noHiddenCleanliness(args.outputs),
    checkInvariantG_compatibilityAndMaterialization({
      outputs: args.outputs,
      subjectsById,
      confidencesById,
      bundlesById,
      restrictionsById,
      deltas: args.deltas,
    }),
  ];
}
