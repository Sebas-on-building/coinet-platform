/**
 * L12.2 — ScenarioCondition validator (§12.2.10.5).
 */

import {
  detectL12PredictionTheater,
  detectL12RecommendationLanguage,
} from '../contracts/l12-mission';
import {
  L12ScenarioCondition,
  isL12LegalConditionTypeLayer,
} from '../contracts/scenario-condition';
import {
  L12ObjectViolation,
  L12ObjectViolationCode,
} from './l12-object-violation-codes';

/**
 * Heuristic: a "raw data" surface ref (un-governed L1/L2 primitive) is illegal.
 * Conditions must reference governed L7+/L11 surfaces.
 */
const RAW_DATA_PATTERN = /^(l[12]|raw|primitive|ohlcv|tick|orderbook)[:.]/i;

export function validateL12ScenarioCondition(
  c: L12ScenarioCondition,
): readonly L12ObjectViolation[] {
  const v: L12ObjectViolation[] = [];
  const sid = c.condition_id || '<unknown>';

  if (!c.condition_id) {
    v.push({ code: L12ObjectViolationCode.L12O_CONDITION_ID_MISSING, subject_id: sid, detail: 'condition_id required' });
  }
  if (!c.scenario_id) {
    v.push({ code: L12ObjectViolationCode.L12O_CONDITION_SCENARIO_REF_MISSING, subject_id: sid, detail: 'scenario_id required' });
  }
  if (!c.source_layer) {
    v.push({ code: L12ObjectViolationCode.L12O_CONDITION_SOURCE_LAYER_MISSING, subject_id: sid, detail: 'source_layer required' });
  }
  if (!c.required_surface_ref) {
    v.push({ code: L12ObjectViolationCode.L12O_CONDITION_REQUIRED_SURFACE_REF_MISSING, subject_id: sid, detail: 'required_surface_ref required' });
  }
  if (!c.condition_role) {
    v.push({ code: L12ObjectViolationCode.L12O_CONDITION_ROLE_MISSING, subject_id: sid, detail: 'condition_role required' });
  }
  if (!c.condition_status) {
    v.push({ code: L12ObjectViolationCode.L12O_CONDITION_STATUS_MISSING, subject_id: sid, detail: 'condition_status required' });
  }
  if (!c.lineage_refs || c.lineage_refs.length === 0) {
    v.push({ code: L12ObjectViolationCode.L12O_LINEAGE_REFS_MISSING, subject_id: sid, detail: 'lineage_refs required' });
  }
  if (!c.replay_hash) {
    v.push({ code: L12ObjectViolationCode.L12O_REPLAY_HASH_MISSING, subject_id: sid, detail: 'replay_hash required' });
  }

  if (c.condition_type && c.source_layer && !isL12LegalConditionTypeLayer(c.condition_type, c.source_layer)) {
    v.push({
      code: L12ObjectViolationCode.L12O_CONDITION_TYPE_LAYER_MISMATCH,
      subject_id: sid,
      detail: `illegal type/layer pair: ${c.condition_type}/${c.source_layer}`,
    });
  }

  if (c.required_surface_ref && RAW_DATA_PATTERN.test(c.required_surface_ref)) {
    v.push({
      code: L12ObjectViolationCode.L12O_CONDITION_USES_RAW_DATA,
      subject_id: sid,
      detail: `condition references raw/un-governed surface: ${c.required_surface_ref}`,
    });
  }

  if (c.expected_state) {
    if (detectL12RecommendationLanguage(c.expected_state)) {
      v.push({
        code: L12ObjectViolationCode.L12O_CONDITION_RECOMMENDATION_LANGUAGE,
        subject_id: sid,
        detail: 'expected_state contains recommendation language',
      });
    }
    if (detectL12PredictionTheater(c.expected_state)) {
      v.push({
        code: L12ObjectViolationCode.L12O_CONDITION_CERTAINTY_LANGUAGE,
        subject_id: sid,
        detail: 'expected_state contains certainty language',
      });
    }
  }

  return v;
}
