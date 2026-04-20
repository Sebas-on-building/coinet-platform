/**
 * L9.7 — Sequence Restriction-Profile Validator
 *
 * §9.7.6 — Validates an `L9SequenceRestrictionProfileL9_7` against:
 *   - rights registration (§9.7.6.3)
 *   - band coherence (§9.7.6.4)
 *   - broader-than-state detection (§9.7.6.5 / INV-9.7-D)
 *   - contradiction-disclosure compliance (§9.7.6.5)
 *   - causal-restraint interaction (§9.7.7.5)
 *   - blocked-but-granted detection (§9.7.6.5)
 */

import {
  ALL_L9_RELIANCE_CONFIDENCE_BANDS,
  L9RelianceConfidenceBand,
} from '../contracts/l9_7-sequence-confidence-policy';
import {
  ALL_L9_SEQUENCE_RESTRICTION_RIGHTS,
  L9SequenceRestrictionProfileL9_7,
  L9SequenceRestrictionRight,
  L9_SEQUENCE_RESTRICTIVE_RIGHTS,
  L9_SEQUENCE_SCORE_DRIVING_RIGHTS,
} from '../contracts/l9_7-sequence-restriction-rights';
import {
  ALL_L9_SEQUENCE_CAUSAL_RESTRAINT_CLASSES,
  L9SequenceCausalRestraintClass,
} from '../contracts/l9_7-sequence-causal-restraint';
import {
  L9SequenceRelianceValidationError,
  L9SequenceRelianceViolation,
  L9SequenceRelianceViolationCode,
  L9SequenceRelianceViolationTier,
} from './l9-reliance-violation-codes';

export interface L9SequenceRestrictionProfileValidationInput {
  readonly profile: L9SequenceRestrictionProfileL9_7;
  readonly contradiction_present: boolean;
  readonly causal_restraint_class: L9SequenceCausalRestraintClass;
  /** §9.7.6.5 — when `true`, downstream narrowing is required but the
   *  profile only declared SCORING/JUDGMENT rights → reject. */
  readonly additional_confirmation_required: boolean;
}

export interface L9SequenceRestrictionProfileValidationResult {
  readonly ok: boolean;
  readonly violations: readonly L9SequenceRelianceViolation[];
}

function v(
  code: L9SequenceRelianceViolationCode,
  detail: string,
  refs?: readonly string[],
): L9SequenceRelianceViolation {
  return {
    code,
    tier: L9SequenceRelianceViolationTier.RESTRICTION,
    detail,
    ...(refs ? { offending_refs: refs } : {}),
  };
}

