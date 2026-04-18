/**
 * L8.4 — RegimeInputResolver
 *
 * §8.4.4.4-7 — Classifies the resolved input set as one of the legal
 * readiness classes and emits a governed `L8ResolvedRegimeInputSet`.
 */

import type { L8RegimeSubjectContract } from '../contracts/regime-subject.contract';
import type { L8ResolvedRegimeInputSet } from '../runtime/regime-execution-context';
import {
  L8RuntimeViolation,
  L8RuntimeViolationCode,
} from '../validation/l8-runtime-violation-codes';
import { L8EngineResult, fail, ok } from './engine-types';

export interface L8InputSurfaceStatus {
  readonly ref: string;
  readonly family:
    | 'L7_VALIDATION'
    | 'L7_CONTRADICTION'
    | 'L7_CONFIDENCE'
    | 'L7_RESTRICTION'
    | 'L6_FEATURE'
    | 'L6_EVENT'
    | 'L6_EVIDENCE_PACK'
    | 'L4_CONTEXT'
    | 'L3_METRIC_CONTRACT'
    | 'L3_IDENTITY';
  readonly is_current: boolean;
  readonly is_stale: boolean;
  readonly is_degraded: boolean;
  readonly evidence_only: boolean;
  readonly context_only: boolean;
  readonly scope_type: string;
  readonly scope_id: string;
}

export interface L8InputResolutionInput {
  readonly subject: L8RegimeSubjectContract;
  readonly surface_statuses: readonly L8InputSurfaceStatus[];
  readonly usable_validation_refs: readonly string[];
  readonly blocked_validation_refs: readonly string[];
}

