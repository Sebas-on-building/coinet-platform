/**
 * L7.6 — Claim Restriction Validator
 *
 * §7.6.5.6 + §7.6.5.8 — Verifies that a derived restriction-rights set
 * is legal under the L7.6 reliability lawbook:
 *
 *   - every emitted right is registered (UNKNOWN_RIGHT)
 *   - rights conflict-free with each other
 *   - every right meets its required minimum reliability band
 *   - reasons set is non-empty
 *   - required disclosure / confirmation flags consistent with rights
 *   - evidence-only consistency
 *   - rights not broader than (class, modifiers, contradiction,
 *     reliability) state justifies
 *   - rights not narrower than mandatory state requires
 */

import {
  L7ReliabilityRight,
  L7ReliabilityRightDerivationInput,
  L7ReliabilityRightDerivationResult,
} from '../contracts/claim-restriction.policy';
import { L7PrimaryValidationClass } from '../contracts/validation-class.policy';
import {
  L7ContradictionSeverity,
  compareSeverity,
} from '../contracts/contradiction-bundle';
import { L7ReliabilityBand } from '../contracts/confidence-band';
import {
  L7ReliabilityRightRegistry,
  getDefaultReliabilityRightRegistry,
} from '../registry/reliability-right.registry';
import {
  L7ConfidenceViolation,
  L7ConfidenceViolationCode,
} from './l7-confidence-violation-codes';

const BAND_RANK: Record<L7ReliabilityBand, number> = {
  [L7ReliabilityBand.HIGH]: 3,
  [L7ReliabilityBand.MEDIUM]: 2,
  [L7ReliabilityBand.LOW]: 1,
  [L7ReliabilityBand.UNRESOLVED]: 0,
};

export interface L7ClaimRestrictionValidationResult {
  readonly ok: boolean;
  readonly violations: readonly L7ConfidenceViolation[];
}

export class L7ClaimRestrictionValidator {
  constructor(
    private readonly registry: L7ReliabilityRightRegistry = getDefaultReliabilityRightRegistry(),
  ) {}

