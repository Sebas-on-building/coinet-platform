/**
 * L9.4 — SequenceClassificationEngine
 *
 * §9.4.13 — The sole assigner of primary + secondary sequence state +
 * coexistence posture (§9.4.13.2 runtime-exclusivity law). Consumes
 * ordered signals, lead-lag, phase, decay, post-event, change-points
 * and emits an `L9ClassificationOutput` that later stages consume.
 *
 * The classification engine enforces cleanliness (§9.3.3.5) — it may
 * not emit CLEAN_SINGLE when ambiguity/decay/staleness is material.
 */

import type {
  L9SequenceSubjectContract,
} from '../contracts/sequence-subject.contract';
import type {
  L9OrderedSignalSet,
  L9LeadLagProfile,
  L9PhaseRuntimeOutput,
  L9ChangePointRuntimeOutput,
  L9PostEventRuntimeOutput,
  L9ResolvedTemporalInputSet,
  L9ClassificationOutput,
} from '../runtime/sequence-execution-context';
import type { L9DecayProfileContract } from '../contracts/decay-profile.contract';
import type { L9SequenceChainContract } from '../contracts/sequence-chain.contract';
import { L9SequenceState, getL9SequenceStateDescriptor, l9StateBelongsToFamily, l9StateAllowsCleanSingle } from '../contracts/sequence-state';
import {
  L9SequenceCoexistenceClass,
  decideL9Coexistence,
} from '../contracts/sequence-coexistence';
import { L9ChainIntegrityFlag } from '../contracts/sequence-chain';
import { L9DecayClass } from '../contracts/decay-profile';
import { L9_OUTPUT_CLEANLINESS_THRESHOLDS } from '../contracts/sequence-materialization-policy';
import { L9TemporalInputReadinessClass } from '../runtime/runtime-types';
import {
  L9RuntimeViolation,
  L9RuntimeViolationCode,
} from '../validation/l9-runtime-violation-codes';
import { L9EngineResult, fail, ok } from './engine-types';

export interface L9ClassificationEngineInput {
  readonly subject: L9SequenceSubjectContract;
  readonly resolved_inputs: L9ResolvedTemporalInputSet;
  readonly ordered_signals: L9OrderedSignalSet;
  readonly lead_lag: L9LeadLagProfile;
  readonly phase_output: L9PhaseRuntimeOutput;
  readonly change_points: L9ChangePointRuntimeOutput;
  readonly decay: L9DecayProfileContract;
  readonly post_event: L9PostEventRuntimeOutput;
  readonly chain: L9SequenceChainContract;

  // Final proposed states
  readonly primary_sequence_state: L9SequenceState;
  readonly secondary_sequence_state: L9SequenceState | null;
  readonly declared_coexistence_class: L9SequenceCoexistenceClass;
  readonly proposed_ambiguity_score: number;
  readonly proposed_staleness_score: number;
  readonly proposed_degradation_score: number;
  readonly rationale_codes: readonly string[];
}

