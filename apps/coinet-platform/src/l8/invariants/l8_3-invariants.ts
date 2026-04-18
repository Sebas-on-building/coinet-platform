/**
 * L8.3 — Contract Invariants
 *
 * §8.3.10.1 — INV-8.3-A through INV-8.3-G, all executable and
 * test-covered.
 *
 *   INV-8.3-A : Every regime subject declares identity, scope, inputs,
 *               temporal rules, classification rules, confidence logic,
 *               and persistence policy.
 *   INV-8.3-B : Every regime output carries regime identity, confidence,
 *               transition posture, multiplier linkage, lineage, and
 *               replay identity.
 *   INV-8.3-C : Confidence, transition, and multiplier profiles are
 *               first-class contracts and may not be implicit side
 *               fields only.
 *   INV-8.3-D : A regime output may not omit ambiguity, staleness,
 *               degradation, or contradiction posture when materially
 *               relevant.
 *   INV-8.3-E : L7 restriction posture, where required, must be
 *               contractually consumed and cannot be bypassed.
 *   INV-8.3-F : Multiplier profiles remain interpretive objects, not
 *               score or judgment objects.
 *   INV-8.3-G : Contract changes that alter regime meaning, coexistence
 *               meaning, or multiplier meaning must classify as
 *               migration-required or breaking semantic.
 */

import { L8RegimeFamily } from '../contracts/regime-family';
import {
  L8MacroRegimeClass,
  L8TokenRegimeClass,
} from '../contracts/regime-class';
import {
  L8RegimeCoexistenceClass,
  L8RegimeConfidenceBand,
  L8TransitionRiskClass,
} from '../contracts/regime-state';
import {
  L8RegimeSubjectContract,
  L8_SUBJECT_CONTRACT_REQUIRED_FIELDS,
} from '../contracts/regime-subject.contract';
import {
  L8RegimeOutputContract,
  L8_OUTPUT_CONTRACT_REQUIRED_FIELDS,
} from '../contracts/regime-output.contract';
import {
  L8RegimeConfidenceContract,
  L8_REGIME_CONFIDENCE_FACTOR_NAMES,
} from '../contracts/regime-confidence.contract';
import {
  L8RegimeTransitionContract,
  L8_TRANSITION_CONTRACT_REQUIRED_FIELDS,
} from '../contracts/regime-transition.contract';
import {
  L8RegimeMultiplierProfileContract,
  L8_MULTIPLIER_CONTRACT_REQUIRED_FIELDS,
  L8_REQUIRED_MULTIPLIER_DIMENSION_NAMES,
} from '../contracts/regime-multiplier-profile.contract';
import {
  L8ContractCompatibilityClass,
  L8ContractSurface,
  classifyL8ContractDelta,
} from '../contracts/regime-contract-versioning';
import {
  validateRegimeSubjectContract,
} from '../validation/regime-subject-contract.validator';
import {
  validateRegimeOutputContract,
} from '../validation/regime-output-contract.validator';
import {
  validateRegimeConfidenceContract,
} from '../validation/regime-confidence-contract.validator';
import {
  validateRegimeTransitionContract,
} from '../validation/regime-transition-contract.validator';
import {
  validateRegimeMultiplierContract,
} from '../validation/regime-multiplier-contract.validator';
import {
  validateRegimeContractCompatibility,
} from '../validation/regime-contract-compatibility.validator';
import {
  validateRegimeOutputReadiness,
  L8RegimeOutputReadinessClass,
} from '../validation/regime-output-readiness.validator';
import { L8RegimeContractViolationCode } from '../validation/l8-contract-violation-codes';

export interface L8_3InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

// ──────────────────────────────────────────────────────────────────
// Green-bundle builder — used by tests and invariants alike.
// ──────────────────────────────────────────────────────────────────

export interface L8GreenContractBundle {
  readonly subject: L8RegimeSubjectContract;
  readonly output: L8RegimeOutputContract;
  readonly confidence: L8RegimeConfidenceContract;
  readonly transition: L8RegimeTransitionContract;
  readonly multiplier: L8RegimeMultiplierProfileContract;
}

