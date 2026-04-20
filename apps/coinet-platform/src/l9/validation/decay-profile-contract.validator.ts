/**
 * L9.3 — DecayProfile Contract Validator — §9.3.6.2
 */

import { L9DecayProfileContract } from '../contracts/decay-profile.contract';
import { L9SequenceContractViolationCode } from './l9-contract-violation-codes';

export interface L9DecayContractIssue {
  readonly code: L9SequenceContractViolationCode;
  readonly message: string;
}
export interface L9DecayContractReport {
  readonly valid: boolean;
  readonly issues: readonly L9DecayContractIssue[];
}

const SEMVER = /^\d+\.\d+\.\d+(?:-[\w.]+)?$/;

export function validateL9DecayProfileContract(
  d: L9DecayProfileContract,
): L9DecayContractReport {
  const issues: L9DecayContractIssue[] = [];

  if (!d.decay_profile_id || !d.sequence_subject_id) {
    issues.push({
      code: L9SequenceContractViolationCode.DECAY_MISSING_IDENTITY,
      message: 'decay_profile_id or sequence_subject_id missing',
    });
  }
  if (!d.decay_contract_version || !SEMVER.test(d.decay_contract_version)) {
    issues.push({
      code: L9SequenceContractViolationCode.DECAY_MISSING_CONTRACT_VERSION,
      message:
        `decay_contract_version missing or not semver: ${d.decay_contract_version}`,
    });
  }
  if (!d.decay_class) {
    issues.push({
      code: L9SequenceContractViolationCode.DECAY_MISSING_CLASS,
      message: 'decay_class missing',
    });
  }
  if (typeof d.decay_score !== 'number' || !Number.isFinite(d.decay_score)) {
    issues.push({
      code: L9SequenceContractViolationCode.DECAY_MISSING_SCORE,
      message: 'decay_score missing or non-finite',
    });
  } else if (d.decay_score < 0 || d.decay_score > 1) {
    issues.push({
      code: L9SequenceContractViolationCode.DECAY_SCORE_OUT_OF_RANGE,
      message: `decay_score out of [0,1]: ${d.decay_score}`,
    });
  }
  if (!d.decaying_signal_refs || !d.surviving_signal_refs) {
    issues.push({
      code: L9SequenceContractViolationCode.DECAY_MISSING_SIGNAL_REFS,
      message:
        'decaying_signal_refs and surviving_signal_refs must both be arrays',
    });
  } else if (d.decaying_signal_refs.length === 0 &&
      d.surviving_signal_refs.length === 0) {
    issues.push({
      code: L9SequenceContractViolationCode.DECAY_MISSING_SIGNAL_REFS,
      message:
        'at least one of decaying_signal_refs / surviving_signal_refs must be non-empty',
    });
  }
  if (!d.decay_reason_codes || d.decay_reason_codes.length === 0) {
    issues.push({
      code: L9SequenceContractViolationCode.DECAY_MISSING_REASON_CODES,
      message: 'decay_reason_codes empty',
    });
  }
  if (typeof d.time_burden_ms !== 'number' || d.time_burden_ms < 0) {
    issues.push({
      code: L9SequenceContractViolationCode.DECAY_MISSING_TIME_BURDEN,
      message: `time_burden_ms missing or negative: ${d.time_burden_ms}`,
    });
  }
  if (!d.lineage_refs || !d.lineage_refs.trace_id ||
      !d.lineage_refs.manifest_id) {
    issues.push({
      code: L9SequenceContractViolationCode.DECAY_MISSING_LINEAGE,
      message: 'lineage_refs.trace_id and lineage_refs.manifest_id required',
    });
  }
  if (!d.replay_hash) {
    issues.push({
      code: L9SequenceContractViolationCode.DECAY_MISSING_REPLAY_HASH,
      message: 'replay_hash missing',
    });
  }

  return { valid: issues.length === 0, issues };
}
