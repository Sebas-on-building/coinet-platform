/**
 * L10.7 — Hypothesis Readiness Validator
 *
 * §10.7.7 — Validates that a declared
 * `L10HypothesisRelianceReadinessClass` is consistent with the band,
 * cap-chain hint, spread class, and posture booleans it was derived
 * from. Enforces the illegal-readiness table (§10.7.7.5):
 *
 *   - STRONG_PRIMARY under narrow/tied spread → reject
 *   - STRONG_PRIMARY under active invalidation → reject
 *   - STRONG_PRIMARY with material missing confirmations → reject
 *   - STRONG_PRIMARY with any restrictive right granted → reject
 *   - NARROWED_PRIMARY without a narrowing cause → reject
 *   - UNRESOLVED_COMPETITION without live competition → reject
 *   - BLOCKED while still advertising score-driving rights → reject
 */

import {
  L10HypothesisCapReadinessHint,
} from '../contracts/hypothesis-cap-chain';
import {
  L10HypothesisRelianceConfidenceBand,
} from '../contracts/hypothesis-confidence.policy';
import {
  ALL_L10_HYPOTHESIS_RELIANCE_READINESS_CLASSES,
  L10HypothesisRelianceReadinessClass,
  L10_HYPOTHESIS_RELIANCE_READINESS_STRONG_BLOCKERS,
  summarizeL10HypothesisRelianceReadiness,
} from '../contracts/hypothesis-readiness';
import {
  L10HypothesisRestrictionRight,
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

export interface L10HypothesisReadinessValidationInput {
  readonly readiness: L10HypothesisRelianceReadinessClass;
  readonly band: L10HypothesisRelianceConfidenceBand;
  readonly cap_hint: L10HypothesisCapReadinessHint;
  readonly spread_class: L10SpreadClass;
  readonly granted_rights: readonly L10HypothesisRestrictionRight[];
  readonly active_invalidation: boolean;
  readonly material_missing_confirmations: boolean;
  readonly live_competition: boolean;
}

export interface L10HypothesisReadinessValidationResult {
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
    tier: L10HypothesisRelianceViolationTier.READINESS,
    detail,
    ...(refs ? { offending_refs: refs } : {}),
  };
}

