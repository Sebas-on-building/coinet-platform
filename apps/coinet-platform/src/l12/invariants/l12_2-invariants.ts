/**
 * L12.2 — Object invariants (§12.2.22).
 *
 *   INV-12.2-A : family registration law
 *   INV-12.2-B : scenario object completeness law
 *   INV-12.2-C : scenario set multi-path law
 *   INV-12.2-D : invalidation law
 *   INV-12.2-E : path confidence integrity law
 *   INV-12.2-F : shift-condition law
 *   INV-12.2-G : restriction profile law
 *   INV-12.2-H : non-prediction object law
 */

import {
  ALL_L12_SCENARIO_FAMILIES,
  L12_SCENARIO_FAMILY_DESCRIPTORS,
  L12ScenarioFamily,
} from '../contracts/scenario-family';
import {
  ALL_L12_SCENARIO_TYPES,
  L12ScenarioType,
} from '../contracts/scenario-type';
import {
  ALL_L12_PATH_CONFIDENCE_BANDS,
  L12PathConfidenceBand,
  l12ConfidenceBandFor,
} from '../contracts/path-confidence-profile';
import {
  L12_MANDATORY_BLOCKED_USES,
  L12ScenarioAllowedUse,
  L12ScenarioBlockedUse,
  L12ScenarioRestrictionProfile,
} from '../contracts/scenario-restriction-profile';
import {
  L12MultiPathClass,
  L12ScenarioSpreadClass,
} from '../contracts/scenario-set';
import { L12ScenarioReadinessClass } from '../contracts/scenario-object-readiness';
import {
  L12InvalidationStatus,
  L12ScenarioInvalidation,
} from '../contracts/scenario-invalidation';
import {
  detectL12JudgmentLanguage,
  detectL12PredictionTheater,
  detectL12RecommendationLanguage,
} from '../contracts/l12-mission';
import { containsL12ForbiddenNaming } from '../contracts/l12-boundary';
import {
  buildL12ConditionId,
  buildL12InvalidationId,
  buildL12PathConfidenceProfileId,
  buildL12ScenarioId,
  buildL12ScenarioReplayHash,
  buildL12ScenarioSetId,
  buildL12ScenarioSubjectId,
  buildL12TriggerId,
} from '../contracts/scenario-ids';
import {
  auditL12FamilyRegistry,
  isL12FamilyRegisteredInRegistry,
  isL12FamilyProductionEnabled,
} from '../registry/scenario-family.registry';
import {
  isL12LegalTypeFamilyPairing,
  isL12ScenarioTypeRegistered,
} from '../registry/scenario-type.registry';
import {
  L12ConditionMaterialityClass,
  L12ConditionRole,
  L12ConditionSourceLayer,
  L12ConditionStatus,
  L12ScenarioCondition,
  L12ScenarioConditionType,
} from '../contracts/scenario-condition';
import {
  L12ScenarioTrigger,
  L12TriggerEffect,
  L12TriggerStatus,
  L12TriggerType,
} from '../contracts/scenario-trigger';
import {
  L12InvalidationEffect,
  L12InvalidationType,
} from '../contracts/scenario-invalidation';
import { L12ScenarioSummaryCode } from '../contracts/scenario-summary-code';
import { L12ScenarioTimeHorizon } from '../contracts/scenario-time-horizon';
import { L12ScenarioSubjectClass, L12ScenarioSubject } from '../contracts/scenario-subject';
import { validateL12FamilyRegistration } from '../validation/scenario-family.validator';
import { validateL12ScenarioSet } from '../validation/scenario-set.validator';
import { validateL12Scenario } from '../validation/scenario.validator';
import { validateL12ScenarioCondition } from '../validation/scenario-condition.validator';
import { validateL12ScenarioTrigger } from '../validation/scenario-trigger.validator';
import { validateL12ScenarioInvalidation } from '../validation/scenario-invalidation.validator';
import {
  validateL12PathConfidenceProfile,
} from '../validation/path-confidence-profile.validator';
import {
  validateL12ScenarioShiftConditionSet,
} from '../validation/scenario-shift-condition.validator';
import {
  validateL12ScenarioRestrictionProfile,
} from '../validation/scenario-restriction-profile.validator';
import { L12ObjectViolationCode } from '../validation/l12-object-violation-codes';
import { validateL12ScenarioSubject } from '../validation/scenario-subject.validator';