export function buildL8GreenContractBundle(): L8GreenContractBundle {
  const asOf = '2026-04-17T12:00:00Z';
  const traceId = 'trace-l83';
  const manifestId = 'manifest-l83';
  const computeRunId = 'run-l83';

  const subject: L8RegimeSubjectContract = {
    regime_subject_id: 'rsub_macro_test',
    regime_family: L8RegimeFamily.MACRO,
    regime_template_id: 'rtpl_macro_default_v1',
    regime_version: '1.0.0',

    subject_contract_version: '8.3.0',
    schema_version: '8.3.0',
    policy_version: 'l8.3-policy-v1',

    scope_type: 'MARKET',
    scope_id: 'global',
    scope_granularity: 'MARKET_WIDE',

    required_validation_inputs: [
      {
        ref: 'l7:validation_assessment/macro',
        family: 'L7_VALIDATION',
        required: true,
        staleness_critical: true,
        evidence_only: false,
        context_only: false,
      },
      {
        ref: 'l7:restriction_profile/macro',
        family: 'L7_RESTRICTION',
        required: true,
        staleness_critical: true,
        evidence_only: false,
        context_only: false,
      },
    ],
    required_feature_inputs: [
      {
        ref: 'l6:current_feature_state/macro_risk',
        family: 'L6_FEATURE',
        required: true,
        staleness_critical: true,
        evidence_only: false,
        context_only: false,
      },
    ],
    required_context_inputs: [
      {
        ref: 'l4:context_packages/macro',
        family: 'L4_CONTEXT',
        required: false,
        staleness_critical: false,
        evidence_only: false,
        context_only: true,
      },
    ],
    optional_context_inputs: [],
    historical_inputs: [
      {
        ref: 'l6:feature_history/macro_risk',
        family: 'L6_FEATURE',
        required: false,
        staleness_critical: false,
        evidence_only: false,
        context_only: true,
      },
    ],
    evidence_only_inputs: [
      {
        ref: 'l6:evidence_pack/macro_risk',
        family: 'L6_EVIDENCE_PACK',
        required: false,
        staleness_critical: false,
        evidence_only: true,
        context_only: false,
      },
    ],

    as_of: asOf,
    regime_window: {
      window_id: 'win_regime_macro_24h',
      as_of: asOf,
      lookback_seconds: 86400,
      lookforward_seconds: 0,
      transition_lookback_seconds: 21600,
    },
    transition_window: {
      window_id: 'win_trans_macro_6h',
      as_of: asOf,
      lookback_seconds: 21600,
      lookforward_seconds: 0,
      transition_lookback_seconds: 21600,
    },
    freshness_budget_seconds: 900,
    staleness_policy: 'STRICT',

    regime_selection_rules: [
      { rule_id: 'macro.select.v1', rule_version: '1.0.0' },
    ],
    secondary_regime_rules: [
      { rule_id: 'macro.secondary.v1', rule_version: '1.0.0' },
    ],
    transition_rules: [
      { rule_id: 'macro.transition.v1', rule_version: '1.0.0' },
    ],
    ambiguity_rules: [
      { rule_id: 'macro.ambiguity.v1', rule_version: '1.0.0' },
    ],
    degradation_rules: [
      { rule_id: 'macro.degradation.v1', rule_version: '1.0.0' },
    ],

    confidence_derivation_spec: {
      policy_id: 'macro.confidence.v1',
      policy_version: '1.0.0',
      required_factors: [...L8_REGIME_CONFIDENCE_FACTOR_NAMES] as string[],
      factor_weights: {
        support_breadth: 0.15,
        freshness: 0.15,
        validation_quality_posture: 0.15,
        contradiction_pressure: 0.15,
        transition_instability: 0.1,
        cross_domain_agreement: 0.1,
        historical_reliability: 0.1,
        ambiguity_pressure: 0.1,
      },
      caps: ['TRANSITION_HIGH', 'AMBIGUITY_MATERIAL'],
      consumes_l7_confidence: true,
    },
    multiplier_derivation_spec: {
      policy_id: 'macro.multiplier.v1',
      policy_version: '1.0.0',
      required_dimensions: [...L8_REQUIRED_MULTIPLIER_DIMENSION_NAMES] as string[],
      forbid_final_score_shape: true,
    },

    materialization_policy: 'ON_DEMAND',
    evidence_pack_policy: 'REQUIRED',

    restriction_consumption_policy: {
      required: true,
      expected_rights: ['REGIME_CONDITIONING', 'MULTIPLIER_INPUT'],
      block_on_missing_profile: true,
    },
    validation_consumption_policy: {
      required: true,
      min_validation_refs: 1,
      block_on_restricted_outputs: true,
    },

    allowed_regime_class_set: [
      L8MacroRegimeClass.RISK_ON,
      L8MacroRegimeClass.RISK_OFF,
      L8MacroRegimeClass.TRANSITION,
      L8MacroRegimeClass.CHOP,
    ],
    allowed_secondary_regime_set: [
      L8MacroRegimeClass.TRANSITION,
      L8MacroRegimeClass.CHOP,
    ],
    required_multiplier_dimensions: [...L8_REQUIRED_MULTIPLIER_DIMENSION_NAMES] as string[],
    lineage_policy: {
      requires_trace_id: true,
      requires_manifest_id: true,
      requires_upstream_refs: false,
    },
    lineage_refs: {
      trace_id: traceId,
      manifest_id: manifestId,
      upstream_refs: [],
    },

    created_by: 'regime-engine',
    created_at: '2026-04-17T12:00:01Z',
    description: 'governed macro regime classification environment',
  };

  const output: L8RegimeOutputContract = {
    regime_result_id: 'rstate_macro_test',
    regime_subject_id: subject.regime_subject_id,
    subject_contract_ref: 'l8:subject_contract/macro_v1',

    output_contract_version: '8.3.0',
    schema_version: '8.3.0',
    policy_version: 'l8.3-policy-v1',

    regime_family: L8RegimeFamily.MACRO,
    primary_regime: L8MacroRegimeClass.RISK_ON,
    secondary_regime: null,

    scope_type: 'MARKET',
    scope_id: 'global',
    as_of: asOf,

    regime_confidence_score: 0.7,
    regime_confidence_band: L8RegimeConfidenceBand.HIGH,
    secondary_regime_confidence: null,
    confidence_profile_ref: 'l8:confidence/macro_test',

    transition_risk_score: 0.1,
    transition_risk_class: L8TransitionRiskClass.STABLE,
    transition_profile_ref: 'l8:transition/macro_test',

    multiplier_profile_ref: 'l8:multiplier/macro_test',

    support_strength_score: 0.75,
    ambiguity_score: 0.1,
    staleness_score: 0.05,
    degradation_score: 0.05,
    coexistence_class: L8RegimeCoexistenceClass.CLEAN_SINGLE,
    contradicting_surface_refs: [],
    supporting_surface_refs: [
      'l6:current_feature_state/macro_risk',
      'l6:feature_history/macro_risk',
    ],

    validation_refs: ['l7:validation_assessment/macro'],
    evidence_pack_ref: 'l6:evidence_pack/macro_risk',
    input_snapshot_ref: 'l5:snapshot/macro_run_l83',

    materialization_mode: 'LIVE',
    materialization_policy: 'ON_DEMAND',
    replay_mode_flag: 'LIVE',
    repair_mode_flag: false,
    late_data_class: 'NONE',

    compute_run_id: computeRunId,
    replay_hash: 'rhash_macrotest',
    runtime_integrity_flags: {
      input_snapshot_hash_match: true,
      contract_version_match: true,
      replay_hash_stable: true,
      evidence_refs_resolvable: true,
      subject_contract_resolvable: true,
      validation_refs_within_restriction: true,
    },

    lineage_refs: {
      trace_id: traceId,
      manifest_id: manifestId,
      upstream_refs: [],
    },
  };

  const confidence: L8RegimeConfidenceContract = {
    confidence_assessment_id: 'rconf_macro_test',
    regime_subject_id: subject.regime_subject_id,
    regime_result_id: output.regime_result_id,

    confidence_contract_version: '8.3.0',
    schema_version: '8.3.0',
    policy_version: 'l8.3-policy-v1',

    confidence_score_raw: 0.7,
    confidence_score_capped: 0.7,
    confidence_band: L8RegimeConfidenceBand.HIGH,

    factor_breakdown: {
      support_breadth: 0.8,
      freshness: 0.9,
      validation_quality_posture: 0.75,
      contradiction_pressure: 0.9,
      transition_instability: 0.9,
      cross_domain_agreement: 0.7,
      historical_reliability: 0.65,
      ambiguity_pressure: 0.85,
    },
    cap_chain: [],
    rationale_codes: ['STRUCTURAL_SUPPORT'],

    l7_restriction_profile_refs: ['l7:restriction_profile/macro'],
    l7_contradiction_bundle_refs: ['l7:contradiction_bundle/macro'],

    lineage_refs: { trace_id: traceId, manifest_id: manifestId },
    compute_run_id: computeRunId,
    replay_hash: 'rhash_confmacro',
  };

  const transition: L8RegimeTransitionContract = {
    transition_profile_id: 'rtrans_macro_test',
    regime_subject_id: subject.regime_subject_id,
    regime_result_id: output.regime_result_id,

    transition_contract_version: '8.3.0',
    schema_version: '8.3.0',
    policy_version: 'l8.3-policy-v1',

    transition_risk_score: 0.1,
    transition_risk_class: L8TransitionRiskClass.STABLE,
    coexistence_class: L8RegimeCoexistenceClass.CLEAN_SINGLE,

    transition_signature_refs: [],
    candidate_flip_refs: [],
    instability_reasons: [],

    lineage_refs: { trace_id: traceId, manifest_id: manifestId },
    compute_run_id: computeRunId,
    replay_hash: 'rhash_transmacro',
  };

  const multiplier: L8RegimeMultiplierProfileContract = {
    multiplier_profile_id: 'rmul_macro_test',
    regime_subject_id: subject.regime_subject_id,
    regime_result_id: output.regime_result_id,

    multiplier_contract_version: '8.3.0',
    schema_version: '8.3.0',
    policy_version: 'l8.3-policy-v1',

    primary_regime: L8MacroRegimeClass.RISK_ON,
    secondary_regime: null,
    regime_confidence_band: L8RegimeConfidenceBand.HIGH,
    transition_risk_class: L8TransitionRiskClass.STABLE,

    dimensions: {
      trend_amplification: 1.1,
      momentum_trust_multiplier: 1.0,
      breakout_skepticism_multiplier: 0.9,
      leverage_risk_multiplier: 0.8,
      liquidity_fragility_multiplier: 0.9,
      narrative_sensitivity_multiplier: 1.0,
      risk_overhang_sensitivity_multiplier: 0.95,
    },

    derivation_spec_ref: 'macro.multiplier.v1',
    restriction_consumption_refs: [
      {
        restriction_profile_ref: 'l7:restriction_profile/macro',
        consumed_rights: ['REGIME_CONDITIONING', 'MULTIPLIER_INPUT'],
      },
    ],

    lineage_refs: { trace_id: traceId, manifest_id: manifestId },
    compute_run_id: computeRunId,
    replay_hash: 'rhash_mulmacro',

    description: 'regime-conditioned interpretive multiplier profile',
  };

  return { subject, output, confidence, transition, multiplier };
}

