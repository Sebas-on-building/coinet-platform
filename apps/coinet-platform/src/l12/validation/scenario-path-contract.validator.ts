/**
 * L12.3 — Scenario path contract validator (§12.3.6.3).
 */

import {
  detectL12JudgmentLanguage,
  detectL12PredictionTheater,
  detectL12RecommendationLanguage,
} from '../contracts/l12-mission';
import { l12ConfidenceBandFor } from '../contracts/path-confidence-profile';
import {
  detectL12PathClaimCertainty,
  isL12PathClaimConditional,
  L12ScenarioPathContract,
} from '../contracts/scenario-path.contract';
import {
  L12ContractViolation,
  L12ContractViolationCode,
} from './l12-contract-violation-codes';

const TRADE_ACTION_PATTERNS: readonly RegExp[] = [
  /(?:^|[^a-z0-9])(buy|sell|long|short)(?:[^a-z0-9]|$)/i,
  /entry[_\s]?(point|signal|price)/i,
  /exit[_\s]?(point|signal|price)/i,
  /trade[_\s]?(action|signal|instruction|intent)/i,
];

function detectTradeAction(text: string): boolean {
  if (!text) return false;
  return TRADE_ACTION_PATTERNS.some(p => p.test(text));
}

export function validateL12ScenarioPathContract(
  c: L12ScenarioPathContract,
): readonly L12ContractViolation[] {
  const v: L12ContractViolation[] = [];
  const sid = c.scenario_contract_id || '<unknown>';

  if (!c.scenario_contract_id) {
    v.push({
      code: L12ContractViolationCode.L12K_SCENARIO_CONTRACT_ID_MISSING,
      subject_id: sid,
      detail: 'scenario_contract_id required',
    });
  }
  if (!c.path_claim) {
    v.push({
      code: L12ContractViolationCode.L12K_PATH_CLAIM_MISSING,
      subject_id: sid,
      detail: 'path_claim required',
    });
  } else {
    if (!isL12PathClaimConditional(c.path_claim)) {
      v.push({
        code: L12ContractViolationCode.L12K_PATH_CLAIM_NOT_CONDITIONAL,
        subject_id: sid,
        detail: `path_claim must be conditional: "${c.path_claim}"`,
      });
    }
    if (detectL12PathClaimCertainty(c.path_claim)) {
      v.push({
        code: L12ContractViolationCode.L12K_CERTAINTY_LANGUAGE,
        subject_id: sid,
        detail: `path_claim contains certainty language: "${c.path_claim}"`,
      });
    }
    if (detectL12PredictionTheater(c.path_claim)) {
      v.push({
        code: L12ContractViolationCode.L12K_PREDICTION_THEATER,
        subject_id: sid,
        detail: `path_claim carries prediction language: "${c.path_claim}"`,
      });
    }
    if (detectL12RecommendationLanguage(c.path_claim)) {
      v.push({
        code: L12ContractViolationCode.L12K_RECOMMENDATION_LEAK,
        subject_id: sid,
        detail: `path_claim carries recommendation language: "${c.path_claim}"`,
      });
    }
    if (detectL12JudgmentLanguage(c.path_claim)) {
      v.push({
        code: L12ContractViolationCode.L12K_JUDGMENT_LEAK,
        subject_id: sid,
        detail: `path_claim carries judgment language: "${c.path_claim}"`,
      });
    }
    if (detectTradeAction(c.path_claim)) {
      v.push({
        code: L12ContractViolationCode.L12K_TRADE_ACTION_LEAK,
        subject_id: sid,
        detail: `path_claim carries trade-action language: "${c.path_claim}"`,
      });
    }
  }
  if (!c.required_condition_refs || c.required_condition_refs.length === 0) {
    v.push({
      code: L12ContractViolationCode.L12K_REQUIRED_CONDITIONS_ABSENT,
      subject_id: sid,
      detail: 'required_condition_refs required',
    });
  }
  if (!c.trigger_refs || c.trigger_refs.length === 0) {
    v.push({
      code: L12ContractViolationCode.L12K_TRIGGER_REFS_ABSENT,
      subject_id: sid,
      detail: 'trigger_refs required',
    });
  }
  if (!c.invalidation_refs || c.invalidation_refs.length === 0) {
    v.push({
      code: L12ContractViolationCode.L12K_INVALIDATION_REFS_ABSENT,
      subject_id: sid,
      detail: 'invalidation_refs required',
    });
  }
  if (
    !c.supporting_evidence_refs ||
    c.supporting_evidence_refs.length === 0
  ) {
    v.push({
      code: L12ContractViolationCode.L12K_PATH_EVIDENCE_REFS_ABSENT,
      subject_id: sid,
      detail: 'supporting_evidence_refs required',
    });
  }
  if (!c.restriction_profile_ref) {
    v.push({
      code: L12ContractViolationCode.L12K_PATH_RESTRICTION_PROFILE_ABSENT,
      subject_id: sid,
      detail: 'restriction_profile_ref required',
    });
  }
  if (!c.readiness_class) {
    v.push({
      code: L12ContractViolationCode.L12K_PATH_READINESS_MISSING,
      subject_id: sid,
      detail: 'readiness_class required',
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
  if (
    typeof c.path_confidence_score === 'number' &&
    c.path_confidence_band &&
    l12ConfidenceBandFor(c.path_confidence_score) !== c.path_confidence_band
  ) {
    v.push({
      code: L12ContractViolationCode.L12K_PATH_CONFIDENCE_BAND_MISMATCH,
      subject_id: sid,
      detail: `path_confidence_score=${c.path_confidence_score} does not map to band ${c.path_confidence_band}`,
    });
  }
  return v;
}