export function resolveRegimeInputs(
  input: L8InputResolutionInput,
): L8EngineResult<L8ResolvedRegimeInputSet> {
  const violations: L8RuntimeViolation[] = [];
  const s = input.subject;

  const statusByRef = new Map(
    input.surface_statuses.map(st => [st.ref, st]),
  );

  // §8.4.4.6 — Unregistered / raw-ungated surfaces
  const allDeclaredRefs = new Set<string>();
  for (const r of [
    ...s.required_validation_inputs,
    ...s.required_feature_inputs,
    ...s.required_context_inputs,
    ...s.optional_context_inputs,
    ...s.historical_inputs,
    ...s.evidence_only_inputs,
  ]) {
    allDeclaredRefs.add(r.ref);
  }

  for (const st of input.surface_statuses) {
    if (!allDeclaredRefs.has(st.ref)) {
      violations.push(v(
        L8RuntimeViolationCode.INPUT_UNREGISTERED_SURFACE, s,
        `undeclared surface ${st.ref}`, { ref: st.ref },
      ));
    }
    // Scope compatibility: surfaces must match the subject's scope for
    // tight families (L6 features and L7 stable handoffs).
    const scopeLocal =
      st.family === 'L6_FEATURE' || st.family === 'L6_EVENT' ||
      st.family === 'L7_VALIDATION' || st.family === 'L7_CONTRADICTION' ||
      st.family === 'L7_CONFIDENCE' || st.family === 'L7_RESTRICTION';
    if (scopeLocal &&
        (st.scope_type !== s.scope_type || st.scope_id !== s.scope_id)) {
      violations.push(v(
        L8RuntimeViolationCode.INPUT_SCOPE_INCOMPATIBLE, s,
        `surface ${st.ref} scope ${st.scope_type}:${st.scope_id} != subject ${s.scope_type}:${s.scope_id}`,
        { ref: st.ref },
      ));
    }
  }

  // §8.4.4.6 — required validation + feature inputs must resolve to
  // refs actually marked available in statusByRef
  const missingValidation: string[] = [];
  for (const r of s.required_validation_inputs) {
    const st = statusByRef.get(r.ref);
    if (!st) missingValidation.push(r.ref);
  }
  if (missingValidation.length > 0) {
    violations.push(v(
      L8RuntimeViolationCode.INPUT_MISSING_REQUIRED_VALIDATION, s,
      `required validation inputs missing: ${missingValidation.join(',')}`,
      { missing: missingValidation },
    ));
  }

  const missingFeature: string[] = [];
  for (const r of s.required_feature_inputs) {
    const st = statusByRef.get(r.ref);
    if (!st) missingFeature.push(r.ref);
  }
  if (missingFeature.length > 0) {
    violations.push(v(
      L8RuntimeViolationCode.INPUT_MISSING_REQUIRED_FEATURE, s,
      `required feature inputs missing: ${missingFeature.join(',')}`,
      { missing: missingFeature },
    ));
  }

  // §8.4.4.6 — evidence-only must not be used as hard evidence. Heuristic:
  // if any required validation ref is declared `evidence_only` in the
  // status table, we block.
  for (const r of s.required_validation_inputs) {
    const st = statusByRef.get(r.ref);
    if (st?.evidence_only) {
      violations.push(v(
        L8RuntimeViolationCode.INPUT_EVIDENCE_ONLY_USED_AS_HARD, s,
        `required validation ref ${r.ref} marked evidence_only at runtime`,
        { ref: r.ref },
      ));
    }
  }

  // §8.4.4.6 — stale-masquerading-current: if the subject's staleness
  // policy is STRICT, any stale-yet-current surface is illegal.
  if (s.staleness_policy === 'STRICT') {
    for (const st of input.surface_statuses) {
      if (st.is_stale && st.is_current) {
        violations.push(v(
          L8RuntimeViolationCode.INPUT_STALE_MASQUERADING_CURRENT, s,
          `surface ${st.ref} is both stale and claimed current under STRICT policy`,
          { ref: st.ref },
        ));
      }
    }
  }

  // Classify the resolved set
  const legalSupport: string[] = [];
  const legalChallenge: string[] = [];
  const staleRefs: string[] = [];
  const degradedRefs: string[] = [];
  for (const st of input.surface_statuses) {
    if (st.is_stale) staleRefs.push(st.ref);
    if (st.is_degraded) degradedRefs.push(st.ref);
    if (st.evidence_only || st.context_only) continue;
    if (st.family === 'L7_CONTRADICTION') {
      legalChallenge.push(st.ref);
    } else {
      legalSupport.push(st.ref);
    }
  }

  const missingRequired =
    missingValidation.length + missingFeature.length;
  const hasAnyStale = staleRefs.length > 0;
  const hasAnyDegraded = degradedRefs.length > 0;
  const allBlocked =
    input.usable_validation_refs.length === 0 &&
    input.blocked_validation_refs.length > 0;

  let readiness: L8ResolvedRegimeInputSet['readiness_class'];
  if (violations.length > 0 || allBlocked) {
    readiness = 'BLOCKED';
  } else if (hasAnyDegraded) {
    readiness = 'DEGRADED';
  } else if (missingRequired > 0 && hasAnyStale) {
    readiness = 'PARTIAL_STALE';
  } else if (missingRequired > 0) {
    readiness = 'PARTIAL_CURRENT';
  } else if (hasAnyStale) {
    readiness = 'COMPLETE_STALE';
  } else {
    readiness = 'COMPLETE_CURRENT';
  }

  // Readiness self-consistency: if we claim COMPLETE_CURRENT but any
  // stale ref is actually present, flag.
  if (readiness === 'COMPLETE_CURRENT' && hasAnyStale) {
    violations.push(v(
      L8RuntimeViolationCode.INPUT_READINESS_INCONSISTENT, s,
      'COMPLETE_CURRENT declared but stale refs present',
      { staleRefs },
    ));
  }

  if (violations.length > 0) return fail(violations);

  const resolved: L8ResolvedRegimeInputSet = {
    regime_subject_id: s.regime_subject_id,
    legal_support_refs: legalSupport.sort(),
    legal_challenge_refs: legalChallenge.sort(),
    missing_required_refs:
      [...missingValidation, ...missingFeature].sort(),
    stale_refs: staleRefs.sort(),
    degraded_refs: degradedRefs.sort(),
    usable_validation_refs: [...input.usable_validation_refs].sort(),
    blocked_validation_refs: [...input.blocked_validation_refs].sort(),
    readiness_class: readiness,
    replay_hash_contribution:
      `rinp:${s.regime_subject_id}:${readiness}:${legalSupport.length}:${legalChallenge.length}`,
  };
  return ok(resolved);
}

function v(
  code: L8RuntimeViolationCode,
  s: L8RegimeSubjectContract,
  detail: string,
  context: Record<string, unknown>,
): L8RuntimeViolation {
  return {
    code,
    source: 'regime-input-resolver',
    nodeId: null,
    regime_run_id: null,
    regime_subject_id: s.regime_subject_id,
    detail,
    context,
  };
}