// ──────────────────────────────────────────────────────────────────
// Invariants INV-8.3-A .. G
// ──────────────────────────────────────────────────────────────────

export function checkINV_83_A(): L8_3InvariantResult {
  const g = buildL8GreenContractBundle();
  const ok = validateRegimeSubjectContract(g.subject).valid;

  // Drop identity → must fail
  const noId = validateRegimeSubjectContract({ ...g.subject, regime_subject_id: '' });
  const noIdBlocked = !noId.valid && noId.issues.some(i =>
    i.code === L8RegimeContractViolationCode.SUBJECT_MISSING_IDENTITY);

  // Drop scope granularity
  const noGran = validateRegimeSubjectContract({
    ...g.subject,
    scope_granularity: '' as L8RegimeSubjectContract['scope_granularity'],
  });
  const noGranBlocked = !noGran.valid && noGran.issues.some(i =>
    i.code === L8RegimeContractViolationCode.SUBJECT_MISSING_SCOPE_GRANULARITY);

  // Drop required validation inputs
  const noInputs = validateRegimeSubjectContract({
    ...g.subject,
    required_validation_inputs: [],
  });
  const noInputsBlocked = !noInputs.valid && noInputs.issues.some(i =>
    i.code === L8RegimeContractViolationCode.SUBJECT_MISSING_VALIDATION_INPUTS);

  // Drop classification rules
  const noRules = validateRegimeSubjectContract({
    ...g.subject,
    regime_selection_rules: [],
  });
  const noRulesBlocked = !noRules.valid && noRules.issues.some(i =>
    i.code === L8RegimeContractViolationCode.SUBJECT_MISSING_CLASSIFICATION_RULES);

  // Drop confidence spec
  const noConf = validateRegimeSubjectContract({
    ...g.subject,
    confidence_derivation_spec: {
      ...g.subject.confidence_derivation_spec,
      required_factors: [],
    },
  });
  const noConfBlocked = !noConf.valid && noConf.issues.some(i =>
    i.code === L8RegimeContractViolationCode.SUBJECT_MISSING_CONFIDENCE_SPEC);

  // Drop persistence policy
  const noPers = validateRegimeSubjectContract({
    ...g.subject,
    materialization_policy: '' as L8RegimeSubjectContract['materialization_policy'],
  });
  const noPersBlocked = !noPers.valid && noPers.issues.some(i =>
    i.code === L8RegimeContractViolationCode.SUBJECT_MISSING_PERSISTENCE_POLICY);

  const haveAllRequiredConstants =
    L8_SUBJECT_CONTRACT_REQUIRED_FIELDS.length >= 25;

  return {
    id: 'INV-8.3-A',
    name: 'Regime subject must declare identity/scope/inputs/temporal/rules/confidence/persistence',
    holds: ok && noIdBlocked && noGranBlocked && noInputsBlocked &&
      noRulesBlocked && noConfBlocked && noPersBlocked &&
      haveAllRequiredConstants,
    evidence:
      `ok=${ok}, id=${noIdBlocked}, gran=${noGranBlocked}, inputs=${noInputsBlocked}, ` +
      `rules=${noRulesBlocked}, conf=${noConfBlocked}, persist=${noPersBlocked}, ` +
      `required_fields=${L8_SUBJECT_CONTRACT_REQUIRED_FIELDS.length}`,
  };
}

