/**
 * L12.3 — Contract invariants (§12.3.21).
 *
 *   INV-12.3-A : subject contract law
 *   INV-12.3-B : scenario set contract law
 *   INV-12.3-C : scenario path contract law
 *   INV-12.3-D : trigger and invalidation law
 *   INV-12.3-E : L11 score-context law
 *   INV-12.3-F : cleanliness law
 *   INV-12.3-G : compatibility law
 *   INV-12.3-H : non-prediction law
 */

import {
  L12_DEFAULT_SCORE_CONTEXT_POLICY,
  L12_STRICT_ALT_PATH_POLICY,
  L12_STRICT_BASE_CASE_POLICY,
  L12_STRICT_CONTRADICTION_POLICY,
  L12_STRICT_DRIFT_POLICY,
  L12_STRICT_EVIDENCE_POLICY,
  L12_STRICT_INVALIDATION_POLICY,
  L12_STRICT_LINEAGE_POLICY,
  L12_STRICT_MATERIALIZATION_POLICY,
  L12_STRICT_RESTRICTION_POLICY,
  L12_STRICT_SHIFT_POLICY,
  L12_STRICT_TRIGGER_POLICY,
} from '../contracts/scenario-contract-policies';
import { L12ScenarioFamily } from '../contracts/scenario-family';
import { L12ScenarioInputRequirementClass } from '../contracts/scenario-input-requirement.contract';
import { L12PathConfidenceBand } from '../contracts/path-confidence-profile';
import { L12ScenarioReadinessClass } from '../contracts/scenario-object-readiness';
import { L12ScenarioOutputReadinessClass } from '../contracts/scenario-output-readiness.contract';
import {
  L12ScenarioContractCompatibilityClass,
  L12ScenarioContractSurface,
} from '../contracts/scenario-contract-versioning';
import {
  L12ScenarioAllowedUse,
  L12ScenarioBlockedUse,
  L12ScenarioDisclosureRequirement,
} from '../contracts/scenario-restriction-profile';
import { L12ScenarioRestrictionReasonCode } from '../contracts/scenario-restriction.contract';
import {
  L12ScenarioSpreadClass,
  L12MultiPathClass,
} from '../contracts/scenario-set';
import { L12ScenarioCoexistenceClass } from '../contracts/scenario-coexistence';
import { L12ScenarioSubjectClass } from '../contracts/scenario-subject';
import { L12ScenarioTimeHorizon } from '../contracts/scenario-time-horizon';
import { L12ScenarioType } from '../contracts/scenario-type';
import { L12ScenarioSummaryCode } from '../contracts/scenario-summary-code';
import { L12DependencyLayer, L12DependencySurfaceClass } from '../contracts/l12-constitutional-types';
import { L12TriggerCheckFrequencyClass } from '../contracts/scenario-trigger.contract';
import {
  L12ConditionMaterialityClass,
  L12ConditionOperator,
  L12ConditionRole,
  L12ConditionSourceLayer,
  L12ConditionStatus,
  L12ScenarioConditionType,
} from '../contracts/scenario-condition';
import {
  L12TriggerEffect,
  L12TriggerStatus,
  L12TriggerType,
} from '../contracts/scenario-trigger';
import {
  L12InvalidationEffect,
  L12InvalidationStatus,
  L12InvalidationType,
} from '../contracts/scenario-invalidation';

import type { L12ScenarioSubjectContract } from '../contracts/scenario-subject.contract';
import type { L12ScenarioSetContract } from '../contracts/scenario-set.contract';
import type { L12ScenarioPathContract } from '../contracts/scenario-path.contract';
import type { L12ConditionContract } from '../contracts/scenario-condition.contract';
import type { L12TriggerContract } from '../contracts/scenario-trigger.contract';
import type { L12InvalidationContract } from '../contracts/scenario-invalidation.contract';
import type { L12PathConfidenceContract } from '../contracts/path-confidence.contract';
import type { L12ShiftConditionContract } from '../contracts/scenario-shift-condition.contract';
import type { L12RestrictionContract } from '../contracts/scenario-restriction.contract';
import type { L12ScenarioEvidencePackContract } from '../contracts/scenario-evidence-pack.contract';
import type { L12ScenarioReplayIdentity } from '../contracts/scenario-replay-identity.contract';

import { L12ContractViolationCode } from '../validation/l12-contract-violation-codes';
import { validateL12ScenarioSubjectContract } from '../validation/scenario-subject-contract.validator';
import { validateL12ScenarioSetContract } from '../validation/scenario-set-contract.validator';
import { validateL12ScenarioPathContract } from '../validation/scenario-path-contract.validator';
import { validateL12ConditionContract } from '../validation/condition-contract.validator';
import { validateL12TriggerContract } from '../validation/trigger-contract.validator';
import { validateL12InvalidationContract } from '../validation/invalidation-contract.validator';
import { validateL12PathConfidenceContract } from '../validation/path-confidence-contract.validator';
import { validateL12ShiftConditionContract } from '../validation/shift-condition-contract.validator';
import { validateL12RestrictionContract } from '../validation/restriction-contract.validator';
import { validateL12EvidencePackContract } from '../validation/evidence-pack-contract.validator';
import { validateL12ReplayIdentity } from '../validation/replay-identity-contract.validator';
import { validateL12ScenarioOutputReadiness } from '../validation/scenario-output-readiness.validator';
import { validateL12ScenarioCleanliness } from '../validation/scenario-cleanliness.validator';
import { validateL12ContractDelta } from '../validation/scenario-contract-compatibility.validator';

