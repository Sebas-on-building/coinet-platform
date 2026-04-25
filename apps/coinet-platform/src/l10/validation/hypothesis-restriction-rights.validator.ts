/**
 * L10.7 — Hypothesis Restriction-Rights Validator
 *
 * Named `hypothesis-restriction-rights.validator.ts` to stay disjoint
 * from the L10.2 object-tier `hypothesis-restriction-profile.validator.ts`,
 * which validates the object-level `L10HypothesisRestrictionProfile`.
 * This validator governs the L10.7 reliance-tier
 * `L10HypothesisRestrictionProfileL10_7` surface (rights / blocked
 * rights / narrowing notes).
 *
 * §10.7.5 — Validates that a restriction profile:
 *
 *   - exists and carries every required surface
 *   - uses only registered rights and bands
 *   - does not grant broader rights than the current competition
 *     state justifies (INV-10.7-D)
 *   - does not pair score-driving rights with `EVIDENCE_ONLY`
 *   - does not grant final-judgment support under UNRESOLVED band
 *   - does not ignore contradiction disclosure / additional
 *     confirmation / narrow spread when those are required by the
 *     cap-chain posture or spread class (INV-10.7-D / INV-10.7-E)
 *   - does not leak rights declared blocked
 */

import {
  ALL_L10_HYPOTHESIS_RELIANCE_CONFIDENCE_BANDS,
  L10HypothesisRelianceConfidenceBand,
} from '../contracts/hypothesis-confidence.policy';
import {
  L10HypothesisCapReason,
} from '../contracts/hypothesis-cap-chain';
import {
  ALL_L10_HYPOTHESIS_RESTRICTION_RIGHTS,
  L10HypothesisRestrictionProfileL10_7,
  L10HypothesisRestrictionRight,
  L10_HYPOTHESIS_RESTRICTIVE_RIGHTS,
  L10_HYPOTHESIS_SCORE_DRIVING_RIGHTS,
} from '../contracts/hypothesis-restriction-rights';
import {
  L10SpreadClass,
} from '../contracts/hypothesis-spread-profile';
import {
  L10HypothesisRelianceValidationError,
  L10HypothesisRelianceViolation,
  L10HypothesisRelianceViolationCode,
  L10HypothesisRelianceViolationTier,
} from './l10-reliance-violation-codes';

export interface L10HypothesisRestrictionRightsValidationInput {
  readonly profile: L10HypothesisRestrictionProfileL10_7;
  readonly applied_cap_reasons: readonly L10HypothesisCapReason[];
  readonly spread_class: L10SpreadClass;
  readonly active_contradiction: boolean;
  readonly missing_required_confirmations: boolean;
}

export interface L10HypothesisRestrictionRightsValidationResult {
  readonly ok: boolean;
  readonly violations: readonly L10HypothesisRelianceViolation[];
}

function v(
  code: L10HypothesisRelianceViolationCode,
  detail: string,
  refs?: readonly string[],
): L10HypothesisRelianceViolation {
  return {
    code,
    tier: L10HypothesisRelianceViolationTier.RESTRICTION,
    detail,
    ...(refs ? { offending_refs: refs } : {}),
  };
}

