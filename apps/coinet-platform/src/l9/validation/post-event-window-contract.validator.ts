/**
 * L9.3 — PostEventWindow Contract Validator — §9.3.6.3
 */

import { L9PostEventWindowContract } from '../contracts/post-event-window.contract';
import { L9SequenceContractViolationCode } from './l9-contract-violation-codes';

export interface L9PostEventContractIssue {
  readonly code: L9SequenceContractViolationCode;
  readonly message: string;
}
export interface L9PostEventContractReport {
  readonly valid: boolean;
  readonly issues: readonly L9PostEventContractIssue[];
}

const ISO_TS =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})$/;
const SEMVER = /^\d+\.\d+\.\d+(?:-[\w.]+)?$/;

export function validateL9PostEventWindowContract(
  w: L9PostEventWindowContract,
): L9PostEventContractReport {
  const issues: L9PostEventContractIssue[] = [];

  if (!w.post_event_window_id || !w.sequence_subject_id) {
    issues.push({
      code: L9SequenceContractViolationCode.POST_EVENT_MISSING_IDENTITY,
      message: 'post_event_window_id or sequence_subject_id missing',
    });
  }
  if (!w.post_event_contract_version ||
      !SEMVER.test(w.post_event_contract_version)) {
    issues.push({
      code: L9SequenceContractViolationCode.POST_EVENT_MISSING_CONTRACT_VERSION,
      message:
        `post_event_contract_version missing or not semver: ${w.post_event_contract_version}`,
    });
  }
  if (!w.anchor_event_ref) {
    issues.push({
      code: L9SequenceContractViolationCode.POST_EVENT_MISSING_ANCHOR,
      message: 'anchor_event_ref missing',
    });
  }
  if (!w.window_class) {
    issues.push({
      code: L9SequenceContractViolationCode.POST_EVENT_MISSING_CLASS,
      message: 'window_class missing',
    });
  }
  if (!w.window_state) {
    issues.push({
      code: L9SequenceContractViolationCode.POST_EVENT_MISSING_STATE,
      message: 'window_state missing',
    });
  }
  if (!w.window_start || !ISO_TS.test(w.window_start)) {
    issues.push({
      code: L9SequenceContractViolationCode.POST_EVENT_MISSING_START,
      message: `window_start missing or not ISO-8601: ${w.window_start}`,
    });
  }
  if (!w.window_end || !ISO_TS.test(w.window_end)) {
    issues.push({
      code: L9SequenceContractViolationCode.POST_EVENT_MISSING_END,
      message: `window_end missing or not ISO-8601: ${w.window_end}`,
    });
  }
  if (w.window_start && w.window_end &&
      ISO_TS.test(w.window_start) && ISO_TS.test(w.window_end) &&
      Date.parse(w.window_start) > Date.parse(w.window_end)) {
    issues.push({
      code: L9SequenceContractViolationCode.POST_EVENT_MISSING_END,
      message:
        `window_start ${w.window_start} > window_end ${w.window_end}`,
    });
  }
  if (!w.lineage_refs || !w.lineage_refs.trace_id ||
      !w.lineage_refs.manifest_id) {
    issues.push({
      code: L9SequenceContractViolationCode.POST_EVENT_MISSING_LINEAGE,
      message: 'lineage_refs.trace_id and lineage_refs.manifest_id required',
    });
  }
  if (!w.replay_hash) {
    issues.push({
      code: L9SequenceContractViolationCode.POST_EVENT_MISSING_REPLAY_HASH,
      message: 'replay_hash missing',
    });
  }

  return { valid: issues.length === 0, issues };
}
