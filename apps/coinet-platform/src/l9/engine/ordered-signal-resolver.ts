/**
 * L9.4 — OrderedSignalResolver
 *
 * §9.4.7 — Produces the chain of ordered temporal nodes with typed
 * roles, ambiguity, lateness, and staleness flags. This engine is the
 * sole owner of role assignment (§9.4.7.2 exclusivity). Timestamps
 * alone are not enough to assign meaning — they must be evidenced by
 * governed ordering refs.
 */

import type {
  L9SequenceSubjectContract,
} from '../contracts/sequence-subject.contract';
import type {
  L9ResolvedTemporalInputSet,
  L9OrderedSignal,
  L9OrderedSignalSet,
} from '../runtime/sequence-execution-context';
import { L9OrderedSignalRoleClass } from '../runtime/runtime-types';
import {
  L9RuntimeViolation,
  L9RuntimeViolationCode,
} from '../validation/l9-runtime-violation-codes';
import { L9EngineResult, fail, ok } from './engine-types';

/**
 * §9.4.7 — Typed input used by the resolver. Each candidate signal
 * carries its timestamp, its ordering evidence refs, and any staleness
 * / ambiguity / lateness markers propagated from lower layers.
 */
export interface L9OrderedSignalCandidate {
  readonly signal_ref: string;
  readonly observed_at: string;       // ISO-8601
  readonly ordering_evidence_refs: readonly string[];
  readonly pre_event: boolean;
  readonly post_event: boolean;
  readonly late: boolean;
  readonly stale: boolean;
  readonly ambiguous: boolean;
  readonly evidence_only: boolean;
  readonly contradicts_prior: boolean;
  readonly decayed_predecessor: boolean;
  readonly role_confidence: number; // 0..1
}

export interface L9OrderedSignalResolverInput {
  readonly subject: L9SequenceSubjectContract;
  readonly resolved_inputs: L9ResolvedTemporalInputSet;
  readonly candidates: readonly L9OrderedSignalCandidate[];
}

/**
 * §9.4.7.4 — Produce an `L9OrderedSignalSet` for the subject.
 */
