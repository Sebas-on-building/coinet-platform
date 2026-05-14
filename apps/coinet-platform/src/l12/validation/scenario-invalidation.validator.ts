/**
 * L12.2 — ScenarioInvalidation validator (§12.2.12.4).
 */

import {
  L12InvalidationStatus,
  L12ScenarioInvalidation,
  isL12LegalInvalidationEffect,
} from '../contracts/scenario-invalidation';
import { isL12LegalInvalidationStatus } from '../registry/scenario-invalidation.registry';
import {
  L12ObjectViolation,
  L12ObjectViolationCode,
} from './l12-object-violation-codes';

const NON_MONITORABLE_STATUSES: ReadonlySet<L12InvalidationStatus> = new Set([
  // Hidden = invalidation exists but cannot be observed → reject
]);

export function validateL12ScenarioInvalidation(
  i: L12ScenarioInvalidation,
): readonly L12ObjectViolation[] {
  const v: L12ObjectViolation[] = [];
  const sid = i.invalidation_id || '<unknown>';

  if (!i.invalidation_id) {
    v.push({ code: L12ObjectViolationCode.L12O_INVALIDATION_ID_MISSING, subject_id: sid, detail: 'invalidation_id required' });
  }
  if (!i.scenario_id) {
    v.push({ code: L12ObjectViolationCode.L12O_INVALIDATION_SCENARIO_REF_MISSING, subject_id: sid, detail: 'scenario_id required' });
  }
  if (!i.invalidation_condition_refs || i.invalidation_condition_refs.length === 0) {
    v.push({ code: L12ObjectViolationCode.L12O_INVALIDATION_CONDITION_REFS_MISSING, subject_id: sid, detail: 'invalidation_condition_refs required' });
  }
  if (
    typeof i.invalidation_strength_score !== 'number' ||
    Number.isNaN(i.invalidation_strength_score) ||
    i.invalidation_strength_score < 0 ||
    i.invalidation_strength_score > 1
  ) {
    v.push({
      code: L12ObjectViolationCode.L12O_INVALIDATION_STRENGTH_OUT_OF_RANGE,
      subject_id: sid,
      detail: `invalidation_strength_score out of range: ${i.invalidation_strength_score}`,
    });
  }
  if (!i.invalidation_status) {
    v.push({ code: L12ObjectViolationCode.L12O_INVALIDATION_STATUS_MISSING, subject_id: sid, detail: 'invalidation_status required' });
  }
  if (!i.expected_effect) {
    v.push({ code: L12ObjectViolationCode.L12O_INVALIDATION_EFFECT_MISSING, subject_id: sid, detail: 'expected_effect required' });
  }
  if (!i.evidence_refs || i.evidence_refs.length === 0) {
    v.push({ code: L12ObjectViolationCode.L12O_EVIDENCE_REFS_MISSING, subject_id: sid, detail: 'evidence_refs required' });
  }
  if (!i.lineage_refs || i.lineage_refs.length === 0) {
    v.push({ code: L12ObjectViolationCode.L12O_LINEAGE_REFS_MISSING, subject_id: sid, detail: 'lineage_refs required' });
  }
  if (!i.replay_hash) {
    v.push({ code: L12ObjectViolationCode.L12O_REPLAY_HASH_MISSING, subject_id: sid, detail: 'replay_hash required' });
  }

  if (i.invalidation_type && i.expected_effect && !isL12LegalInvalidationEffect(i.invalidation_type, i.expected_effect)) {
    v.push({
      code: L12ObjectViolationCode.L12O_INVALIDATION_ILLEGAL_TYPE_EFFECT_PAIR,
      subject_id: sid,
      detail: `illegal type/effect pair: ${i.invalidation_type}/${i.expected_effect}`,
    });
  }
  if (i.invalidation_type && i.invalidation_status && !isL12LegalInvalidationStatus(i.invalidation_type, i.invalidation_status)) {
    v.push({
      code: L12ObjectViolationCode.L12O_INVALIDATION_STATUS_MISSING,
      subject_id: sid,
      detail: `illegal type/status pair: ${i.invalidation_type}/${i.invalidation_status}`,
    });
  }

  if (i.invalidation_status && NON_MONITORABLE_STATUSES.has(i.invalidation_status)) {
    v.push({
      code: L12ObjectViolationCode.L12O_INVALIDATION_NOT_MONITORABLE,
      subject_id: sid,
      detail: `non-monitorable status: ${i.invalidation_status}`,
    });
  }

  return v;
}
