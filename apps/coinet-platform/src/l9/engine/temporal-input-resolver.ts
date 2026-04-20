/**
 * L9.4 — TemporalInputResolver
 *
 * §9.4.6 — Determines which lower-layer surfaces are legal temporal
 * inputs, which are stale vs degraded, which are usable only as
 * evidence, and whether the subject can proceed at all.
 *
 * §9.4.6.3 — Consumption law enforces L7 restriction, L7 contradiction,
 * L8 regime posture; no raw lower-layer rebuild allowed.
 */

import type {
  L9SequenceSubjectContract,
} from '../contracts/sequence-subject.contract';
import type {
  L9SequenceSubjectInstance,
  L9ResolvedTemporalInputSet,
} from '../runtime/sequence-execution-context';
import { L9TemporalInputReadinessClass } from '../runtime/runtime-types';
import {
  L9RuntimeViolation,
  L9RuntimeViolationCode,
} from '../validation/l9-runtime-violation-codes';
import { L9EngineResult, fail, ok } from './engine-types';

/**
 * §9.4.6 — Runtime status of a single input surface. The resolver is
 * told these up-front (typically from L7/L8 adapters); it does not
 * discover them itself.
 */
export interface L9InputSurfaceStatus {
  readonly ref: string;
  readonly available: boolean;
  readonly stale: boolean;
  readonly degraded: boolean;
  readonly restricted: boolean;
  readonly blocked: boolean;
  readonly evidence_only: boolean;
  readonly historical: boolean;
}

export interface L9TemporalInputResolverInput {
  readonly subject: L9SequenceSubjectContract;
  readonly instance: L9SequenceSubjectInstance;
  readonly surface_statuses: readonly L9InputSurfaceStatus[];
  readonly restriction_profile_refs: readonly string[];
}

/**
 * §9.4.6.4 — Build a resolved temporal input set for a subject.
 */