export interface L12_2InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

const POLICY = 'l12.2.test_policy.v1';
const TS = '2026-05-08T00:00:00.000Z';

/* ─────────────────── INV-12.2-A : family registration ─────────────────── */
export function checkINV_122_A(): L12_2InvariantResult {
  const allRegistered = ALL_L12_SCENARIO_FAMILIES.every(f => isL12FamilyRegisteredInRegistry(f));
  const allProduction = ALL_L12_SCENARIO_FAMILIES.every(f => isL12FamilyProductionEnabled(f));
  const descriptors = L12_SCENARIO_FAMILY_DESCRIPTORS;
  const allHaveTypes = descriptors.every(d => d.legal_scenario_types.length >= 1);
  const allHaveScopes = descriptors.every(d => d.legal_scope_types.length >= 1);
  const allHaveContexts = descriptors.every(d => d.required_lower_layer_contexts.length >= 1);
  const allRequireScoreContext = descriptors.every(d => d.requires_l11_score_context);
  const allRequireInvalidation = descriptors.every(d => d.requires_invalidation_profile);
  const auditClean = auditL12FamilyRegistry().length === 0;
  const validationCleanIssues = validateL12FamilyRegistration();
  const validationClean = validationCleanIssues.length === 0;
  const exactlyTwelve = ALL_L12_SCENARIO_FAMILIES.length === 12 && descriptors.length === 12;
  return {
    id: 'INV-12.2-A',
    name: 'family registration law',
    holds:
      allRegistered &&
      allProduction &&
      allHaveTypes &&
      allHaveScopes &&
      allHaveContexts &&
      allRequireScoreContext &&
      allRequireInvalidation &&
      auditClean &&
      validationClean &&
      exactlyTwelve,
    evidence:
      `families=${ALL_L12_SCENARIO_FAMILIES.length}, all_reg=${allRegistered}, all_prod=${allProduction}, ` +
      `types=${allHaveTypes}, scopes=${allHaveScopes}, contexts=${allHaveContexts}, ` +
      `score_ctx=${allRequireScoreContext}, invalidation=${allRequireInvalidation}, ` +
      `audit_clean=${auditClean}, validation_clean=${validationClean}, twelve=${exactlyTwelve}`,
  };
}

/* ─────────────────── INV-12.2-B : object completeness ─────────────────── */
function buildSubjectFor(family: L12ScenarioFamily): L12ScenarioSubject {
  const subjectId = buildL12ScenarioSubjectId({
    scope_type: 'asset',
    scope_id: 'BTC',
    as_of: TS,
    policy_version: POLICY,
  });
  return {
    scenario_subject_id: subjectId,
    subject_class: L12ScenarioSubjectClass.ASSET_SCENARIO,
    scope_type: 'asset',
    scope_id: 'BTC',
    scope_granularity: 'asset/global',
    as_of: TS,
    requested_scenario_families: [family],
    excluded_scenario_families: [],
    required_validation_refs: ['l7:validation_assessment'],
    required_regime_refs: ['l8:current_regime_state'],
    required_sequence_refs: ['l9:current_sequence_state'],
    required_hypothesis_refs: ['l10:current_hypothesis_ranking'],
    required_score_context_refs: [
      'l11:current_score_snapshot',
      'l11:score_attribution',
      'l11:score_components',
      'l11:score_modifier_profile',
      'l11:score_missing_data_profile',
      'l11:score_calibration_hook',
      'l11:score_drift_report',
      'l11:score_restriction_profile',
      'l11:score_evidence_pack',
      'l11:score_lineage_pack',
    ],
    optional_context_refs: [],
    historical_context_refs: [],
    evidence_only_refs: [],
    scenario_window: {
      window_start: TS,
      window_end: TS,
      horizon: L12ScenarioTimeHorizon.MEDIUM_TERM,
    },
    path_horizon: L12ScenarioTimeHorizon.MEDIUM_TERM,
    conditionality_policy_ref: 'l12.policy.conditionality.v1',
    multi_path_policy_ref: 'l12.policy.multi_path.v1',
    lineage_refs: ['l12.lineage.subject.v1'],
    input_snapshot_ref: 'l12.input_snapshot.v1',
    policy_version: POLICY,
    replay_hash: buildL12ScenarioReplayHash({
      domain: 'subject',
      policy_version: POLICY,
      material: { scope: 'asset/BTC', as_of: TS, family },
    }),
  };
}