  validate(
    input: L7ReliabilityRightDerivationInput,
    result: L7ReliabilityRightDerivationResult,
  ): L7ClaimRestrictionValidationResult {
    const violations: L7ConfidenceViolation[] = [];
    const sid = input.subject_id;

    if (result.rights.length === 0) {
      violations.push(
        v(
          L7ConfidenceViolationCode.RIGHTS_NARROWER_THAN_STATE_REQUIRES,
          sid,
          'rights set is empty',
        ),
      );
    }

    // Registration + band-floor.
    for (const r of result.rights) {
      if (!this.registry.isRegistered(r)) {
        violations.push(
          v(
            L7ConfidenceViolationCode.RIGHT_NOT_REGISTERED,
            sid,
            `right ${r} not registered`,
            { right: r },
          ),
        );
        continue;
      }
      const minBand = this.registry.requiresMinBand(r);
      if (BAND_RANK[input.reliability_band] < BAND_RANK[minBand]) {
        violations.push(
          v(
            L7ConfidenceViolationCode.RIGHTS_BROADER_THAN_STATE_JUSTIFIES,
            sid,
            `right ${r} requires min band ${minBand}, got ${input.reliability_band}`,
            { right: r },
          ),
        );
      }
    }

    // Conflict-free.
    const set = new Set<L7ReliabilityRight>(result.rights);
    for (const r of set) {
      const conflicts = this.registry.conflictsWith(r);
      for (const c of conflicts) {
        if (set.has(c)) {
          violations.push(
            v(
              L7ConfidenceViolationCode.RIGHTS_BROADER_THAN_STATE_JUSTIFIES,
              sid,
              `right ${r} conflicts with co-emitted ${c}`,
              { right: r },
            ),
          );
        }
      }
    }

    // Reasons non-empty.
    if (result.reasons.length === 0) {
      violations.push(
        v(
          L7ConfidenceViolationCode.RESTRICTION_REASONS_MISSING,
          sid,
          'no reason codes derived',
        ),
      );
    }

    // Disclosure / confirmation consistency.
    if (
      result.requires_contradiction_disclosure &&
      !set.has(L7ReliabilityRight.REQUIRES_CONTRADICTION_DISCLOSURE)
    ) {
      violations.push(
        v(
          L7ConfidenceViolationCode.REQUIRED_DISCLOSURE_MISSING,
          sid,
          'requires_contradiction_disclosure=true but right not in set',
        ),
      );
    }
    if (
      result.requires_additional_confirmation &&
      !set.has(L7ReliabilityRight.REQUIRES_ADDITIONAL_CONFIRMATION)
    ) {
      violations.push(
        v(
          L7ConfidenceViolationCode.REQUIRED_CONFIRMATION_MISSING,
          sid,
          'requires_additional_confirmation=true but right not in set',
        ),
      );
    }
    if (
      result.evidence_only_mode &&
      (set.has(L7ReliabilityRight.DETERMINISTIC_SCORING_ALLOWED) ||
        set.has(L7ReliabilityRight.FINAL_JUDGMENT_ALLOWED) ||
        set.has(L7ReliabilityRight.SCENARIO_WEIGHTING_ALLOWED))
    ) {
      violations.push(
        v(
          L7ConfidenceViolationCode.EVIDENCE_ONLY_INCONSISTENT,
          sid,
          'evidence_only_mode=true but score-driving right present',
        ),
      );
    }

    // §7.6.5.6 — broader-than-state-justifies guards.
    if (
      compareSeverity(input.contradiction_severity, L7ContradictionSeverity.SEVERE) >= 0 &&
      set.has(L7ReliabilityRight.DETERMINISTIC_SCORING_ALLOWED)
    ) {
      violations.push(
        v(
          L7ConfidenceViolationCode.RIGHTS_BROADER_THAN_STATE_JUSTIFIES,
          sid,
          'severe contradiction outstanding but DETERMINISTIC_SCORING_ALLOWED granted',
        ),
      );
    }
    if (
      input.primary_class === L7PrimaryValidationClass.DEGRADED_DUE_TO_MISSING_SOURCE &&
      (set.has(L7ReliabilityRight.DETERMINISTIC_SCORING_ALLOWED) ||
        set.has(L7ReliabilityRight.FINAL_JUDGMENT_ALLOWED))
    ) {
      violations.push(
        v(
          L7ConfidenceViolationCode.RIGHTS_BROADER_THAN_STATE_JUSTIFIES,
          sid,
          'degraded primary class but score/judgment right granted',
        ),
      );
    }
    if (
      input.primary_class === L7PrimaryValidationClass.STALE &&
      set.has(L7ReliabilityRight.FINAL_JUDGMENT_ALLOWED)
    ) {
      violations.push(
        v(
          L7ConfidenceViolationCode.RIGHTS_BROADER_THAN_STATE_JUSTIFIES,
          sid,
          'stale primary class but FINAL_JUDGMENT_ALLOWED granted',
        ),
      );
    }
    if (
      input.primary_class === L7PrimaryValidationClass.INSUFFICIENT_EVIDENCE &&
      input.reliability_band === L7ReliabilityBand.UNRESOLVED &&
      (set.has(L7ReliabilityRight.SCENARIO_WEIGHTING_ALLOWED) ||
        set.has(L7ReliabilityRight.DETERMINISTIC_SCORING_ALLOWED) ||
        set.has(L7ReliabilityRight.FINAL_JUDGMENT_ALLOWED))
    ) {
      violations.push(
        v(
          L7ConfidenceViolationCode.RIGHTS_BROADER_THAN_STATE_JUSTIFIES,
          sid,
          'INSUFFICIENT_EVIDENCE+UNRESOLVED but score-driving right granted',
        ),
      );
    }

    return { ok: violations.length === 0, violations };
  }
}

function v(
  code: L7ConfidenceViolationCode,
  subjectId: string,
  detail: string,
  context: Record<string, unknown> = {},
): L7ConfidenceViolation {
  return {
    code,
    source: 'l7_6-claim-restriction.validator',
    subject_id: subjectId,
    factor_group: null,
    cap_class: null,
    right: typeof context.right === 'string' ? context.right : null,
    detail,
    context,
  };
}
