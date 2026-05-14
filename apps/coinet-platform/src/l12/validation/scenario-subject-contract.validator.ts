/**
 * L12.3 — Scenario subject contract validator (§12.3.3.3).
 */

import {
  detectL12PredictionTheater,
  detectL12RecommendationLanguage,
} from '../contracts/l12-mission';
import { L12ScenarioSubjectContract } from '../contracts/scenario-subject.contract';
import {
  L12ScenarioInputRequirement,
} from '../contracts/scenario-input-requirement.contract';
import {
  L12ContractViolation,
  L12ContractViolationCode,
} from './l12-contract-violation-codes';

const L13_PLUS_REF_PATTERN = /^l(1[3-9]|[2-9][0-9])[:.]/i;

const TRADE_INTENT_PATTERNS: readonly RegExp[] = [
  /(?:^|[^a-z0-9])(buy|sell|long|short)(?:[^a-z0-9]|$)/i,
  /portfolio[_\s]?allocation/i,
  /trade[_\s]?(action|signal|instruction|intent)/i,
  /entry[_\s]?(point|signal|level)/i,
];

function detectTradeIntent(text: string): boolean {
  if (!text) return false;
  return TRADE_INTENT_PATTERNS.some(p => p.test(text));
}

function detectL13PlusRef(text: string): boolean {
  if (!text) return false;
  return L13_PLUS_REF_PATTERN.test(text);
}

function checkInputs(
  inputs: readonly L12ScenarioInputRequirement[],
  sid: string,
  v: L12ContractViolation[],
): void {
  for (const i of inputs) {
    if (!i.input_requirement_id || !i.surface_class || !i.requirement_class) {
      v.push({
        code: L12ContractViolationCode.L12K_INPUT_REQUIRED_FIELD_MISSING,
        subject_id: sid,
        detail: `input requirement missing required fields (id=${i.input_requirement_id ?? '<unknown>'})`,
      });
    }
    if (
      i.surface_class &&
      detectL13PlusRef(String(i.surface_class))
    ) {
      v.push({
        code: L12ContractViolationCode.L12K_SUBJECT_REFERENCES_L13_PLUS,
        subject_id: sid,
        detail: `input requirement ${i.input_requirement_id} references L13+ surface`,
      });
    }
  }
}

