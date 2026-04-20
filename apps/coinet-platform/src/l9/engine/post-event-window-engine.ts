/**
 * L9.4 — PostEventWindowEngine
 *
 * §9.4.12 — Emits typed post-event windows, classifies them by state
 * (ACTIVE/STABILIZING/STABILIZED/FAILED/EXPIRED), and enforces anchor
 * and bounds.
 */

import type {
  L9SequenceSubjectContract,
} from '../contracts/sequence-subject.contract';
import type {
  L9PostEventRuntimeOutput,
} from '../runtime/sequence-execution-context';
import {
  L9PostEventWindowClass,
  L9PostEventWindowState,
} from '../contracts/post-event-window';
import type { L9PostEventWindowContract } from '../contracts/post-event-window.contract';
import {
  L9RuntimeViolation,
  L9RuntimeViolationCode,
} from '../validation/l9-runtime-violation-codes';
import { L9EngineResult, fail, ok } from './engine-types';

export interface L9PostEventWindowCandidate {
  readonly anchor_event_ref: string;
  readonly window_class: L9PostEventWindowClass;
  readonly window_start: string;
  readonly window_end: string;
  readonly window_state: L9PostEventWindowState;
  readonly stabilization_refs: readonly string[];
  readonly failure_refs: readonly string[];
}

export interface L9PostEventEngineInput {
  readonly subject: L9SequenceSubjectContract;
  readonly candidates: readonly L9PostEventWindowCandidate[];
  readonly contract_versions: {
    readonly post_event_contract_version: string;
    readonly schema_version: string;
    readonly policy_version: string;
  };
  readonly compute_run_id: string;
}

export function emitPostEventWindows(
  input: L9PostEventEngineInput,
): L9EngineResult<L9PostEventRuntimeOutput> {
  const violations: L9RuntimeViolation[] = [];
  const s = input.subject;
  const subjectId = s.sequence_subject_id;
  const windows: L9PostEventWindowContract[] = [];
  let expired = 0;
  let active = 0;

  input.candidates.forEach((c, idx) => {
    const id = `pew:${subjectId}:${idx}`;

    if (!c.anchor_event_ref) {
      violations.push(v(
        L9RuntimeViolationCode.POST_EVENT_WITHOUT_ANCHOR,
        subjectId, `${id} missing anchor_event_ref`));
    }
    if (!c.window_start || !c.window_end) {
      violations.push(v(
        L9RuntimeViolationCode.POST_EVENT_MISSING_BOUNDS,
        subjectId, `${id} missing window bounds`));
    }
    if (!c.window_class) {
      violations.push(v(
        L9RuntimeViolationCode.POST_EVENT_CLASS_MISSING,
        subjectId, `${id} missing window_class`));
    }
    if (!c.window_state) {
      violations.push(v(
        L9RuntimeViolationCode.POST_EVENT_STATE_MISSING,
        subjectId, `${id} missing window_state`));
    }
    if (c.window_state === L9PostEventWindowState.STABILIZED &&
        (!c.stabilization_refs || c.stabilization_refs.length === 0)) {
      violations.push(v(
        L9RuntimeViolationCode.POST_EVENT_CLAIMS_WITHOUT_REFS,
        subjectId, `${id} STABILIZED without refs`));
    }
    if (c.window_state === L9PostEventWindowState.FAILED &&
        (!c.failure_refs || c.failure_refs.length === 0)) {
      violations.push(v(
        L9RuntimeViolationCode.POST_EVENT_CLAIMS_WITHOUT_REFS,
        subjectId, `${id} FAILED without refs`));
    }

    if (c.window_state === L9PostEventWindowState.EXPIRED) expired++;
    if (c.window_state === L9PostEventWindowState.ACTIVE ||
        c.window_state === L9PostEventWindowState.STABILIZING) active++;

    windows.push({
      post_event_window_id: id,
      sequence_subject_id: subjectId,
      post_event_contract_version:
        input.contract_versions.post_event_contract_version,
      schema_version: input.contract_versions.schema_version,
      policy_version: input.contract_versions.policy_version,
      anchor_event_ref: c.anchor_event_ref,
      window_class: c.window_class,
      window_start: c.window_start,
      window_end: c.window_end,
      window_state: c.window_state,
      stabilization_refs: [...c.stabilization_refs].sort(),
      failure_refs: [...c.failure_refs].sort(),
      lineage_refs: {
        trace_id: s.lineage_refs?.trace_id ?? '',
        manifest_id: s.lineage_refs?.manifest_id ?? '',
      },
      compute_run_id: input.compute_run_id,
      replay_hash: `h:${id}:${c.window_class}:${c.window_state}`,
    });
  });

  if (violations.length > 0) return fail(violations);

  return ok({
    sequence_subject_id: subjectId,
    windows: windows.sort((a, b) =>
      a.window_start < b.window_start ? -1 : a.window_start > b.window_start ? 1 :
      a.post_event_window_id < b.post_event_window_id ? -1 : 1),
    expired_count: expired,
    active_count: active,
  });
}

function v(
  code: L9RuntimeViolationCode,
  subjectId: string,
  detail: string,
): L9RuntimeViolation {
  return {
    code,
    source: 'post-event-window-engine',
    nodeId: null,
    sequence_run_id: null,
    sequence_subject_id: subjectId,
    detail,
    context: {},
  };
}