export function checkINV_83_B(): L8_3InvariantResult {
  const g = buildL8GreenContractBundle();
  const ok = validateRegimeOutputContract(g.output).valid;

  const noConfRef = validateRegimeOutputContract({
    ...g.output, confidence_profile_ref: '',
  });
  const noTransRef = validateRegimeOutputContract({
    ...g.output, transition_profile_ref: '',
  });
  const noMulRef = validateRegimeOutputContract({
    ...g.output, multiplier_profile_ref: '',
  });
  const noValidation = validateRegimeOutputContract({
    ...g.output, validation_refs: [],
  });
  const noLineage = validateRegimeOutputContract({
    ...g.output,
    lineage_refs: { trace_id: '', manifest_id: '', upstream_refs: [] },
  });
  const noReplay = validateRegimeOutputContract({
    ...g.output, replay_hash: '',
  });
  const noRun = validateRegimeOutputContract({
    ...g.output, compute_run_id: '',
  });

  const haveRequiredConstants =
    L8_OUTPUT_CONTRACT_REQUIRED_FIELDS.length >= 25;

  return {
    id: 'INV-8.3-B',
    name: 'Regime output must carry identity/confidence/transition/multiplier/lineage/replay',
    holds:
      ok && !noConfRef.valid && !noTransRef.valid && !noMulRef.valid &&
      !noValidation.valid && !noLineage.valid && !noReplay.valid &&
      !noRun.valid && haveRequiredConstants,
    evidence:
      `ok=${ok}, confRef=${!noConfRef.valid}, transRef=${!noTransRef.valid}, ` +
      `mulRef=${!noMulRef.valid}, valRefs=${!noValidation.valid}, ` +
      `lineage=${!noLineage.valid}, replay=${!noReplay.valid}, run=${!noRun.valid}, ` +
      `required_fields=${L8_OUTPUT_CONTRACT_REQUIRED_FIELDS.length}`,
  };
}

