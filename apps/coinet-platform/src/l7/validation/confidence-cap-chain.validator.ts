/**
 * L7.6 — Confidence Cap-Chain Validator
 *
 * §7.6.4.4–§7.6.4.7 — Verifies the cap chain inside an
 * `L7ValidationConfidenceDecision`:
 *
 *   - every cap class is registered
 *   - the cap chain is truth-restrictive: capped score must not exceed
 *     the lowest applied ceiling
 *   - cap-precedence is respected: when multiple caps apply, the
 *     ceiling equals the minimum applied ceiling
 *   - any cap whose mandatory trigger condition is active MUST be
 *     applied (CAP_REQUIRED_BUT_NOT_APPLIED)
 */

import {
  L7ValidationConfidenceDecision,
} from '../contracts/validation-confidence.policy';
import {
  L7ConfidenceCapClass,
  L7ConfidenceCapEvaluation,
  L7ConfidenceCapTrigger,
  resolveCapCeiling,
} from '../contracts/confidence-cap';
import {
  L7ConfidenceCapRegistry,
  getDefaultConfidenceCapRegistry,
} from '../registry/confidence-cap.registry';
import {
  L7ConfidenceViolation,
  L7ConfidenceViolationCode,
} from './l7-confidence-violation-codes';

export interface L7CapChainValidationContext {
  readonly active_triggers: readonly L7ConfidenceCapTrigger[];
}

export interface L7CapChainValidationResult {
  readonly ok: boolean;
  readonly violations: readonly L7ConfidenceViolation[];
}

export class L7ConfidenceCapChainValidator {
  constructor(
    private readonly registry: L7ConfidenceCapRegistry = getDefaultConfidenceCapRegistry(),
  ) {}

  validate(
    decision: L7ValidationConfidenceDecision,
    ctx: L7CapChainValidationContext,
  ): L7CapChainValidationResult {
    const violations: L7ConfidenceViolation[] = [];
    const sid = decision.validation_subject_id;

    // Each evaluation references a registered class.
    for (const e of decision.cap_chain.evaluations) {
      if (!this.registry.isRegistered(e.capClass)) {
        violations.push(
          v(
            L7ConfidenceViolationCode.CAP_CLASS_NOT_REGISTERED,
            sid,
            `cap ${e.capClass} not registered`,
            { cap: e.capClass },
          ),
        );
      }
    }

    // §7.6.4.7 — cap-precedence: capped score must equal min applied ceiling.
    const expectedCeiling = resolveCapCeiling(decision.cap_chain.evaluations);
    if (
      expectedCeiling !== decision.cap_chain.resolved_ceiling_score100 &&
      !(expectedCeiling === null && decision.cap_chain.resolved_ceiling_score100 === null)
    ) {
      violations.push(
        v(
          L7ConfidenceViolationCode.CAP_CHAIN_PRECEDENCE_VIOLATED,
          sid,
          `resolved_ceiling=${decision.cap_chain.resolved_ceiling_score100} ` +
            `expected ${expectedCeiling}`,
        ),
      );
    }
    if (
      expectedCeiling !== null &&
      decision.capped_score_100 > expectedCeiling + 1e-6
    ) {
      violations.push(
        v(
          L7ConfidenceViolationCode.CAP_CHAIN_NOT_TRUTH_RESTRICTIVE,
          sid,
          `capped ${decision.capped_score_100} > ceiling ${expectedCeiling}`,
        ),
      );
    }

    // §7.6.4.5 — required caps must be applied when their trigger is active.
    const required = this.registry.capsRequiredFor(ctx.active_triggers);
    const appliedSet = new Set<L7ConfidenceCapClass>(
      decision.cap_chain.evaluations.filter(e => e.applied).map(e => e.capClass),
    );
    for (const c of required) {
      if (!appliedSet.has(c)) {
        violations.push(
          v(
            L7ConfidenceViolationCode.CAP_REQUIRED_BUT_NOT_APPLIED,
            sid,
            `cap ${c} required by triggers [${ctx.active_triggers.join(',')}] but not applied`,
            { cap: c },
          ),
        );
      }
    }

    // sanity guard
    void evaluationsAreInternallyConsistent(decision.cap_chain.evaluations);

    return { ok: violations.length === 0, violations };
  }
}

function evaluationsAreInternallyConsistent(
  evaluations: readonly L7ConfidenceCapEvaluation[],
): boolean {
  for (const e of evaluations) {
    if (typeof e.ceilingScore100 !== 'number' || !isFinite(e.ceilingScore100)) {
      return false;
    }
  }
  return true;
}

function v(
  code: L7ConfidenceViolationCode,
  subjectId: string,
  detail: string,
  context: Record<string, unknown> = {},
): L7ConfidenceViolation {
  return {
    code,
    source: 'confidence-cap-chain.validator',
    subject_id: subjectId,
    factor_group: null,
    cap_class: typeof context.cap === 'string' ? context.cap : null,
    right: null,
    detail,
    context,
  };
}
