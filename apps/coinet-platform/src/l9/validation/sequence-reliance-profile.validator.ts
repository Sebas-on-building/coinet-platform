/**
 * L9.7 — Sequence Reliance-Profile Validator
 *
 * §9.7.9 — Validates the top-level reliance profile. Calls out to the
 * per-surface validators for confidence, cap chain, restriction, and
 * causal restraint, then enforces cross-surface coherence
 * (INV-9.7-G / §9.7.9.3).
 */

import {
  ALL_L9_SEQUENCE_RELIANCE_READINESS_CLASSES,
  L9SequenceRelianceProfile,
  L9SequenceRelianceReadinessClass,
  summarizeL9SequenceRelianceReadiness,
} from '../contracts/l9_7-sequence-reliance-profile';
import {
  L9SequenceRestrictionRight,
} from '../contracts/l9_7-sequence-restriction-rights';
import {
  L9SequenceRelianceValidationError,
  L9SequenceRelianceViolation,
  L9SequenceRelianceViolationCode,
  L9SequenceRelianceViolationTier,
} from './l9-reliance-violation-codes';
import {
  validateL9SequenceCapChain,
} from './sequence-cap-chain.validator';
import {
  validateL9SequenceCausalRestraint,
} from './sequence-causal-restraint.validator';
import {
  validateL9SequenceConfidencePolicy,
} from './sequence-confidence-policy.validator';
import {
  validateL9SequenceRestrictionProfile,
} from './sequence-restriction-profile.validator';
import { L9SequenceCausalRestraintProfile } from '../contracts/l9_7-sequence-causal-restraint';

export interface L9SequenceRelianceProfileValidationInput {
  readonly reliance: L9SequenceRelianceProfile;
  /**
   * §9.7.7.5 — the causal-restraint *profile* sits beside the
   * reliance bundle; the reliance bundle itself only carries the
   * class. Validators need the profile to scan rationale text.
   */
  readonly causal_profile: L9SequenceCausalRestraintProfile;
  readonly contradiction_present: boolean;
  readonly additional_confirmation_required: boolean;
  /** §9.7.10.3 — expected policy version; mismatches reject. */
  readonly expected_policy_version: string;
}

export interface L9SequenceRelianceProfileValidationResult {
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
    tier: L9SequenceRelianceViolationTier.RELIANCE,
    detail,
    ...(refs ? { offending_refs: refs } : {}),
  };
}

export function validateL9SequenceRelianceProfile(
  input: L9SequenceRelianceProfileValidationInput,
): L9SequenceRelianceProfileValidationResult {
  const r = input.reliance;
  const violations: L9SequenceRelianceViolation[] = [];

  // ── fan out to sublayer validators ──
  const confRes = validateL9SequenceConfidencePolicy({ profile: r.confidence });
  violations.push(...confRes.violations);

  const capRes = validateL9SequenceCapChain({ chain: r.cap_chain });
  violations.push(...capRes.violations);

  const restrRes = validateL9SequenceRestrictionProfile({
    profile: r.restriction,
    contradiction_present: input.contradiction_present,
    causal_restraint_class: r.causal_restraint_class,
    additional_confirmation_required: input.additional_confirmation_required,
  });
  violations.push(...restrRes.violations);

  const causalRes = validateL9SequenceCausalRestraint({
    profile: input.causal_profile,
    surfaces: [],
  });
  violations.push(...causalRes.violations);

  // ── cross-surface coherence ──
  if (!ALL_L9_SEQUENCE_RELIANCE_READINESS_CLASSES.includes(r.readiness)) {
    violations.push(
      v(L9SequenceRelianceViolationCode.REL_READINESS_UNREGISTERED,
        `readiness ${r.readiness} not a registered reliance readiness class`));
  } else {
    const expected: L9SequenceRelianceReadinessClass =
      summarizeL9SequenceRelianceReadiness({
        band: r.confidence.confidence_band,
        capped_score: r.confidence.capped_confidence_score,
        restraint_class: r.causal_restraint_class,
        has_evidence_only_right: r.restriction.rights.includes(
          L9SequenceRestrictionRight.EVIDENCE_ONLY,
        ),
        has_final_judgment_blocked_right: r.restriction.rights.includes(
          L9SequenceRestrictionRight.FINAL_JUDGMENT_BLOCKED,
        ),
      });
    if (expected !== r.readiness) {
      violations.push(
        v(L9SequenceRelianceViolationCode.REL_READINESS_INCONSISTENT,
          `readiness=${r.readiness} does not match derived ${expected}`));
    }
  }

  if (!r.replay_hash || r.replay_hash.length === 0) {
    violations.push(
      v(L9SequenceRelianceViolationCode.REL_REPLAY_HASH_MISSING,
        `reliance profile missing replay_hash`));
  }

  if (r.policy_version !== input.expected_policy_version) {
    violations.push(
      v(L9SequenceRelianceViolationCode.REL_POLICY_VERSION_MISMATCH,
        `policy_version=${r.policy_version} expected=${input.expected_policy_version}`));
  }

  // §9.7.5.5 — cap_chain and confidence must agree on subject
  if (r.cap_chain.sequence_subject_id !== r.confidence.sequence_subject_id) {
    violations.push(
      v(L9SequenceRelianceViolationCode.REL_READINESS_INCONSISTENT,
        `cap_chain.subject_id != confidence.subject_id`));
  }

  return { ok: violations.length === 0, violations };
}

export function assertL9SequenceRelianceProfileLegal(
  input: L9SequenceRelianceProfileValidationInput,
): void {
  const r = validateL9SequenceRelianceProfile(input);
  if (!r.ok) throw new L9SequenceRelianceValidationError(r.violations);
}