export function checkINV_83_C(): L8_3InvariantResult {
  const g = buildL8GreenContractBundle();
  const confOk = validateRegimeConfidenceContract(g.confidence).valid;
  const transOk = validateRegimeTransitionContract(g.transition).valid;
  const mulOk = validateRegimeMultiplierContract(g.multiplier).valid;

  // Remove confidence identity
  const noConfId = validateRegimeConfidenceContract({
    ...g.confidence, confidence_assessment_id: '',
  });

  const transFields = L8_TRANSITION_CONTRACT_REQUIRED_FIELDS.length;
  const mulFields = L8_MULTIPLIER_CONTRACT_REQUIRED_FIELDS.length;

  // Transition without required_result_ref
  const noTransRef = validateRegimeTransitionContract({
    ...g.transition, regime_result_id: '',
  });

  // Multiplier without result_ref
  const noMulRef = validateRegimeMultiplierContract({
    ...g.multiplier, regime_result_id: '',
  });

  return {
    id: 'INV-8.3-C',
    name: 'Confidence / transition / multiplier profiles are first-class contracts',
    holds:
      confOk && transOk && mulOk &&
      !noConfId.valid && !noTransRef.valid && !noMulRef.valid &&
      transFields >= 10 && mulFields >= 12,
    evidence:
      `confOk=${confOk}, transOk=${transOk}, mulOk=${mulOk}, ` +
      `noConfId=${!noConfId.valid}, noTransRef=${!noTransRef.valid}, noMulRef=${!noMulRef.valid}, ` +
      `transFields=${transFields}, mulFields=${mulFields}`,
  };
}