const POLICY = 'l12.3.invariants.v1';

export interface L12_3InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

/* ──────────────────────── builders ──────────────────────── */

export function buildCanonicalL12SubjectContract(): L12ScenarioSubjectContract {
  return {
    scenario_subject_contract_id: 'subj.contract.canon',
    scenario_subject_id: 'subj.canon',
    subject_contract_version: '1.0.0',
    subject_class: L12ScenarioSubjectClass.ASSET_SCENARIO,
    scope_type: 'asset',
    scope_id: 'btc',
    scope_granularity: 'asset',
    as_of: '2026-05-08T00:00:00Z',
    allowed_scenario_families: [L12ScenarioFamily.SPOT_LED_CONTINUATION],
    forbidden_scenario_families: [],
    required_validation_inputs: [
      {
        input_requirement_id: 'inp.val',
        source_layer: L12DependencyLayer.L7,
        surface_class: L12DependencySurfaceClass.L7_VALIDATION_ASSESSMENT,
        requirement_class: L12ScenarioInputRequirementClass.REQUIRED_VALIDATION_INPUT,
        required_for: [],
        scope_match_required: true,
        freshness_required: true,
        restriction_consumption_required: true,
        contradiction_consumption_required: true,
        evidence_required: true,
        lineage_required: true,
        replay_hash_required: true,
        allow_evidence_only: false,
        allow_historical: false,
        policy_version: POLICY,
      },
    ],
    required_regime_inputs: [],
    required_sequence_inputs: [],
    required_hypothesis_inputs: [],
    required_score_context_inputs: [
      {
        input_requirement_id: 'inp.score',
        source_layer: L12DependencyLayer.L11,
        surface_class: L12DependencySurfaceClass.L11_SCORE_COMPONENT_BREAKDOWN,
        requirement_class: L12ScenarioInputRequirementClass.REQUIRED_SCORE_CONTEXT_INPUT,
        required_for: [],
        scope_match_required: true,
        freshness_required: true,
        restriction_consumption_required: true,
        contradiction_consumption_required: true,
        evidence_required: true,
        lineage_required: true,
        replay_hash_required: true,
        allow_evidence_only: false,
        allow_historical: false,
        policy_version: POLICY,
      },
    ],
    required_context_inputs: [],
    optional_context_inputs: [],
    historical_inputs: [],
    evidence_only_inputs: [],
    scenario_window: {
      window_start: '2026-05-08T00:00:00Z',
      window_end: '2026-05-09T00:00:00Z',
      horizon: L12ScenarioTimeHorizon.SHORT_TERM,
    },
    path_horizon: L12ScenarioTimeHorizon.SHORT_TERM,
    base_case_requirement_policy: L12_STRICT_BASE_CASE_POLICY,
    alternative_path_requirement_policy: L12_STRICT_ALT_PATH_POLICY,
    trigger_requirement_policy: L12_STRICT_TRIGGER_POLICY,
    invalidation_requirement_policy: L12_STRICT_INVALIDATION_POLICY,
    shift_condition_requirement_policy: L12_STRICT_SHIFT_POLICY,
    l11_score_context_policy: L12_DEFAULT_SCORE_CONTEXT_POLICY,
    restriction_consumption_policy: L12_STRICT_RESTRICTION_POLICY,
    contradiction_consumption_policy: L12_STRICT_CONTRADICTION_POLICY,
    drift_consumption_policy: L12_STRICT_DRIFT_POLICY,
    evidence_pack_policy: L12_STRICT_EVIDENCE_POLICY,
    materialization_policy: L12_STRICT_MATERIALIZATION_POLICY,
    lineage_policy: L12_STRICT_LINEAGE_POLICY,
    policy_version: POLICY,
    replay_hash: 'rh.subj',
  };
}

export function buildCanonicalL12SetContract(): L12ScenarioSetContract {
  return {
    scenario_set_contract_id: 'set.contract.canon',
    scenario_set_id: 'set.canon',
    scenario_subject_id: 'subj.canon',
    scope_type: 'asset',
    scope_id: 'btc',
    as_of: '2026-05-08T00:00:00Z',
    base_case_ref: 'scen.base',
    scenario_refs: ['scen.base', 'scen.alt'],
    bullish_scenario_refs: ['scen.base'],
    bearish_scenario_refs: ['scen.alt'],
    neutral_scenario_refs: [],
    stress_scenario_refs: [],
    recovery_scenario_refs: [],
    primary_scenario_ref: 'scen.base',
    secondary_scenario_ref: 'scen.alt',
    scenario_count: 2,
    scenario_spread_score: 0.4,
    scenario_spread_class: L12ScenarioSpreadClass.MODERATE_PRIMARY,
    coexistence_class: L12ScenarioCoexistenceClass.CLEAN_BASE_WITH_ALTERNATIVES,
    multi_path_class: L12MultiPathClass.BASE_WITH_ALTERNATIVES,
    path_confidence_profile_ref: 'pcp.canon',
    trigger_profile_refs: ['trig.canon'],
    invalidation_profile_refs: ['inv.canon'],
    shift_condition_set_ref: 'shift.canon',
    restriction_profile_ref: 'rest.canon',
    supporting_evidence_refs: ['ev.support'],
    contradicting_evidence_refs: [],
    evidence_pack_ref: 'epack.canon',
    input_snapshot_ref: 'snap.canon',
    compute_run_id: 'run.canon',
    lineage_refs: ['lin.canon'],
    replay_hash: 'rh.set',
    policy_version: POLICY,
  };
}

