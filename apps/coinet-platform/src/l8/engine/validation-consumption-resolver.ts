/**
 * L8.4 — ValidationConsumptionResolver
 *
 * §8.4.4.3 — Decides which L7 surfaces are usable for the regime
 * subject given their restriction posture, contradiction posture, and
 * the subject's declared consumption policy.
 */

import type { L8RegimeSubjectContract } from '../contracts/regime-subject.contract';
import {
  L8RuntimeViolation,
  L8RuntimeViolationCode,
} from '../validation/l8-runtime-violation-codes';
import { L8EngineResult, ok, fail } from './engine-types';

/**
 * Represents the L7 posture of a single validation/contradiction/
 * confidence/restriction surface the regime subject is consuming. The
 * real data comes from L7 stable handoff surfaces; this is the runtime
 * projection L8.4 works on.
 */
export interface L8L7ValidationSurfacePosture {
  readonly ref: string;
  readonly family: 'L7_VALIDATION' | 'L7_CONTRADICTION' |
    'L7_CONFIDENCE' | 'L7_RESTRICTION';
  /**
   * Per §8.1.3.6 / §8.3.2.9 the restriction profile decides what L8 may
   * do with this surface.
   */
  readonly allows_regime_conditioning: boolean;
  readonly allows_multiplier_input: boolean;
  readonly allows_confidence_input: boolean;
  readonly has_open_contradiction: boolean;
  /** Whether the L7 validation result itself was emitted as blocked. */
  readonly emission_blocked: boolean;
}

export interface L8ConsumedValidationDecision {
  readonly usable_refs: readonly string[];
  readonly blocked_refs: readonly string[];
  /**
   * Refs that are usable only for narrowed rights (evidence/context only).
   * Emitted for observability; the input resolver promotes these into
   * `usable_refs` for evidence tier or rejects them for multiplier tier.
   */
  readonly narrowed_refs: readonly string[];
}

export interface L8ValidationConsumptionInput {
  readonly subject: L8RegimeSubjectContract;
  readonly surfaces: readonly L8L7ValidationSurfacePosture[];
}

export function resolveValidationConsumption(
  input: L8ValidationConsumptionInput,
): L8EngineResult<L8ConsumedValidationDecision> {
  const violations: L8RuntimeViolation[] = [];
  const usable: string[] = [];
  const blocked: string[] = [];
  const narrowed: string[] = [];

  const required = input.subject.restriction_consumption_policy?.required ?? false;
  const expectedRights =
    input.subject.restriction_consumption_policy?.expected_rights ?? [];

  for (const s of input.surfaces) {
    if (s.emission_blocked) {
      blocked.push(s.ref);
      violations.push({
        code: L8RuntimeViolationCode.INPUT_BLOCKED_VALIDATION_ACCEPTED,
        source: 'validation-consumption-resolver',
        nodeId: null,
        regime_run_id: null,
        regime_subject_id: input.subject.regime_subject_id,
        detail: `blocked L7 emission consumed: ${s.ref}`,
        context: { ref: s.ref },
      });
      continue;
    }

    if (required) {
      const needsRegime = expectedRights.includes('REGIME_CONDITIONING');
      const needsMultiplier = expectedRights.includes('MULTIPLIER_INPUT');
      const needsConfidence = expectedRights.includes('CONFIDENCE_INPUT');
      const coversRegime =
        !needsRegime || s.allows_regime_conditioning;
      const coversMultiplier =
        !needsMultiplier || s.allows_multiplier_input;
      const coversConfidence =
        !needsConfidence || s.allows_confidence_input;

      if (!(coversRegime && coversMultiplier && coversConfidence)) {
        blocked.push(s.ref);
        violations.push({
          code: L8RuntimeViolationCode.INPUT_RESTRICTION_BYPASS,
          source: 'validation-consumption-resolver',
          nodeId: null,
          regime_run_id: null,
          regime_subject_id: input.subject.regime_subject_id,
          detail:
            `surface ${s.ref} does not cover required restriction rights ${expectedRights.join(',')}`,
          context: { ref: s.ref, expectedRights },
        });
        continue;
      }

      // Contradiction posture narrows rights: if the L7 surface carries an
      // open contradiction, downstream multiplier/confidence use must be
      // narrowed to regime-conditioning only.
      if (s.has_open_contradiction && (needsMultiplier || needsConfidence)) {
        narrowed.push(s.ref);
        usable.push(s.ref);
        continue;
      }
    }

    usable.push(s.ref);
  }

  if (violations.length > 0) {
    return fail(violations);
  }

  return ok({
    usable_refs: usable.sort(),
    blocked_refs: blocked.sort(),
    narrowed_refs: narrowed.sort(),
  });
}