export function checkINV_122_B(): L12_2InvariantResult {
  const family = L12ScenarioFamily.LEVERAGE_DRIVEN_CONTINUATION;
  const subject = buildSubjectFor(family);
  const subjErrs = validateL12ScenarioSubject(subject);

  const setId = buildL12ScenarioSetId({
    scenario_subject_id: subject.scenario_subject_id,
    as_of: TS,
    policy_version: POLICY,
  });
  const baseId = buildL12ScenarioId({
    scenario_set_id: setId,
    scenario_family: family,
    scenario_type: L12ScenarioType.BASE_CASE,
    as_of: TS,
    policy_version: POLICY,
  });
  const condId = buildL12ConditionId({
    scenario_id: baseId,
    source_layer: L12ConditionSourceLayer.L11,
    required_surface_ref: 'l11:current_score_snapshot',
    operator: 'POSTURE_REQUIRED',
  });
  const trigId = buildL12TriggerId({
    scenario_id: baseId,
    trigger_type: L12TriggerType.BULLISH_CONFIRMATION_TRIGGER,
    trigger_name: 'spot_participation_strengthens',
  });
  const invId = buildL12InvalidationId({
    scenario_id: baseId,
    invalidation_type: L12InvalidationType.SUPPORT_FAILURE,
    invalidation_name: 'spot_support_loses',
  });
  const replay = buildL12ScenarioReplayHash({
    domain: 'scenario',
    policy_version: POLICY,
    material: { setId, baseId, condId, trigId, invId },
  });

  const cond: L12ScenarioCondition = {
    condition_id: condId,
    scenario_id: baseId,
    scenario_set_id: setId,
    condition_type: L12ScenarioConditionType.SCORE_CONDITION,
    condition_role: L12ConditionRole.REQUIRED_FOR_PATH,
    source_layer: L12ConditionSourceLayer.L11,
    required_surface_ref: 'l11:current_score_snapshot',
    current_state_ref: 'l11:snapshot.now',
    operator: 'POSTURE_REQUIRED' as never,
    condition_status: L12ConditionStatus.SATISFIED,
    materiality_class: L12ConditionMaterialityClass.MATERIAL,
    evidence_refs: ['l11:score_evidence_pack'],
    lineage_refs: ['l12.lineage.condition.v1'],
    policy_version: POLICY,
    replay_hash: replay,
  };
  const trig: L12ScenarioTrigger = {
    trigger_id: trigId,
    scenario_id: baseId,
    scenario_set_id: setId,
    trigger_type: L12TriggerType.BULLISH_CONFIRMATION_TRIGGER,
    trigger_name: 'spot_participation_strengthens',
    trigger_condition_refs: [condId],
    trigger_status: L12TriggerStatus.WATCHING,
    trigger_strength_score: 0.4,
    trigger_materiality_class: L12ConditionMaterialityClass.MATERIAL,
    expected_effect_on_scenario: L12TriggerEffect.STRENGTHENS_PRIMARY,
    evidence_refs: ['l11:score_evidence_pack'],
    lineage_refs: ['l12.lineage.trigger.v1'],
    policy_version: POLICY,
    replay_hash: replay,
  };
  const invObj: L12ScenarioInvalidation = {
    invalidation_id: invId,
    scenario_id: baseId,
    scenario_set_id: setId,
    invalidation_type: L12InvalidationType.SUPPORT_FAILURE,
    invalidation_name: 'spot_support_loses',
    invalidation_condition_refs: [condId],
    invalidation_strength_score: 0.5,
    invalidation_status: L12InvalidationStatus.WATCHING,
    expected_effect: L12InvalidationEffect.PATH_NARROWED,
    evidence_refs: ['l11:score_evidence_pack'],
    lineage_refs: ['l12.lineage.invalidation.v1'],
    policy_version: POLICY,
    replay_hash: replay,
  };

  const baseScen = {
    scenario_id: baseId,
    scenario_set_id: setId,
    scenario_subject_id: subject.scenario_subject_id,
    scenario_type: L12ScenarioType.BASE_CASE,
    scenario_family: family,
    scenario_name: 'base_case_leverage_driven',
    scenario_summary_code: L12ScenarioSummaryCode.BASE_CASE_LEVERAGE_DRIVEN,
    scope_type: 'asset',
    scope_id: 'BTC',
    as_of: TS,
    path_claim:
      'base case strengthens if spot participation improves; failure risk rises if OI expands and liquidity weakens',
    required_condition_refs: [condId],
    supporting_condition_refs: [condId],
    weakening_condition_refs: [],
    trigger_refs: [trigId],
    invalidation_refs: [invId],
    supporting_evidence_refs: ['l11:score_evidence_pack'],
    contradicting_evidence_refs: [],
    required_confirmation_refs: [],
    unresolved_dependency_refs: [],
    path_confidence_score: 0.45,
    path_confidence_band: L12PathConfidenceBand.MEDIUM,
    path_time_horizon: L12ScenarioTimeHorizon.MEDIUM_TERM,
    readiness_class: L12ScenarioReadinessClass.SCENARIO_READY,
    restriction_profile_ref: 'l12.restriction.btc.v1',
    evidence_pack_ref: 'l11:score_evidence_pack',
    input_snapshot_ref: subject.input_snapshot_ref,
    compute_run_id: 'l12.run.001',
    lineage_refs: ['l12.lineage.scenario.v1'],
    replay_hash: replay,
    policy_version: POLICY,
  } as const;

  const condErrs = validateL12ScenarioCondition(cond);
  const trigErrs = validateL12ScenarioTrigger(trig);
  const invErrs = validateL12ScenarioInvalidation(invObj);
  const scenErrs = validateL12Scenario(baseScen);

  const ok =
    subjErrs.length === 0 &&
    condErrs.length === 0 &&
    trigErrs.length === 0 &&
    invErrs.length === 0 &&
    scenErrs.length === 0;

  return {
    id: 'INV-12.2-B',
    name: 'scenario object completeness law',
    holds: ok,
    evidence:
      `subject=${subjErrs.length}, cond=${condErrs.length}, trig=${trigErrs.length}, ` +
      `inv=${invErrs.length}, scen=${scenErrs.length}`,
  };
}

