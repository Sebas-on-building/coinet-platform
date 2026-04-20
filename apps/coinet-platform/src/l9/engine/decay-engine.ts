/**
 * L9.4 — DecayEngine
 *
 * §9.4.11 — Emits a single `L9DecayProfileContract` per subject per
 * run. Decay must remain explicit (INV-9.2-F) and never be folded into
 * confidence. This engine does not assign primary sequence state.
 */

import type {
  L9SequenceSubjectContract,
} from '../contracts/sequence-subject.contract';
import {
  L9DecayClass,
  L9DecayReasonCode,
} from '../contracts/decay-profile';
import type { L9DecayProfileContract } from '../contracts/decay-profile.contract';
import {
  L9RuntimeViolation,
  L9RuntimeViolationCode,
} from '../validation/l9-runtime-violation-codes';
import { L9EngineResult, fail, ok } from './engine-types';

export interface L9DecayEngineInput {
  readonly subject: L9SequenceSubjectContract;
  readonly decay_required: boolean;
  readonly decay_score: number; // 0..1
  readonly decaying_signal_refs: readonly string[];
  readonly surviving_signal_refs: readonly string[];
  readonly decay_reason_codes: readonly L9DecayReasonCode[];
  readonly time_burden_ms: number;
  readonly contract_versions: {
    readonly decay_contract_version: string;
    readonly schema_version: string;
    readonly policy_version: string;
  };
  readonly compute_run_id: string;
}

export function emitDecayProfile(
  input: L9DecayEngineInput,
): L9EngineResult<L9DecayProfileContract> {
  const violations: L9RuntimeViolation[] = [];
  const s = input.subject;
  const subjectId = s.sequence_subject_id;

  if (s.decay_window_spec?.required && !input.decay_required) {
    violations.push(v(
      L9RuntimeViolationCode.DECAY_OMITTED_WHERE_REQUIRED,
      subjectId,
      'subject declares decay_window_spec.required but engine marked as not required',
    ));
  }

  if (input.decay_score < 0 || input.decay_score > 1) {
    violations.push(v(
      L9RuntimeViolationCode.DECAY_SCORE_OUT_OF_RANGE,
      subjectId,
      `decay_score ${input.decay_score} out of [0,1]`,
    ));
  }

  if (input.decay_score > 0 &&
      (!input.decay_reason_codes || input.decay_reason_codes.length === 0)) {
    violations.push(v(
      L9RuntimeViolationCode.DECAY_MISSING_REASON,
      subjectId,
      'decay_score > 0 with empty decay_reason_codes',
    ));
  }

  const cls = bandDecay(input.decay_score);
  if (!bandConsistent(input.decay_score, cls)) {
    violations.push(v(
      L9RuntimeViolationCode.DECAY_CLASS_INCONSISTENT_WITH_SCORE,
      subjectId,
      `decay_class ${cls} inconsistent with score ${input.decay_score}`,
    ));
  }

  if (violations.length > 0) return fail(violations);

  const profile: L9DecayProfileContract = {
    decay_profile_id: `dp:${subjectId}:${s.as_of}`,
    sequence_subject_id: subjectId,
    decay_contract_version: input.contract_versions.decay_contract_version,
    schema_version: input.contract_versions.schema_version,
    policy_version: input.contract_versions.policy_version,
    decay_score: clamp01(input.decay_score),
    decay_class: cls,
    decaying_signal_refs: [...input.decaying_signal_refs].sort(),
    surviving_signal_refs: [...input.surviving_signal_refs].sort(),
    decay_reason_codes: [...input.decay_reason_codes].sort(),
    time_burden_ms: Math.max(0, Math.floor(input.time_burden_ms)),
    lineage_refs: {
      trace_id: s.lineage_refs?.trace_id ?? '',
      manifest_id: s.lineage_refs?.manifest_id ?? '',
    },
    compute_run_id: input.compute_run_id,
    replay_hash:
      `h:dp:${subjectId}:${cls}:${clamp01(input.decay_score).toFixed(3)}`,
  };
  return ok(profile);
}

function bandDecay(score: number): L9DecayClass {
  const x = clamp01(score);
  if (x < 0.2) return L9DecayClass.FRESH;
  if (x < 0.5) return L9DecayClass.AGING;
  if (x < 0.8) return L9DecayClass.DECAYING;
  return L9DecayClass.DEPRECATED;
}

function bandConsistent(score: number, cls: L9DecayClass): boolean {
  return bandDecay(score) === cls;
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
    source: 'decay-engine',
    nodeId: null,
    sequence_run_id: null,
    sequence_subject_id: subjectId,
    detail,
    context: {},
  };
}
