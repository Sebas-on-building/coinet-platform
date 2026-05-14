/**
 * L12.3 — Condition contract validator (§12.3.7.2).
 */

import {
  L12ConditionMaterialityClass,
  L12ConditionRole,
} from '../contracts/scenario-condition';
import { L12ConditionContract } from '../contracts/scenario-condition.contract';
import {
  L12ContractViolation,
  L12ContractViolationCode,
} from './l12-contract-violation-codes';

const CAUSALITY_OR_CERTAINTY: readonly RegExp[] = [
  /\bcauses?\b/i,
  /\bcaused\s+by\b/i,
  /\bguaranteed\b/i,
  /\bcertain(ly|ty)?\b/i,
  /\binevitable\b/i,
  /\bmust\s+(happen|cause|trigger)\b/i,
];

const RAW_SOURCE_PATTERN = /^(l[12]|raw|primitive|ohlcv|tick|orderbook)[:.]/i;

function detect(text: string, pats: readonly RegExp[]): boolean {
  if (!text) return false;
  return pats.some(p => p.test(text));
}

export function validateL12ConditionContract(
  c: L12ConditionContract,
): readonly L12ContractViolation[] {
  const v: L12ContractViolation[] = [];
  const sid = c.condition_contract_id || '<unknown>';

  const requiredKeys: Array<keyof L12ConditionContract> = [
    'condition_contract_id',
    'condition_id',
    'scenario_id',
    'scenario_set_id',
    'condition_type',
    'condition_role',
    'source_layer',
    'required_surface_ref',
    'current_state_ref',
    'operator',
    'condition_status',
    'materiality_class',
    'policy_version',
    'replay_hash',
  ];
  for (const k of requiredKeys) {
    if (c[k] === undefined || c[k] === null || c[k] === '') {
      v.push({
        code: L12ContractViolationCode.L12K_CONDITION_CONTRACT_INCOMPLETE,
        subject_id: sid,
        detail: `condition contract field ${String(k)} required`,
      });
    }
  }
  if (!c.lineage_refs || c.lineage_refs.length === 0) {
    v.push({
      code: L12ContractViolationCode.L12K_CONDITION_CONTRACT_INCOMPLETE,
      subject_id: sid,
      detail: 'lineage_refs required',
    });
  }
  if (
    c.materiality_class === L12ConditionMaterialityClass.MATERIAL ||
    c.materiality_class === L12ConditionMaterialityClass.CRITICAL
  ) {
    if (!c.evidence_refs || c.evidence_refs.length === 0) {
      v.push({
        code: L12ContractViolationCode.L12K_CONDITION_MATERIAL_WITHOUT_EVIDENCE,
        subject_id: sid,
        detail: `material condition (${c.materiality_class}) has no evidence_refs`,
      });
    }
  }
  if (
    (c.condition_role === L12ConditionRole.CONFIRMS_PATH ||
      c.condition_role === L12ConditionRole.INVALIDATES_PATH ||
      c.condition_role === L12ConditionRole.SHIFTS_RANKING) &&
    !c.monitorable
  ) {
    v.push({
      code: L12ContractViolationCode.L12K_CONDITION_NOT_MONITORABLE_BUT_USED_AS_TRIGGER,
      subject_id: sid,
      detail: `condition with role ${c.condition_role} must be monitorable`,
    });
  }
  if (RAW_SOURCE_PATTERN.test(c.required_surface_ref ?? '')) {
    v.push({
      code: L12ContractViolationCode.L12K_CONDITION_RAW_SOURCE,
      subject_id: sid,
      detail: `condition references raw source: ${c.required_surface_ref}`,
    });
  }
  const semanticBlobs = [
    c.expected_state ?? '',
    c.required_surface_ref ?? '',
  ];
  for (const blob of semanticBlobs) {
    if (detect(blob, CAUSALITY_OR_CERTAINTY)) {
      v.push({
        code: L12ContractViolationCode.L12K_CONDITION_CAUSALITY_OR_CERTAINTY,
        subject_id: sid,
        detail: `condition carries causality/certainty: "${blob}"`,
      });
      break;
    }
  }
  return v;
}
