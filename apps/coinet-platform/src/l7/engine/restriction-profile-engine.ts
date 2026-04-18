/**
 * L7.4 — RestrictionProfileEngine
 *
 * §7.4.7.6–§7.4.7.8 — Derives a machine-usable
 * `L7ClaimRestrictionProfileContract` from classification, confidence,
 * contradiction posture, and evaluation state. Restriction is the LAST
 * verdict-stage engine to run (§7.4.7.7).
 */

import type { L7ValidationSubjectContract } from '../contracts/validation-subject.contract';
import type { L7ClaimRestrictionProfileContract } from '../contracts/restriction-profile.contract';
import type { L7ClassificationOutput, L7EvaluationOutput } from '../runtime/l7-execution-context';
import type { L7ContradictionBundleContract } from '../contracts/contradiction-bundle.contract';
import type { L7ConfidenceAssessmentContract } from '../contracts/confidence-assessment.contract';
import {
  L7RestrictionRight,
  L7RestrictionReasonCode,
} from '../contracts/claim-restriction-profile';
import { L7ContradictionSeverity, compareSeverity } from '../contracts/contradiction-bundle';
import { canonicalValidationReplayHash } from '../validation/validation-replay-hash';
import { RUN_MODE_TO_REPLAY_IDENTITY, L7ValidationRunMode } from '../runtime/l7-validation-run';
import { L7RuntimeViolation, L7RuntimeViolationCode } from '../validation/l7-runtime-violation-codes';
import { L7EngineResult, fail, ok } from './engine-types';

export interface RestrictionEngineInput {
  readonly subject: L7ValidationSubjectContract;
  readonly classification: L7ClassificationOutput;
  readonly confidence: L7ConfidenceAssessmentContract;
  readonly contradiction_bundle: L7ContradictionBundleContract;
  readonly incompleteness: L7EvaluationOutput;
  readonly staleness: L7EvaluationOutput;
  readonly ambiguity: L7EvaluationOutput;
  readonly degradation: L7EvaluationOutput;
  readonly run_id: string;
  readonly run_mode: L7ValidationRunMode;
  readonly trace_id: string;
  readonly manifest_id: string;
  readonly restriction_contract_version: string;
  readonly schema_version: string;
}