export function validateL10HypothesisReadiness(
  input: L10HypothesisReadinessValidationInput,
): L10HypothesisReadinessValidationResult {
  const violations: L10HypothesisRelianceViolation[] = [];

  if (!ALL_L10_HYPOTHESIS_RELIANCE_READINESS_CLASSES.includes(input.readiness)) {
    violations.push(
      v(L10HypothesisRelianceViolationCode.READ_CLASS_UNREGISTERED,
        `readiness ${input.readiness} not registered`));
    return { ok: false, violations };
  }

  const rights = new Set(input.granted_rights);
  const hasEvidenceOnly = rights.has(
    L10HypothesisRestrictionRight.EVIDENCE_ONLY,
  );
  const hasFinalBlocked = rights.has(
    L10HypothesisRestrictionRight.FINAL_JUDGMENT_BLOCKED,
  );
  const hasStrongBlocker = L10_HYPOTHESIS_RELIANCE_READINESS_STRONG_BLOCKERS
    .some(r => rights.has(r));

  // §10.7.7.5 — STRONG_PRIMARY legality.
  if (input.readiness === L10HypothesisRelianceReadinessClass.STRONG_PRIMARY) {
    if (
      input.spread_class === L10SpreadClass.NARROW ||
      input.spread_class === L10SpreadClass.TIED
    ) {
      violations.push(
        v(L10HypothesisRelianceViolationCode.READ_STRONG_UNDER_NARROW_SPREAD,
          `STRONG_PRIMARY under spread=${input.spread_class} (INV-10.7-E)`));
    }
    if (input.active_invalidation) {
      violations.push(
        v(L10HypothesisRelianceViolationCode.READ_STRONG_UNDER_ACTIVE_INVALIDATION,
          'STRONG_PRIMARY while active invalidation (INV-10.7-B)'));
    }
    if (input.material_missing_confirmations) {
      violations.push(
        v(L10HypothesisRelianceViolationCode.READ_STRONG_UNDER_MISSING_CONFIRMATIONS,
          'STRONG_PRIMARY while material confirmations missing (INV-10.7-B)'));
    }
    if (hasStrongBlocker) {
      violations.push(
        v(L10HypothesisRelianceViolationCode.READ_STRONG_UNDER_NARROW_SPREAD,
          'STRONG_PRIMARY while restrictive right granted (INV-10.7-B/E)'));
    }
    if (input.band !== L10HypothesisRelianceConfidenceBand.HIGH) {
      violations.push(
        v(L10HypothesisRelianceViolationCode.READ_INCONSISTENT_WITH_DERIVED,
          `STRONG_PRIMARY requires band=HIGH, got ${input.band}`));
    }
    if (input.cap_hint !== L10HypothesisCapReadinessHint.CLEAN) {
      violations.push(
        v(L10HypothesisRelianceViolationCode.READ_INCONSISTENT_WITH_DERIVED,
          `STRONG_PRIMARY requires cap_hint=CLEAN, got ${input.cap_hint}`));
    }
  }

  // §10.7.7.5 — NARROWED_PRIMARY must have a narrowing cause.
  if (input.readiness === L10HypothesisRelianceReadinessClass.NARROWED_PRIMARY) {
    const narrowingCause =
      input.cap_hint === L10HypothesisCapReadinessHint.NARROWED ||
      input.cap_hint === L10HypothesisCapReadinessHint.HEAVILY_NARROWED ||
      input.spread_class === L10SpreadClass.NARROW ||
      input.active_invalidation ||
      input.material_missing_confirmations ||
      input.band === L10HypothesisRelianceConfidenceBand.MEDIUM ||
      hasStrongBlocker;
    if (!narrowingCause) {
      violations.push(
        v(L10HypothesisRelianceViolationCode.READ_NARROWED_WITHOUT_CAUSE,
          'NARROWED_PRIMARY declared without any narrowing cause'));
    }
  }

  // §10.7.7.5 — UNRESOLVED_COMPETITION requires live competition.
  if (
    input.readiness ===
      L10HypothesisRelianceReadinessClass.UNRESOLVED_COMPETITION &&
    !input.live_competition &&
    input.spread_class !== L10SpreadClass.TIED
  ) {
    violations.push(
      v(L10HypothesisRelianceViolationCode.READ_UNRESOLVED_WITHOUT_COMPETITION,
        'UNRESOLVED_COMPETITION declared without live competition or ' +
          'tied spread'));
  }

  // §10.7.7.5 — BLOCKED must not advertise score-driving rights.
  if (input.readiness === L10HypothesisRelianceReadinessClass.BLOCKED) {
    for (const r of L10_HYPOTHESIS_SCORE_DRIVING_RIGHTS) {
      if (rights.has(r)) {
        violations.push(
          v(L10HypothesisRelianceViolationCode.READ_BLOCKED_WHILE_BROAD_RIGHTS_GRANTED,
            `BLOCKED readiness while score-driving right ${r} still granted`,
            [String(r)]));
      }
    }
    // BLOCKED expects either band=UNRESOLVED, cap_hint=BLOCKED, or a
    // blocking right to justify the class.
    const blockedJustified =
      input.band === L10HypothesisRelianceConfidenceBand.UNRESOLVED ||
      input.cap_hint === L10HypothesisCapReadinessHint.BLOCKED ||
      hasEvidenceOnly ||
      hasFinalBlocked;
    if (!blockedJustified) {
      violations.push(
        v(L10HypothesisRelianceViolationCode.READ_INCONSISTENT_WITH_DERIVED,
          'BLOCKED readiness declared without UNRESOLVED band, BLOCKED ' +
            'cap_hint, EVIDENCE_ONLY, or FINAL_JUDGMENT_BLOCKED'));
    }
  }

  // §10.7.7.3 — final consistency: declared readiness must match the
  // canonical summarizer (modulo legitimate policy-driven downgrades —
  // see INV-10.7-G: readiness may narrow but never silently widen).
  const derived = summarizeL10HypothesisRelianceReadiness({
    band: input.band,
    cap_hint: input.cap_hint,
    spread_class: input.spread_class,
    has_evidence_only_right: hasEvidenceOnly,
    has_final_judgment_blocked_right: hasFinalBlocked,
    active_invalidation: input.active_invalidation,
    material_missing_confirmations: input.material_missing_confirmations,
  });
  if (derived !== input.readiness) {
    violations.push(
      v(L10HypothesisRelianceViolationCode.READ_INCONSISTENT_WITH_DERIVED,
        `readiness=${input.readiness} does not match derived ${derived}`));
  }

  return { ok: violations.length === 0, violations };
}

export function assertL10HypothesisReadinessLegal(
  input: L10HypothesisReadinessValidationInput,
): void {
  const r = validateL10HypothesisReadiness(input);
  if (!r.ok) throw new L10HypothesisRelianceValidationError(r.violations);
}
