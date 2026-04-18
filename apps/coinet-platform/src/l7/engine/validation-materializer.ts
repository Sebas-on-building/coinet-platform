/**
 * L7.4 — ValidationMaterializer + ContradictionMaterializer
 *
 * §7.4.8.3–§7.4.8.4 — Produces the final L7 output contracts from all
 * intermediate runtime artifacts and hands them to L5 (not directly to
 * stores). L7.4 does not perform any store write: it emits the final
 * contract objects, computes the replay hash, and delegates persistence
 * to the L5 handoff (§7.4.8.7).
 */

import type {
  L7LateDataClass,
  L7RuntimeIntegrityFlags,
  L7ValidationOutputContract,
} from '../contracts/validation-output.contract';
import {
  L7MaterializationReadinessState,
  L7RuntimeStatusClass,
  isReadyState,
} from '../contracts/validation-runtime-status';
import { isValidationMaterializationReady } from '../validation/validation-replay-hash';
import type { L7ValidationSubjectContract } from '../contracts/validation-subject.contract';
import type { L7ContradictionBundleContract } from '../contracts/contradiction-bundle.contract';
import type { L7ConfidenceAssessmentContract } from '../contracts/confidence-assessment.contract';
import type { L7ClaimRestrictionProfileContract } from '../contracts/restriction-profile.contract';
import type {
  L7ClassificationOutput,
  L7EvaluationOutput,
  L7EvidencePack,
  L7SupportRecord,
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
import {
  L7ValidationClass,
  type L7ValidationModifier,
} from '../contracts/validation-output-class';

export interface ValidationMaterializerInput {
  readonly subject: L7ValidationSubjectContract;
  readonly support: readonly L7SupportRecord[];
  readonly contradiction_bundle: L7ContradictionBundleContract;
  readonly incompleteness: L7EvaluationOutput;
  readonly staleness: L7EvaluationOutput;
  readonly ambiguity: L7EvaluationOutput;
  readonly degradation: L7EvaluationOutput;
  readonly classification: L7ClassificationOutput;
  readonly confidence: L7ConfidenceAssessmentContract;
  readonly restriction: L7ClaimRestrictionProfileContract;
  readonly evidence_pack: L7EvidencePack | null;
  readonly input_snapshot_ref: string | null;
  readonly validation_contract_version: string;
  readonly schema_version: string;
  readonly run_id: string;
  readonly run_mode: L7ValidationRunMode;
  readonly trace_id: string;
  readonly manifest_id: string;
  readonly late_data_class: L7LateDataClass;
  readonly repair_mode: boolean;
}

export function materializeValidationOutput(
  input: ValidationMaterializerInput,
): L7EngineResult<L7ValidationOutputContract> {
  const violations: L7RuntimeViolation[] = [];
  const s = input.subject;
  if (!input.classification || !input.confidence || !input.restriction) {
    violations.push(v(L7RuntimeViolationCode.MATERIALIZATION_PREREQUISITES_MISSING, s, 'verdict artifact missing'));
  }
  if (!input.contradiction_bundle) {
    violations.push(v(L7RuntimeViolationCode.MATERIALIZATION_PREREQUISITES_MISSING, s, 'contradiction bundle missing'));
  }
  if (violations.length > 0) return fail(violations);

  const modifiers = input.classification.modifiers.filter(isModifier);
  const contradictionSeverityScore = severityScore(input.contradiction_bundle.highest_severity);

  const cleanlinessMaterial =
    input.staleness.score > 0.25 ||
    input.incompleteness.score > 0.25 ||
    input.ambiguity.score > 0.25 ||
    input.degradation.score > 0.25 ||
    contradictionSeverityScore > 0.25 ||
    modifiers.length > 0;

  const status = deriveStatus(input, modifiers, cleanlinessMaterial);

  const runtime_integrity_flags: L7RuntimeIntegrityFlags = {
    input_snapshot_hash_match: input.input_snapshot_ref !== null,
    contract_version_match: !!s.subject_contract_version && !!input.validation_contract_version,
    replay_hash_stable: true,
    evidence_refs_resolvable: input.evidence_pack !== null,
    subject_contract_resolvable: true,
  };

  const replay_hash = canonicalValidationReplayHash({
    subject_contract_ref: s.validation_subject_id,
    scope_type: s.scope_type,
    scope_id: s.scope_id,
    as_of: s.as_of,
    contract_versions: {
      subject: s.subject_contract_version,
      output: input.validation_contract_version,
      confidence: input.confidence.confidence_contract_version,
      restriction: input.restriction.restriction_contract_version,
      contradiction: input.contradiction_bundle.contradiction_contract_version,
    },
    material_inputs_canonical: {
      validation_class: input.classification.validation_class,
      validation_modifiers: [...modifiers].sort(),
      status,
      support_strength: input.classification.support_strength_score,
      contradiction_severity_score: contradictionSeverityScore,
      incompleteness_score: input.incompleteness.score,
      staleness_score: input.staleness.score,
      ambiguity_score: input.ambiguity.score,
      degradation_score: input.degradation.score,
      confidence_score: input.confidence.confidence_score,
      confidence_band: input.confidence.confidence_band,
    },
    contradiction_bundle_id:
      input.contradiction_bundle.contradiction_records.length > 0
        ? input.contradiction_bundle.contradiction_bundle_id
        : null,
    confidence_factor_signature: input.confidence.replay_hash,
    restriction_profile_id: input.restriction.restriction_profile_id,
    mode: RUN_MODE_TO_REPLAY_IDENTITY[input.run_mode],
    compute_run_id: input.run_id,
  });

  const output: L7ValidationOutputContract = {
    validation_result_id: `vr:${s.validation_subject_id}:${input.run_id}`,
    validation_subject_id: s.validation_subject_id,
    subject_contract_ref: s.validation_subject_id,
    validation_contract_version: input.validation_contract_version,
    schema_version: input.schema_version,
    claim_family: s.claim_family,
    claim_version: s.claim_version,
    scope_type: s.scope_type,
    scope_id: s.scope_id,
    as_of: s.as_of,
    validation_class: input.classification.validation_class as L7ValidationClass,
    validation_modifiers: modifiers,
    validation_status: status,
    support_strength_score: input.classification.support_strength_score,
    contradiction_severity_score: contradictionSeverityScore,
    incompleteness_score: input.incompleteness.score,
    staleness_score: input.staleness.score,
    ambiguity_score: input.ambiguity.score,
    degradation_score: input.degradation.score,
    confidence_score: input.confidence.confidence_score,
    confidence_band: input.confidence.confidence_band,
    confidence_assessment_ref: input.confidence.confidence_assessment_id,
    contradiction_bundle_ref:
      input.contradiction_bundle.contradiction_records.length > 0
        ? input.contradiction_bundle.contradiction_bundle_id
        : null,
    support_refs: input.support.map(r => r.support_ref).sort(),
    evidence_pack_ref: input.evidence_pack?.evidence_pack_id ?? null,
    input_snapshot_ref: input.input_snapshot_ref,
    restriction_profile: input.restriction,
    restriction_profile_ref: input.restriction.restriction_profile_id,
    materialization_mode: s.materialization_policy,
    replay_mode_flag: RUN_MODE_TO_REPLAY_IDENTITY[input.run_mode],
    repair_mode_flag: input.repair_mode,
    late_data_class: input.late_data_class,
    compute_run_id: input.run_id,
    replay_hash,
    runtime_integrity_flags,
    lineage_refs: { trace_id: input.trace_id, manifest_id: input.manifest_id },
  };

  const readiness = isValidationMaterializationReady({
    output,
    subjectContract: s,
    confidence: input.confidence,
    contradiction: input.contradiction_bundle,
    restriction: input.restriction,
    evidenceRequired:
      s.evidence_pack_policy === 'REQUIRED' ||
      (s.evidence_pack_policy === 'ON_MATERIAL_CONFLICT' &&
        input.contradiction_bundle.contradiction_records.length > 0),
    cleanlinessViolation:
      output.validation_status === L7RuntimeStatusClass.CLEAN && cleanlinessMaterial,
  });

  if (!isReadyState(readiness)) {
    violations.push(v(
      L7RuntimeViolationCode.MATERIALIZATION_CONTRACT_INVALID,
      s,
      `materialization readiness: ${readiness}`,
    ));
    return fail(violations);
  }
  void L7MaterializationReadinessState;
  return ok(output);
}

export interface ContradictionMaterializerInput {
  readonly subject: L7ValidationSubjectContract;
  readonly bundle: L7ContradictionBundleContract;
}

export function materializeContradictionBundle(
  input: ContradictionMaterializerInput,
): L7EngineResult<L7ContradictionBundleContract> {
  // Bundles are already contract-complete when emitted by the clustering
  // engine. The materializer exists as an explicit L5-handoff point and
  // re-asserts required fields (§7.4.8.4). No mutation is allowed.
  const b = input.bundle;
  const violations: L7RuntimeViolation[] = [];
  if (!b.contradiction_bundle_id || !b.validation_subject_id) {
    violations.push(v(
      L7RuntimeViolationCode.MATERIALIZATION_CONTRACT_INVALID,
      input.subject,
      'contradiction bundle missing identity',
    ));
  }
  if (!b.replay_hash) {
    violations.push(v(
      L7RuntimeViolationCode.MATERIALIZATION_CONTRACT_INVALID,
      input.subject,
      'contradiction bundle missing replay_hash',
    ));
  }
  if (violations.length > 0) return fail(violations);
  return ok(b);
}

function isModifier(m: string): m is L7ValidationModifier {
  return (
    m === 'STALE_SUPPORT_PRESENT' ||
    m === 'INCOMPLETE_SUPPORT_PRESENT' ||
    m === 'AMBIGUOUS_DIRECTION_PRESENT' ||
    m === 'DEGRADED_SOURCE_PRESENT' ||
    m === 'UNRESOLVED_CONTRADICTION_PRESENT' ||
    m === 'PARTIAL_REGIME_COMPATIBILITY'
  );
}

function severityScore(sev: string): number {
  switch (sev) {
    case 'INFO': return 0;
    case 'MINOR': return 0.25;
    case 'MATERIAL': return 0.5;
    case 'SEVERE': return 0.8;
    case 'BLOCKING': return 1;
  }
  return 0;
}

function deriveStatus(
  input: ValidationMaterializerInput,
  modifiers: readonly L7ValidationModifier[],
  cleanlinessMaterial: boolean,
): L7RuntimeStatusClass {
  if (input.classification.validation_class === 'CONFLICTING' && input.contradiction_bundle.highest_severity === 'BLOCKING') {
    return L7RuntimeStatusClass.BLOCKED;
  }
  if (input.repair_mode) return L7RuntimeStatusClass.REPAIRED;
  if (input.classification.validation_class === 'INSUFFICIENT' || input.classification.validation_class === 'STALE') {
    return L7RuntimeStatusClass.DOWNGRADED;
  }
  if (input.confidence.cap_chain.some(c => c.applied)) return L7RuntimeStatusClass.CAPPED;
  if (cleanlinessMaterial || modifiers.length > 0) return L7RuntimeStatusClass.DOWNGRADED;
  return L7RuntimeStatusClass.CLEAN;
}

function v(code: L7RuntimeViolationCode, s: L7ValidationSubjectContract, detail: string): L7RuntimeViolation {
  return {
    code,
    source: 'validation-materializer',
    nodeId: null,
    validation_run_id: null,
    validation_subject_id: s.validation_subject_id,
    detail,
    context: {},
  };
}