export function buildCanonicalL12PathContract(): L12ScenarioPathContract {
  return {
    scenario_contract_id: 'path.contract.canon',
    scenario_id: 'scen.base',
    scenario_set_id: 'set.canon',
    scenario_subject_id: 'subj.canon',
    scenario_type: L12ScenarioType.BASE_CASE,
    scenario_family: L12ScenarioFamily.SPOT_LED_CONTINUATION,
    scenario_name: 'spot_led_continuation_base',
    scenario_summary_code: L12ScenarioSummaryCode.BASE_CASE_SPOT_LED,
    scope_type: 'asset',
    scope_id: 'btc',
    as_of: '2026-05-08T00:00:00Z',
    path_claim:
      'Continuation path strengthens if spot participation improves while funding cools.',
    required_condition_refs: ['cond.req'],
    supporting_condition_refs: [],
    weakening_condition_refs: [],
    trigger_refs: ['trig.canon'],
    invalidation_refs: ['inv.canon'],
    supporting_evidence_refs: ['ev.support'],
    contradicting_evidence_refs: [],
    required_confirmation_refs: [],
    unresolved_dependency_refs: [],
    path_confidence_score: 0.55,
    path_confidence_band: L12PathConfidenceBand.MEDIUM,
    path_time_horizon: L12ScenarioTimeHorizon.SHORT_TERM,
    readiness_class: L12ScenarioReadinessClass.READY_WITH_DISCLOSURE,
    restriction_profile_ref: 'rest.canon',
    evidence_pack_ref: 'epack.canon',
    input_snapshot_ref: 'snap.canon',
    compute_run_id: 'run.canon',
    lineage_refs: ['lin.canon'],
    replay_hash: 'rh.path',
    policy_version: POLICY,
  };
}

export function buildCanonicalL12ConditionContract(): L12ConditionContract {
  return {
    condition_contract_id: 'cond.contract.canon',
    condition_id: 'cond.req',
    scenario_id: 'scen.base',
    scenario_set_id: 'set.canon',
    condition_type: L12ScenarioConditionType.SCORE_CONDITION,
    condition_role: L12ConditionRole.REQUIRED_FOR_PATH,
    source_layer: L12ConditionSourceLayer.L11,
    required_surface_ref: 'l11:score.bundle',
    current_state_ref: 'l11:score.bundle@now',
    operator: L12ConditionOperator.GREATER_OR_EQUAL,
    threshold_value: 0.6,
    condition_status: L12ConditionStatus.SATISFIED,
    materiality_class: L12ConditionMaterialityClass.MATERIAL,
    evidence_refs: ['ev.support'],
    lineage_refs: ['lin.canon'],
    monitorable: true,
    restriction_aware: true,
    contradiction_aware: true,
    policy_version: POLICY,
    replay_hash: 'rh.cond',
  };
}

export function buildCanonicalL12TriggerContract(): L12TriggerContract {
  return {
    trigger_contract_id: 'trig.contract.canon',
    trigger_id: 'trig.canon',
    scenario_id: 'scen.base',
    scenario_set_id: 'set.canon',
    trigger_type: L12TriggerType.BULLISH_CONFIRMATION_TRIGGER,
    trigger_name: 'spot_participation_strengthens',
    trigger_condition_refs: ['cond.req'],
    trigger_status: L12TriggerStatus.WATCHING,
    trigger_strength_score: 0.55,
    trigger_materiality_class: L12ConditionMaterialityClass.MATERIAL,
    expected_effect_on_scenario: L12TriggerEffect.STRENGTHENS_PRIMARY,
    monitoring_requirement: {
      monitorable: true,
      required_surface_refs: ['l11:score.bundle'],
      check_frequency_class: L12TriggerCheckFrequencyClass.MINUTE,
      stale_after_ms: 60000,
      blocked_if_surface_missing: true,
      policy_version: POLICY,
    },
    evidence_refs: ['ev.support'],
    lineage_refs: ['lin.canon'],
    policy_version: POLICY,
    replay_hash: 'rh.trig',
  };
}

