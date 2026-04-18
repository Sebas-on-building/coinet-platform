/**
 * L7.4 — SupportSurfaceResolver
 *
 * §7.4.4.1–§7.4.4.4 — Determines which primitives count as support, how
 * much each contributes, and whether support is current/stale/partial/
 * degraded. Support is *not* the mirror of challenge: weak support is
 * not contradiction, missing support is not conflict.
 */

import type { L7ValidationSubjectContract } from '../contracts/validation-subject.contract';
import type { L7ValidationSubjectInstance } from './claim-assembly-engine';
import type { L7SupportRecord } from '../runtime/l7-execution-context';
import { L7RuntimeViolation, L7RuntimeViolationCode } from '../validation/l7-runtime-violation-codes';
import { L7EngineResult, fail, ok } from './engine-types';

export interface L7PrimitiveSurface {
  readonly ref: string;
  readonly family: string;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly as_of: string;
  readonly freshness_age_seconds: number;
  readonly confidence: number;
  readonly completeness: number;
  readonly evidence_only: boolean;
  readonly direction_signal: 'SUPPORT' | 'CHALLENGE' | 'NEUTRAL';
}

export interface SupportResolutionInput {
  readonly subject: L7ValidationSubjectContract;
  readonly instance: L7ValidationSubjectInstance;
  readonly primitives: readonly L7PrimitiveSurface[];
}

export function resolveSupport(input: SupportResolutionInput): L7EngineResult<readonly L7SupportRecord[]> {
  const violations: L7RuntimeViolation[] = [];
  const s = input.subject;
  const declared = new Map(
    s.required_support_inputs.concat(s.optional_context_inputs).map(r => [r.ref, r]),
  );
  const evidenceOnlyRefs = new Set(s.evidence_only_inputs.map(r => r.ref));
  const primBy = new Map(input.primitives.map(p => [p.ref, p]));
  const records: L7SupportRecord[] = [];

  for (const ref of input.instance.bound_support_refs) {
    const declaration = declared.get(ref);
    const prim = primBy.get(ref);
    if (!declaration) {
      violations.push(v(L7RuntimeViolationCode.SUPPORT_UNDECLARED_SURFACE, s, `surface ${ref} not declared as support/context`));
      continue;
    }
    if (!prim) continue; // handled by assembly

    if (evidenceOnlyRefs.has(ref)) {
      // §7.4.4.9 evidence-only leaking into scored support.
      violations.push(v(L7RuntimeViolationCode.SUPPORT_EVIDENCE_ONLY_LEAK, s, `evidence-only surface ${ref} bound as support`));
      continue;
    }

    if (prim.direction_signal === 'CHALLENGE') {
      violations.push(v(L7RuntimeViolationCode.SUPPORT_UNDECLARED_SURFACE, s, `surface ${ref} flagged CHALLENGE but bound as support`));
      continue;
    }

    if (prim.scope_type !== s.scope_type || prim.scope_id !== s.scope_id) {
      violations.push(v(L7RuntimeViolationCode.SUPPORT_ILLEGAL_SCOPE_PROJECTION, s, `surface ${ref} on scope ${prim.scope_type}:${prim.scope_id} cannot project onto ${s.scope_type}:${s.scope_id}`));
      continue;
    }

    const freshness = classifyFreshness(prim.freshness_age_seconds, s.freshness_budget_seconds);
    // §7.4.4.9 — stale must not masquerade as current.
    if (
      freshness !== 'CURRENT' &&
      declaration.staleness_critical &&
      prim.freshness_age_seconds === 0
    ) {
      violations.push(v(L7RuntimeViolationCode.SUPPORT_STALE_MASQUERADING_CURRENT, s, `surface ${ref} reports age 0 but classifier demotes it to ${freshness}`));
    }

    const rec: L7SupportRecord = {
      support_ref: ref,
      family: prim.family,
      relevance_class: declaration.required ? 'PRIMARY' : 'SECONDARY',
      freshness_class: freshness,
      completeness_class: classifyCompleteness(prim.completeness),
      confidence_posture: classifyConfidence(prim.confidence),
      contribution_score: scoreContribution(prim, declaration.required),
      lineage_refs: [ref],
      hard_required: declaration.required,
    };
    records.push(rec);
  }

  // §7.4.4.4 — every required pattern must have at least one bound record.
  const boundFamilies = new Set(records.map(r => r.family));
  for (const pat of s.required_support_inputs) {
    if (pat.required && !boundFamilies.has(pat.family)) {
      violations.push(v(
        L7RuntimeViolationCode.SUPPORT_MISSING_FOR_REQUIRED_PATTERN,
        s,
        `required support pattern ${pat.family} has no bound record`,
      ));
    }
  }

  if (violations.length > 0) return fail(violations);

  records.sort((a, b) => (a.support_ref < b.support_ref ? -1 : a.support_ref > b.support_ref ? 1 : 0));
  return ok(records);
}

function classifyFreshness(
  age: number,
  budget: number,
): 'CURRENT' | 'RECENT' | 'STALE' | 'EXPIRED' {
  if (budget <= 0) return 'CURRENT';
  if (age <= budget * 0.5) return 'CURRENT';
  if (age <= budget) return 'RECENT';
  if (age <= budget * 2) return 'STALE';
  return 'EXPIRED';
}

function classifyCompleteness(c: number): 'FULL' | 'PARTIAL' | 'MISSING' {
  if (c >= 0.9) return 'FULL';
  if (c >= 0.5) return 'PARTIAL';
  return 'MISSING';
}

function classifyConfidence(c: number): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (c >= 0.7) return 'HIGH';
  if (c >= 0.4) return 'MEDIUM';
  return 'LOW';
}

function scoreContribution(prim: L7PrimitiveSurface, hardRequired: boolean): number {
  const base = prim.confidence * prim.completeness;
  return hardRequired ? base : base * 0.75;
}

function v(code: L7RuntimeViolationCode, s: L7ValidationSubjectContract, detail: string): L7RuntimeViolation {
  return {
    code,
    source: 'support-surface-resolver',
    nodeId: null,
    validation_run_id: null,
    validation_subject_id: s.validation_subject_id,
    detail,
    context: {},
  };
}