export function validateL12ScenarioSubjectContract(
  c: L12ScenarioSubjectContract,
): readonly L12ContractViolation[] {
  const v: L12ContractViolation[] = [];
  const sid = c.scenario_subject_contract_id || '<unknown>';

  if (!c.scenario_subject_contract_id) {
    v.push({
      code: L12ContractViolationCode.L12K_SUBJECT_CONTRACT_ID_MISSING,
      subject_id: sid,
      detail: 'scenario_subject_contract_id required',
    });
  }
  if (!c.scenario_subject_id) {
    v.push({
      code: L12ContractViolationCode.L12K_SUBJECT_REF_MISSING,
      subject_id: sid,
      detail: 'scenario_subject_id required',
    });
  }
  if (!c.scope_type || !c.scope_id) {
    v.push({
      code: L12ContractViolationCode.L12K_SCOPE_MISSING,
      subject_id: sid,
      detail: 'scope_type/scope_id required',
    });
  }
  if (!c.as_of) {
    v.push({
      code: L12ContractViolationCode.L12K_AS_OF_MISSING,
      subject_id: sid,
      detail: 'as_of required',
    });
  }
  if (!c.allowed_scenario_families || c.allowed_scenario_families.length === 0) {
    v.push({
      code: L12ContractViolationCode.L12K_ALLOWED_FAMILIES_MISSING,
      subject_id: sid,
      detail: 'allowed_scenario_families required',
    });
  }
  if (!c.l11_score_context_policy) {
    v.push({
      code: L12ContractViolationCode.L12K_SCORE_CONTEXT_POLICY_MISSING,
      subject_id: sid,
      detail: 'l11_score_context_policy required',
    });
  } else {
    const p = c.l11_score_context_policy;
    if (
      !p.requires_score_output ||
      !p.requires_component_breakdown ||
      !p.requires_attribution ||
      !p.requires_missing_data_profile ||
      !p.requires_modifier_profile ||
      !p.requires_drift_status ||
      !p.requires_restriction_profile ||
      !p.requires_lineage ||
      !p.requires_replay_hash ||
      !p.score_value_only_forbidden ||
      !p.recompute_scores_forbidden
    ) {
      v.push({
        code: L12ContractViolationCode.L12K_SCORE_CONTEXT_POLICY_WEAKENED,
        subject_id: sid,
        detail: 'l11_score_context_policy weakened: required flags must all be true',
      });
    }
  }
  if (!c.restriction_consumption_policy) {
    v.push({
      code: L12ContractViolationCode.L12K_RESTRICTION_POLICY_MISSING,
      subject_id: sid,
      detail: 'restriction_consumption_policy required',
    });
  }
  if (!c.contradiction_consumption_policy) {
    v.push({
      code: L12ContractViolationCode.L12K_CONTRADICTION_POLICY_MISSING,
      subject_id: sid,
      detail: 'contradiction_consumption_policy required',
    });
  }
  if (!c.drift_consumption_policy) {
    v.push({
      code: L12ContractViolationCode.L12K_DRIFT_POLICY_MISSING,
      subject_id: sid,
      detail: 'drift_consumption_policy required',
    });
  }
  if (!c.trigger_requirement_policy) {
    v.push({
      code: L12ContractViolationCode.L12K_TRIGGER_POLICY_MISSING,
      subject_id: sid,
      detail: 'trigger_requirement_policy required',
    });
  }
  if (!c.invalidation_requirement_policy) {
    v.push({
      code: L12ContractViolationCode.L12K_INVALIDATION_POLICY_MISSING,
      subject_id: sid,
      detail: 'invalidation_requirement_policy required',
    });
  }
  if (!c.shift_condition_requirement_policy) {
    v.push({
      code: L12ContractViolationCode.L12K_SHIFT_POLICY_MISSING,
      subject_id: sid,
      detail: 'shift_condition_requirement_policy required',
    });
  }
  if (!c.base_case_requirement_policy) {
    v.push({
      code: L12ContractViolationCode.L12K_BASE_CASE_POLICY_MISSING,
      subject_id: sid,
      detail: 'base_case_requirement_policy required',
    });
  }
  if (!c.alternative_path_requirement_policy) {
    v.push({
      code: L12ContractViolationCode.L12K_ALT_PATH_POLICY_MISSING,
      subject_id: sid,
      detail: 'alternative_path_requirement_policy required',
    });
  }
  if (!c.evidence_pack_policy) {
    v.push({
      code: L12ContractViolationCode.L12K_EVIDENCE_POLICY_MISSING,
      subject_id: sid,
      detail: 'evidence_pack_policy required',
    });
  }
  if (!c.materialization_policy) {
    v.push({
      code: L12ContractViolationCode.L12K_MATERIALIZATION_POLICY_MISSING,
      subject_id: sid,
      detail: 'materialization_policy required',
    });
  }
  if (!c.lineage_policy) {
    v.push({
      code: L12ContractViolationCode.L12K_LINEAGE_POLICY_MISSING,
      subject_id: sid,
      detail: 'lineage_policy required',
    });
  }
  if (!c.replay_hash) {
    v.push({
      code: L12ContractViolationCode.L12K_REPLAY_HASH_MISSING,
      subject_id: sid,
      detail: 'replay_hash required',
    });
  }
  for (const list of [
    c.required_validation_inputs,
    c.required_regime_inputs,
    c.required_sequence_inputs,
    c.required_hypothesis_inputs,
    c.required_score_context_inputs,
    c.required_context_inputs,
    c.optional_context_inputs,
    c.historical_inputs,
    c.evidence_only_inputs,
  ]) {
    if (list) checkInputs(list, sid, v);
  }
  const semanticBlobs: string[] = [
    c.scope_type ?? '',
    c.scope_id ?? '',
    c.scope_granularity ?? '',
    c.subject_contract_version ?? '',
    c.policy_version ?? '',
  ];
  for (const blob of semanticBlobs) {
    if (detectTradeIntent(blob)) {
      v.push({
        code: L12ContractViolationCode.L12K_SUBJECT_TRADE_INTENT,
        subject_id: sid,
        detail: `subject contract carries trade intent: "${blob}"`,
      });
      break;
    }
  }
  for (const blob of semanticBlobs) {
    if (detectL12PredictionTheater(blob)) {
      v.push({
        code: L12ContractViolationCode.L12K_PREDICTION_THEATER,
        subject_id: sid,
        detail: `subject contract carries prediction language: "${blob}"`,
      });
      break;
    }
  }
  for (const blob of semanticBlobs) {
    if (detectL12RecommendationLanguage(blob)) {
      v.push({
        code: L12ContractViolationCode.L12K_RECOMMENDATION_LEAK,
        subject_id: sid,
        detail: `subject contract carries recommendation language: "${blob}"`,
      });
      break;
    }
  }
  return v;
}
