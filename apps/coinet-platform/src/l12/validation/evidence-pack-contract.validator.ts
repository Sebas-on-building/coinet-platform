/**
 * L12.3 — Evidence pack contract validator (§12.3.13.2).
 */

import {
  isL12RawLowerLayerEvidenceRef,
  L12ScenarioEvidencePackContract,
} from '../contracts/scenario-evidence-pack.contract';
import {
  L12ContractViolation,
  L12ContractViolationCode,
} from './l12-contract-violation-codes';

const UNGOVERNED_REF_PATTERN = /^(unknown|adhoc|local|tmp|scratch|sandbox)[:.]/i;

export function validateL12EvidencePackContract(
  c: L12ScenarioEvidencePackContract,
): readonly L12ContractViolation[] {
  const v: L12ContractViolation[] = [];
  const sid = c.evidence_pack_contract_id || '<unknown>';

  const required: Array<keyof L12ScenarioEvidencePackContract> = [
    'evidence_pack_contract_id',
    'evidence_pack_ref',
    'scenario_set_id',
    'subject_ref',
    'archive_policy_ref',
    'policy_version',
    'replay_hash',
  ];
  for (const k of required) {
    if (c[k] === undefined || c[k] === null || c[k] === '') {
      v.push({
        code: L12ContractViolationCode.L12K_EVIDENCE_PACK_INCOMPLETE,
        subject_id: sid,
        detail: `evidence pack field ${String(k)} required`,
      });
    }
  }
  const requiredArrays: Array<[keyof L12ScenarioEvidencePackContract, L12ContractViolationCode]> = [
    ['scenario_refs', L12ContractViolationCode.L12K_EVIDENCE_PACK_INCOMPLETE],
    ['condition_refs', L12ContractViolationCode.L12K_EVIDENCE_PACK_INCOMPLETE],
    ['trigger_refs', L12ContractViolationCode.L12K_EVIDENCE_PACK_INCOMPLETE],
    ['invalidation_refs', L12ContractViolationCode.L12K_EVIDENCE_PACK_INCOMPLETE],
    ['confidence_profile_refs', L12ContractViolationCode.L12K_EVIDENCE_PACK_INCOMPLETE],
    ['restriction_profile_refs', L12ContractViolationCode.L12K_EVIDENCE_PACK_INCOMPLETE],
    ['lineage_refs', L12ContractViolationCode.L12K_EVIDENCE_PACK_INCOMPLETE],
  ];
  for (const [k, code] of requiredArrays) {
    const arr = c[k] as readonly unknown[] | undefined;
    if (!arr || arr.length === 0) {
      v.push({
        code,
        subject_id: sid,
        detail: `evidence pack array ${String(k)} required`,
      });
    }
  }
  if (
    !c.score_evidence_refs ||
    c.score_evidence_refs.length === 0
  ) {
    v.push({
      code: L12ContractViolationCode.L12K_EVIDENCE_SCORE_REFS_MISSING,
      subject_id: sid,
      detail: 'score_evidence_refs required',
    });
  }
  if (!c.input_snapshot_ref) {
    v.push({
      code: L12ContractViolationCode.L12K_EVIDENCE_INPUT_SNAPSHOT_MISSING,
      subject_id: sid,
      detail: 'input_snapshot_ref required',
    });
  }
  if (!c.replay_safe_ref) {
    v.push({
      code: L12ContractViolationCode.L12K_EVIDENCE_REPLAY_SAFE_REF_MISSING,
      subject_id: sid,
      detail: 'replay_safe_ref required',
    });
  }
  for (const ref of c.lower_layer_evidence_refs ?? []) {
    if (isL12RawLowerLayerEvidenceRef(ref)) {
      v.push({
        code: L12ContractViolationCode.L12K_EVIDENCE_REFS_RAW_LOWER_LAYER,
        subject_id: sid,
        detail: `evidence references raw lower-layer ref: "${ref}"`,
      });
      break;
    }
  }
  for (const ref of [
    ...(c.validation_evidence_refs ?? []),
    ...(c.regime_evidence_refs ?? []),
    ...(c.sequence_evidence_refs ?? []),
    ...(c.hypothesis_evidence_refs ?? []),
    ...(c.score_evidence_refs ?? []),
  ]) {
    if (UNGOVERNED_REF_PATTERN.test(ref) || isL12RawLowerLayerEvidenceRef(ref)) {
      v.push({
        code: L12ContractViolationCode.L12K_EVIDENCE_REFS_UNGOVERNED,
        subject_id: sid,
        detail: `evidence references ungoverned surface: "${ref}"`,
      });
      break;
    }
  }
  return v;
}
