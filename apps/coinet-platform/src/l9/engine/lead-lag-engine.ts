/**
 * L9.4 — LeadLagEngine
 *
 * §9.4.8 — Builds lead-lag relations off the ordered signal set and
 * aggregates them into an `L9LeadLagProfile`. This engine enforces
 * causal restraint (§9.4.8.2) — it may never assign primary sequence
 * state and must carry a causal-restraint disclaimer on every
 * emitted relation.
 */

import type {
  L9SequenceSubjectContract,
} from '../contracts/sequence-subject.contract';
import type {
  L9LeadLagProfile,
  L9OrderedSignalSet,
} from '../runtime/sequence-execution-context';
import {
  L9LeadLagRelationContract,
  L9LeadLagRestrictionRef,
  L9LeadLagRegimeRef,
  L9LeadLagValidationRef,
} from '../contracts/lead-lag-relation.contract';
import {
  L9LagClass,
  L9LagSupportStrength,
  L9LagContradictionPosture,
} from '../contracts/lead-lag-relation';
import {
  L9RuntimeViolation,
  L9RuntimeViolationCode,
} from '../validation/l9-runtime-violation-codes';
import { L9EngineResult, fail, ok } from './engine-types';
import { L9OrderedSignalRoleClass } from '../runtime/runtime-types';

export interface L9LeadLagRelationInput {
  readonly leading_signal_ref: string;
  readonly lagging_signal_ref: string;
  readonly lag_duration_ms: number;
  readonly support_strength: L9LagSupportStrength;
  readonly contradiction_posture: L9LagContradictionPosture;
  readonly decay_adjustment: number;        // 0..1
  readonly historical_reliability: number;  // 0..1
  readonly lag_window_ref: string;
  readonly ordering_evidence_refs: readonly string[];
  readonly restriction_consumption_refs: readonly L9LeadLagRestrictionRef[];
  readonly regime_conditioning_refs: readonly L9LeadLagRegimeRef[];
  readonly validation_conditioning_refs: readonly L9LeadLagValidationRef[];
}

export interface L9LeadLagEngineInput {
  readonly subject: L9SequenceSubjectContract;
  readonly ordered_signals: L9OrderedSignalSet;
  readonly relations: readonly L9LeadLagRelationInput[];
  readonly contract_versions: {
    readonly lead_lag_contract_version: string;
    readonly schema_version: string;
    readonly policy_version: string;
  };
  readonly compute_run_id: string;
}

/**
 * §9.4.8.4 — Produce a lead-lag profile.
 */