/* ─────────────────── INV-12.2-C : multi-path law ─────────────────── */
export function checkINV_122_C(): L12_2InvariantResult {
  // Build a known-bad set: one scenario, no alternatives, BASE_WITH_ALTERNATIVES, no insufficiency.
  const setId = 'l12.set.test.bad';
  const badSet = {
    scenario_set_id: setId,
    scenario_subject_id: 'sub_x',
    scope_type: 'asset',
    scope_id: 'BTC',
    as_of: TS,
    base_case_ref: 'l12.scenario.base',
    bullish_scenario_refs: [],
    bearish_scenario_refs: [],
    neutral_scenario_refs: [],
    stress_scenario_refs: [],
    recovery_scenario_refs: [],
    primary_scenario_ref: 'l12.scenario.base',
    secondary_scenario_ref: '',
    scenario_count: 1,
    scenario_spread_score: 1.0,
    scenario_spread_class: L12ScenarioSpreadClass.CLEAR_PRIMARY,
    multi_path_class: L12MultiPathClass.BASE_WITH_ALTERNATIVES,
    path_confidence_profile_ref: 'l12.pcp.x',
    trigger_profile_refs: ['l12.trig.x'],
    invalidation_profile_refs: ['l12.inv.x'],
    shift_condition_set_ref: 'l12.shift.x',
    restriction_profile_ref: 'l12.restr.x',
    supporting_evidence_refs: ['e'],
    contradicting_evidence_refs: [],
    evidence_pack_ref: 'e',
    input_snapshot_ref: 'snap',
    compute_run_id: 'run',
    lineage_refs: ['l12.lineage.set.v1'],
    replay_hash: 'rh',
    policy_version: POLICY,
  } as const;
  const badErrs = validateL12ScenarioSet(badSet);
  const detected =
    badErrs.some(e => e.code === L12ObjectViolationCode.L12O_SINGLE_PATH_FAKE_CERTAINTY);

  // Legal multi-path
  const goodSet = {
    ...badSet,
    bullish_scenario_refs: ['l12.scenario.bull'],
    bearish_scenario_refs: ['l12.scenario.bear'],
    secondary_scenario_ref: 'l12.scenario.bear',
    scenario_count: 3,
  };
  const goodErrs = validateL12ScenarioSet(goodSet);
  const goodPasses = goodErrs.length === 0;

  // Legal single-path with insufficiency declaration
  const sufficient = {
    ...badSet,
    multi_path_class: L12MultiPathClass.INSUFFICIENT_INPUTS_FOR_ALTERNATIVES,
  };
  const sufErrs = validateL12ScenarioSet(sufficient);
  const sufPasses = sufErrs.every(e => e.code !== L12ObjectViolationCode.L12O_SINGLE_PATH_FAKE_CERTAINTY);

  return {
    id: 'INV-12.2-C',
    name: 'scenario set multi-path law',
    holds: detected && goodPasses && sufPasses,
    evidence: `bad_detected=${detected}, good=${goodPasses}, sufficient=${sufPasses}`,
  };
}