export function buildCanonicalL12InvalidationContract(): L12InvalidationContract {
  return {
    invalidation_contract_id: 'inv.contract.canon',
    invalidation_id: 'inv.canon',
    scenario_id: 'scen.base',
    scenario_set_id: 'set.canon',
    invalidation_type: L12InvalidationType.SUPPORT_FAILURE,
    invalidation_name: 'spot_participation_collapses',
    invalidation_condition_refs: ['cond.req'],
    invalidation_strength_score: 0.5,
    invalidation_status: L12InvalidationStatus.WATCHING,
    expected_effect: L12InvalidationEffect.PATH_NARROWED,
    monitoring_requirement: {
      monitorable: true,
      required_surface_refs: ['l11:score.bundle'],
      check_frequency_class: L12TriggerCheckFrequencyClass.MINUTE,
      stale_after_ms: 60000,
      blocks_clean_output_if_missing: true,
      policy_version: POLICY,
    },
    evidence_refs: ['ev.support'],
    lineage_refs: ['lin.canon'],
    policy_version: POLICY,
    replay_hash: 'rh.inv',
  };
}

export function buildCanonicalL12PathConfidenceContract(): L12PathConfidenceContract {
  return {
    path_confidence_contract_id: 'pcp.contract.canon',
    path_confidence_profile_id: 'pcp.canon',
    scenario_set_id: 'set.canon',
    scenario_confidences: { 'scen.base': 0.55, 'scen.alt': 0.4 },
    primary_path_confidence_score: 0.55,
    primary_path_confidence_band: L12PathConfidenceBand.MEDIUM,
    confidence_spread_to_secondary: 0.15,
    confidence_cap_refs: [],
    confidence_penalty_refs: [],
    ambiguity_score: 0.2,
    contradiction_pressure_score: 0,
    missing_visibility_score: 0,
    transition_risk_score: 0.1,
    drift_pressure_score: 0,
    active_invalidation_score: 0,
    unresolved_trigger_score: 0,
    readiness_class: L12ScenarioReadinessClass.READY_WITH_DISCLOSURE,
    cap_reason_refs: [],
    restriction_reason_refs: [],
    lineage_refs: ['lin.canon'],
    replay_hash: 'rh.pcp',
    policy_version: POLICY,
  };
}

export function buildCanonicalL12ShiftContract(): L12ShiftConditionContract {
  return {
    shift_condition_contract_id: 'shift.contract.canon',
    shift_condition_set_id: 'shift.canon',
    scenario_set_id: 'set.canon',
    current_primary_scenario_ref: 'scen.base',
    current_secondary_scenario_ref: 'scen.alt',
    conditions_that_strengthen_primary: ['cond.req'],
    conditions_that_weaken_primary: [],
    conditions_that_promote_secondary: ['cond.req'],
    conditions_that_collapse_base_case: [],
    conditions_that_raise_bullish_path: [],
    conditions_that_raise_bearish_path: [],
    spread_narrowing_conditions: [],
    spread_widening_conditions: [],
    required_under_close_competition: false,
    lineage_refs: ['lin.canon'],
    replay_hash: 'rh.shift',
    policy_version: POLICY,
  };
}

export function buildCanonicalL12RestrictionContract(): L12RestrictionContract {
  return {
    restriction_contract_id: 'rest.contract.canon',
    restriction_profile_id: 'rest.canon',
    scenario_set_id: 'set.canon',
    allowed_uses: [L12ScenarioAllowedUse.JUDGMENT_SUPPORT_WITH_DISCLOSURE],
    blocked_uses: [
      L12ScenarioBlockedUse.RECOMMENDATION_OUTPUT,
      L12ScenarioBlockedUse.PREDICTION_OUTPUT,
      L12ScenarioBlockedUse.TRADE_ACTION_OUTPUT,
      L12ScenarioBlockedUse.FINAL_JUDGMENT_WITHOUT_L13,
      L12ScenarioBlockedUse.CERTAINTY_CLAIM,
      L12ScenarioBlockedUse.SCORE_REPLACEMENT,
      L12ScenarioBlockedUse.LIVE_OUTPUT_WITHOUT_DISCLOSURE,
    ],
    required_disclosures: [
      L12ScenarioDisclosureRequirement.CONDITIONALITY_DISCLOSURE,
      L12ScenarioDisclosureRequirement.INVALIDATION_DISCLOSURE,
      L12ScenarioDisclosureRequirement.ALTERNATIVES_DISCLOSURE,
    ],
    restriction_reason_codes: [L12ScenarioRestrictionReasonCode.CONSTITUTIONAL_BASELINE],
    downstream_consumption_limits: [],
    lineage_refs: ['lin.canon'],
    replay_hash: 'rh.rest',
    policy_version: POLICY,
  };
}

export function buildCanonicalL12EvidencePack(): L12ScenarioEvidencePackContract {
  return {
    evidence_pack_contract_id: 'epack.contract.canon',
    evidence_pack_ref: 'epack.canon',
    scenario_set_id: 'set.canon',
    subject_ref: 'subj.canon',
    scenario_refs: ['scen.base'],
    condition_refs: ['cond.req'],
    trigger_refs: ['trig.canon'],
    invalidation_refs: ['inv.canon'],
    confidence_profile_refs: ['pcp.canon'],
    shift_condition_refs: ['shift.canon'],
    restriction_profile_refs: ['rest.canon'],
    lower_layer_evidence_refs: ['l7:validation.bundle'],
    validation_evidence_refs: ['l7:validation.bundle'],
    regime_evidence_refs: [],
    sequence_evidence_refs: [],
    hypothesis_evidence_refs: [],
    score_evidence_refs: ['l11:score.bundle'],
    input_snapshot_ref: 'snap.canon',
    lineage_refs: ['lin.canon'],
    archive_policy_ref: 'archive.canon',
    replay_safe_ref: 'replay.canon',
    policy_version: POLICY,
    replay_hash: 'rh.epack',
  };
}

