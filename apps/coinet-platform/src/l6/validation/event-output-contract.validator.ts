/**
 * L6.3 — Event Output Contract Validator
 *
 * §6.3.6.5–7 — Enforces event runtime output legality:
 *   - all required top-level and lineage fields present
 *   - lifecycle state is a registered L6EventLifecycleState
 *   - timestamp ordering law (candidate → confirmed → active → peak → resolved/expired)
 *   - event confirmation law (cannot be CONFIRMED without trigger + confirmed_at)
 *   - dedupe, suppression, replay-hash rules
 *   - contract version alignment with definition
 */

import {
  EventOutput,
  REQUIRED_EVENT_OUTPUT_TOP_FIELDS,
  REQUIRED_EVENT_OUTPUT_LINEAGE_FIELDS,
} from '../contracts/event-output.contract';
import { EventDefinitionContract } from '../contracts/event-definition.contract';
import {
  L6EventLifecycleState,
  isRegisteredLifecycleState,
} from '../contracts/event-lifecycle-state';
import {
  L6ContractValidationResult,
  L6ContractViolation,
  L6ContractViolationCode,
  contractFail,
  contractOk,
  contractViolation,
} from './contract-violation-codes';
import { isValidReplayHash } from './replay-hash';

export function validateEventOutput(
  output: EventOutput,
  definition?: EventDefinitionContract,
): L6ContractValidationResult {
  const v: L6ContractViolation[] = [];

  if (!output || typeof output !== 'object') {
    return contractFail([contractViolation(
      L6ContractViolationCode.OUT_MISSING_FIELD, 'root',
      'Event output is missing.', {},
    )]);
  }

  const dict = output as unknown as Record<string, unknown>;
  for (const field of REQUIRED_EVENT_OUTPUT_TOP_FIELDS) {
    if (!hasMeaningfulValue(dict, field as string)) {
      v.push(contractViolation(
        L6ContractViolationCode.OUT_MISSING_FIELD, field as string,
        `Event output is missing required field "${String(field)}".`,
        { field: String(field) },
      ));
    }
  }

  if (output.lineage) {
    const lineageDict = output.lineage as unknown as Record<string, unknown>;
    for (const field of REQUIRED_EVENT_OUTPUT_LINEAGE_FIELDS) {
      if (!hasMeaningfulValue(lineageDict, field as string)) {
        v.push(contractViolation(
          L6ContractViolationCode.OUT_MISSING_LINEAGE_FIELD,
          `lineage.${String(field)}`,
          `Event output lineage is missing required field "${String(field)}".`,
          { field: String(field) },
        ));
      }
    }
    if (output.lineage.replay_hash && !isValidReplayHash(output.lineage.replay_hash)) {
      v.push(contractViolation(
        L6ContractViolationCode.OUT_MISSING_REPLAY_HASH, 'lineage.replay_hash',
        'replay_hash must be a 64-char lowercase hex SHA-256 digest.',
        { got: output.lineage.replay_hash },
      ));
    }
  }

  if (output.state && !isRegisteredLifecycleState(output.state)) {
    v.push(contractViolation(
      L6ContractViolationCode.OUT_INVALID_LIFECYCLE_STATE, 'state',
      `state "${output.state}" is not a registered L6EventLifecycleState.`,
      { got: output.state },
    ));
  }

  const ts = extractTimestamps(output);
  const orderIssues = checkTimestampOrdering(ts);
  if (orderIssues.length > 0) {
    for (const msg of orderIssues) {
      v.push(contractViolation(
        L6ContractViolationCode.OUT_IMPOSSIBLE_TIMESTAMP_ORDER, 'timestamps',
        msg, ts as unknown as Record<string, unknown>,
      ));
    }
  }

  if (output.state === L6EventLifecycleState.CONFIRMED
    || output.state === L6EventLifecycleState.ACTIVE
    || output.state === L6EventLifecycleState.COOLING
    || output.state === L6EventLifecycleState.RESOLVED
    || output.state === L6EventLifecycleState.EXPIRED) {
    if (!output.confirmed_at) {
      v.push(contractViolation(
        L6ContractViolationCode.OUT_ILLEGAL_CONFIRMATION, 'confirmed_at',
        `state "${output.state}" requires a confirmed_at timestamp.`, {},
      ));
    }
    if (!output.trigger_values || !output.trigger_values.trigger_id) {
      v.push(contractViolation(
        L6ContractViolationCode.OUT_ILLEGAL_CONFIRMATION, 'trigger_values',
        `Confirmed event must carry a trigger snapshot with trigger_id.`, {},
      ));
    }
    if (!output.lineage?.evidence_pack_ref) {
      v.push(contractViolation(
        L6ContractViolationCode.OUT_ILLEGAL_CONFIRMATION, 'lineage.evidence_pack_ref',
        `Confirmed event must reference an evidence pack.`, {},
      ));
    }
  }

  if (!output.dedupe_key || typeof output.dedupe_key !== 'string' || output.dedupe_key.length === 0) {
    v.push(contractViolation(
      L6ContractViolationCode.OUT_MISSING_DEDUPE_KEY, 'dedupe_key',
      'Event output must carry a non-empty dedupe_key.', {},
    ));
  }

  if (output.state === L6EventLifecycleState.SUPPRESSED && !output.suppression_group) {
    v.push(contractViolation(
      L6ContractViolationCode.OUT_MISSING_SUPPRESSION_GROUP, 'suppression_group',
      'SUPPRESSED events must carry suppression_group.', {},
    ));
  }

  if (definition) {
    if (output.event_id !== definition.primitive_id) {
      v.push(contractViolation(
        L6ContractViolationCode.OUT_CONTRACT_VERSION_MISMATCH, 'event_id',
        `Event output event_id "${output.event_id}" does not match definition primitive_id "${definition.primitive_id}".`,
        { output: output.event_id, definition: definition.primitive_id },
      ));
    }
    if (output.event_version !== definition.version) {
      v.push(contractViolation(
        L6ContractViolationCode.OUT_CONTRACT_VERSION_MISMATCH, 'event_version',
        `Event output event_version "${output.event_version}" does not match definition version "${definition.version}".`,
        { output: output.event_version, definition: definition.version },
      ));
    }
    if (definition.lifecycle_completeness) {
      const lc = definition.lifecycle_completeness;
      if (lc.requiresConfirmation && output.state === L6EventLifecycleState.ACTIVE && !output.confirmed_at) {
        v.push(contractViolation(
          L6ContractViolationCode.OUT_ILLEGAL_CONFIRMATION, 'confirmed_at',
          'Definition requires confirmation stage before ACTIVE state.', {},
        ));
      }
    }
  }

  return v.length === 0 ? contractOk() : contractFail(v);
}