export function classifySequence(
  input: L9ClassificationEngineInput,
): L9EngineResult<L9ClassificationOutput> {
  const violations: L9RuntimeViolation[] = [];
  const s = input.subject;
  const subjectId = s.sequence_subject_id;

  // §9.4.13.2 — primary must belong to family
  if (!l9StateBelongsToFamily(input.primary_sequence_state, s.sequence_family)) {
    violations.push(v(
      L9RuntimeViolationCode.CLASSIFY_PRIMARY_NOT_IN_FAMILY,
      subjectId,
      `primary ${input.primary_sequence_state} not in family ${s.sequence_family}`,
    ));
  }

  // §9.4.13.2 — allowed state set
  if (!s.allowed_sequence_state_set.includes(input.primary_sequence_state)) {
    violations.push(v(
      L9RuntimeViolationCode.CLASSIFY_PRIMARY_NOT_IN_FAMILY,
      subjectId,
      `primary ${input.primary_sequence_state} not in subject allowed_sequence_state_set`,
    ));
  }

  if (input.secondary_sequence_state &&
      input.secondary_sequence_state === input.primary_sequence_state) {
    violations.push(v(
      L9RuntimeViolationCode.CLASSIFY_SECONDARY_SAME_AS_PRIMARY,
      subjectId,
      'secondary === primary',
    ));
  }

  // §9.4.13.2 — coexistence legality
  const decision = decideL9Coexistence(
    s.sequence_family,
    input.primary_sequence_state,
    input.secondary_sequence_state,
    input.declared_coexistence_class,
  );
  if (!decision.allowed) {
    violations.push(v(
      L9RuntimeViolationCode.CLASSIFY_ILLEGAL_COEXISTENCE,
      subjectId,
      `coexistence illegal: ${decision.reason}`,
    ));
  }

  // §9.4.13.2 — fake clean-single against state descriptor
  if (input.declared_coexistence_class === L9SequenceCoexistenceClass.CLEAN_SINGLE &&
      !l9StateAllowsCleanSingle(input.primary_sequence_state)) {
    violations.push(v(
      L9RuntimeViolationCode.CLASSIFY_FAKE_CLEAN_SINGLE,
      subjectId,
      `state ${input.primary_sequence_state} cannot emit CLEAN_SINGLE`,
    ));
  }

  // §9.4.13.2 — cleanliness law
  const thresholds = L9_OUTPUT_CLEANLINESS_THRESHOLDS;
  const completeness = input.chain?.sequence_completeness_score ?? 0;
  if (input.declared_coexistence_class === L9SequenceCoexistenceClass.CLEAN_SINGLE) {
    if (input.proposed_ambiguity_score >= thresholds.ambiguityMaterial ||
        input.proposed_staleness_score >= thresholds.stalenessMaterial ||
        input.proposed_degradation_score >= thresholds.degradationMaterial ||
        input.decay.decay_score >= thresholds.decayMaterial ||
        completeness < thresholds.completenessMaterial) {
      violations.push(v(
        L9RuntimeViolationCode.CLASSIFY_FAKE_CLEAN_SINGLE,
        subjectId,
        'CLEAN_SINGLE emitted with material ambiguity/staleness/decay/degradation/incomplete chain',
      ));
    }
  }

  // §9.4.13.2 — chain damaged clean
  const damagedFlags = input.chain?.chain_integrity_flags ?? [];
  const chainDamaged =
    damagedFlags.includes(L9ChainIntegrityFlag.MISSING_INITIATOR) ||
    damagedFlags.includes(L9ChainIntegrityFlag.MISSING_CONFIRMATION) ||
    damagedFlags.includes(L9ChainIntegrityFlag.CONTRADICTION_PRESENT) ||
    completeness < thresholds.completenessMaterial;
  if (chainDamaged &&
      input.declared_coexistence_class === L9SequenceCoexistenceClass.CLEAN_SINGLE) {
    violations.push(v(
      L9RuntimeViolationCode.CLASSIFY_CHAIN_DAMAGED_CLEAN,
      subjectId,
      'CLEAN_SINGLE over damaged chain',
    ));
  }

  // §9.4.13.2 — validated while decaying
  const descriptor = getL9SequenceStateDescriptor(input.primary_sequence_state);
  if (descriptor?.dominance === 'CONFIRMATORY' &&
      (input.decay.decay_class === L9DecayClass.DECAYING ||
       input.decay.decay_class === L9DecayClass.DEPRECATED)) {
    violations.push(v(
      L9RuntimeViolationCode.CLASSIFY_VALIDATED_WHILE_DECAYING,
      subjectId,
      'confirmatory state emitted while decay class is DECAYING/DEPRECATED',
    ));
  }

  // §9.4.13.2 — early while late
  if (descriptor?.dominance === 'EARLY') {
    if (input.ordered_signals.ordered_signals.some(o => o.late_flag)) {
      violations.push(v(
        L9RuntimeViolationCode.CLASSIFY_EARLY_WHILE_LATE,
        subjectId,
        'early state emitted with late entrants present',
      ));
    }
  }

  // §9.4.13.2 — post-shock without window
  if (descriptor?.requiresPostEventAnchor &&
      input.post_event.windows.length === 0) {
    violations.push(v(
      L9RuntimeViolationCode.CLASSIFY_POST_SHOCK_WITHOUT_WINDOW,
      subjectId,
      'post-shock state emitted without post-event window',
    ));
  }

  // §9.4.13.2 — ambiguity laundering: score high but class clean
  if (input.proposed_ambiguity_score >= thresholds.ambiguityMaterial &&
      input.declared_coexistence_class === L9SequenceCoexistenceClass.CLEAN_SINGLE) {
    violations.push(v(
      L9RuntimeViolationCode.CLASSIFY_AMBIGUITY_LAUNDERED,
      subjectId,
      'ambiguity material but coexistence_class=CLEAN_SINGLE',
    ));
  }

  if (violations.length > 0) return fail(violations);

  const readiness = deriveReadiness(input);

  const output: L9ClassificationOutput = {
    sequence_subject_id: subjectId,
    sequence_family: s.sequence_family,
    primary_sequence_state: input.primary_sequence_state,
    secondary_sequence_state: input.secondary_sequence_state,
    coexistence_class: input.declared_coexistence_class,
    phase_class: input.phase_output.phase_state.phase_class,
    phase_progression_class:
      input.phase_output.phase_state.phase_progression_class,
    phase_progression_score:
      input.phase_output.phase_state.phase_progression_score,
    sequence_decay_class: input.decay.decay_class,
    sequence_decay_score: input.decay.decay_score,
    ambiguity_score: clamp01(input.proposed_ambiguity_score),
    staleness_score: clamp01(input.proposed_staleness_score),
    degradation_score: clamp01(input.proposed_degradation_score),
    sequence_completeness_score: clamp01(completeness),
    chain_integrity_flags: [...damagedFlags].sort() as L9ChainIntegrityFlag[],
    causal_restraint_flags: {
      chain_is_temporal_only: true,
      hypothesis_excluded: true,
    },
    rationale_codes: [...input.rationale_codes].sort(),
    readiness_class: readiness,
  };
  return ok(output);
}

function deriveReadiness(
  input: L9ClassificationEngineInput,
): L9TemporalInputReadinessClass {
  const base = input.resolved_inputs.readiness_class;
  // propagate degraded/stale/blocked from runtime posture
  if (base === L9TemporalInputReadinessClass.BLOCKED) return base;
  if (input.proposed_degradation_score >= 0.3) {
    return L9TemporalInputReadinessClass.DEGRADED_NARROWED;
  }
  if (input.proposed_staleness_score >= 0.3) {
    return L9TemporalInputReadinessClass.STALE_NARROWED;
  }
  return base;
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
    source: 'sequence-classification-engine',
    nodeId: null,
    sequence_run_id: null,
    sequence_subject_id: subjectId,
    detail,
    context: {},
  };
}
