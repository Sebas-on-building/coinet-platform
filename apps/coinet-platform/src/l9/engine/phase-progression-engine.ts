/**
 * L9.4 — PhaseProgressionEngine
 *
 * §9.4.9 — Emits a single `L9PhaseStateContract` per subject based on
 * ordered-signal posture, lead-lag profile, and decay signal. It is the
 * sole emitter of phase posture (§9.4.9.2). It never assigns primary
 * sequence state.
 */

import type {
  L9SequenceSubjectContract,
} from '../contracts/sequence-subject.contract';
import type {
  L9OrderedSignalSet,
  L9LeadLagProfile,
  L9PhaseRuntimeOutput,
} from '../runtime/sequence-execution-context';
import type { L9PhaseStateContract } from '../contracts/phase-state.contract';
import {
  L9PhaseClass,
  L9PhaseProgressionClass,
} from '../contracts/phase-state';
import {
  L9RuntimeViolation,
  L9RuntimeViolationCode,
} from '../validation/l9-runtime-violation-codes';
import { L9EngineResult, fail, ok } from './engine-types';
import { L9OrderedSignalRoleClass } from '../runtime/runtime-types';

export interface L9PhaseEngineInput {
  readonly subject: L9SequenceSubjectContract;
  readonly ordered_signals: L9OrderedSignalSet;
  readonly lead_lag: L9LeadLagProfile;
  readonly chain_complete: boolean;
  readonly chain_damaged: boolean;
  readonly has_change_point_jump: boolean;
  readonly has_post_event_digestion: boolean;
  readonly is_decaying: boolean;
  readonly phase_class: L9PhaseClass;
  readonly phase_progression_score: number; // 0..1
  readonly phase_support_refs: readonly string[];
  readonly phase_challenge_refs: readonly string[];
  readonly phase_started_at: string;
  readonly phase_last_confirmed_at: string;
  readonly contract_versions: {
    readonly phase_contract_version: string;
    readonly schema_version: string;
    readonly policy_version: string;
  };
  readonly compute_run_id: string;
}

export function emitPhaseProgression(
  input: L9PhaseEngineInput,
): L9EngineResult<L9PhaseRuntimeOutput> {
  const violations: L9RuntimeViolation[] = [];
  const s = input.subject;
  const subjectId = s.sequence_subject_id;

  if (!input.chain_complete) {
    violations.push(v(
      L9RuntimeViolationCode.PHASE_ASSIGNED_WITHOUT_CHAIN,
      subjectId,
      'phase assigned with no chain or incomplete chain',
    ));
  }

  const isJumpedPhase =
    input.phase_class === L9PhaseClass.SHOCK_RESPONSE ||
    input.phase_class === L9PhaseClass.ROTATION;
  if (isJumpedPhase && !input.has_change_point_jump) {
    violations.push(v(
      L9RuntimeViolationCode.PHASE_JUMP_WITHOUT_CHANGE_POINT,
      subjectId,
      `phase ${input.phase_class} jump without change-point`,
    ));
  }

  if (input.phase_class === L9PhaseClass.VALIDATED &&
      input.ordered_signals.ordered_signals.some(
        o => o.role === L9OrderedSignalRoleClass.LATE_ENTRANT,
      ) &&
      input.lead_lag.aggregate_support_score < 0.4) {
    violations.push(v(
      L9RuntimeViolationCode.PHASE_VALIDATING_WHILE_CROWDED,
      subjectId,
      'VALIDATED while crowded (late entrants + weak support)',
    ));
  }

  if (input.phase_class === L9PhaseClass.DIGESTION &&
      !input.has_post_event_digestion) {
    violations.push(v(
      L9RuntimeViolationCode.PHASE_DIGESTION_WITHOUT_POST_EVENT,
      subjectId,
      'DIGESTION phase without post-event window',
    ));
  }

  if (input.phase_class === L9PhaseClass.EXPANSION && input.is_decaying) {
    violations.push(v(
      L9RuntimeViolationCode.PHASE_EXPANSION_WHILE_DECAYING,
      subjectId,
      'EXPANSION while decaying',
    ));
  }

  const progressionClass = classifyProgression(
    input.phase_progression_score,
  );
  if (!bandMatchesClass(input.phase_class, progressionClass)) {
    violations.push(v(
      L9RuntimeViolationCode.PHASE_CLASS_INCONSISTENT_WITH_SCORE,
      subjectId,
      `phase ${input.phase_class} inconsistent with progression ${progressionClass}`,
    ));
  }

  if (violations.length > 0) return fail(violations);

  const phaseState: L9PhaseStateContract = {
    phase_state_id: `ps:${subjectId}:${s.as_of}`,
    sequence_subject_id: subjectId,
    phase_contract_version: input.contract_versions.phase_contract_version,
    schema_version: input.contract_versions.schema_version,
    policy_version: input.contract_versions.policy_version,
    phase_class: input.phase_class,
    phase_progression_score: clamp01(input.phase_progression_score),
    phase_progression_class: progressionClass,
    phase_support_refs: [...input.phase_support_refs].sort(),
    phase_challenge_refs: [...input.phase_challenge_refs].sort(),
    phase_started_at: input.phase_started_at,
    phase_last_confirmed_at: input.phase_last_confirmed_at,
    lineage_refs: {
      trace_id: s.lineage_refs?.trace_id ?? '',
      manifest_id: s.lineage_refs?.manifest_id ?? '',
    },
    compute_run_id: input.compute_run_id,
    replay_hash: `h:ps:${subjectId}:${input.phase_class}:${progressionClass}`,
  };
  return ok({
    sequence_subject_id: subjectId,
    phase_state: phaseState,
    jumped: input.has_change_point_jump,
    continuity_intact: !input.chain_damaged,
  });
}

function classifyProgression(score: number): L9PhaseProgressionClass {
  const x = clamp01(score);
  if (x < 0.2) return L9PhaseProgressionClass.INITIATING;
  if (x < 0.45) return L9PhaseProgressionClass.DEVELOPING;
  if (x < 0.7) return L9PhaseProgressionClass.CONFIRMED;
  if (x < 0.9) return L9PhaseProgressionClass.MATURING;
  return L9PhaseProgressionClass.TERMINAL;
}

function bandMatchesClass(
  cls: L9PhaseClass,
  progression: L9PhaseProgressionClass,
): boolean {
  const initiating = [
    L9PhaseClass.DISCOVERY, L9PhaseClass.EARLY, L9PhaseClass.CONFIRMING,
  ];
  const confirmed = [
    L9PhaseClass.CONFIRMING, L9PhaseClass.VALIDATED,
    L9PhaseClass.EXPANSION, L9PhaseClass.SHOCK_RESPONSE,
    L9PhaseClass.RECOVERY, L9PhaseClass.ROTATION,
  ];
  const terminal = [
    L9PhaseClass.LATE, L9PhaseClass.REFLEXIVE_LATE,
    L9PhaseClass.DIGESTION, L9PhaseClass.DECAYING, L9PhaseClass.CROWDING,
  ];
  switch (progression) {
    case L9PhaseProgressionClass.INITIATING:
    case L9PhaseProgressionClass.DEVELOPING:
      return initiating.includes(cls);
    case L9PhaseProgressionClass.CONFIRMED:
    case L9PhaseProgressionClass.MATURING:
      return confirmed.includes(cls);
    case L9PhaseProgressionClass.TERMINAL:
      return terminal.includes(cls);
  }
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
    source: 'phase-progression-engine',
    nodeId: null,
    sequence_run_id: null,
    sequence_subject_id: subjectId,
    detail,
    context: {},
  };
}