/* ─────────────────── INV-12.2-D : invalidation law ─────────────────── */
export function checkINV_122_D(): L12_2InvariantResult {
  // A scenario without invalidation refs must fail
  const noInv = validateL12Scenario({
    scenario_id: 's1',
    scenario_set_id: 'set',
    scenario_subject_id: 'sub',
    scenario_type: L12ScenarioType.BASE_CASE,
    scenario_family: L12ScenarioFamily.SPOT_LED_CONTINUATION,
    scenario_name: 'base_case_spot_led',
    scenario_summary_code: L12ScenarioSummaryCode.BASE_CASE_SPOT_LED,
    scope_type: 'asset',
    scope_id: 'BTC',
    as_of: TS,
    path_claim: 'base case strengthens if spot improves',
    required_condition_refs: ['c'],
    supporting_condition_refs: [],
    weakening_condition_refs: [],
    trigger_refs: ['t'],
    invalidation_refs: [],
    supporting_evidence_refs: ['e'],
    contradicting_evidence_refs: [],
    required_confirmation_refs: [],
    unresolved_dependency_refs: [],
    path_confidence_score: 0.5,
    path_confidence_band: L12PathConfidenceBand.MEDIUM,
    path_time_horizon: L12ScenarioTimeHorizon.MEDIUM_TERM,
    readiness_class: L12ScenarioReadinessClass.SCENARIO_READY,
    restriction_profile_ref: 'r',
    evidence_pack_ref: 'e',
    input_snapshot_ref: 'snap',
    compute_run_id: 'run',
    lineage_refs: ['l'],
    replay_hash: 'rh',
    policy_version: POLICY,
  });
  const detected = noInv.some(e => e.code === L12ObjectViolationCode.L12O_INVALIDATION_REFS_MISSING);

  // An invalidation object missing condition refs must fail
  const badInv = validateL12ScenarioInvalidation({
    invalidation_id: 'inv1',
    scenario_id: 's',
    scenario_set_id: 'set',
    invalidation_type: L12InvalidationType.SUPPORT_FAILURE,
    invalidation_name: 'support_loses',
    invalidation_condition_refs: [],
    invalidation_strength_score: 0.5,
    invalidation_status: L12InvalidationStatus.WATCHING,
    expected_effect: L12InvalidationEffect.PATH_NARROWED,
    evidence_refs: ['e'],
    lineage_refs: ['l'],
    policy_version: POLICY,
    replay_hash: 'rh',
  });
  const badInvDetected = badInv.some(e => e.code === L12ObjectViolationCode.L12O_INVALIDATION_CONDITION_REFS_MISSING);

  return {
    id: 'INV-12.2-D',
    name: 'invalidation law',
    holds: detected && badInvDetected,
    evidence: `scenario_inv_missing=${detected}, inv_obj_cond_missing=${badInvDetected}`,
  };
}