export function validateL9SequenceRestrictionProfile(
  input: L9SequenceRestrictionProfileValidationInput,
): L9SequenceRestrictionProfileValidationResult {
  const p = input.profile;
  const violations: L9SequenceRelianceViolation[] = [];

  if (!p) {
    return {
      ok: false,
      violations: [
        v(L9SequenceRelianceViolationCode.RESTR_PROFILE_MISSING,
          'restriction profile absent'),
      ],
    };
  }

  if (!ALL_L9_RELIANCE_CONFIDENCE_BANDS.includes(p.driving_band)) {
    violations.push(
      v(L9SequenceRelianceViolationCode.RESTR_BAND_UNREGISTERED,
        `driving_band ${p.driving_band} not a registered reliance band`));
  }

  const rightsSet = new Set<L9SequenceRestrictionRight>();
  for (const r of p.rights) {
    if (!ALL_L9_SEQUENCE_RESTRICTION_RIGHTS.includes(r)) {
      violations.push(
        v(L9SequenceRelianceViolationCode.RESTR_RIGHT_UNREGISTERED,
          `right ${r} not registered`,
          [String(r)]));
      continue;
    }
    rightsSet.add(r);
  }

  for (const b of p.blocked_rights) {
    if (!ALL_L9_SEQUENCE_RESTRICTION_RIGHTS.includes(b)) {
      violations.push(
        v(L9SequenceRelianceViolationCode.RESTR_RIGHT_UNREGISTERED,
          `blocked right ${b} not registered`,
          [String(b)]));
      continue;
    }
    if (rightsSet.has(b)) {
      violations.push(
        v(L9SequenceRelianceViolationCode.RESTR_BLOCKED_RIGHT_STILL_GRANTED,
          `right ${b} both granted and blocked`,
          [String(b)]));
    }
  }

  // §9.7.6.5 — UNRESOLVED band may not grant any score-driving right.
  if (p.driving_band === L9RelianceConfidenceBand.UNRESOLVED) {
    for (const sd of L9_SEQUENCE_SCORE_DRIVING_RIGHTS) {
      if (rightsSet.has(sd)) {
        violations.push(
          v(L9SequenceRelianceViolationCode.RESTR_BROADER_THAN_STATE,
            `UNRESOLVED band granted score-driving right ${sd}`,
            [String(sd)]));
      }
    }
    if (!rightsSet.has(L9SequenceRestrictionRight.EVIDENCE_ONLY)) {
      violations.push(
        v(L9SequenceRelianceViolationCode.RESTR_BROADER_THAN_STATE,
          `UNRESOLVED band must grant EVIDENCE_ONLY`));
    }
    if (!rightsSet.has(L9SequenceRestrictionRight.FINAL_JUDGMENT_BLOCKED)) {
      violations.push(
        v(L9SequenceRelianceViolationCode.RESTR_BROADER_THAN_STATE,
          `UNRESOLVED band must block FINAL_JUDGMENT`));
    }
  }

  // §9.7.6.5 — LOW band must require contradiction disclosure OR
  // additional confirmation.
  if (
    p.driving_band === L9RelianceConfidenceBand.LOW &&
    !rightsSet.has(L9SequenceRestrictionRight.ADDITIONAL_CONFIRMATION_REQUIRED) &&
    !rightsSet.has(L9SequenceRestrictionRight.CONTRADICTION_DISCLOSURE_REQUIRED)
  ) {
    violations.push(
      v(L9SequenceRelianceViolationCode.RESTR_ADDITIONAL_CONFIRMATION_IGNORED,
        `LOW band must require additional confirmation or contradiction disclosure`));
  }

  // §9.7.6.5 — contradiction present but not disclosed → reject.
  if (
    input.contradiction_present &&
    !rightsSet.has(L9SequenceRestrictionRight.CONTRADICTION_DISCLOSURE_REQUIRED)
  ) {
    violations.push(
      v(L9SequenceRelianceViolationCode.RESTR_IGNORES_CONTRADICTION_DISCLOSURE,
        `contradiction present but CONTRADICTION_DISCLOSURE_REQUIRED not granted`));
  }

  // §9.7.7.5 — causal-restraint interaction:
  if (!ALL_L9_SEQUENCE_CAUSAL_RESTRAINT_CLASSES.includes(input.causal_restraint_class)) {
    violations.push(
      v(L9SequenceRelianceViolationCode.RESTR_IGNORES_CAUSAL_RESTRAINT,
        `causal_restraint_class ${input.causal_restraint_class} not registered`));
  } else if (
    input.causal_restraint_class ===
      L9SequenceCausalRestraintClass.BLOCKED_CAUSAL_LANGUAGE &&
    !rightsSet.has(L9SequenceRestrictionRight.FINAL_JUDGMENT_BLOCKED)
  ) {
    violations.push(
      v(L9SequenceRelianceViolationCode.RESTR_IGNORES_CAUSAL_RESTRAINT,
        `BLOCKED_CAUSAL_LANGUAGE must yield FINAL_JUDGMENT_BLOCKED`));
  } else if (
    input.causal_restraint_class ===
      L9SequenceCausalRestraintClass.STRICT_RESTRAINT &&
    rightsSet.has(L9SequenceRestrictionRight.JUDGMENT_SUPPORT_ALLOWED) &&
    !rightsSet.has(L9SequenceRestrictionRight.ADDITIONAL_CONFIRMATION_REQUIRED)
  ) {
    violations.push(
      v(L9SequenceRelianceViolationCode.RESTR_IGNORES_CAUSAL_RESTRAINT,
        `STRICT_RESTRAINT + JUDGMENT_SUPPORT_ALLOWED requires ` +
          `ADDITIONAL_CONFIRMATION_REQUIRED`));
  }

  // §9.7.6.5 — additional-confirmation override: if caller says it's
  // required and the profile doesn't declare it, reject.
  if (
    input.additional_confirmation_required &&
    !rightsSet.has(L9SequenceRestrictionRight.ADDITIONAL_CONFIRMATION_REQUIRED)
  ) {
    violations.push(
      v(L9SequenceRelianceViolationCode.RESTR_ADDITIONAL_CONFIRMATION_IGNORED,
        `additional confirmation required but not granted`));
  }

  // §9.7.6.5 — EVIDENCE_ONLY + any score-driving right → reject.
  if (rightsSet.has(L9SequenceRestrictionRight.EVIDENCE_ONLY)) {
    for (const sd of L9_SEQUENCE_SCORE_DRIVING_RIGHTS) {
      if (rightsSet.has(sd)) {
        violations.push(
          v(L9SequenceRelianceViolationCode.RESTR_SCORE_DRIVING_WITH_EVIDENCE_ONLY,
            `EVIDENCE_ONLY cannot coexist with score-driving right ${sd}`,
            [String(sd)]));
      }
    }
  }

  return { ok: violations.length === 0, violations };
}

export function assertL9SequenceRestrictionProfileLegal(
  input: L9SequenceRestrictionProfileValidationInput,
): void {
  const r = validateL9SequenceRestrictionProfile(input);
  if (!r.ok) throw new L9SequenceRelianceValidationError(r.violations);
}

/**
 * §9.7.6.5 — Helper for tests: does any restrictive right appear in
 * a rights set?
 */
export function l9RestrictionHasRestrictiveRight(
  rights: readonly L9SequenceRestrictionRight[],
): boolean {
  return rights.some(r => L9_SEQUENCE_RESTRICTIVE_RIGHTS.includes(r));
}