export function checkINV_83_D(): L8_3InvariantResult {
  const g = buildL8GreenContractBundle();

  // High ambiguity + clean-single → blocked by cleanliness law
  const cleanAmb = validateRegimeOutputContract({
    ...g.output,
    ambiguity_score: 0.6,
    coexistence_class: L8RegimeCoexistenceClass.CLEAN_SINGLE,
  });
  const cleanAmbBlocked = cleanAmb.issues.some(i =>
    i.code === L8RegimeContractViolationCode.CLEAN_WHILE_AMBIGUOUS);

  // High staleness + HIGH/FULL band → blocked
  const cleanStale = validateRegimeOutputContract({
    ...g.output,
    staleness_score: 0.6,
  });
  const cleanStaleBlocked = cleanStale.issues.some(i =>
    i.code === L8RegimeContractViolationCode.CLEAN_WHILE_STALE);

  // High degradation + HIGH band → blocked
  const cleanDeg = validateRegimeOutputContract({
    ...g.output,
    degradation_score: 0.6,
  });
  const cleanDegBlocked = cleanDeg.issues.some(i =>
    i.code === L8RegimeContractViolationCode.CLEAN_WHILE_DEGRADED);

  // Stable transition + high score → blocked
  const cleanTrans = validateRegimeOutputContract({
    ...g.output,
    transition_risk_score: 0.9,
    transition_risk_class: L8TransitionRiskClass.STABLE,
  });
  const cleanTransBlocked = cleanTrans.issues.some(i =>
    i.code === L8RegimeContractViolationCode.CLEAN_WHILE_TRANSITION_HIGH ||
    i.code === L8RegimeContractViolationCode.OUTPUT_TRANSITION_CLASS_INCONSISTENT);

  // Confidence clean while ambiguous
  const confClean = validateRegimeConfidenceContract(g.confidence, {
    ambiguity_score: 0.6,
    restriction_required: true,
    staleness_material: false,
    transition_high: false,
  });
  const confCleanBlocked = confClean.issues.some(i =>
    i.code === L8RegimeContractViolationCode.CONFIDENCE_CLEAN_WHILE_AMBIGUOUS);

  // Transition stable while ambiguous
  const transStable = validateRegimeTransitionContract(g.transition, {
    ambiguity_score: 0.7,
  });
  const transStableBlocked = transStable.issues.some(i =>
    i.code === L8RegimeContractViolationCode.TRANSITION_STABLE_WHILE_AMBIGUOUS);

  return {
    id: 'INV-8.3-D',
    name: 'Ambiguity/staleness/degradation/contradiction posture cannot be omitted',
    holds:
      cleanAmbBlocked && cleanStaleBlocked && cleanDegBlocked &&
      cleanTransBlocked && confCleanBlocked && transStableBlocked,
    evidence:
      `amb=${cleanAmbBlocked}, stale=${cleanStaleBlocked}, deg=${cleanDegBlocked}, ` +
      `trans=${cleanTransBlocked}, confClean=${confCleanBlocked}, transStable=${transStableBlocked}`,
  };
}

