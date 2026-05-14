/**
 * L12.3 — Scenario set contract validator (§12.3.5.2).
 */

import {
  detectL12JudgmentLanguage,
  detectL12PredictionTheater,
} from '../contracts/l12-mission';
import { L12ScenarioSpreadClass } from '../contracts/scenario-set';
import { L12ScenarioSetContract } from '../contracts/scenario-set.contract';
import {
  L12ContractViolation,
  L12ContractViolationCode,
} from './l12-contract-violation-codes';

const GUARANTEED_BASE_PATTERNS: readonly RegExp[] = [
  /guaranteed[_\s]?(outcome|path|continuation|breakout)/i,
  /certain[_\s]?(outcome|path)/i,
  /must[_\s]?happen/i,
];

const FINAL_WINNER_PATTERNS: readonly RegExp[] = [
  /(final|winning|winner)[_\s]?scenario/i,
  /scenario[_\s]?winner/i,
  /best[_\s]?path/i,
];

function any(text: string, pats: readonly RegExp[]): boolean {
  if (!text) return false;
  return pats.some(p => p.test(text));
}

export function validateL12ScenarioSetContract(
  c: L12ScenarioSetContract,
): readonly L12ContractViolation[] {
  const v: L12ContractViolation[] = [];
  const sid = c.scenario_set_contract_id || '<unknown>';

  if (!c.scenario_set_contract_id) {
    v.push({
      code: L12ContractViolationCode.L12K_SCENARIO_SET_CONTRACT_ID_MISSING,
      subject_id: sid,
      detail: 'scenario_set_contract_id required',
    });
  }
  if (!c.scenario_set_id || !c.scenario_subject_id) {
    v.push({
      code: L12ContractViolationCode.L12K_SET_REF_MISSING,
      subject_id: sid,
      detail: 'scenario_set_id/scenario_subject_id required',
    });
  }
  if (!c.base_case_ref) {
    v.push({
      code: L12ContractViolationCode.L12K_BASE_CASE_ABSENT,
      subject_id: sid,
      detail: 'base_case_ref required',
    });
  }
  if (!c.scenario_refs || c.scenario_refs.length === 0) {
    v.push({
      code: L12ContractViolationCode.L12K_NO_SCENARIO_REFS,
      subject_id: sid,
      detail: 'scenario_refs required',
    });
  } else if (c.scenario_count !== c.scenario_refs.length) {
    v.push({
      code: L12ContractViolationCode.L12K_SCENARIO_COUNT_MISMATCH,
      subject_id: sid,
      detail: `scenario_count (${c.scenario_count}) does not match scenario_refs length (${c.scenario_refs.length})`,
    });
  }
  if (!c.primary_scenario_ref) {
    v.push({
      code: L12ContractViolationCode.L12K_PRIMARY_ABSENT,
      subject_id: sid,
      detail: 'primary_scenario_ref required',
    });
  }
  if (
    c.scenario_refs &&
    c.scenario_refs.length <= 1 &&
    c.scenario_spread_class !== L12ScenarioSpreadClass.INSUFFICIENT_SCENARIO_COMPETITION
  ) {
    v.push({
      code: L12ContractViolationCode.L12K_ALTERNATIVE_PATH_ABSENT,
      subject_id: sid,
      detail: 'single-path scenario set requires scenario_spread_class=INSUFFICIENT_SCENARIO_COMPETITION',
    });
  }
  if (!c.trigger_profile_refs || c.trigger_profile_refs.length === 0) {
    v.push({
      code: L12ContractViolationCode.L12K_TRIGGER_PROFILE_ABSENT,
      subject_id: sid,
      detail: 'trigger_profile_refs required',
    });
  }
  if (!c.invalidation_profile_refs || c.invalidation_profile_refs.length === 0) {
    v.push({
      code: L12ContractViolationCode.L12K_INVALIDATION_ABSENT,
      subject_id: sid,
      detail: 'invalidation_profile_refs required',
    });
  }
  if (!c.path_confidence_profile_ref) {
    v.push({
      code: L12ContractViolationCode.L12K_PATH_CONFIDENCE_ABSENT,
      subject_id: sid,
      detail: 'path_confidence_profile_ref required',
    });
  }
  if (!c.restriction_profile_ref) {
    v.push({
      code: L12ContractViolationCode.L12K_RESTRICTION_PROFILE_ABSENT,
      subject_id: sid,
      detail: 'restriction_profile_ref required',
    });
  }
  if (!c.evidence_pack_ref) {
    v.push({
      code: L12ContractViolationCode.L12K_EVIDENCE_REFS_ABSENT,
      subject_id: sid,
      detail: 'evidence_pack_ref required',
    });
  }
  if (!c.lineage_refs || c.lineage_refs.length === 0) {
    v.push({
      code: L12ContractViolationCode.L12K_LINEAGE_REFS_ABSENT,
      subject_id: sid,
      detail: 'lineage_refs required',
    });
  }
  if (!c.replay_hash) {
    v.push({
      code: L12ContractViolationCode.L12K_REPLAY_HASH_MISSING,
      subject_id: sid,
      detail: 'replay_hash required',
    });
  }

  // Semantic checks: base case must not claim guarantee, primary must not be final winner
  if (any(c.base_case_ref ?? '', GUARANTEED_BASE_PATTERNS)) {
    v.push({
      code: L12ContractViolationCode.L12K_BASE_CASE_GUARANTEED_OUTCOME,
      subject_id: sid,
      detail: `base_case_ref claims guaranteed outcome: "${c.base_case_ref}"`,
    });
  }
  if (any(c.primary_scenario_ref ?? '', FINAL_WINNER_PATTERNS)) {
    v.push({
      code: L12ContractViolationCode.L12K_PRIMARY_FINAL_WINNER,
      subject_id: sid,
      detail: `primary_scenario_ref described as final winner: "${c.primary_scenario_ref}"`,
    });
  }
  const blobs = [
    c.scenario_set_id ?? '',
    c.primary_scenario_ref ?? '',
    c.base_case_ref ?? '',
  ];
  for (const blob of blobs) {
    if (detectL12PredictionTheater(blob)) {
      v.push({
        code: L12ContractViolationCode.L12K_PREDICTION_THEATER,
        subject_id: sid,
        detail: `set contract carries prediction language: "${blob}"`,
      });
      break;
    }
  }
  for (const blob of blobs) {
    if (detectL12JudgmentLanguage(blob)) {
      v.push({
        code: L12ContractViolationCode.L12K_JUDGMENT_LEAK,
        subject_id: sid,
        detail: `set contract carries judgment language: "${blob}"`,
      });
      break;
    }
  }
  return v;
}
