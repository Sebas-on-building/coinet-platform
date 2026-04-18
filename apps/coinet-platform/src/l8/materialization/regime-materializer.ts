/**
 * L8.4 — RegimeMaterializer
 *
 * §8.4.7.2 — Produces an L5-ready materialization plan. It does not
 * write to any store directly; it validates contract legality, lineage
 * completeness, and replay identity, then returns a `L8MaterializationPlan`
 * the L5 adapter will consume.
 */

import type { L8RegimeOutputContract } from '../contracts/regime-output.contract';
import {
  L8RegimeOutputReadinessClass,
  validateRegimeOutputReadiness,
} from '../validation/regime-output-readiness.validator';
import type { L8RegimeSubjectContract } from '../contracts/regime-subject.contract';
import type { L8RegimeConfidenceContract } from '../contracts/regime-confidence.contract';
import type { L8RegimeTransitionContract } from '../contracts/regime-transition.contract';
import type {
  L8RegimeMultiplierProfileContract,
} from '../contracts/regime-multiplier-profile.contract';
import {
  L8RuntimeViolation,
  L8RuntimeViolationCode,
} from '../validation/l8-runtime-violation-codes';
import { L8EngineResult, fail, ok } from '../engine/engine-types';

export interface L8MaterializationPlan {
  readonly regime_result_id: string;
  readonly readiness_class: L8RegimeOutputReadinessClass;
  readonly l5_route: string;
  readonly emissible: boolean;
  readonly replay_hash: string;
  readonly lineage_trace_id: string;
  readonly lineage_manifest_id: string;
}

export interface L8MaterializationInput {
  readonly subject: L8RegimeSubjectContract;
  readonly output: L8RegimeOutputContract;
  readonly confidence: L8RegimeConfidenceContract;
  readonly transition: L8RegimeTransitionContract;
  readonly multiplier: L8RegimeMultiplierProfileContract;
  /**
   * §8.4.7.2 — Intent to write directly to a backing store is caught
   * here. A production runtime never passes a non-L5 target. We keep the
   * flag so mis-wired adapters fail loudly.
   */
  readonly l5_route: string;
  readonly direct_store_target: string | null;
}

export function prepareRegimeMaterialization(
  input: L8MaterializationInput,
): L8EngineResult<L8MaterializationPlan> {
  const violations: L8RuntimeViolation[] = [];
  const s = input.subject;

  if (input.direct_store_target) {
    violations.push(v(
      L8RuntimeViolationCode.MATERIALIZATION_DIRECT_STORE_WRITE, s,
      `direct store target forbidden: ${input.direct_store_target}`,
      { target: input.direct_store_target },
    ));
    return fail(violations);
  }

  if (!input.l5_route || !input.l5_route.startsWith('l5:')) {
    violations.push(v(
      L8RuntimeViolationCode.MATERIALIZATION_BYPASSES_L5, s,
      `materialization route must start with l5:, got ${input.l5_route}`,
      { route: input.l5_route },
    ));
    return fail(violations);
  }

  const readiness = validateRegimeOutputReadiness({
    subject: input.subject,
    output: input.output,
    confidence: input.confidence,
    transition: input.transition,
    multiplier: input.multiplier,
  });

  if (!readiness.emissible) {
    for (const i of readiness.issues) {
      violations.push({
        code: L8RuntimeViolationCode.MATERIALIZATION_CONTRACT_INVALID,
        source: 'regime-materializer',
        nodeId: null,
        regime_run_id: null,
        regime_subject_id: s.regime_subject_id,
        detail: `${i.surface}/${i.code}: ${i.message}`,
        context: { surface: i.surface, code: i.code },
      });
    }
    return fail(violations);
  }

  if (readiness.readiness_class ===
      L8RegimeOutputReadinessClass.BLOCKED_EMISSION) {
    violations.push(v(
      L8RuntimeViolationCode.MATERIALIZATION_READINESS_INCONSISTENT, s,
      'readiness reports emissible but class is BLOCKED_EMISSION', {},
    ));
    return fail(violations);
  }

  const plan: L8MaterializationPlan = {
    regime_result_id: input.output.regime_result_id,
    readiness_class: readiness.readiness_class,
    l5_route: input.l5_route,
    emissible: true,
    replay_hash: input.output.replay_hash,
    lineage_trace_id: input.output.lineage_refs.trace_id,
    lineage_manifest_id: input.output.lineage_refs.manifest_id,
  };
  return ok(plan);
}

function v(
  code: L8RuntimeViolationCode,
  s: L8RegimeSubjectContract,
  detail: string,
  context: Record<string, unknown>,
): L8RuntimeViolation {
  return {
    code,
    source: 'regime-materializer',
    nodeId: null,
    regime_run_id: null,
    regime_subject_id: s.regime_subject_id,
    detail,
    context,
  };
}
