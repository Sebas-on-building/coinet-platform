/**
 * L7.4 — ValidationEvidencePackBuilder
 *
 * §7.4.8.1 — Produces the evidence pack for a single validation run.
 * The pack must point to every input surface, every challenge surface,
 * the contradiction bundle (if any), and the four evaluation domains.
 * It must never invent references and must be fully deterministic given
 * identical upstream state.
 */

import type { L7ValidationSubjectContract } from '../contracts/validation-subject.contract';
import type { L7ContradictionBundleContract } from '../contracts/contradiction-bundle.contract';
import type { L7ConfidenceAssessmentContract } from '../contracts/confidence-assessment.contract';
import type { L7ClaimRestrictionProfileContract } from '../contracts/restriction-profile.contract';
import type {
  L7SupportRecord,
  L7ChallengeRecord,
  L7EvaluationOutput,
  L7EvidencePack,
  L7ClassificationOutput,
} from '../runtime/l7-execution-context';
import {
  canonicalValidationReplayHash,
} from '../validation/validation-replay-hash';
import {
  RUN_MODE_TO_REPLAY_IDENTITY,
  L7ValidationRunMode,
} from '../runtime/l7-validation-run';
import { L7RuntimeViolation, L7RuntimeViolationCode } from '../validation/l7-runtime-violation-codes';
import { L7EngineResult, fail, ok } from './engine-types';

export interface EvidencePackInput {
  readonly subject: L7ValidationSubjectContract;
  readonly support: readonly L7SupportRecord[];
  readonly challenge: readonly L7ChallengeRecord[];
  readonly contradiction_bundle: L7ContradictionBundleContract;
  readonly incompleteness: L7EvaluationOutput;
  readonly staleness: L7EvaluationOutput;
  readonly ambiguity: L7EvaluationOutput;
  readonly degradation: L7EvaluationOutput;
  readonly classification: L7ClassificationOutput;
  readonly confidence: L7ConfidenceAssessmentContract;
  readonly restriction: L7ClaimRestrictionProfileContract;
  readonly input_snapshot_ref: string;
  readonly run_id: string;
  readonly run_mode: L7ValidationRunMode;
  readonly trace_id: string;
  readonly parent_run_ids: readonly string[];
}

export function buildEvidencePack(
  input: EvidencePackInput,
): L7EngineResult<L7EvidencePack> {
  const violations: L7RuntimeViolation[] = [];
  const s = input.subject;
  if (!input.input_snapshot_ref) {
    violations.push(v(L7RuntimeViolationCode.EVIDENCE_PACK_MISSING_LINEAGE, s, 'input_snapshot_ref missing'));
  }
  if (!input.trace_id) {
    violations.push(v(L7RuntimeViolationCode.EVIDENCE_PACK_MISSING_LINEAGE, s, 'trace_id missing'));
  }
  if (!input.classification || !input.confidence || !input.restriction) {
    violations.push(v(L7RuntimeViolationCode.EVIDENCE_PACK_INCOMPLETE, s, 'verdict stage artifact missing'));
  }
  if (violations.length > 0) return fail(violations);

  const support_refs = input.support.map(r => r.support_ref).sort();
  const challenge_refs = input.challenge.map(r => r.challenge_ref).sort();
  const bundleId =
    input.contradiction_bundle.contradiction_records.length > 0
      ? input.contradiction_bundle.contradiction_bundle_id
      : null;

  const replay_hash = canonicalValidationReplayHash({
    subject_contract_ref: s.validation_subject_id,
    scope_type: s.scope_type,
    scope_id: s.scope_id,
    as_of: s.as_of,
    contract_versions: {
      subject: s.subject_contract_version,
      confidence: input.confidence.confidence_contract_version,
      restriction: input.restriction.restriction_contract_version,
      contradiction: input.contradiction_bundle.contradiction_contract_version,
    },
    material_inputs_canonical: {
      support_refs,
      challenge_refs,
      incompleteness: input.incompleteness,
      staleness: input.staleness,
      ambiguity: input.ambiguity,
      degradation: input.degradation,
      classification_class: input.classification.validation_class,
      classification_modifiers: [...input.classification.modifiers].sort(),
      confidence_band: input.confidence.confidence_band,
      restriction_rights: [...input.restriction.downstream_use_rights].sort(),
    },
    contradiction_bundle_id: bundleId,
    confidence_factor_signature: input.confidence.replay_hash,
    restriction_profile_id: input.restriction.restriction_profile_id,
    mode: RUN_MODE_TO_REPLAY_IDENTITY[input.run_mode],
    compute_run_id: input.run_id,
  });

  const pack: L7EvidencePack = {
    evidence_pack_id: `ep:${s.validation_subject_id}:${input.run_id}`,
    validation_subject_id: s.validation_subject_id,
    support_refs,
    challenge_refs,
    contradiction_bundle_id: bundleId,
    incompleteness_refs: [...input.incompleteness.affected_surface_refs].sort(),
    staleness_refs: [...input.staleness.affected_surface_refs].sort(),
    ambiguity_refs: [...input.ambiguity.affected_surface_refs].sort(),
    degradation_refs: [...input.degradation.affected_surface_refs].sort(),
    classification_ref: `${s.validation_subject_id}:${input.classification.validation_class}`,
    confidence_ref: input.confidence.confidence_assessment_id,
    restriction_ref: input.restriction.restriction_profile_id,
    input_snapshot_ref: input.input_snapshot_ref,
    compute_run_lineage: [input.run_id, ...input.parent_run_ids],
    replay_hash,
  };
  return ok(pack);
}

function v(code: L7RuntimeViolationCode, s: L7ValidationSubjectContract, detail: string): L7RuntimeViolation {
  return {
    code,
    source: 'validation-evidence-pack-builder',
    nodeId: null,
    validation_run_id: null,
    validation_subject_id: s.validation_subject_id,
    detail,
    context: {},
  };
}
