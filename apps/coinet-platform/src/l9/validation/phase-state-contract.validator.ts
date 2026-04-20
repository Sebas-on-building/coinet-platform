/**
 * L9.3 — PhaseState Contract Validator — §9.3.6.1
 */

import { L9PhaseStateContract } from '../contracts/phase-state.contract';
import { L9SequenceContractViolationCode } from './l9-contract-violation-codes';

export interface L9PhaseContractIssue {
  readonly code: L9SequenceContractViolationCode;
  readonly message: string;
}
export interface L9PhaseContractReport {
  readonly valid: boolean;
  readonly issues: readonly L9PhaseContractIssue[];
}

const ISO_TS =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})$/;
const SEMVER = /^\d+\.\d+\.\d+(?:-[\w.]+)?$/;

export function validateL9PhaseStateContract(
  p: L9PhaseStateContract,
): L9PhaseContractReport {
  const issues: L9PhaseContractIssue[] = [];

  if (!p.phase_state_id || !p.sequence_subject_id) {
    issues.push({
      code: L9SequenceContractViolationCode.PHASE_MISSING_IDENTITY,
      message: 'phase_state_id or sequence_subject_id missing',
    });
  }
  if (!p.phase_contract_version || !SEMVER.test(p.phase_contract_version)) {
    issues.push({
      code: L9SequenceContractViolationCode.PHASE_MISSING_CONTRACT_VERSION,
      message:
        `phase_contract_version missing or not semver: ${p.phase_contract_version}`,
    });
  }
  if (!p.phase_class) {
    issues.push({
      code: L9SequenceContractViolationCode.PHASE_MISSING_CLASS,
      message: 'phase_class missing',
    });
  }
  if (typeof p.phase_progression_score !== 'number' ||
      !Number.isFinite(p.phase_progression_score)) {
    issues.push({
      code: L9SequenceContractViolationCode.PHASE_MISSING_PROGRESSION_SCORE,
      message: 'phase_progression_score missing',
    });
  } else if (p.phase_progression_score < 0 || p.phase_progression_score > 1) {
    issues.push({
      code: L9SequenceContractViolationCode.PHASE_SCORE_OUT_OF_RANGE,
      message: `phase_progression_score out of [0,1]: ${p.phase_progression_score}`,
    });
  }
  if (!p.phase_progression_class) {
    issues.push({
      code: L9SequenceContractViolationCode.PHASE_MISSING_PROGRESSION_CLASS,
      message: 'phase_progression_class missing',
    });
  }
  if (!p.phase_support_refs || p.phase_support_refs.length === 0) {
    issues.push({
      code: L9SequenceContractViolationCode.PHASE_MISSING_SUPPORT_REFS,
      message: 'phase_support_refs empty',
    });
  }
  if (!p.phase_challenge_refs) {
    issues.push({
      code: L9SequenceContractViolationCode.PHASE_MISSING_CHALLENGE_REFS,
      message: 'phase_challenge_refs missing (must be array, may be empty)',
    });
  }
  if (!p.phase_started_at || !ISO_TS.test(p.phase_started_at)) {
    issues.push({
      code: L9SequenceContractViolationCode.PHASE_MISSING_IDENTITY,
      message: `phase_started_at missing or not ISO-8601: ${p.phase_started_at}`,
    });
  }
  if (!p.lineage_refs || !p.lineage_refs.trace_id ||
      !p.lineage_refs.manifest_id) {
    issues.push({
      code: L9SequenceContractViolationCode.PHASE_MISSING_LINEAGE,
      message: 'lineage_refs.trace_id and lineage_refs.manifest_id required',
    });
  }
  if (!p.replay_hash) {
    issues.push({
      code: L9SequenceContractViolationCode.PHASE_MISSING_REPLAY_HASH,
      message: 'replay_hash missing',
    });
  }

  return { valid: issues.length === 0, issues };
}