/* ─────────────────── INV-12.2-E : path confidence integrity ─────────────────── */
export function checkINV_122_E(): L12_2InvariantResult {
  const profile = {
    path_confidence_profile_id: buildL12PathConfidenceProfileId({
      scenario_set_id: 'set',
      policy_version: POLICY,
    }),
    scenario_set_id: 'set',
    scenario_confidences: { s1: 0.85 },
    primary_path_confidence_score: 0.85,
    primary_path_confidence_band: L12PathConfidenceBand.VERY_HIGH,
    confidence_spread_to_secondary: 0.4,
    confidence_cap_refs: [],
    confidence_penalty_refs: [],
    ambiguity_score: 0.1,
    contradiction_pressure_score: 0.0,
    missing_visibility_score: 0.0,
    transition_risk_score: 0.0,
    drift_pressure_score: 0.0,
    readiness_class: L12ScenarioReadinessClass.SCENARIO_READY,
    lineage_refs: ['l'],
    replay_hash: 'rh',
    policy_version: POLICY,
  };
  const r1 = validateL12PathConfidenceProfile(profile, {
    hasActiveInvalidation: true,
    hasUnresolvedContradiction: false,
    hasMaterialMissingVisibility: false,
    hasCriticalDrift: false,
  });
  const r2 = validateL12PathConfidenceProfile(profile, {
    hasActiveInvalidation: false,
    hasUnresolvedContradiction: true,
    hasMaterialMissingVisibility: false,
    hasCriticalDrift: false,
  });
  const r3 = validateL12PathConfidenceProfile(profile, {
    hasActiveInvalidation: false,
    hasUnresolvedContradiction: false,
    hasMaterialMissingVisibility: true,
    hasCriticalDrift: false,
  });
  const r4 = validateL12PathConfidenceProfile(profile, {
    hasActiveInvalidation: false,
    hasUnresolvedContradiction: false,
    hasMaterialMissingVisibility: false,
    hasCriticalDrift: true,
  });

  const detected =
    r1.some(e => e.code === L12ObjectViolationCode.L12O_HIGH_CONFIDENCE_WITH_ACTIVE_INVALIDATION) &&
    r2.some(e => e.code === L12ObjectViolationCode.L12O_HIGH_CONFIDENCE_WITH_UNRESOLVED_CONTRADICTION) &&
    r3.some(e => e.code === L12ObjectViolationCode.L12O_HIGH_CONFIDENCE_WITH_MISSING_VISIBILITY) &&
    r4.some(e => e.code === L12ObjectViolationCode.L12O_HIGH_CONFIDENCE_WITH_CRITICAL_DRIFT);

  // Band/score consistency
  const bandsOk = ALL_L12_PATH_CONFIDENCE_BANDS.every(b => {
    // Pick a representative score for each band and round-trip.
    const score =
      b === L12PathConfidenceBand.VERY_LOW ? 0.1 :
      b === L12PathConfidenceBand.LOW ? 0.3 :
      b === L12PathConfidenceBand.MEDIUM ? 0.5 :
      b === L12PathConfidenceBand.HIGH ? 0.7 : 0.9;
    return l12ConfidenceBandFor(score) === b;
  });

  return {
    id: 'INV-12.2-E',
    name: 'path confidence integrity law',
    holds: detected && bandsOk,
    evidence: `blockers_detected=${detected}, bands_ok=${bandsOk}`,
  };
}