function hasMeaningfulValue(obj: Record<string, unknown>, field: string): boolean {
  if (!(field in obj)) return false;
  const v = obj[field];
  if (v === null || v === undefined) return false;
  if (typeof v === 'string' && v.length === 0) return false;
  return true;
}

interface TimestampBundle {
  candidate_at?: string;
  confirmed_at?: string | null;
  active_at?: string | null;
  peak_at?: string | null;
  resolved_at?: string | null;
  expired_at?: string | null;
}

function extractTimestamps(output: EventOutput): TimestampBundle {
  return {
    candidate_at: output.candidate_at,
    confirmed_at: output.confirmed_at,
    active_at: output.active_at,
    peak_at: output.peak_at,
    resolved_at: output.resolved_at,
    expired_at: output.expired_at,
  };
}

function parseTs(t: string | null | undefined): number | null {
  if (!t) return null;
  const ms = Date.parse(t);
  return Number.isNaN(ms) ? null : ms;
}

function checkTimestampOrdering(ts: TimestampBundle): string[] {
  const issues: string[] = [];
  const cand = parseTs(ts.candidate_at);
  const conf = parseTs(ts.confirmed_at);
  const act = parseTs(ts.active_at);
  const peak = parseTs(ts.peak_at);
  const res = parseTs(ts.resolved_at);
  const exp = parseTs(ts.expired_at);

  if (ts.candidate_at && cand === null) {
    issues.push('candidate_at is not a parseable ISO timestamp.');
  }

  if (conf !== null && cand !== null && conf < cand) {
    issues.push('confirmed_at precedes candidate_at.');
  }
  if (act !== null && conf !== null && act < conf) {
    issues.push('active_at precedes confirmed_at.');
  }
  if (peak !== null && act !== null && peak < act) {
    issues.push('peak_at precedes active_at.');
  }
  if (res !== null && cand !== null && res < cand) {
    issues.push('resolved_at precedes candidate_at.');
  }
  if (res !== null && act !== null && res < act) {
    issues.push('resolved_at precedes active_at.');
  }
  if (exp !== null && cand !== null && exp < cand) {
    issues.push('expired_at precedes candidate_at.');
  }
  return issues;
}