export function deriveRestrictionProfile(
  input: RestrictionEngineInput,
): L7EngineResult<L7ClaimRestrictionProfileContract> {
  const violations: L7RuntimeViolation[] = [];
  const s = input.subject;
  const spec = s.restriction_derivation_spec;
  const reasons = new Set<L7RestrictionReasonCode>();
  const rights = new Set<L7RestrictionRight>();

  const band = input.confidence.confidence_band;
  const highSeverity = compareSeverity(input.contradiction_bundle.highest_severity, L7ContradictionSeverity.SEVERE) >= 0;

  const requires_contradiction_disclosure =
    highSeverity ||
    (spec.require_contradiction_disclosure_if_severity_at_least !== null &&
      compareSeverity(
        input.contradiction_bundle.highest_severity,
        spec.require_contradiction_disclosure_if_severity_at_least as L7ContradictionSeverity,
      ) >= 0);
  const staleness_material = input.staleness.score > 0.25 || input.staleness.blocks_classification;
  const incompleteness_material = input.incompleteness.score > 0.25 || input.incompleteness.blocks_classification;
  const requires_additional_confirmation =
    spec.require_additional_confirmation_if_support_incomplete && incompleteness_material ||
    input.classification.validation_class === 'WEAKLY_CONFIRMED' ||
    input.classification.validation_class === 'INSUFFICIENT' ||
    input.classification.validation_class === 'STALE' ||
    input.classification.validation_class === 'AMBIGUOUS' ||
    input.classification.validation_class === 'DEGRADED';
  const evidence_only_mode =
    spec.downgrade_to_evidence_only_if_staleness_material && staleness_material ||
    input.contradiction_bundle.highest_severity === L7ContradictionSeverity.BLOCKING;

  const belowFinalJudgmentThreshold =
    spec.deny_final_judgment_if_below_confidence !== null &&
    input.confidence.confidence_score < spec.deny_final_judgment_if_below_confidence;

  const allowed_for_regime_input = band !== 'VERY_LOW';
  const allowed_for_scenario_weighting =
    input.classification.validation_class !== 'INSUFFICIENT' &&
    input.classification.validation_class !== 'STALE' &&
    input.classification.validation_class !== 'AMBIGUOUS' &&
    band !== 'VERY_LOW';
  const allowed_for_deterministic_scoring =
    (band === 'MODERATE' || band === 'HIGH' || band === 'VERY_HIGH') &&
    !evidence_only_mode &&
    !highSeverity;
  const allowed_for_final_judgment =
    !evidence_only_mode &&
    !belowFinalJudgmentThreshold &&
    (band === 'HIGH' || band === 'VERY_HIGH') &&
    input.classification.validation_class === 'CONFIRMED';

  if (allowed_for_regime_input) rights.add(L7RestrictionRight.USABLE_FOR_REGIME_INPUT);
  if (allowed_for_scenario_weighting) rights.add(L7RestrictionRight.USABLE_FOR_SCENARIO_WEIGHTING);
  if (allowed_for_deterministic_scoring) rights.add(L7RestrictionRight.USABLE_FOR_DETERMINISTIC_SCORING);
  if (allowed_for_final_judgment) rights.add(L7RestrictionRight.USABLE_FOR_FINAL_JUDGMENT);
  if (evidence_only_mode) rights.add(L7RestrictionRight.EVIDENCE_ONLY);
  if (requires_additional_confirmation) rights.add(L7RestrictionRight.REQUIRES_ADDITIONAL_CONFIRMATION);
  if (requires_contradiction_disclosure) rights.add(L7RestrictionRight.USABLE_WITH_CONTRADICTION_DISCLOSURE_ONLY);
  if (
    !allowed_for_regime_input &&
    !allowed_for_scenario_weighting &&
    !allowed_for_deterministic_scoring &&
    !allowed_for_final_judgment &&
    !evidence_only_mode
  ) {
    rights.add(L7RestrictionRight.NOT_USABLE);
  }

  // reason codes
  switch (input.classification.validation_class) {
    case 'CONFIRMED':
      reasons.add(L7RestrictionReasonCode.CONFIRMED_NO_RISK);
      break;
    case 'WEAKLY_CONFIRMED':
      reasons.add(L7RestrictionReasonCode.WEAK_SUPPORT);
      break;
    case 'CONFLICTING':
      reasons.add(L7RestrictionReasonCode.UNRESOLVED_CONTRADICTION);
      break;
    case 'INSUFFICIENT':
      reasons.add(L7RestrictionReasonCode.MISSING_REQUIRED_SUPPORT);
      break;
    case 'STALE':
      reasons.add(L7RestrictionReasonCode.STALE_SUPPORT);
      break;
    case 'AMBIGUOUS':
      reasons.add(L7RestrictionReasonCode.AMBIGUOUS_DIRECTION);
      break;
    case 'DEGRADED':
      reasons.add(L7RestrictionReasonCode.DEGRADED_SOURCE);
      break;
  }
  if (highSeverity) reasons.add(L7RestrictionReasonCode.UNRESOLVED_CONTRADICTION);
  if (staleness_material) reasons.add(L7RestrictionReasonCode.STALE_SUPPORT);
  if (incompleteness_material) reasons.add(L7RestrictionReasonCode.MISSING_REQUIRED_SUPPORT);
  if (input.ambiguity.score > 0.4) reasons.add(L7RestrictionReasonCode.AMBIGUOUS_DIRECTION);
  if (input.degradation.score > 0.25) reasons.add(L7RestrictionReasonCode.DEGRADED_SOURCE);
  if (input.classification.modifiers.includes('PARTIAL_REGIME_COMPATIBILITY')) {
    reasons.add(L7RestrictionReasonCode.REGIME_INCOMPATIBILITY);
  }
  if (evidence_only_mode) reasons.add(L7RestrictionReasonCode.EVIDENCE_ONLY_REQUIRED);

  if (rights.size === 0) {
    violations.push(v(L7RuntimeViolationCode.RESTRICTION_BROADER_THAN_STATE_JUSTIFIES, s, 'derived rights set empty'));
  }
  if (reasons.size === 0) {
    violations.push(v(L7RuntimeViolationCode.RESTRICTION_REASONS_MISSING, s, 'no reason codes derived'));
  }
  if (violations.length > 0) return fail(violations);

  const profile_id = `rp:${s.validation_subject_id}:${input.run_id}`;
  const replayHash = canonicalValidationReplayHash({
    subject_contract_ref: s.validation_subject_id,
    scope_type: s.scope_type,
    scope_id: s.scope_id,
    as_of: s.as_of,
    contract_versions: {
      subject: s.subject_contract_version,
      restriction: input.restriction_contract_version,
    },
    material_inputs_canonical: {
      rights: [...rights].sort(),
      reasons: [...reasons].sort(),
      band: input.confidence.confidence_band,
      severity: input.contradiction_bundle.highest_severity,
    },
    contradiction_bundle_id: input.contradiction_bundle.contradiction_bundle_id,
    confidence_factor_signature: null,
    restriction_profile_id: profile_id,
    mode: RUN_MODE_TO_REPLAY_IDENTITY[input.run_mode],
    compute_run_id: input.run_id,
  });

  const profile: L7ClaimRestrictionProfileContract = {
    restriction_profile_id: profile_id,
    validation_subject_id: s.validation_subject_id,
    restriction_contract_version: input.restriction_contract_version,
    schema_version: input.schema_version,
    downstream_use_rights: [...rights].sort(),
    requires_contradiction_disclosure,
    requires_additional_confirmation,
    allowed_for_regime_input,
    allowed_for_scenario_weighting,
    allowed_for_deterministic_scoring,
    allowed_for_final_judgment,
    evidence_only_mode,
    restriction_reasons: [...reasons].sort(),
    lineage_refs: { trace_id: input.trace_id, manifest_id: input.manifest_id },
    compute_run_id: input.run_id,
    replay_hash: replayHash,
  };
  return ok(profile);
}

function v(code: L7RuntimeViolationCode, s: L7ValidationSubjectContract, detail: string): L7RuntimeViolation {
  return {
    code,
    source: 'restriction-profile-engine',
    nodeId: null,
    validation_run_id: null,
    validation_subject_id: s.validation_subject_id,
    detail,
    context: {},
  };
}
