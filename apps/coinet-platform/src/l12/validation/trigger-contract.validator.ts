/**
 * L12.3 — Trigger contract validator (§12.3.8.3).
 */

import { L12TriggerStatus } from '../contracts/scenario-trigger';
import { L12TriggerContract } from '../contracts/scenario-trigger.contract';
import {
  L12ContractViolation,
  L12ContractViolationCode,
} from './l12-contract-violation-codes';

const GUARANTEED_PATTERNS: readonly RegExp[] = [
  /(?:^|[^a-z0-9])guaranteed(?:[^a-z0-9]|$)/i,
  /(?:^|[^a-z0-9])inevitable(?:[^a-z0-9]|$)/i,
  /(?:^|[^a-z0-9])certain(?:ty|ly)?(?:[^a-z0-9]|$)/i,
  /must[_\s]?(happen|trigger|fire)/i,
];

const TRADE_INSTRUCTION: readonly RegExp[] = [
  /(?:^|[^a-z0-9])(buy|sell|long|short)(?:[^a-z0-9]|$)/i,
  /entry[_\s]?(point|signal|price)/i,
  /exit[_\s]?(point|signal|price)/i,
  /trade[_\s]?(action|signal|instruction)/i,
];

function detect(text: string, pats: readonly RegExp[]): boolean {
  if (!text) return false;
  return pats.some(p => p.test(text));
}

export function validateL12TriggerContract(
  c: L12TriggerContract,
): readonly L12ContractViolation[] {
  const v: L12ContractViolation[] = [];
  const sid = c.trigger_contract_id || '<unknown>';

  const required: Array<keyof L12TriggerContract> = [
    'trigger_contract_id',
    'trigger_id',
    'scenario_id',
    'scenario_set_id',
    'trigger_type',
    'trigger_name',
    'trigger_status',
    'trigger_materiality_class',
    'expected_effect_on_scenario',
    'policy_version',
    'replay_hash',
  ];
  for (const k of required) {
    if (c[k] === undefined || c[k] === null || c[k] === '') {
      v.push({
        code: L12ContractViolationCode.L12K_TRIGGER_CONTRACT_INCOMPLETE,
        subject_id: sid,
        detail: `trigger contract field ${String(k)} required`,
      });
    }
  }
  if (
    !c.trigger_condition_refs ||
    c.trigger_condition_refs.length === 0
  ) {
    v.push({
      code: L12ContractViolationCode.L12K_TRIGGER_CONTRACT_INCOMPLETE,
      subject_id: sid,
      detail: 'trigger_condition_refs required',
    });
  }
  if (!c.evidence_refs || c.evidence_refs.length === 0) {
    v.push({
      code: L12ContractViolationCode.L12K_TRIGGER_CONTRACT_INCOMPLETE,
      subject_id: sid,
      detail: 'evidence_refs required',
    });
  }
  if (!c.lineage_refs || c.lineage_refs.length === 0) {
    v.push({
      code: L12ContractViolationCode.L12K_TRIGGER_CONTRACT_INCOMPLETE,
      subject_id: sid,
      detail: 'lineage_refs required',
    });
  }
  if (
    typeof c.trigger_strength_score !== 'number' ||
    c.trigger_strength_score < 0 ||
    c.trigger_strength_score > 1
  ) {
    v.push({
      code: L12ContractViolationCode.L12K_TRIGGER_CONTRACT_INCOMPLETE,
      subject_id: sid,
      detail: 'trigger_strength_score must be in [0,1]',
    });
  }
  if (!c.monitoring_requirement) {
    v.push({
      code: L12ContractViolationCode.L12K_TRIGGER_MONITORING_REQ_MISSING,
      subject_id: sid,
      detail: 'monitoring_requirement required',
    });
  } else {
    const mr = c.monitoring_requirement;
    if (
      !mr.required_surface_refs ||
      mr.required_surface_refs.length === 0 ||
      !mr.check_frequency_class ||
      typeof mr.stale_after_ms !== 'number'
    ) {
      v.push({
        code: L12ContractViolationCode.L12K_TRIGGER_MONITORING_REQ_MISSING,
        subject_id: sid,
        detail: 'monitoring_requirement is incomplete',
      });
    }
    if (
      !mr.monitorable &&
      (c.trigger_status === L12TriggerStatus.ACTIVE ||
        c.trigger_status === L12TriggerStatus.PARTIALLY_ACTIVE)
    ) {
      v.push({
        code: L12ContractViolationCode.L12K_TRIGGER_NOT_MONITORABLE_BUT_ACTIVE,
        subject_id: sid,
        detail: `trigger ${c.trigger_id} is unmonitorable but status=${c.trigger_status}`,
      });
    }
  }
  if (detect(c.trigger_name ?? '', GUARANTEED_PATTERNS)) {
    v.push({
      code: L12ContractViolationCode.L12K_TRIGGER_GUARANTEED_OUTCOME,
      subject_id: sid,
      detail: `trigger claims guaranteed outcome: "${c.trigger_name}"`,
    });
  }
  if (detect(c.trigger_name ?? '', TRADE_INSTRUCTION)) {
    v.push({
      code: L12ContractViolationCode.L12K_TRIGGER_TRADE_INSTRUCTION,
      subject_id: sid,
      detail: `trigger acts as trade instruction: "${c.trigger_name}"`,
    });
  }
  return v;
}