export function validateL10HypothesisRestrictionRights(
  input: L10HypothesisRestrictionRightsValidationInput,
): L10HypothesisRestrictionRightsValidationResult {
  const p = input.profile;
  const violations: L10HypothesisRelianceViolation[] = [];

  if (!p) {
    return {
      ok: false,
      violations: [
        v(L10HypothesisRelianceViolationCode.RESTR_PROFILE_MISSING,
          'restriction profile missing'),
      ],
    };
  }

  if (!ALL_L10_HYPOTHESIS_RELIANCE_CONFIDENCE_BANDS.includes(p.driving_band)) {
    violations.push(
      v(L10HypothesisRelianceViolationCode.RESTR_BAND_UNREGISTERED,
        `driving_band=${p.driving_band} not a registered reliance band`));
  }

  const grants = new Set<L10HypothesisRestrictionRight>();
  for (const r of p.rights) {
    if (!ALL_L10_HYPOTHESIS_RESTRICTION_RIGHTS.includes(r)) {
      violations.push(
        v(L10HypothesisRelianceViolationCode.RESTR_RIGHT_UNREGISTERED,
          `right ${r} not registered`, [String(r)]));
      continue;
    }
    grants.add(r);
  }

  const blocked = new Set<L10HypothesisRestrictionRight>();
  for (const r of p.blocked_rights) {
    if (!ALL_L10_HYPOTHESIS_RESTRICTION_RIGHTS.includes(r)) {
      violations.push(
        v(L10HypothesisRelianceViolationCode.RESTR_RIGHT_UNREGISTERED,
          `blocked right ${r} not registered`, [String(r)]));
      continue;
    }
    blocked.add(r);
  }

  // §10.7.5.5 — a blocked right must not also be granted.
  for (const r of blocked) {
    if (grants.has(r)) {
      violations.push(
        v(L10HypothesisRelianceViolationCode.RESTR_BLOCKED_RIGHT_STILL_GRANTED,
          `right ${r} is declared blocked but also granted`,
          [String(r)]));
    }
  }

  const hasScoreDriving = L10_HYPOTHESIS_SCORE_DRIVING_RIGHTS.some(r =>
    grants.has(r),
  );
  const hasRestrictive = L10_HYPOTHESIS_RESTRICTIVE_RIGHTS.some(r =>
    grants.has(r),
  );
  const hasEvidenceOnly = grants.has(
    L10HypothesisRestrictionRight.EVIDENCE_ONLY,
  );
  const hasFinalBlocked = grants.has(
    L10HypothesisRestrictionRight.FINAL_JUDGMENT_BLOCKED,
  );
  const hasJudgment = grants.has(
    L10HypothesisRestrictionRight.JUDGMENT_SUPPORT_ALLOWED,
  );

  // §10.7.5.5 — score-driving + evidence-only is an instant reject.
  if (hasScoreDriving && hasEvidenceOnly) {
    violations.push(
      v(
        L10HypothesisRelianceViolationCode.RESTR_SCORE_DRIVING_WITH_EVIDENCE_ONLY,
        'score-driving rights granted alongside EVIDENCE_ONLY (INV-10.7-D)',
      ));
  }

  // §10.7.5.5 — UNRESOLVED band must not grant judgment support.
  if (
    p.driving_band === L10HypothesisRelianceConfidenceBand.UNRESOLVED &&
    hasJudgment
  ) {
    violations.push(
      v(L10HypothesisRelianceViolationCode.RESTR_FINAL_JUDGMENT_UNDER_UNRESOLVED,
        'JUDGMENT_SUPPORT_ALLOWED granted under UNRESOLVED band (INV-10.7-D)'));
  }
  if (
    p.driving_band === L10HypothesisRelianceConfidenceBand.UNRESOLVED &&
    hasScoreDriving &&
    !hasFinalBlocked
  ) {
    violations.push(
      v(L10HypothesisRelianceViolationCode.RESTR_BROADER_THAN_STATE,
        'score-driving rights granted under UNRESOLVED band without ' +
          'FINAL_JUDGMENT_BLOCKED (INV-10.7-D)'));
  }

  // §10.7.5.5 — LOW band must not grant deterministic scoring /
  // judgment support (broader than state).
  if (p.driving_band === L10HypothesisRelianceConfidenceBand.LOW) {
    if (
      grants.has(
        L10HypothesisRestrictionRight.DETERMINISTIC_SCORING_ALLOWED,
      )
    ) {
      violations.push(
        v(L10HypothesisRelianceViolationCode.RESTR_BROADER_THAN_STATE,
          'DETERMINISTIC_SCORING_ALLOWED granted under LOW band ' +
            '(INV-10.7-D)'));
    }
    if (hasJudgment) {
      violations.push(
        v(L10HypothesisRelianceViolationCode.RESTR_BROADER_THAN_STATE,
          'JUDGMENT_SUPPORT_ALLOWED granted under LOW band (INV-10.7-D)'));
    }
  }

  // §10.7.5.5 — MEDIUM band must not grant judgment support.
  if (
    p.driving_band === L10HypothesisRelianceConfidenceBand.MEDIUM &&
    hasJudgment
  ) {
    violations.push(
      v(L10HypothesisRelianceViolationCode.RESTR_BROADER_THAN_STATE,
        'JUDGMENT_SUPPORT_ALLOWED granted under MEDIUM band ' +
          '(INV-10.7-D)'));
  }

  // §10.7.5.5 — active contradiction → contradiction disclosure
  // required.
  if (
    input.active_contradiction &&
    !grants.has(
      L10HypothesisRestrictionRight.CONTRADICTION_DISCLOSURE_REQUIRED,
    )
  ) {
    violations.push(
      v(
        L10HypothesisRelianceViolationCode.RESTR_IGNORES_CONTRADICTION_DISCLOSURE,
        'active contradiction posture requires CONTRADICTION_' +
          'DISCLOSURE_REQUIRED',
      ));
  }

  // §10.7.5.5 — missing confirmations → additional-confirmation
  // required.
  if (
    input.missing_required_confirmations &&
    !grants.has(
      L10HypothesisRestrictionRight.ADDITIONAL_CONFIRMATION_REQUIRED,
    )
  ) {
    violations.push(
      v(
        L10HypothesisRelianceViolationCode.RESTR_ADDITIONAL_CONFIRMATION_IGNORED,
        'missing required confirmations but ADDITIONAL_CONFIRMATION_' +
          'REQUIRED not granted',
      ));
  }

  // §10.7.5.5 — narrow or tied spread → additional confirmation
  // required AND score-driving narrowed.
  if (
    (input.spread_class === L10SpreadClass.NARROW ||
      input.spread_class === L10SpreadClass.TIED) &&
    !grants.has(
      L10HypothesisRestrictionRight.ADDITIONAL_CONFIRMATION_REQUIRED,
    )
  ) {
    violations.push(
      v(L10HypothesisRelianceViolationCode.RESTR_IGNORES_NARROW_SPREAD,
        `spread=${input.spread_class} without ADDITIONAL_` +
          'CONFIRMATION_REQUIRED (INV-10.7-E)'));
  }
  if (input.spread_class === L10SpreadClass.TIED && hasJudgment) {
    violations.push(
      v(L10HypothesisRelianceViolationCode.RESTR_IGNORES_NARROW_SPREAD,
        'JUDGMENT_SUPPORT_ALLOWED granted under TIED spread (INV-10.7-E)'));
  }

  // §10.7.5.5 — restrictive flag + score-driving combo needs that
  // restrictive right to be honored (e.g. FINAL_JUDGMENT_BLOCKED must
  // block judgment support).
  if (hasFinalBlocked && hasJudgment) {
    violations.push(
      v(L10HypothesisRelianceViolationCode.RESTR_BROADER_THAN_STATE,
        'JUDGMENT_SUPPORT_ALLOWED granted while FINAL_JUDGMENT_BLOCKED ' +
          'is also granted (INV-10.7-D)'));
  }

  // §10.7.5.5 — validation hook: if restrictive rights present but
  // score-driving also present and band is UNRESOLVED/LOW → broader.
  if (
    hasRestrictive &&
    hasScoreDriving &&
    (p.driving_band === L10HypothesisRelianceConfidenceBand.LOW ||
      p.driving_band === L10HypothesisRelianceConfidenceBand.UNRESOLVED) &&
    !hasFinalBlocked
  ) {
    violations.push(
      v(L10HypothesisRelianceViolationCode.RESTR_BROADER_THAN_STATE,
        'restrictive right present but score-driving grant still allowed ' +
          `under band=${p.driving_band} (INV-10.7-D)`));
  }

  // §10.7.5.5 — cap posture requires restriction posture.
  if (
    input.applied_cap_reasons.includes(
      L10HypothesisCapReason.CONTRADICTION_HIGH,
    ) &&
    !grants.has(
      L10HypothesisRestrictionRight.CONTRADICTION_DISCLOSURE_REQUIRED,
    )
  ) {
    violations.push(
      v(
        L10HypothesisRelianceViolationCode.RESTR_IGNORES_CONTRADICTION_DISCLOSURE,
        'CONTRADICTION_HIGH cap applied but CONTRADICTION_DISCLOSURE_' +
          'REQUIRED not granted',
      ));
  }
  if (
    input.applied_cap_reasons.includes(
      L10HypothesisCapReason.CONFIRMATION_INCOMPLETE,
    ) &&
    !grants.has(
      L10HypothesisRestrictionRight.ADDITIONAL_CONFIRMATION_REQUIRED,
    )
  ) {
    violations.push(
      v(
        L10HypothesisRelianceViolationCode.RESTR_ADDITIONAL_CONFIRMATION_IGNORED,
        'CONFIRMATION_INCOMPLETE cap applied but ADDITIONAL_CONFIRMATION_' +
          'REQUIRED not granted',
      ));
  }

  return { ok: violations.length === 0, violations };
}

export function assertL10HypothesisRestrictionRightsLegal(
  input: L10HypothesisRestrictionRightsValidationInput,
): void {
  const r = validateL10HypothesisRestrictionRights(input);
  if (!r.ok) throw new L10HypothesisRelianceValidationError(r.violations);
}