export function buildCanonicalL12ReplayIdentity(): L12ScenarioReplayIdentity {
  return {
    replay_identity_id: 'rep.canon',
    scenario_subject_id: 'subj.canon',
    scenario_set_id: 'set.canon',
    scenario_contract_version: '1.0.0',
    subject_replay_hash: 'rh.subj',
    set_replay_hash: 'rh.set',
    scenario_replay_hashes: ['rh.path'],
    condition_replay_hashes: ['rh.cond'],
    trigger_replay_hashes: ['rh.trig'],
    invalidation_replay_hashes: ['rh.inv'],
    confidence_replay_hash: 'rh.pcp',
    shift_condition_replay_hash: 'rh.shift',
    restriction_replay_hash: 'rh.rest',
    evidence_pack_replay_hash: 'rh.epack',
    input_snapshot_ref: 'snap.canon',
    lower_layer_snapshot_refs: ['l11:score.bundle@snap'],
    policy_version: POLICY,
    replay_hash: 'rh.replay',
  };
}

/* ──────────────────────── invariants ──────────────────────── */

/* INV-12.3-A subject contract law */
export function checkINV_123_A(): L12_3InvariantResult {
  const ok = validateL12ScenarioSubjectContract(buildCanonicalL12SubjectContract())
    .length === 0;
  // Weakened score-context policy must reject
  const weakened = {
    ...buildCanonicalL12SubjectContract(),
    l11_score_context_policy: {
      ...L12_DEFAULT_SCORE_CONTEXT_POLICY,
      requires_drift_status: false as unknown as true,
    },
  };
  const weakenedRejected = validateL12ScenarioSubjectContract(weakened).some(
    e => e.code === L12ContractViolationCode.L12K_SCORE_CONTEXT_POLICY_WEAKENED,
  );
  // Missing trigger / invalidation policies must reject
  const missingTrigger = {
    ...buildCanonicalL12SubjectContract(),
    trigger_requirement_policy: undefined as unknown as L12ScenarioSubjectContract['trigger_requirement_policy'],
  };
  const missingTriggerRejected = validateL12ScenarioSubjectContract(missingTrigger).some(
    e => e.code === L12ContractViolationCode.L12K_TRIGGER_POLICY_MISSING,
  );

  return {
    id: 'INV-12.3-A',
    name: 'subject contract law',
    holds: ok && weakenedRejected && missingTriggerRejected,
    evidence: `canon_clean=${ok}, score_weakened=${weakenedRejected}, trigger_missing=${missingTriggerRejected}`,
  };
}

/* INV-12.3-B scenario set contract law */
export function checkINV_123_B(): L12_3InvariantResult {
  const ok = validateL12ScenarioSetContract(buildCanonicalL12SetContract()).length === 0;
  const noBase = { ...buildCanonicalL12SetContract(), base_case_ref: '' };
  const baseRejected = validateL12ScenarioSetContract(noBase).some(
    e => e.code === L12ContractViolationCode.L12K_BASE_CASE_ABSENT,
  );
  const noTrig = { ...buildCanonicalL12SetContract(), trigger_profile_refs: [] };
  const trigRejected = validateL12ScenarioSetContract(noTrig).some(
    e => e.code === L12ContractViolationCode.L12K_TRIGGER_PROFILE_ABSENT,
  );
  const noInv = { ...buildCanonicalL12SetContract(), invalidation_profile_refs: [] };
  const invRejected = validateL12ScenarioSetContract(noInv).some(
    e => e.code === L12ContractViolationCode.L12K_INVALIDATION_ABSENT,
  );
  return {
    id: 'INV-12.3-B',
    name: 'scenario set contract law',
    holds: ok && baseRejected && trigRejected && invRejected,
    evidence: `canon_clean=${ok}, base=${baseRejected}, trig=${trigRejected}, inv=${invRejected}`,
  };
}

/* INV-12.3-C scenario path contract law */
export function checkINV_123_C(): L12_3InvariantResult {
  const ok = validateL12ScenarioPathContract(buildCanonicalL12PathContract()).length === 0;
  const noTrig = { ...buildCanonicalL12PathContract(), trigger_refs: [] };
  const trigRejected = validateL12ScenarioPathContract(noTrig).some(
    e => e.code === L12ContractViolationCode.L12K_TRIGGER_REFS_ABSENT,
  );
  const noInv = { ...buildCanonicalL12PathContract(), invalidation_refs: [] };
  const invRejected = validateL12ScenarioPathContract(noInv).some(
    e => e.code === L12ContractViolationCode.L12K_INVALIDATION_REFS_ABSENT,
  );
  const declarative = { ...buildCanonicalL12PathContract(), path_claim: 'price will go higher' };
  const declRejected = validateL12ScenarioPathContract(declarative).some(
    e => e.code === L12ContractViolationCode.L12K_PATH_CLAIM_NOT_CONDITIONAL,
  );
  return {
    id: 'INV-12.3-C',
    name: 'scenario path contract law',
    holds: ok && trigRejected && invRejected && declRejected,
    evidence: `canon_clean=${ok}, trig=${trigRejected}, inv=${invRejected}, declarative=${declRejected}`,
  };
}