export function computeLeadLagProfile(
  input: L9LeadLagEngineInput,
): L9EngineResult<L9LeadLagProfile> {
  const violations: L9RuntimeViolation[] = [];
  const s = input.subject;
  const relations: L9LeadLagRelationContract[] = [];
  const signalRoles = new Map(
    input.ordered_signals.ordered_signals.map(
      o => [o.signal_ref, o.role] as const,
    ),
  );

  let contradictionPresent = false;
  let decaySum = 0;
  let supportSum = 0;
  let relationIdx = 0;

  for (const r of input.relations) {
    const relId = `ll:${s.sequence_subject_id}:${relationIdx}`;

    if (r.lag_duration_ms < 0) {
      violations.push(v(
        L9RuntimeViolationCode.LEAD_LAG_NEGATIVE_DURATION,
        s.sequence_subject_id,
        `relation ${relId} has negative lag_duration_ms`,
      ));
    }

    // §9.4.8.2 — ordering evidence required
    if (!r.ordering_evidence_refs || r.ordering_evidence_refs.length === 0) {
      violations.push(v(
        L9RuntimeViolationCode.LEAD_LAG_WITHOUT_ORDERING_EVIDENCE,
        s.sequence_subject_id,
        `relation ${relId} missing ordering_evidence_refs`,
      ));
    }

    // §9.4.8.2 — contradiction must never be silently omitted. If the
    // lagging ref is a CONTRADICTION_INTRUDER, relation must not report
    // NONE contradiction_posture.
    const role = signalRoles.get(r.lagging_signal_ref);
    if (role === L9OrderedSignalRoleClass.CONTRADICTION_INTRUDER &&
        r.contradiction_posture === L9LagContradictionPosture.NONE) {
      violations.push(v(
        L9RuntimeViolationCode.LEAD_LAG_IGNORES_CONTRADICTION,
        s.sequence_subject_id,
        `relation ${relId} ignores contradiction intruder posture`,
      ));
    }

    // §9.4.8.2 — decay awareness: decayed predecessor must have
    // non-trivial decay_adjustment
    const predecessorRole = signalRoles.get(r.leading_signal_ref);
    if (predecessorRole === L9OrderedSignalRoleClass.DECAYED_PREDECESSOR &&
        r.decay_adjustment >= 0.95) {
      violations.push(v(
        L9RuntimeViolationCode.LEAD_LAG_IGNORES_DECAY,
        s.sequence_subject_id,
        `relation ${relId} ignores decayed predecessor (decay_adjustment≥0.95)`,
      ));
    }

    const relation: L9LeadLagRelationContract = {
      lead_lag_id: relId,
      sequence_subject_id: s.sequence_subject_id,
      lead_lag_contract_version:
        input.contract_versions.lead_lag_contract_version,
      schema_version: input.contract_versions.schema_version,
      policy_version: input.contract_versions.policy_version,
      leading_signal_ref: r.leading_signal_ref,
      lagging_signal_ref: r.lagging_signal_ref,
      lag_duration_ms: r.lag_duration_ms,
      lag_class: classifyLag(r.lag_duration_ms, s.lead_lag_window?.max_lag_ms ?? 0),
      support_strength: r.support_strength,
      contradiction_posture: r.contradiction_posture,
      decay_adjustment: clamp01(r.decay_adjustment),
      historical_reliability: clamp01(r.historical_reliability),
      lag_window_ref: r.lag_window_ref,
      scope_type: s.scope_type,
      scope_id: s.scope_id,
      as_of: s.as_of,
      causal_restraint_flag: true,
      causal_restraint: {
        treated_as_temporal_only: true,
        causal_inference_disclaimer:
          'Temporal adjacency does not imply causality.',
      },
      restriction_consumption_refs: r.restriction_consumption_refs,
      regime_conditioning_refs: r.regime_conditioning_refs,
      validation_conditioning_refs: r.validation_conditioning_refs,
      lineage_refs: {
        trace_id: s.lineage_refs?.trace_id ?? '',
        manifest_id: s.lineage_refs?.manifest_id ?? '',
      },
      compute_run_id: input.compute_run_id,
      replay_hash: hashRelation(relId, r),
      replay_hash_component: 'lead-lag-engine',
    };

    relations.push(relation);
    if (relation.contradiction_posture !== L9LagContradictionPosture.NONE) {
      contradictionPresent = true;
    }
    decaySum += relation.decay_adjustment;
    supportSum += supportWeight(relation.support_strength);
    relationIdx++;
  }

  if (violations.length > 0) return fail(violations);

  const count = Math.max(1, relations.length);
  const profile: L9LeadLagProfile = {
    sequence_subject_id: s.sequence_subject_id,
    relations,
    dominant_lag_class: dominantClass(relations),
    aggregate_support_score: clamp01(supportSum / count),
    contradiction_present: contradictionPresent,
    decay_adjustment_mean: clamp01(decaySum / count),
    causal_restraint_flag: true,
  };
  return ok(profile);
}

function classifyLag(lagMs: number, maxMs: number): L9LagClass {
  if (lagMs === 0) return L9LagClass.ZERO;
  if (maxMs > 0 && lagMs > maxMs) return L9LagClass.BEYOND_WINDOW;
  if (lagMs <= 60_000) return L9LagClass.TIGHT;
  if (lagMs <= 3_600_000) return L9LagClass.NORMAL;
  return L9LagClass.LOOSE;
}

function supportWeight(s: L9LagSupportStrength): number {
  switch (s) {
    case L9LagSupportStrength.STRONG_SUPPORT: return 1.0;
    case L9LagSupportStrength.MODERATE_SUPPORT: return 0.7;
    case L9LagSupportStrength.WEAK_SUPPORT: return 0.4;
    case L9LagSupportStrength.AMBIGUOUS: return 0.2;
    case L9LagSupportStrength.NON_SUPPORTIVE: return 0.0;
  }
}

function dominantClass(
  relations: readonly L9LeadLagRelationContract[],
): L9LagClass {
  if (relations.length === 0) return L9LagClass.ZERO;
  const counts = new Map<L9LagClass, number>();
  for (const r of relations) {
    counts.set(r.lag_class, (counts.get(r.lag_class) ?? 0) + 1);
  }
  let best: L9LagClass = relations[0]!.lag_class;
  let bestN = -1;
  for (const [cls, n] of [...counts.entries()].sort((a, b) =>
    a[0] < b[0] ? -1 : 1,
  )) {
    if (n > bestN) { best = cls; bestN = n; }
  }
  return best;
}

function hashRelation(
  id: string,
  r: L9LeadLagRelationInput,
): string {
  return `h:${id}:${r.lag_duration_ms}:${r.support_strength}:${r.contradiction_posture}`;
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
    source: 'lead-lag-engine',
    nodeId: null,
    sequence_run_id: null,
    sequence_subject_id: subjectId,
    detail,
    context: {},
  };
}