export function resolveTemporalInputs(
  input: L9TemporalInputResolverInput,
): L9EngineResult<L9ResolvedTemporalInputSet> {
  const violations: L9RuntimeViolation[] = [];
  const s = input.subject;
  const statuses = new Map(
    input.surface_statuses.map(x => [x.ref, x]),
  );

  const classifyList = (
    refs: readonly { ref: string; required: boolean; evidence_only: boolean }[],
  ): {
    usable: string[];
    stale: string[];
    degraded: string[];
    blocked: string[];
    missing: string[];
    evidence: string[];
    historical: string[];
  } => {
    const usable: string[] = [];
    const stale: string[] = [];
    const degraded: string[] = [];
    const blocked: string[] = [];
    const missing: string[] = [];
    const evidence: string[] = [];
    const historical: string[] = [];
    for (const r of refs) {
      const st = statuses.get(r.ref);
      if (!st || !st.available) {
        if (r.required) missing.push(r.ref);
        continue;
      }
      if (st.blocked) {
        blocked.push(r.ref);
        continue;
      }
      if (st.evidence_only || r.evidence_only) {
        evidence.push(r.ref);
        continue;
      }
      if (st.degraded) degraded.push(r.ref);
      if (st.stale) stale.push(r.ref);
      if (st.historical) historical.push(r.ref);
      if (!st.blocked) usable.push(r.ref);
    }
    return { usable, stale, degraded, blocked, missing, evidence, historical };
  };

  const validation = classifyList(s.required_validation_inputs ?? []);
  const event = classifyList(s.required_event_inputs ?? []);
  const feature = classifyList(s.required_feature_inputs ?? []);
  const regime = classifyList(s.required_regime_inputs ?? []);

  // §9.4.6.4 — missing required triggers specific codes
  if (validation.missing.length > 0) {
    violations.push(v(
      L9RuntimeViolationCode.INPUT_MISSING_REQUIRED_VALIDATION,
      s.sequence_subject_id,
      `missing required validation refs: ${validation.missing.join(',')}`,
    ));
  }
  if (event.missing.length > 0) {
    violations.push(v(
      L9RuntimeViolationCode.INPUT_MISSING_REQUIRED_EVENT,
      s.sequence_subject_id,
      `missing required event refs: ${event.missing.join(',')}`,
    ));
  }
  if (feature.missing.length > 0) {
    violations.push(v(
      L9RuntimeViolationCode.INPUT_MISSING_REQUIRED_FEATURE,
      s.sequence_subject_id,
      `missing required feature refs: ${feature.missing.join(',')}`,
    ));
  }

  // §9.4.6.4 — blocked validation accepted
  if (validation.blocked.length > 0) {
    violations.push(v(
      L9RuntimeViolationCode.INPUT_BLOCKED_VALIDATION_ACCEPTED,
      s.sequence_subject_id,
      `blocked validation refs: ${validation.blocked.join(',')}`,
    ));
  }

  // §9.4.6.4 — evidence-only used as hard
  for (const r of s.required_validation_inputs ?? []) {
    const st = statuses.get(r.ref);
    if (st?.evidence_only && r.required && !r.evidence_only) {
      violations.push(v(
        L9RuntimeViolationCode.INPUT_EVIDENCE_ONLY_USED_AS_HARD,
        s.sequence_subject_id,
        `evidence-only ref ${r.ref} treated as hard validation`,
      ));
    }
  }

  // §9.4.6.4 — restriction bypass: subject requires restriction consumption
  // but no restriction profile refs were declared
  if (s.restriction_consumption_policy?.required &&
      (!input.restriction_profile_refs ||
        input.restriction_profile_refs.length === 0)) {
    violations.push(v(
      L9RuntimeViolationCode.INPUT_RESTRICTION_BYPASS,
      s.sequence_subject_id,
      'restriction_consumption_policy.required=true but no restriction profile refs provided',
    ));
  }

  // §9.4.6.4 — regime omitted where required
  if (s.regime_consumption_policy?.required &&
      regime.usable.length < (s.regime_consumption_policy?.min_regime_refs ?? 1)) {
    violations.push(v(
      L9RuntimeViolationCode.INPUT_REGIME_OMITTED_WHERE_REQUIRED,
      s.sequence_subject_id,
      'regime_consumption_policy.required=true but insufficient usable regime refs',
    ));
  }

  // §9.4.6.4 — historical without window
  const hasHistorical =
    (s.historical_inputs?.length ?? 0) > 0 || historical(statuses);
  if (hasHistorical && !s.sequence_window) {
    violations.push(v(
      L9RuntimeViolationCode.INPUT_HISTORICAL_WITHOUT_WINDOW,
      s.sequence_subject_id,
      'historical inputs declared without sequence_window',
    ));
  }

  if (violations.length > 0) return fail(violations);

  const allStale = [
    ...validation.stale, ...event.stale, ...feature.stale, ...regime.stale,
  ].sort();
  const allDegraded = [
    ...validation.degraded, ...event.degraded,
    ...feature.degraded, ...regime.degraded,
  ].sort();
  const allBlocked = [
    ...validation.blocked, ...event.blocked,
    ...feature.blocked, ...regime.blocked,
  ].sort();
  const allHistorical = [
    ...validation.historical, ...event.historical,
    ...feature.historical, ...regime.historical,
  ].sort();
  const allEvidence = [
    ...validation.evidence, ...event.evidence,
    ...feature.evidence, ...regime.evidence,
  ].sort();

  const readiness = decideReadiness(
    {
      stale: allStale.length,
      degraded: allDegraded.length,
      blocked: allBlocked.length,
      historical: allHistorical.length,
      total_usable:
        validation.usable.length + event.usable.length +
        feature.usable.length + regime.usable.length,
    },
  );

  const replayHash = canonicalise([
    ...validation.usable, ...event.usable,
    ...feature.usable, ...regime.usable,
    ...allStale, ...allDegraded, ...allBlocked,
  ]);

  const resolved: L9ResolvedTemporalInputSet = {
    sequence_subject_id: s.sequence_subject_id,
    usable_validation_refs: validation.usable.sort(),
    usable_event_refs: event.usable.sort(),
    usable_feature_refs: feature.usable.sort(),
    usable_regime_refs: regime.usable.sort(),
    evidence_only_refs: allEvidence,
    historical_refs: allHistorical,
    stale_refs: allStale,
    degraded_refs: allDegraded,
    blocked_refs: allBlocked,
    missing_required_refs: [
      ...validation.missing, ...event.missing,
      ...feature.missing, ...regime.missing,
    ].sort(),
    restriction_consumption_refs:
      [...input.restriction_profile_refs].sort(),
    readiness_class: readiness,
    replay_hash_contribution: replayHash,
  };
  return ok(resolved);
}

function decideReadiness(meta: {
  stale: number;
  degraded: number;
  blocked: number;
  historical: number;
  total_usable: number;
}): L9TemporalInputReadinessClass {
  if (meta.total_usable === 0) {
    return L9TemporalInputReadinessClass.BLOCKED;
  }
  if (meta.blocked > 0 && meta.total_usable < meta.blocked) {
    return L9TemporalInputReadinessClass.BLOCKED;
  }
  if (meta.degraded > 0) return L9TemporalInputReadinessClass.DEGRADED_NARROWED;
  if (meta.stale > 0) return L9TemporalInputReadinessClass.STALE_NARROWED;
  if (meta.blocked > 0) return L9TemporalInputReadinessClass.PARTIAL_RESTRICTED;
  if (meta.historical > 0 && meta.stale === 0 && meta.degraded === 0) {
    return L9TemporalInputReadinessClass.READY_HISTORICAL;
  }
  return L9TemporalInputReadinessClass.READY_CURRENT;
}

function historical(statuses: Map<string, L9InputSurfaceStatus>): boolean {
  for (const s of statuses.values()) if (s.historical) return true;
  return false;
}

function canonicalise(refs: readonly string[]): string {
  const sorted = [...new Set(refs)].sort();
  return sorted.join('|');
}

function v(
  code: L9RuntimeViolationCode,
  subjectId: string,
  detail: string,
): L9RuntimeViolation {
  return {
    code,
    source: 'temporal-input-resolver',
    nodeId: null,
    sequence_run_id: null,
    sequence_subject_id: subjectId,
    detail,
    context: {},
  };
}