/* INV-12.3-D trigger and invalidation law */
export function checkINV_123_D(): L12_3InvariantResult {
  const trigOk = validateL12TriggerContract(buildCanonicalL12TriggerContract()).length === 0;
  const invOk = validateL12InvalidationContract(buildCanonicalL12InvalidationContract()).length === 0;
  const guaranteed = {
    ...buildCanonicalL12TriggerContract(),
    trigger_name: 'guaranteed_breakout',
  };
  const trigGuaranteedRejected = validateL12TriggerContract(guaranteed).some(
    e => e.code === L12ContractViolationCode.L12K_TRIGGER_GUARANTEED_OUTCOME,
  );
  const trade = {
    ...buildCanonicalL12TriggerContract(),
    trigger_name: 'btc_buy_signal',
  };
  const trigTradeRejected = validateL12TriggerContract(trade).some(
    e => e.code === L12ContractViolationCode.L12K_TRIGGER_TRADE_INSTRUCTION,
  );
  // Trigger absent on path → critical
  const noInvOnPath = { ...buildCanonicalL12PathContract(), invalidation_refs: [] };
  const pathInvRejected = validateL12ScenarioPathContract(noInvOnPath).some(
    e => e.code === L12ContractViolationCode.L12K_INVALIDATION_REFS_ABSENT,
  );
  const noTrigOnPath = { ...buildCanonicalL12PathContract(), trigger_refs: [] };
  const pathTrigRejected = validateL12ScenarioPathContract(noTrigOnPath).some(
    e => e.code === L12ContractViolationCode.L12K_TRIGGER_REFS_ABSENT,
  );
  return {
    id: 'INV-12.3-D',
    name: 'trigger and invalidation law',
    holds:
      trigOk &&
      invOk &&
      trigGuaranteedRejected &&
      trigTradeRejected &&
      pathInvRejected &&
      pathTrigRejected,
    evidence: `t_canon=${trigOk}, i_canon=${invOk}, t_guaranteed=${trigGuaranteedRejected}, t_trade=${trigTradeRejected}, p_inv=${pathInvRejected}, p_trig=${pathTrigRejected}`,
  };
}

/* INV-12.3-E L11 score-context law */
export function checkINV_123_E(): L12_3InvariantResult {
  // Require both: subject contract enforces full score-context policy AND
  // weakened forms reject.
  const ok = validateL12ScenarioSubjectContract(buildCanonicalL12SubjectContract())
    .length === 0;
  const flags: Array<keyof typeof L12_DEFAULT_SCORE_CONTEXT_POLICY> = [
    'requires_score_output',
    'requires_component_breakdown',
    'requires_attribution',
    'requires_missing_data_profile',
    'requires_modifier_profile',
    'requires_drift_status',
    'requires_restriction_profile',
    'requires_lineage',
    'requires_replay_hash',
    'score_value_only_forbidden',
    'recompute_scores_forbidden',
  ];
  const eachRejects = flags.every(k => {
    const weakened = {
      ...buildCanonicalL12SubjectContract(),
      l11_score_context_policy: {
        ...L12_DEFAULT_SCORE_CONTEXT_POLICY,
        [k]: false as unknown as boolean,
      } as unknown as L12ScenarioSubjectContract['l11_score_context_policy'],
    };
    return validateL12ScenarioSubjectContract(weakened).some(
      e => e.code === L12ContractViolationCode.L12K_SCORE_CONTEXT_POLICY_WEAKENED,
    );
  });
  return {
    id: 'INV-12.3-E',
    name: 'L11 score-context law',
    holds: ok && eachRejects,
    evidence: `canon_clean=${ok}, each_flag_rejects=${eachRejects}`,
  };
}