/* ─────────────────── INV-12.2-F : shift-condition law ─────────────────── */
export function checkINV_122_F(): L12_2InvariantResult {
  const noShift = validateL12ScenarioShiftConditionSet(
    {
      shift_condition_set_id: 'sh1',
      scenario_set_id: 'set',
      current_primary_scenario_ref: 'p',
      current_secondary_scenario_ref: '',
      conditions_that_strengthen_primary: [],
      conditions_that_weaken_primary: [],
      conditions_that_promote_secondary: [],
      conditions_that_collapse_base_case: [],
      conditions_that_raise_bullish_path: [],
      conditions_that_raise_bearish_path: [],
      spread_narrowing_conditions: [],
      spread_widening_conditions: [],
      lineage_refs: ['l'],
      replay_hash: 'rh',
      policy_version: POLICY,
    },
    { competitionIsClose: true },
  );
  const detected =
    noShift.some(e => e.code === L12ObjectViolationCode.L12O_SHIFT_SECONDARY_REF_MISSING) &&
    noShift.some(e => e.code === L12ObjectViolationCode.L12O_SHIFT_CONDITIONS_MISSING_UNDER_CLOSE_SPREAD);

  const trade = validateL12ScenarioShiftConditionSet(
    {
      shift_condition_set_id: 'sh2',
      scenario_set_id: 'set',
      current_primary_scenario_ref: 'p',
      current_secondary_scenario_ref: 's',
      conditions_that_strengthen_primary: [],
      conditions_that_weaken_primary: ['buy_now_signal'],
      conditions_that_promote_secondary: [],
      conditions_that_collapse_base_case: [],
      conditions_that_raise_bullish_path: [],
      conditions_that_raise_bearish_path: [],
      spread_narrowing_conditions: [],
      spread_widening_conditions: [],
      lineage_refs: ['l'],
      replay_hash: 'rh',
      policy_version: POLICY,
    },
    { competitionIsClose: true },
  );
  const tradeDetected = trade.some(e => e.code === L12ObjectViolationCode.L12O_SHIFT_CONDITIONS_TRADE_LANGUAGE);

  return {
    id: 'INV-12.2-F',
    name: 'shift-condition law',
    holds: detected && tradeDetected,
    evidence: `missing_under_close=${detected}, trade_lang=${tradeDetected}`,
  };
}

/* ─────────────────── INV-12.2-G : restriction profile ─────────────────── */
export function checkINV_122_G(): L12_2InvariantResult {
  const incomplete: L12ScenarioRestrictionProfile = {
    restriction_profile_id: 'r1',
    scenario_set_id: 'set',
    allowed_uses: [L12ScenarioAllowedUse.SCENARIO_WEIGHTING],
    blocked_uses: [], // missing all mandatory
    required_disclosures: [],
    restriction_reason_codes: [],
    lineage_refs: ['l'],
    replay_hash: 'rh',
    policy_version: POLICY,
  };
  const incErrs = validateL12ScenarioRestrictionProfile(incomplete);
  const detected =
    incErrs.some(e => e.code === L12ObjectViolationCode.L12O_RESTRICTION_RECOMMENDATION_NOT_BLOCKED) &&
    incErrs.some(e => e.code === L12ObjectViolationCode.L12O_RESTRICTION_PREDICTION_NOT_BLOCKED) &&
    incErrs.some(e => e.code === L12ObjectViolationCode.L12O_RESTRICTION_TRADE_NOT_BLOCKED) &&
    incErrs.some(e => e.code === L12ObjectViolationCode.L12O_RESTRICTION_FINAL_JUDGMENT_NOT_BLOCKED) &&
    incErrs.some(e => e.code === L12ObjectViolationCode.L12O_RESTRICTION_CERTAINTY_NOT_BLOCKED) &&
    incErrs.some(e => e.code === L12ObjectViolationCode.L12O_RESTRICTION_SCORE_REPLACEMENT_NOT_BLOCKED);

  const complete: L12ScenarioRestrictionProfile = {
    ...incomplete,
    blocked_uses: [...L12_MANDATORY_BLOCKED_USES],
    required_disclosures: [],
  };
  const compErrs = validateL12ScenarioRestrictionProfile(complete);
  const compClean = compErrs.length === 0;

  // Mandatory list is exactly the 6 critical ones
  const mandatoryOk =
    L12_MANDATORY_BLOCKED_USES.includes(L12ScenarioBlockedUse.RECOMMENDATION_OUTPUT) &&
    L12_MANDATORY_BLOCKED_USES.includes(L12ScenarioBlockedUse.PREDICTION_OUTPUT) &&
    L12_MANDATORY_BLOCKED_USES.includes(L12ScenarioBlockedUse.TRADE_ACTION_OUTPUT) &&
    L12_MANDATORY_BLOCKED_USES.includes(L12ScenarioBlockedUse.FINAL_JUDGMENT_WITHOUT_L13) &&
    L12_MANDATORY_BLOCKED_USES.includes(L12ScenarioBlockedUse.CERTAINTY_CLAIM) &&
    L12_MANDATORY_BLOCKED_USES.includes(L12ScenarioBlockedUse.SCORE_REPLACEMENT);

  return {
    id: 'INV-12.2-G',
    name: 'restriction profile law',
    holds: detected && compClean && mandatoryOk,
    evidence: `incomplete_detected=${detected}, complete_clean=${compClean}, mandatory=${mandatoryOk}`,
  };
}