export function checkINV_83_E(): L8_3InvariantResult {
  const g = buildL8GreenContractBundle();

  // Confidence without l7_restriction_profile_refs when subject requires
  const noRestConf = validateRegimeConfidenceContract(
    { ...g.confidence, l7_restriction_profile_refs: [] },
    {
      ambiguity_score: 0,
      restriction_required: true,
      staleness_material: false,
      transition_high: false,
    },
  );
  const noRestConfBlocked = noRestConf.issues.some(i =>
    i.code ===
      L8RegimeContractViolationCode.CONFIDENCE_MISSING_CAPS_WHEN_REQUIRED);

  // Multiplier without restriction_consumption_refs when required
  const noRestMul = validateRegimeMultiplierContract(
    { ...g.multiplier, restriction_consumption_refs: [] },
    { restriction_required: true },
  );
  const noRestMulBlocked = noRestMul.issues.some(i =>
    i.code ===
      L8RegimeContractViolationCode.MULTIPLIER_MISSING_RESTRICTION_CONSUMPTION);

  // Subject without restriction_consumption_policy
  const noPolSubj = validateRegimeSubjectContract({
    ...g.subject,
    restriction_consumption_policy:
      undefined as unknown as L8RegimeSubjectContract['restriction_consumption_policy'],
  });
  const noPolSubjBlocked = noPolSubj.issues.some(i =>
    i.code === L8RegimeContractViolationCode.SUBJECT_MISSING_RESTRICTION_POLICY);

  return {
    id: 'INV-8.3-E',
    name: 'L7 restriction posture must be contractually consumed, never bypassed',
    holds: noRestConfBlocked && noRestMulBlocked && noPolSubjBlocked,
    evidence:
      `conf=${noRestConfBlocked}, mul=${noRestMulBlocked}, subj=${noPolSubjBlocked}`,
  };
}

export function checkINV_83_F(): L8_3InvariantResult {
  const g = buildL8GreenContractBundle();

  // OOR dimension
  const oor = validateRegimeMultiplierContract({
    ...g.multiplier,
    dimensions: { ...g.multiplier.dimensions, trend_amplification: 5.0 },
  });
  const oorBlocked = oor.issues.some(i =>
    i.code === L8RegimeContractViolationCode.MULTIPLIER_IS_SCORE_SHAPED ||
    i.code === L8RegimeContractViolationCode.MULTIPLIER_DIMENSION_OUT_OF_RANGE);

  // All dimensions collapse → score shaped
  const collapsed = validateRegimeMultiplierContract({
    ...g.multiplier,
    dimensions: {
      trend_amplification: 2.5,
      momentum_trust_multiplier: 2.5,
      breakout_skepticism_multiplier: 2.5,
      leverage_risk_multiplier: 2.5,
      liquidity_fragility_multiplier: 2.5,
      narrative_sensitivity_multiplier: 2.5,
      risk_overhang_sensitivity_multiplier: 2.5,
    },
  });
  const collapsedBlocked = collapsed.issues.some(i =>
    i.code === L8RegimeContractViolationCode.MULTIPLIER_IS_SCORE_SHAPED);

  // Final-score wording
  const finalScore = validateRegimeMultiplierContract({
    ...g.multiplier,
    description: 'final score for macro regime',
  });
  const finalScoreBlocked = finalScore.issues.some(i =>
    i.code === L8RegimeContractViolationCode.MULTIPLIER_IS_SCORE_SHAPED);

  // Action bias
  const actionBias = validateRegimeMultiplierContract({
    ...g.multiplier,
    description: 'recommendation: buy when regime flips',
  });
  const actionBiasBlocked = actionBias.issues.some(i =>
    i.code === L8RegimeContractViolationCode.MULTIPLIER_ACTION_BIAS);

  return {
    id: 'INV-8.3-F',
    name: 'Multiplier profiles remain interpretive — not scores or judgment',
    holds: oorBlocked && collapsedBlocked && finalScoreBlocked && actionBiasBlocked,
    evidence:
      `oor=${oorBlocked}, collapsed=${collapsedBlocked}, finalScore=${finalScoreBlocked}, ` +
      `actionBias=${actionBiasBlocked}`,
  };
}

