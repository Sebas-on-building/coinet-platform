/**
 * L9.7 — Sequence Causal-Restraint Validator
 *
 * §9.7.7 — Validates a causal-restraint profile and detects forbidden
 * causal language (INV-9.7-E). Used both by the engine emission path
 * (before publishing a profile) and by the invariant runner to assert
 * that crafted overclaims are rejected.
 */

import {
  ALL_L9_SEQUENCE_CAUSAL_RESTRAINT_CLASSES,
  L9SequenceCausalRestraintClass,
  L9SequenceCausalRestraintProfile,
  detectL9ForbiddenCausalLanguage,
  l9RestraintPermitsFinalJudgment,
} from '../contracts/l9_7-sequence-causal-restraint';
import {
  L9SequenceRelianceValidationError,
  L9SequenceRelianceViolation,
  L9SequenceRelianceViolationCode,
  L9SequenceRelianceViolationTier,
} from './l9-reliance-violation-codes';

export interface L9SequenceCausalRestraintValidationInput {
  readonly profile: L9SequenceCausalRestraintProfile;
  /**
   * §9.7.7.3 — optional extra surfaces (descriptions, rationale text)
   * the caller wants scanned for forbidden causal language.
   */
  readonly surfaces?: readonly string[];
}

export interface L9SequenceCausalRestraintValidationResult {
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
    tier: L9SequenceRelianceViolationTier.CAUSAL,
    detail,
    ...(refs ? { offending_refs: refs } : {}),
  };
}

export function validateL9SequenceCausalRestraint(
  input: L9SequenceCausalRestraintValidationInput,
): L9SequenceCausalRestraintValidationResult {
  const p = input.profile;
  const violations: L9SequenceRelianceViolation[] = [];

  if (!ALL_L9_SEQUENCE_CAUSAL_RESTRAINT_CLASSES.includes(p.restraint_class)) {
    violations.push(
      v(L9SequenceRelianceViolationCode.CAUSAL_CLASS_UNREGISTERED,
        `restraint_class ${p.restraint_class} not a registered L9.7 class`));
  }

  if (p.rationale_notes.length === 0) {
    violations.push(
      v(L9SequenceRelianceViolationCode.CAUSAL_RATIONALE_EMPTY,
        `causal-restraint profile must declare at least one rationale note`));
  }

  // §9.7.7.3 — scan rationale + caller surfaces for causal language
  const textCorpus = [...p.rationale_notes, ...(input.surfaces ?? [])];
  for (const text of textCorpus) {
    if (detectL9ForbiddenCausalLanguage(text)) {
      violations.push(
        v(L9SequenceRelianceViolationCode.CAUSAL_LANGUAGE_DETECTED,
          `forbidden causal language detected: "${truncate(text)}"`));
    }
  }

  // §9.7.7.4 — STRICT_RESTRAINT with any flagged token is an overclaim
  if (
    p.restraint_class === L9SequenceCausalRestraintClass.STRICT_RESTRAINT &&
    p.flagged_tokens.length > 0
  ) {
    violations.push(
      v(L9SequenceRelianceViolationCode.CAUSAL_OVERCLAIM_UNDER_STRICT,
        `STRICT_RESTRAINT declares flagged causal tokens (${p.flagged_tokens.join(',')})`));
  }

  // §9.7.7.5 — final-judgment consistency with restraint class
  const expectedPermit = l9RestraintPermitsFinalJudgment(p.restraint_class);
  if (p.permits_final_judgment !== expectedPermit) {
    if (
      p.permits_final_judgment &&
      p.restraint_class === L9SequenceCausalRestraintClass.BLOCKED_CAUSAL_LANGUAGE
    ) {
      violations.push(
        v(L9SequenceRelianceViolationCode.CAUSAL_FINAL_JUDGMENT_UNDER_BLOCKED,
          `permits_final_judgment=true under BLOCKED_CAUSAL_LANGUAGE`));
    } else if (
      p.permits_final_judgment &&
      p.restraint_class === L9SequenceCausalRestraintClass.STRICT_RESTRAINT
    ) {
      violations.push(
        v(L9SequenceRelianceViolationCode.CAUSAL_FINAL_JUDGMENT_UNDER_STRICT,
          `permits_final_judgment=true under STRICT_RESTRAINT`));
    } else {
      violations.push(
        v(L9SequenceRelianceViolationCode.CAUSAL_FINAL_JUDGMENT_UNDER_STRICT,
          `permits_final_judgment=${p.permits_final_judgment} ` +
            `inconsistent with class ${p.restraint_class}`));
    }
  }

  return { ok: violations.length === 0, violations };
}

export function assertL9SequenceCausalRestraintLegal(
  input: L9SequenceCausalRestraintValidationInput,
): void {
  const r = validateL9SequenceCausalRestraint(input);
  if (!r.ok) throw new L9SequenceRelianceValidationError(r.violations);
}

function truncate(s: string, n = 64): string {
  return s.length <= n ? s : s.slice(0, n) + '…';
}