export function resolveOrderedSignals(
  input: L9OrderedSignalResolverInput,
): L9EngineResult<L9OrderedSignalSet> {
  const violations: L9RuntimeViolation[] = [];
  const subjectId = input.subject.sequence_subject_id;
  const tieBreakReasons: string[] = [];

  const candidates = [...input.candidates];

  // §9.4.7.4 — deterministic sort: (observed_at asc, signal_ref asc)
  candidates.sort((a, b) => {
    if (a.observed_at !== b.observed_at) {
      return a.observed_at < b.observed_at ? -1 : 1;
    }
    if (a.signal_ref !== b.signal_ref) {
      return a.signal_ref < b.signal_ref ? -1 : 1;
    }
    return 0;
  });

  for (let i = 1; i < candidates.length; i++) {
    if (candidates[i]!.observed_at === candidates[i - 1]!.observed_at) {
      tieBreakReasons.push(
        `tie(${candidates[i - 1]!.signal_ref},${candidates[i]!.signal_ref}) → signal_ref asc`,
      );
    }
  }

  const ordered: L9OrderedSignal[] = [];
  let hasAmbiguity = false;

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i]!;

    // §9.4.7.4 — ordering evidence required
    if (c.ordering_evidence_refs.length === 0) {
      violations.push(v(
        L9RuntimeViolationCode.ORDERED_SIGNAL_MISSING_EVIDENCE,
        subjectId,
        `candidate ${c.signal_ref} has no ordering evidence`,
      ));
    }

    // §9.4.7.4 — evidence-only cannot be a chain node
    if (c.evidence_only) {
      violations.push(v(
        L9RuntimeViolationCode.ORDERED_SIGNAL_EVIDENCE_ONLY_AS_NODE,
        subjectId,
        `evidence-only signal ${c.signal_ref} used as chain node`,
      ));
    }

    // §9.4.7.4 — late signal as initiator (i===0)
    if (i === 0 && c.late) {
      violations.push(v(
        L9RuntimeViolationCode.ORDERED_SIGNAL_LATE_AS_INITIATOR,
        subjectId,
        `late signal ${c.signal_ref} used as initiator`,
      ));
    }

    // §9.4.7.4 — stale as fresh anchor
    if (i === 0 && c.stale && !c.pre_event) {
      violations.push(v(
        L9RuntimeViolationCode.ORDERED_SIGNAL_STALE_AS_FRESH_ANCHOR,
        subjectId,
        `stale signal ${c.signal_ref} used as fresh anchor`,
      ));
    }

    // §9.4.7.4 — post-event as pre-event
    if (c.post_event && c.pre_event) {
      violations.push(v(
        L9RuntimeViolationCode.ORDERED_SIGNAL_POST_EVENT_AS_PRE_EVENT,
        subjectId,
        `signal ${c.signal_ref} marked both pre and post event`,
      ));
    }

    const role = deriveRole(c, i, candidates.length);

    if (c.ambiguous) hasAmbiguity = true;

    ordered.push({
      signal_ref: c.signal_ref,
      role,
      ordering_evidence_refs: [...c.ordering_evidence_refs].sort(),
      ambiguity_flag: c.ambiguous,
      late_flag: c.late,
      stale_flag: c.stale,
      role_confidence: clamp01(c.role_confidence),
    });
  }

  // §9.4.7.4 — false clean order: no ambiguity declared but candidate
  // carried ambiguity bits
  if (!hasAmbiguity && candidates.some(c => c.ambiguous)) {
    violations.push(v(
      L9RuntimeViolationCode.ORDERED_SIGNAL_FALSE_CLEAN_ORDER,
      subjectId,
      'ambiguity flag erased despite candidate ambiguity',
    ));
  }

  // §9.4.7.4 — ambiguity erased
  const ambiguityScore = computeAmbiguityScore(candidates);
  if (ambiguityScore >= 0.3 && !hasAmbiguity) {
    violations.push(v(
      L9RuntimeViolationCode.ORDERED_SIGNAL_AMBIGUITY_ERASED,
      subjectId,
      `ambiguity_score=${ambiguityScore} but has_ambiguity=false`,
    ));
  }

  if (violations.length > 0) return fail(violations);

  const set: L9OrderedSignalSet = {
    sequence_subject_id: subjectId,
    ordered_signals: ordered,
    has_ambiguity: hasAmbiguity,
    ambiguity_score: ambiguityScore,
    staleness_score: computeStalenessScore(candidates),
    tie_break_reasons: tieBreakReasons,
  };
  return ok(set);
}

function deriveRole(
  c: L9OrderedSignalCandidate,
  index: number,
  total: number,
): L9OrderedSignalRoleClass {
  if (c.contradicts_prior) {
    return L9OrderedSignalRoleClass.CONTRADICTION_INTRUDER;
  }
  if (c.decayed_predecessor) {
    return L9OrderedSignalRoleClass.DECAYED_PREDECESSOR;
  }
  if (c.post_event) {
    return L9OrderedSignalRoleClass.POST_EVENT_STABILIZER;
  }
  if (c.late) {
    return L9OrderedSignalRoleClass.LATE_ENTRANT;
  }
  if (index === 0) {
    return L9OrderedSignalRoleClass.INITIATOR;
  }
  if (index === total - 1 && c.stale) {
    return L9OrderedSignalRoleClass.LAGGING_CONFIRMER;
  }
  if (index === total - 1) {
    return L9OrderedSignalRoleClass.CONFIRMER;
  }
  return L9OrderedSignalRoleClass.REINFORCER;
}

function computeAmbiguityScore(
  candidates: readonly L9OrderedSignalCandidate[],
): number {
  if (candidates.length === 0) return 0;
  const n = candidates.filter(c => c.ambiguous).length;
  return n / candidates.length;
}

function computeStalenessScore(
  candidates: readonly L9OrderedSignalCandidate[],
): number {
  if (candidates.length === 0) return 0;
  const n = candidates.filter(c => c.stale).length;
  return n / candidates.length;
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
    source: 'ordered-signal-resolver',
    nodeId: null,
    sequence_run_id: null,
    sequence_subject_id: subjectId,
    detail,
    context: {},
  };
}