export function checkINV_83_G(): L8_3InvariantResult {
  // Breaking semantic — changed field, declared ADDITIVE_SAFE
  const breaking = validateRegimeContractCompatibility({
    delta: {
      surface: L8ContractSurface.OUTPUT,
      from: '8.3.0',
      to: '8.4.0',
      added_fields: [],
      removed_fields: [],
      semantically_changed_fields: ['primary_regime'],
      changed_enum_vocabularies: [],
      changed_default_policies: [],
      prohibited_change: false,
    },
    declared_classification: L8ContractCompatibilityClass.ADDITIVE_SAFE,
    allow_breaking: false,
    allow_migration_required: false,
  });
  const breakingBlocked =
    !breaking.valid &&
    breaking.classification === L8ContractCompatibilityClass.BREAKING_SEMANTIC;

  // Migration-required — removed required field
  const migration = validateRegimeContractCompatibility({
    delta: {
      surface: L8ContractSurface.SUBJECT,
      from: '8.3.0',
      to: '8.4.0',
      added_fields: [],
      removed_fields: ['confidence_derivation_spec'],
      semantically_changed_fields: [],
      changed_enum_vocabularies: [],
      changed_default_policies: [],
      prohibited_change: false,
    },
    declared_classification: L8ContractCompatibilityClass.MIGRATION_REQUIRED,
    allow_breaking: false,
    allow_migration_required: true,
  });
  const migrationOk =
    migration.classification === L8ContractCompatibilityClass.MIGRATION_REQUIRED &&
    migration.issues.some(i =>
      i.code ===
        L8RegimeContractViolationCode.COMPATIBILITY_REQUIRED_FIELD_REMOVED);

  // Prohibited
  const prohibited = validateRegimeContractCompatibility({
    delta: {
      surface: L8ContractSurface.MULTIPLIER,
      from: '8.3.0',
      to: '8.4.0',
      added_fields: [],
      removed_fields: [],
      semantically_changed_fields: [],
      changed_enum_vocabularies: [],
      changed_default_policies: [],
      prohibited_change: true,
    },
    declared_classification: L8ContractCompatibilityClass.ADDITIVE_SAFE,
    allow_breaking: true,
    allow_migration_required: true,
  });
  const prohibitedBlocked =
    !prohibited.valid &&
    prohibited.classification === L8ContractCompatibilityClass.PROHIBITED;

  // Changing regime enum vocabulary → migration-required
  const enumChange = classifyL8ContractDelta({
    surface: L8ContractSurface.MULTIPLIER,
    from: '8.3.0',
    to: '8.4.0',
    added_fields: [],
    removed_fields: [],
    semantically_changed_fields: [],
    changed_enum_vocabularies: ['L8RegimeClass'],
    changed_default_policies: [],
    prohibited_change: false,
  });
  const enumChangeOk =
    enumChange === L8ContractCompatibilityClass.MIGRATION_REQUIRED;

  // Non-monotonic version
  const nonMonotonic = validateRegimeContractCompatibility({
    delta: {
      surface: L8ContractSurface.OUTPUT,
      from: '8.3.0',
      to: '8.2.0',
      added_fields: ['some_new_field'],
      removed_fields: [],
      semantically_changed_fields: [],
      changed_enum_vocabularies: [],
      changed_default_policies: [],
      prohibited_change: false,
    },
    declared_classification: L8ContractCompatibilityClass.ADDITIVE_SAFE,
    allow_breaking: false,
    allow_migration_required: false,
  });
  const nonMonotonicBlocked = !nonMonotonic.valid &&
    nonMonotonic.issues.some(i =>
      i.code === L8RegimeContractViolationCode.COMPATIBILITY_NON_MONOTONIC_VERSION);

  return {
    id: 'INV-8.3-G',
    name: 'Contract changes altering regime/coexistence/multiplier meaning are migration-required or breaking',
    holds:
      breakingBlocked && migrationOk && prohibitedBlocked &&
      enumChangeOk && nonMonotonicBlocked,
    evidence:
      `breaking=${breakingBlocked}, migration=${migrationOk}, prohibited=${prohibitedBlocked}, ` +
      `enumChange=${enumChangeOk}, nonMonotonic=${nonMonotonicBlocked}`,
  };
}

export function checkAllL83Invariants(): readonly L8_3InvariantResult[] {
  return [
    checkINV_83_A(),
    checkINV_83_B(),
    checkINV_83_C(),
    checkINV_83_D(),
    checkINV_83_E(),
    checkINV_83_F(),
    checkINV_83_G(),
  ];
}

/**
 * Exposed for the readiness-validator tests so the green bundle can be
 * passed through `validateRegimeOutputReadiness` without being rebuilt.
 */
export function l8GreenReadinessClass(): L8RegimeOutputReadinessClass {
  return validateRegimeOutputReadiness(
    buildL8GreenContractBundle(),
  ).readiness_class;
}
