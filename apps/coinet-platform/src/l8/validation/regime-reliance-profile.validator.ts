/**
 * L8.7 — Regime Reliance Profile Validator
 *
 * §8.7.2 / §8.7.10 — The reliance profile is the governance aggregate.
 * This validator ensures:
 *   - all three first-class surfaces are referenced (INV-8.7-A)
 *   - readiness class is consistent with band + transition class + caps
 *   - reliance profile cannot collapse the three surfaces
 *   - replay hash is present and non-trivial
 *   - STRONG readiness is illegal with critical caps applied
 *   - BLOCKED readiness is illegal with a CLEAN hint
 */

import {
  L8RegimeRelianceProfile,
  L8RegimeRelianceReadinessClass,
  deriveL8RegimeRelianceReadinessClass,
  L8_RELIANCE_PROFILE_REQUIRED_FIELDS,
} from '../contracts/regime-reliance-profile';
import {
  L8RegimeCapReason,
} from '../contracts/regime-cap-chain';
import {
  L8RegimeRelianceViolation,
  L8RegimeRelianceViolationCode,
} from './l8-reliance-violation-codes';

export interface L8RelianceProfileValidationInput {
  readonly reliance: L8RegimeRelianceProfile;
  readonly subject_ref?: string;
}

export interface L8RelianceProfileValidationResult {
  readonly ok: boolean;
  readonly violations: readonly L8RegimeRelianceViolation[];
}

function push(
  v: L8RegimeRelianceViolation[], code: L8RegimeRelianceViolationCode,
  detail: string, subject_ref?: string,
): void { v.push({ code, detail, subject_ref }); }

export function validateRegimeRelianceProfile(
  input: L8RelianceProfileValidationInput,
): L8RelianceProfileValidationResult {
  const { reliance: r, subject_ref } = input;
  const violations: L8RegimeRelianceViolation[] = [];

  // Required-fields structural sweep
  for (const k of L8_RELIANCE_PROFILE_REQUIRED_FIELDS) {
    if ((r as unknown as Record<string, unknown>)[k] === undefined) {
      push(violations,
        L8RegimeRelianceViolationCode.RELIANCE_SURFACES_COLLAPSED,
        `field=${k} missing`, subject_ref);
    }
  }

  // §8.7.2.1 — all three references must be present and non-empty
  if (!r.confidence_assessment_id) {
    push(violations,
      L8RegimeRelianceViolationCode.RELIANCE_MISSING_CONFIDENCE_REF,
      `confidence_assessment_id empty`, subject_ref);
  }
  if (!r.transition_profile_id) {
    push(violations,
      L8RegimeRelianceViolationCode.RELIANCE_MISSING_TRANSITION_REF,
      `transition_profile_id empty`, subject_ref);
  }
  if (!r.multiplier_profile_id) {
    push(violations,
      L8RegimeRelianceViolationCode.RELIANCE_MISSING_MULTIPLIER_REF,
      `multiplier_profile_id empty`, subject_ref);
  }

  // §8.7.2.3 — surfaces may not collapse: the three refs must be unique
  const refs = [
    r.confidence_assessment_id, r.transition_profile_id, r.multiplier_profile_id,
  ];
  const uniqueRefs = new Set(refs.filter(x => !!x));
  if (uniqueRefs.size < refs.filter(x => !!x).length) {
    push(violations,
      L8RegimeRelianceViolationCode.RELIANCE_SURFACES_COLLAPSED,
      `reliance refs collapse; refs=${JSON.stringify(refs)}`, subject_ref);
  }

  // §8.7.2 — band must match reliance cap_chain readiness hint
  if (r.confidence_band === 'HIGH' || r.confidence_band === 'FULL') {
    if (r.cap_chain.readiness_hint === 'BLOCKED') {
      push(violations,
        L8RegimeRelianceViolationCode.RELIANCE_BAND_MISMATCH,
        `band=${r.confidence_band} but cap_chain readiness=BLOCKED`,
        subject_ref);
    }
  }

  // §8.7.4.2 — transition class must match the reliance risk class
  if (r.transition_risk_class === 'HIGH' &&
      r.readiness_class === L8RegimeRelianceReadinessClass.STRONG) {
    push(violations,
      L8RegimeRelianceViolationCode.RELIANCE_RISK_CLASS_MISMATCH,
      `transition=HIGH but readiness=STRONG`, subject_ref);
  }

  // §8.7.10.1 — readiness class must be the derived class from the triple
  const derived = deriveL8RegimeRelianceReadinessClass(
    r.confidence_band, r.transition_risk_class, r.cap_chain,
  );
  if (r.readiness_class !== derived) {
    push(violations,
      L8RegimeRelianceViolationCode.RELIANCE_READINESS_INCOHERENT,
      `readiness=${r.readiness_class} expected=${derived}`,
      subject_ref);
  }

  // §8.7.7.4 — STRONG readiness is illegal with critical caps applied
  const appliedCaps = r.cap_chain.applied_caps.filter(c => c.applied);
  const hasCritical = appliedCaps.some(c =>
    c.cap_reason === L8RegimeCapReason.CAP_CROSS_DOMAIN_CONTRADICTION ||
    c.cap_reason === L8RegimeCapReason.CAP_DEGRADATION_MATERIAL
  );
  if (r.readiness_class === L8RegimeRelianceReadinessClass.STRONG &&
      hasCritical) {
    push(violations,
      L8RegimeRelianceViolationCode.RELIANCE_STRONG_WITH_CRITICAL_CAP,
      `readiness=STRONG with applied caps: ${appliedCaps.map(c => c.cap_reason).join(',')}`,
      subject_ref);
  }

  // §8.7.10.1 — BLOCKED with CLEAN hint is incoherent
  if (r.readiness_class === L8RegimeRelianceReadinessClass.BLOCKED &&
      r.cap_chain.readiness_hint === 'CLEAN') {
    push(violations,
      L8RegimeRelianceViolationCode.RELIANCE_BLOCKED_WITH_CLEAN_HINT,
      `readiness=BLOCKED with readiness_hint=CLEAN`, subject_ref);
  }

  // §8.7.9.4 — replay hash must exist
  if (!r.replay_hash || r.replay_hash.length < 8) {
    push(violations,
      L8RegimeRelianceViolationCode.RELIANCE_REPLAY_HASH_MISSING,
      `replay_hash='${r.replay_hash}'`, subject_ref);
  }

  return { ok: violations.length === 0, violations };
}
