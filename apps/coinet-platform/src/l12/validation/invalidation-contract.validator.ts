/**
 * L12.3 — Invalidation contract validator (§12.3.9.3).
 */

import { L12InvalidationStatus } from '../contracts/scenario-invalidation';
import { L12InvalidationContract } from '../contracts/scenario-invalidation.contract';
import {
  L12ContractViolation,
  L12ContractViolationCode,
} from './l12-contract-violation-codes';

export interface L12InvalidationContextForValidation {
  /**
   * If active invalidation exists, the current path-confidence contract must
   * carry a cap reason ref naming this invalidation. If `null`/`undefined`,
   * we skip the reflection check (used in unit-level tests of the contract
   * alone).
   */
  readonly confidenceCapReasonRefs?: readonly string[];
  /** Whether the scenario set hides this invalidation from output. */
  readonly hiddenFromOutput?: boolean;
}

function isActive(s: L12InvalidationStatus): boolean {
  return (
    s === L12InvalidationStatus.ACTIVE ||
    s === L12InvalidationStatus.PARTIALLY_ACTIVE ||
    s === L12InvalidationStatus.BLOCKING
  );
}

export function validateL12InvalidationContract(
  c: L12InvalidationContract,
  ctx?: L12InvalidationContextForValidation,
): readonly L12ContractViolation[] {
  const v: L12ContractViolation[] = [];
  const sid = c.invalidation_contract_id || '<unknown>';

  const required: Array<keyof L12InvalidationContract> = [
    'invalidation_contract_id',
    'invalidation_id',
    'scenario_id',
    'scenario_set_id',
    'invalidation_type',
    'invalidation_name',
    'invalidation_status',
    'expected_effect',
    'policy_version',
    'replay_hash',
  ];
  for (const k of required) {
    if (c[k] === undefined || c[k] === null || c[k] === '') {
      v.push({
        code: L12ContractViolationCode.L12K_INVALIDATION_CONTRACT_INCOMPLETE,
        subject_id: sid,
        detail: `invalidation contract field ${String(k)} required`,
      });
    }
  }
  if (
    !c.invalidation_condition_refs ||
    c.invalidation_condition_refs.length === 0
  ) {
    v.push({
      code: L12ContractViolationCode.L12K_INVALIDATION_CONTRACT_INCOMPLETE,
      subject_id: sid,
      detail: 'invalidation_condition_refs required',
    });
  }
  if (!c.evidence_refs || c.evidence_refs.length === 0) {
    v.push({
      code: L12ContractViolationCode.L12K_INVALIDATION_CONTRACT_INCOMPLETE,
      subject_id: sid,
      detail: 'evidence_refs required',
    });
  }
  if (!c.lineage_refs || c.lineage_refs.length === 0) {
    v.push({
      code: L12ContractViolationCode.L12K_INVALIDATION_CONTRACT_INCOMPLETE,
      subject_id: sid,
      detail: 'lineage_refs required',
    });
  }
  if (
    typeof c.invalidation_strength_score !== 'number' ||
    c.invalidation_strength_score < 0 ||
    c.invalidation_strength_score > 1
  ) {
    v.push({
      code: L12ContractViolationCode.L12K_INVALIDATION_CONTRACT_INCOMPLETE,
      subject_id: sid,
      detail: 'invalidation_strength_score must be in [0,1]',
    });
  }
  if (!c.monitoring_requirement) {
    v.push({
      code: L12ContractViolationCode.L12K_INVALIDATION_MONITORING_REQ_MISSING,
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
        code: L12ContractViolationCode.L12K_INVALIDATION_MONITORING_REQ_MISSING,
        subject_id: sid,
        detail: 'monitoring_requirement is incomplete',
      });
    }
    if (!mr.monitorable && !mr.blocks_clean_output_if_missing) {
      v.push({
        code: L12ContractViolationCode.L12K_INVALIDATION_NOT_MONITORABLE_USED_CLEAN,
        subject_id: sid,
        detail: 'unmonitorable invalidation must set blocks_clean_output_if_missing=true',
      });
    }
  }
  if (ctx) {
    if (
      isActive(c.invalidation_status) &&
      ctx.confidenceCapReasonRefs !== undefined
    ) {
      const reflected = ctx.confidenceCapReasonRefs.some(
        r => r === c.invalidation_id || r === c.invalidation_contract_id,
      );
      if (!reflected) {
        v.push({
          code: L12ContractViolationCode.L12K_ACTIVE_INVALIDATION_NOT_REFLECTED_IN_CONFIDENCE,
          subject_id: sid,
          detail: 'active invalidation is not reflected in confidence cap reasons',
        });
      }
    }
    if (ctx.hiddenFromOutput) {
      v.push({
        code: L12ContractViolationCode.L12K_INVALIDATION_HIDDEN,
        subject_id: sid,
        detail: 'invalidation is hidden from scenario output',
      });
    }
  }
  return v;
}
