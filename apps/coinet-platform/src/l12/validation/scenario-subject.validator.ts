/**
 * L12.2 — ScenarioSubject validator (§12.2.4.4).
 */

import {
  L12ScenarioSubject,
} from '../contracts/scenario-subject';
import {
  L12ObjectViolation,
  L12ObjectViolationCode,
} from './l12-object-violation-codes';
import { isL12FamilyBlocked } from '../registry/scenario-family.registry';

const TRADE_INTENT_PATTERNS: readonly RegExp[] = [
  /(?:^|[^a-z0-9])(buy|sell|long|short)(?:[^a-z0-9]|$)/i,
  /portfolio[_\s]?allocation/i,
  /trade[_\s]?(action|signal|instruction|intent)/i,
  /entry[_\s]?(point|signal|level)/i,
];

const L13_PLUS_REF_PATTERN = /^l(1[3-9]|[2-9][0-9])[:.]/i;

export function validateL12ScenarioSubject(
  s: L12ScenarioSubject,
): readonly L12ObjectViolation[] {
  const v: L12ObjectViolation[] = [];
  const sid = s.scenario_subject_id || '<unknown>';

  if (!s.scenario_subject_id) {
    v.push({
      code: L12ObjectViolationCode.L12O_SUBJECT_ID_MISSING,
      subject_id: sid,
      detail: 'scenario_subject_id is required',
    });
  }
  if (!s.scope_type || !s.scope_id) {
    v.push({
      code: L12ObjectViolationCode.L12O_SUBJECT_SCOPE_MISSING,
      subject_id: sid,
      detail: 'scope_type/scope_id are required',
    });
  }
  if (!s.as_of) {
    v.push({
      code: L12ObjectViolationCode.L12O_SUBJECT_AS_OF_MISSING,
      subject_id: sid,
      detail: 'as_of is required',
    });
  }
  if (!s.requested_scenario_families || s.requested_scenario_families.length === 0) {
    v.push({
      code: L12ObjectViolationCode.L12O_SUBJECT_NO_REQUESTED_FAMILY,
      subject_id: sid,
      detail: 'at least one requested family is required',
    });
  } else {
    for (const f of s.requested_scenario_families) {
      if (isL12FamilyBlocked(f)) {
        v.push({
          code: L12ObjectViolationCode.L12O_SUBJECT_REQUESTED_BLOCKED_FAMILY,
          subject_id: sid,
          detail: `requested family is BLOCKED: ${f}`,
        });
      }
    }
  }
  if (!s.required_score_context_refs || s.required_score_context_refs.length === 0) {
    v.push({
      code: L12ObjectViolationCode.L12O_SUBJECT_SCORE_CONTEXT_REFS_ABSENT,
      subject_id: sid,
      detail: 'L11 score-context refs are required',
    });
  }
  if (!s.lineage_refs || s.lineage_refs.length === 0) {
    v.push({
      code: L12ObjectViolationCode.L12O_SUBJECT_LINEAGE_ABSENT,
      subject_id: sid,
      detail: 'lineage refs are required',
    });
  }
  if (!s.input_snapshot_ref) {
    v.push({
      code: L12ObjectViolationCode.L12O_SUBJECT_INPUT_SNAPSHOT_ABSENT,
      subject_id: sid,
      detail: 'input_snapshot_ref is required',
    });
  }
  if (!s.replay_hash) {
    v.push({
      code: L12ObjectViolationCode.L12O_SUBJECT_REPLAY_HASH_ABSENT,
      subject_id: sid,
      detail: 'replay_hash is required',
    });
  }

  // Trade intent check across optional/historical/evidence refs and metadata.
  const refsForCheck: string[] = [
    s.scope_type,
    s.scope_id,
    s.scope_granularity,
    s.conditionality_policy_ref,
    s.multi_path_policy_ref,
    ...(s.optional_context_refs ?? []),
    ...(s.historical_context_refs ?? []),
    ...(s.evidence_only_refs ?? []),
  ];
  for (const r of refsForCheck) {
    if (!r) continue;
    for (const pat of TRADE_INTENT_PATTERNS) {
      if (pat.test(r)) {
        v.push({
          code: L12ObjectViolationCode.L12O_SUBJECT_TRADE_INTENT,
          subject_id: sid,
          detail: `trade intent detected in ${r}`,
        });
        break;
      }
    }
  }

  const allInputRefs: string[] = [
    ...(s.required_validation_refs ?? []),
    ...(s.required_regime_refs ?? []),
    ...(s.required_sequence_refs ?? []),
    ...(s.required_hypothesis_refs ?? []),
    ...(s.required_score_context_refs ?? []),
    ...(s.optional_context_refs ?? []),
    ...(s.historical_context_refs ?? []),
    ...(s.evidence_only_refs ?? []),
  ];
  for (const r of allInputRefs) {
    if (!r) continue;
    if (L13_PLUS_REF_PATTERN.test(r)) {
      v.push({
        code: L12ObjectViolationCode.L12O_SUBJECT_REFERENCES_L13_PLUS,
        subject_id: sid,
        detail: `subject references L13+ surface: ${r}`,
      });
      break;
    }
  }

  return v;
}