/* INV-12.3-F cleanliness law */
export function checkINV_123_F(): L12_3InvariantResult {
  const baseInputs: import('../contracts/scenario-output-readiness.contract').L12ScenarioOutputReadinessInputs = {
    hasBaseCase: true,
    hasAlternativePath: true,
    triggersComplete: true,
    invalidationsComplete: true,
    confidenceClean: true,
    shiftConditionsCompleteWhenRequired: true,
    restrictionProfileComplete: true,
    l11ScoreContextComplete: true,
    evidencePackComplete: true,
    replayIdentityComplete: true,
    hasPredictionLeak: false,
    hasRecommendationLeak: false,
    hasJudgmentLeak: false,
    hasTradeLeak: false,
    hasActiveInvalidation: false,
    contradictionUnresolved: false,
    missingVisibilityMaterial: false,
    driftMaterial: false,
    multiPathUnresolved: false,
    disclosuresPresent: false,
    restrictionBlocksEmission: false,
  };
  const cleanOk = validateL12ScenarioCleanliness(
    { claims_clean: true },
    baseInputs,
  ).length === 0;
  const cases: Array<[string, Partial<typeof baseInputs>, L12ContractViolationCode]> = [
    [
      'invalidation_active',
      { hasActiveInvalidation: true },
      L12ContractViolationCode.L12K_OUTPUT_CLEAN_WHILE_INVALIDATION_ACTIVE,
    ],
    [
      'trigger_missing',
      { triggersComplete: false },
      L12ContractViolationCode.L12K_OUTPUT_CLEAN_WHILE_TRIGGER_MISSING,
    ],
    [
      'alt_absent',
      { hasAlternativePath: false },
      L12ContractViolationCode.L12K_OUTPUT_CLEAN_WHILE_ALT_PATH_ABSENT,
    ],
    [
      'score_ctx_incomplete',
      { l11ScoreContextComplete: false },
      L12ContractViolationCode.L12K_OUTPUT_CLEAN_WHILE_SCORE_CONTEXT_INCOMPLETE,
    ],
    [
      'contradiction_unresolved',
      { contradictionUnresolved: true },
      L12ContractViolationCode.L12K_OUTPUT_CLEAN_WHILE_CONTRADICTION_UNRESOLVED,
    ],
    [
      'drift_material',
      { driftMaterial: true },
      L12ContractViolationCode.L12K_OUTPUT_CLEAN_WHILE_DRIFT_HIDDEN,
    ],
    [
      'visibility_missing',
      { missingVisibilityMaterial: true },
      L12ContractViolationCode.L12K_OUTPUT_CLEAN_WHILE_VISIBILITY_MISSING,
    ],
    [
      'shift_required',
      { shiftConditionsCompleteWhenRequired: false },
      L12ContractViolationCode.L12K_OUTPUT_CLEAN_WHILE_SHIFT_REQUIRED,
    ],
    [
      'leakage',
      { hasPredictionLeak: true },
      L12ContractViolationCode.L12K_OUTPUT_LEAKAGE_DETECTED,
    ],
  ];
  const allDetect = cases.every(([, patch, code]) =>
    validateL12ScenarioCleanliness(
      { claims_clean: true },
      { ...baseInputs, ...patch },
    ).some(e => e.code === code),
  );
  return {
    id: 'INV-12.3-F',
    name: 'cleanliness law',
    holds: cleanOk && allDetect,
    evidence: `canon_clean=${cleanOk}, all_fake_clean_detected=${allDetect}`,
  };
}

/* INV-12.3-G compatibility law */
export function checkINV_123_G(): L12_3InvariantResult {
  const additive = validateL12ContractDelta(
    {
      surface: L12ScenarioContractSurface.SUBJECT_CONTRACT,
      from_version: emptyVer('1.0.0'),
      to_version: emptyVer('1.1.0'),
      weakens_required_fields: false,
      replay_material_changed_without_version_bump: false,
      weakens_invalidation_law: false,
      weakens_trigger_law: false,
      weakens_score_context_law: false,
      weakens_restriction_law: false,
      removes_prediction_theater_scan: false,
      reinterprets_old_outputs: false,
      only_added_optional_fields: true,
    },
    L12ScenarioContractCompatibilityClass.ADDITIVE_SAFE,
  );
  const additiveOk =
    additive.compatibility_class === L12ScenarioContractCompatibilityClass.ADDITIVE_SAFE &&
    additive.violations.length === 0;

  const removed = validateL12ContractDelta({
    surface: L12ScenarioContractSurface.SUBJECT_CONTRACT,
    from_version: emptyVer('1.0.0'),
    to_version: emptyVer('1.1.0'),
    weakens_required_fields: true,
    replay_material_changed_without_version_bump: false,
    weakens_invalidation_law: false,
    weakens_trigger_law: false,
    weakens_score_context_law: false,
    weakens_restriction_law: false,
    removes_prediction_theater_scan: false,
    reinterprets_old_outputs: false,
    only_added_optional_fields: false,
  });
  const removedDetected = removed.violations.some(
    e => e.code === L12ContractViolationCode.L12K_REQUIRED_FIELD_REMOVED,
  );

  const replay = validateL12ContractDelta({
    surface: L12ScenarioContractSurface.SUBJECT_CONTRACT,
    from_version: emptyVer('1.0.0'),
    to_version: emptyVer('1.0.0'),
    weakens_required_fields: false,
    replay_material_changed_without_version_bump: true,
    weakens_invalidation_law: false,
    weakens_trigger_law: false,
    weakens_score_context_law: false,
    weakens_restriction_law: false,
    removes_prediction_theater_scan: false,
    reinterprets_old_outputs: false,
    only_added_optional_fields: false,
  });
  const replayDetected = replay.violations.some(
    e => e.code === L12ContractViolationCode.L12K_REPLAY_MATERIAL_CHANGED_WITHOUT_VERSION,
  );

  const trigger = validateL12ContractDelta({
    surface: L12ScenarioContractSurface.TRIGGER_CONTRACT,
    from_version: emptyVer('1.0.0'),
    to_version: emptyVer('1.0.0'),
    weakens_required_fields: false,
    replay_material_changed_without_version_bump: false,
    weakens_invalidation_law: false,
    weakens_trigger_law: true,
    weakens_score_context_law: false,
    weakens_restriction_law: false,
    removes_prediction_theater_scan: false,
    reinterprets_old_outputs: false,
    only_added_optional_fields: false,
  });
  const triggerDetected = trigger.violations.some(
    e => e.code === L12ContractViolationCode.L12K_TRIGGER_LAW_WEAKENED,
  );

  const inv = validateL12ContractDelta({
    surface: L12ScenarioContractSurface.INVALIDATION_CONTRACT,
    from_version: emptyVer('1.0.0'),
    to_version: emptyVer('1.0.0'),
    weakens_required_fields: false,
    replay_material_changed_without_version_bump: false,
    weakens_invalidation_law: true,
    weakens_trigger_law: false,
    weakens_score_context_law: false,
    weakens_restriction_law: false,
    removes_prediction_theater_scan: false,
    reinterprets_old_outputs: false,
    only_added_optional_fields: false,
  });
  const invDetected = inv.violations.some(
    e => e.code === L12ContractViolationCode.L12K_INVALIDATION_LAW_WEAKENED,
  );

  return {
    id: 'INV-12.3-G',
    name: 'compatibility law',
    holds: additiveOk && removedDetected && replayDetected && triggerDetected && invDetected,
    evidence: `additive=${additiveOk}, removed=${removedDetected}, replay=${replayDetected}, trig=${triggerDetected}, inv=${invDetected}`,
  };
}

