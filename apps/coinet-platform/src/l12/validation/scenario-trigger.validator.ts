/**
 * L12.2 — ScenarioTrigger validator (§12.2.11.4).
 */

import {
  detectL12PredictionTheater,
  detectL12RecommendationLanguage,
} from '../contracts/l12-mission';
import {
  L12ScenarioTrigger,
  isL12LegalTriggerEffect,
} from '../contracts/scenario-trigger';
import { isL12LegalTriggerStatus } from '../registry/scenario-trigger.registry';
import {
  L12ObjectViolation,
  L12ObjectViolationCode,
} from './l12-object-violation-codes';

const TRADE_INSTRUCTION = /(?:^|[^a-z0-9])(buy|sell|long|short|enter|exit|trim|allocate)(?:[^a-z0-9]|$)/i;

export function validateL12ScenarioTrigger(
  t: L12ScenarioTrigger,
): readonly L12ObjectViolation[] {
  const v: L12ObjectViolation[] = [];
  const sid = t.trigger_id || '<unknown>';

  if (!t.trigger_id) {
    v.push({ code: L12ObjectViolationCode.L12O_TRIGGER_ID_MISSING, subject_id: sid, detail: 'trigger_id required' });
  }
  if (!t.scenario_id) {
    v.push({ code: L12ObjectViolationCode.L12O_TRIGGER_SCENARIO_REF_MISSING, subject_id: sid, detail: 'scenario_id required' });
  }
  if (!t.trigger_condition_refs || t.trigger_condition_refs.length === 0) {
    v.push({ code: L12ObjectViolationCode.L12O_TRIGGER_CONDITION_REFS_MISSING, subject_id: sid, detail: 'trigger_condition_refs required' });
  }
  if (!t.trigger_status) {
    v.push({ code: L12ObjectViolationCode.L12O_TRIGGER_STATUS_MISSING, subject_id: sid, detail: 'trigger_status required' });
  }
  if (!t.expected_effect_on_scenario) {
    v.push({ code: L12ObjectViolationCode.L12O_TRIGGER_EFFECT_MISSING, subject_id: sid, detail: 'expected_effect_on_scenario required' });
  }
  if (
    typeof t.trigger_strength_score !== 'number' ||
    Number.isNaN(t.trigger_strength_score) ||
    t.trigger_strength_score < 0 ||
    t.trigger_strength_score > 1
  ) {
    v.push({
      code: L12ObjectViolationCode.L12O_TRIGGER_STRENGTH_OUT_OF_RANGE,
      subject_id: sid,
      detail: `trigger_strength_score out of range: ${t.trigger_strength_score}`,
    });
  }
  if (!t.evidence_refs || t.evidence_refs.length === 0) {
    v.push({ code: L12ObjectViolationCode.L12O_EVIDENCE_REFS_MISSING, subject_id: sid, detail: 'evidence_refs required' });
  }
  if (!t.lineage_refs || t.lineage_refs.length === 0) {
    v.push({ code: L12ObjectViolationCode.L12O_LINEAGE_REFS_MISSING, subject_id: sid, detail: 'lineage_refs required' });
  }
  if (!t.replay_hash) {
    v.push({ code: L12ObjectViolationCode.L12O_REPLAY_HASH_MISSING, subject_id: sid, detail: 'replay_hash required' });
  }

  if (t.trigger_type && t.expected_effect_on_scenario && !isL12LegalTriggerEffect(t.trigger_type, t.expected_effect_on_scenario)) {
    v.push({
      code: L12ObjectViolationCode.L12O_TRIGGER_ILLEGAL_TYPE_EFFECT_PAIR,
      subject_id: sid,
      detail: `illegal type/effect pair: ${t.trigger_type}/${t.expected_effect_on_scenario}`,
    });
  }
  if (t.trigger_type && t.trigger_status && !isL12LegalTriggerStatus(t.trigger_type, t.trigger_status)) {
    v.push({
      code: L12ObjectViolationCode.L12O_TRIGGER_ILLEGAL_TYPE_STATUS_PAIR,
      subject_id: sid,
      detail: `illegal type/status pair: ${t.trigger_type}/${t.trigger_status}`,
    });
  }

  if (t.trigger_name) {
    if (detectL12PredictionTheater(t.trigger_name)) {
      v.push({
        code: L12ObjectViolationCode.L12O_TRIGGER_GUARANTEED_OUTCOME,
        subject_id: sid,
        detail: 'trigger_name contains certainty/guaranteed language',
      });
    }
    if (TRADE_INSTRUCTION.test(t.trigger_name) || detectL12RecommendationLanguage(t.trigger_name)) {
      v.push({
        code: L12ObjectViolationCode.L12O_TRIGGER_TRADE_INSTRUCTION,
        subject_id: sid,
        detail: 'trigger_name contains trade-instruction / recommendation language',
      });
    }
  }

  return v;
}
