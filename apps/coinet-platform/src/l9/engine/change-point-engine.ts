/**
 * L9.4 — ChangePointEngine
 *
 * §9.4.10 — Detects typed change points (phase shift, lead-lag
 * inversion, shock, unlock, liquidation, decay onset, etc.). It
 * assigns severity bands and carries triggering refs. Never assigns
 * primary sequence state.
 */

import type {
  L9SequenceSubjectContract,
} from '../contracts/sequence-subject.contract';
import type {
  L9ChangePointRuntimeOutput,
} from '../runtime/sequence-execution-context';
import {
  L9ChangePoint,
  L9ChangePointClass,
  L9ChangePointSeverity,
} from '../contracts/change-point';
import {
  L9RuntimeViolation,
  L9RuntimeViolationCode,
} from '../validation/l9-runtime-violation-codes';
import { L9EngineResult, fail, ok } from './engine-types';

export interface L9ChangePointCandidate {
  readonly change_point_class: L9ChangePointClass;
  readonly change_point_at: string;
  readonly prior_phase_ref: string | null;
  readonly next_phase_ref: string | null;
  readonly triggering_refs: readonly string[];
  readonly severity_score: number; // 0..1
  readonly has_anchor: boolean;
  readonly has_contradiction_refs: boolean;
}

export interface L9ChangePointEngineInput {
  readonly subject: L9SequenceSubjectContract;
  readonly candidates: readonly L9ChangePointCandidate[];
}

export function detectChangePoints(
  input: L9ChangePointEngineInput,
): L9EngineResult<L9ChangePointRuntimeOutput> {
  const violations: L9RuntimeViolation[] = [];
  const s = input.subject;
  const subjectId = s.sequence_subject_id;
  const points: L9ChangePoint[] = [];

  input.candidates.forEach((c, idx) => {
    const id = `cp:${subjectId}:${idx}`;

    // §9.4.10.2 — phase shift requires both prior and next
    if (c.change_point_class === L9ChangePointClass.PHASE_SHIFT &&
        (!c.prior_phase_ref || !c.next_phase_ref)) {
      if (!c.prior_phase_ref) {
        violations.push(v(
          L9RuntimeViolationCode.CHANGE_POINT_PRIOR_POSTURE_MISSING,
          subjectId, `${id} phase shift missing prior_phase_ref`));
      }
      if (!c.next_phase_ref) {
        violations.push(v(
          L9RuntimeViolationCode.CHANGE_POINT_NEXT_POSTURE_MISSING,
          subjectId, `${id} phase shift missing next_phase_ref`));
      }
    }

    const isShock =
      c.change_point_class === L9ChangePointClass.CONTRADICTION_SHOCK ||
      c.change_point_class === L9ChangePointClass.SECURITY_SHOCK ||
      c.change_point_class === L9ChangePointClass.LIQUIDATION_EVENT ||
      c.change_point_class === L9ChangePointClass.UNLOCK_EVENT;
    if (isShock && !c.has_anchor) {
      violations.push(v(
        L9RuntimeViolationCode.CHANGE_POINT_SHOCK_WITHOUT_ANCHOR,
        subjectId, `${id} shock class without anchor`));
    }

    if (c.change_point_class === L9ChangePointClass.CONTRADICTION_SHOCK &&
        !c.has_contradiction_refs) {
      violations.push(v(
        L9RuntimeViolationCode.CHANGE_POINT_CONTRADICTION_WITHOUT_REFS,
        subjectId, `${id} contradiction shock without refs`));
    }

    if (!c.triggering_refs || c.triggering_refs.length === 0) {
      violations.push(v(
        L9RuntimeViolationCode.CHANGE_POINT_MISSING_TRIGGERS,
        subjectId, `${id} missing triggering_refs`));
    }

    const severityClass = bandSeverity(c.severity_score);
    if (severityClass === L9ChangePointSeverity.MINOR &&
        (c.change_point_class === L9ChangePointClass.CONTRADICTION_SHOCK ||
         c.change_point_class === L9ChangePointClass.SECURITY_SHOCK)) {
      violations.push(v(
        L9RuntimeViolationCode.CHANGE_POINT_MICRO_PROMOTED,
        subjectId,
        `${id} MINOR severity inconsistent with shock semantics`));
    }

    // Basic severity consistency
    if (c.severity_score < 0 || c.severity_score > 1) {
      violations.push(v(
        L9RuntimeViolationCode.CHANGE_POINT_SEVERITY_INCONSISTENT,
        subjectId, `${id} severity_score out of range`));
    }

    points.push({
      change_point_id: id,
      sequence_subject_id: subjectId,
      change_point_class: c.change_point_class,
      change_point_at: c.change_point_at,
      prior_phase_ref: c.prior_phase_ref,
      next_phase_ref: c.next_phase_ref,
      triggering_refs: [...c.triggering_refs].sort(),
      severity_score: clamp01(c.severity_score),
      severity_class: severityClass,
      lineage_refs: [
        `trace:${s.lineage_refs?.trace_id ?? ''}`,
        `manifest:${s.lineage_refs?.manifest_id ?? ''}`,
      ],
    });
  });

  if (violations.length > 0) return fail(violations);

  return ok({
    sequence_subject_id: subjectId,
    change_points: points.sort((a, b) =>
      a.change_point_at < b.change_point_at ? -1 :
      a.change_point_at > b.change_point_at ? 1 :
      a.change_point_id < b.change_point_id ? -1 : 1,
    ),
  });
}

function bandSeverity(score: number): L9ChangePointSeverity {
  const x = clamp01(score);
  if (x < 0.3) return L9ChangePointSeverity.MINOR;
  if (x < 0.6) return L9ChangePointSeverity.MODERATE;
  if (x < 0.85) return L9ChangePointSeverity.MAJOR;
  return L9ChangePointSeverity.DECISIVE;
}

function clamp01(x: number): number {
  if (!Number.isFinite(x) || x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function v(
  code: L9RuntimeViolationCode,
  subjectId: string,
  detail: string,
): L9RuntimeViolation {
  return {
    code,
    source: 'change-point-engine',
    nodeId: null,
    sequence_run_id: null,
    sequence_subject_id: subjectId,
    detail,
    context: {},
  };
}