/* ─────────────────── INV-12.2-H : non-prediction object law ─────────────────── */
export function checkINV_122_H(): L12_2InvariantResult {
  // Names must reject prediction theater / recommendation / judgment / trade
  const namesBlocked = [
    'guaranteed_path',
    'buy_signal',
    'final_scenario',
    'trade_ready_scenario',
    'scenario_winner',
    'forecast_signal',
  ].every(n => containsL12ForbiddenNaming(n));

  // Path-claim text detectors
  const predictDetected = detectL12PredictionTheater('this path is guaranteed and cannot fail');
  const recDetected = detectL12RecommendationLanguage('buy signal triggered for this asset');
  const judgmentDetected = detectL12JudgmentLanguage('final scenario chosen as winner');

  // Family / type / summary code: no name carries forbidden semantics
  const familyClean = ALL_L12_SCENARIO_FAMILIES.every(f => !containsL12ForbiddenNaming(f));
  const typeClean = ALL_L12_SCENARIO_TYPES.every(t => !containsL12ForbiddenNaming(t));
  const summaryClean = Object.values(L12ScenarioSummaryCode).every(c => !containsL12ForbiddenNaming(c));

  // Type/family pairing legality is actually exposed
  const allTypesRegistered = ALL_L12_SCENARIO_TYPES.every(t => isL12ScenarioTypeRegistered(t));
  const someLegal = isL12LegalTypeFamilyPairing(
    L12ScenarioType.BASE_CASE,
    L12ScenarioFamily.SPOT_LED_CONTINUATION,
  );
  const someIllegal = !isL12LegalTypeFamilyPairing(
    L12ScenarioType.RECOVERY_CASE,
    L12ScenarioFamily.RISK_OFF_BREAKDOWN,
  );

  return {
    id: 'INV-12.2-H',
    name: 'non-prediction object law',
    holds:
      namesBlocked &&
      predictDetected &&
      recDetected &&
      judgmentDetected &&
      familyClean &&
      typeClean &&
      summaryClean &&
      allTypesRegistered &&
      someLegal &&
      someIllegal,
    evidence:
      `names_blocked=${namesBlocked}, predict=${predictDetected}, rec=${recDetected}, ` +
      `judgment=${judgmentDetected}, family_clean=${familyClean}, type_clean=${typeClean}, ` +
      `summary_clean=${summaryClean}, all_types=${allTypesRegistered}, legal=${someLegal}, illegal_blocked=${someIllegal}`,
  };
}

export function checkAllL12_2Invariants(): readonly L12_2InvariantResult[] {
  return [
    checkINV_122_A(),
    checkINV_122_B(),
    checkINV_122_C(),
    checkINV_122_D(),
    checkINV_122_E(),
    checkINV_122_F(),
    checkINV_122_G(),
    checkINV_122_H(),
  ];
}