/* INV-12.3-H non-prediction law */
export function checkINV_123_H(): L12_3InvariantResult {
  // Path with prediction language must reject
  const predict = {
    ...buildCanonicalL12PathContract(),
    path_claim: 'price will definitely break out and continue higher',
  };
  const predictRejected = validateL12ScenarioPathContract(predict).some(
    e => e.code === L12ContractViolationCode.L12K_PREDICTION_THEATER,
  );
  // Recommendation
  const rec = {
    ...buildCanonicalL12PathContract(),
    path_claim:
      'continuation strengthens if spot improves while funding cools — buy signal triggered',
  };
  const recRejected = validateL12ScenarioPathContract(rec).some(
    e => e.code === L12ContractViolationCode.L12K_RECOMMENDATION_LEAK,
  );
  // Judgment
  const judgment = {
    ...buildCanonicalL12PathContract(),
    path_claim:
      'remains conditional — final scenario chosen as winner',
  };
  const judgmentRejected = validateL12ScenarioPathContract(judgment).some(
    e => e.code === L12ContractViolationCode.L12K_JUDGMENT_LEAK,
  );
  // Trade
  const trade = {
    ...buildCanonicalL12PathContract(),
    path_claim:
      'continuation strengthens if spot improves while funding cools (entry signal at 50k)',
  };
  const tradeRejected = validateL12ScenarioPathContract(trade).some(
    e => e.code === L12ContractViolationCode.L12K_TRADE_ACTION_LEAK,
  );
  // Restriction profile that fails to block prediction
  const noBlock = {
    ...buildCanonicalL12RestrictionContract(),
    blocked_uses: [L12ScenarioBlockedUse.RECOMMENDATION_OUTPUT],
  };
  const restrictRejected = validateL12RestrictionContract(noBlock).some(
    e => e.code === L12ContractViolationCode.L12K_RESTRICTION_PREDICTION_NOT_BLOCKED,
  );
  return {
    id: 'INV-12.3-H',
    name: 'non-prediction law',
    holds: predictRejected && recRejected && judgmentRejected && tradeRejected && restrictRejected,
    evidence: `predict=${predictRejected}, rec=${recRejected}, judgment=${judgmentRejected}, trade=${tradeRejected}, restrict=${restrictRejected}`,
  };
}

function emptyVer(v: string) {
  return {
    contract_version_id: `cv.${v}`,
    surface: L12ScenarioContractSurface.SUBJECT_CONTRACT,
    semantic_version: v,
    required_fields: [],
    optional_fields: [],
    replay_material_fields: [],
    breaking_change_surfaces: [],
    migration_required_surfaces: [],
    policy_version: POLICY,
  };
}

export function checkAllL12_3Invariants(): readonly L12_3InvariantResult[] {
  return [
    checkINV_123_A(),
    checkINV_123_B(),
    checkINV_123_C(),
    checkINV_123_D(),
    checkINV_123_E(),
    checkINV_123_F(),
    checkINV_123_G(),
    checkINV_123_H(),
  ];
}

/** Wire so unused builders count as exports rather than dead. */
export const L12_3_CANONICAL_BUILDERS = {
  buildCanonicalL12SubjectContract,
  buildCanonicalL12SetContract,
  buildCanonicalL12PathContract,
  buildCanonicalL12ConditionContract,
  buildCanonicalL12TriggerContract,
  buildCanonicalL12InvalidationContract,
  buildCanonicalL12PathConfidenceContract,
  buildCanonicalL12ShiftContract,
  buildCanonicalL12RestrictionContract,
  buildCanonicalL12EvidencePack,
  buildCanonicalL12ReplayIdentity,
};

// Surface validators that may not be referenced above so they are linked.
void validateL12ConditionContract;
void validateL12PathConfidenceContract;
void validateL12ShiftConditionContract;
void validateL12EvidencePackContract;
void validateL12ReplayIdentity;
void validateL12ScenarioOutputReadiness;
