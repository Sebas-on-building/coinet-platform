/**
 * L12.2 — Scenario validator (§12.2.6.4).
 */

import {
  containsL12ForbiddenNaming,
} from '../contracts/l12-boundary';
import {
  detectL12JudgmentLanguage,
  detectL12PredictionTheater,
  detectL12RecommendationLanguage,
} from '../contracts/l12-mission';
import { L12Scenario } from '../contracts/scenario';
import { isL12LegalTypeFamilyPair } from '../contracts/scenario-family';
import {
  L12ObjectViolation,
  L12ObjectViolationCode,
} from './l12-object-violation-codes';

const TRADE_LANGUAGE_PATTERNS: readonly RegExp[] = [
  /(?:^|[^a-z0-9])(buy|sell|long|short|enter|exit)(?:[^a-z0-9]|$)/i,
  /trade[_\s]?(action|signal|instruction|intent|now)/i,
  /(?:^|[^a-z0-9])(allocate|trim|dump|pump)(?:[^a-z0-9]|$)/i,
];

function detectTradeLanguage(text: string): boolean {
  return TRADE_LANGUAGE_PATTERNS.some(p => p.test(text));
}

export function validateL12Scenario(s: L12Scenario): readonly L12ObjectViolation[] {
  const v: L12ObjectViolation[] = [];
  const sid = s.scenario_id || '<unknown>';

  if (!s.scenario_type) {
    v.push({ code: L12ObjectViolationCode.L12O_SCENARIO_TYPE_MISSING, subject_id: sid, detail: 'scenario_type required' });
  }
  if (!s.scenario_family) {
    v.push({ code: L12ObjectViolationCode.L12O_SCENARIO_FAMILY_MISSING, subject_id: sid, detail: 'scenario_family required' });
  }
  if (s.scenario_type && s.scenario_family && !isL12LegalTypeFamilyPair(s.scenario_type, s.scenario_family)) {
    v.push({
      code: L12ObjectViolationCode.L12O_ILLEGAL_TYPE_FAMILY_PAIR,
      subject_id: sid,
      detail: `illegal type/family pair: ${s.scenario_type}/${s.scenario_family}`,
    });
  }
  if (!s.path_claim || s.path_claim.trim().length === 0) {
    v.push({ code: L12ObjectViolationCode.L12O_PATH_CLAIM_MISSING, subject_id: sid, detail: 'path_claim required' });
  }
  if (!s.required_condition_refs || s.required_condition_refs.length === 0) {
    v.push({ code: L12ObjectViolationCode.L12O_CONDITION_REFS_MISSING, subject_id: sid, detail: 'required_condition_refs must not be empty' });
  }
  if (!s.trigger_refs || s.trigger_refs.length === 0) {
    v.push({ code: L12ObjectViolationCode.L12O_TRIGGER_REFS_MISSING, subject_id: sid, detail: 'trigger_refs must not be empty' });
  }
  if (!s.invalidation_refs || s.invalidation_refs.length === 0) {
    v.push({ code: L12ObjectViolationCode.L12O_INVALIDATION_REFS_MISSING, subject_id: sid, detail: 'invalidation_refs must not be empty' });
  }
  if (
    (!s.supporting_evidence_refs || s.supporting_evidence_refs.length === 0) &&
    (!s.contradicting_evidence_refs || s.contradicting_evidence_refs.length === 0)
  ) {
    v.push({ code: L12ObjectViolationCode.L12O_EVIDENCE_REFS_MISSING, subject_id: sid, detail: 'evidence refs required' });
  }
  if (!s.lineage_refs || s.lineage_refs.length === 0) {
    v.push({ code: L12ObjectViolationCode.L12O_LINEAGE_REFS_MISSING, subject_id: sid, detail: 'lineage_refs required' });
  }
  if (!s.replay_hash) {
    v.push({ code: L12ObjectViolationCode.L12O_REPLAY_HASH_MISSING, subject_id: sid, detail: 'replay_hash required' });
  }
  if (
    typeof s.path_confidence_score !== 'number' ||
    Number.isNaN(s.path_confidence_score) ||
    s.path_confidence_score < 0 ||
    s.path_confidence_score > 1
  ) {
    v.push({
      code: L12ObjectViolationCode.L12O_CONFIDENCE_SCORE_OUT_OF_RANGE,
      subject_id: sid,
      detail: `path_confidence_score out of range: ${s.path_confidence_score}`,
    });
  }

  // Path claim semantic checks
  if (s.path_claim) {
    if (detectL12PredictionTheater(s.path_claim)) {
      v.push({
        code: L12ObjectViolationCode.L12O_PREDICTION_THEATER,
        subject_id: sid,
        detail: 'path_claim contains prediction-theater language',
      });
    }
    if (detectL12RecommendationLanguage(s.path_claim)) {
      v.push({
        code: L12ObjectViolationCode.L12O_RECOMMENDATION_LEAK,
        subject_id: sid,
        detail: 'path_claim contains recommendation language',
      });
    }
    if (detectL12JudgmentLanguage(s.path_claim)) {
      v.push({
        code: L12ObjectViolationCode.L12O_JUDGMENT_LEAK,
        subject_id: sid,
        detail: 'path_claim contains judgment language',
      });
    }
    if (detectTradeLanguage(s.path_claim)) {
      v.push({
        code: L12ObjectViolationCode.L12O_TRADE_ACTION_LEAK,
        subject_id: sid,
        detail: 'path_claim contains trade-action language',
      });
    }
  }

  if (s.scenario_name && containsL12ForbiddenNaming(s.scenario_name)) {
    v.push({
      code: L12ObjectViolationCode.L12O_PREDICTION_THEATER,
      subject_id: sid,
      detail: `scenario_name contains forbidden naming: ${s.scenario_name}`,
    });
  }

  return v;
}
