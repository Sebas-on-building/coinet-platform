/**
 * L10.7 — Hypothesis Reliance-Profile Validator
 *
 * §10.7.9 — Validates the final aggregated reliance profile. Does not
 * re-validate internal surfaces (those are validated by their own
 * validators); instead it enforces:
 *
 *   - confidence_score / confidence_band match the inner confidence
 *     profile (INV-10.7-A, INV-10.7-G)
 *   - cap_chain matches the inner cap chain
 *   - restriction policy_version / subject_id match
 *   - spread_class matches a spread externally supplied by the caller
 *     (or skipped if caller does not know it)
 *   - readiness is consistent with (band, cap_hint, spread, posture)
 *   - replay_hash + policy_version present
 */

import {
  L10HypothesisRelianceConfidenceBand,
} from '../contracts/hypothesis-confidence.policy';
import {
  L10HypothesisCapReadinessHint,
} from '../contracts/hypothesis-cap-chain';
import {
  L10HypothesisRelianceReadinessClass,
  summarizeL10HypothesisRelianceReadiness,
} from '../contracts/hypothesis-readiness';
import {
  L10HypothesisRestrictionRight,
} from '../contracts/hypothesis-restriction-rights';
import {
  L10HypothesisRelianceProfile,
} from '../contracts/hypothesis-reliance-profile';
import {
  L10SpreadClass,
} from '../contracts/hypothesis-spread-profile';
import {
  L10HypothesisRelianceValidationError,
  L10HypothesisRelianceViolation,
  L10HypothesisRelianceViolationCode,
  L10HypothesisRelianceViolationTier,
} from './l10-reliance-violation-codes';

export interface L10HypothesisRelianceProfileValidationInput {
  readonly profile: L10HypothesisRelianceProfile;
  readonly active_invalidation: boolean;
  readonly material_missing_confirmations: boolean;
  readonly live_competition: boolean;
}

export interface L10HypothesisRelianceProfileValidationResult {
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
    tier: L10HypothesisRelianceViolationTier.RELIANCE,
    detail,
    ...(refs ? { offending_refs: refs } : {}),
  };
}

export function validateL10HypothesisRelianceProfile(
  input: L10HypothesisRelianceProfileValidationInput,
): L10HypothesisRelianceProfileValidationResult {
  const p = input.profile;
  const violations: L10HypothesisRelianceViolation[] = [];

  if (!p) {
    return {
      ok: false,
      violations: [
        v(L10HypothesisRelianceViolationCode.REL_PROFILE_MISSING,
          'reliance profile missing'),
      ],
    };
  }
  if (!p.replay_hash) {
    violations.push(
      v(L10HypothesisRelianceViolationCode.REL_REPLAY_HASH_MISSING,
        'reliance profile missing replay_hash'));
  }

  // §10.7.9.4 — confidence aggregation integrity.
  if (
    Math.abs(p.confidence_score - p.confidence.capped_confidence_score) > 1e-9
  ) {
    violations.push(
      v(L10HypothesisRelianceViolationCode.REL_CONFIDENCE_MISMATCH,
        `confidence_score=${p.confidence_score} does not match inner ` +
          `capped=${p.confidence.capped_confidence_score}`));
  }
  if (p.confidence_band !== p.confidence.confidence_band) {
    violations.push(
      v(L10HypothesisRelianceViolationCode.REL_BAND_MISMATCH,
        `confidence_band=${p.confidence_band} does not match inner ` +
          `band=${p.confidence.confidence_band}`));
  }
  if (p.confidence.hypothesis_subject_id !== p.hypothesis_subject_id) {
    violations.push(
      v(L10HypothesisRelianceViolationCode.REL_CONFIDENCE_MISMATCH,
        `inner confidence subject_id=${p.confidence.hypothesis_subject_id} ` +
          `does not match profile subject_id=${p.hypothesis_subject_id}`));
  }

  // §10.7.9.4 — cap-chain aggregation integrity.
  if (p.cap_chain.hypothesis_subject_id !== p.hypothesis_subject_id) {
    violations.push(
      v(L10HypothesisRelianceViolationCode.REL_CAP_CHAIN_MISMATCH,
        `inner cap_chain subject_id=${p.cap_chain.hypothesis_subject_id} ` +
          `does not match profile subject_id=${p.hypothesis_subject_id}`));
  }
  if (
    Math.abs(p.cap_chain.post_cap_score - p.confidence.capped_confidence_score) > 1e-9
  ) {
    violations.push(
      v(L10HypothesisRelianceViolationCode.REL_CAP_CHAIN_MISMATCH,
        `cap_chain.post_cap_score=${p.cap_chain.post_cap_score} disagrees ` +
          `with confidence.capped=${p.confidence.capped_confidence_score}`));
  }

  // §10.7.9.4 — restriction aggregation integrity.
  if (p.restriction.hypothesis_subject_id !== p.hypothesis_subject_id) {
    violations.push(
      v(L10HypothesisRelianceViolationCode.REL_RESTRICTION_MISMATCH,
        `inner restriction subject_id=${p.restriction.hypothesis_subject_id} ` +
          `does not match profile subject_id=${p.hypothesis_subject_id}`));
  }
  if (p.restriction.driving_band !== p.confidence_band) {
    violations.push(
      v(L10HypothesisRelianceViolationCode.REL_RESTRICTION_MISMATCH,
        `restriction.driving_band=${p.restriction.driving_band} does not ` +
          `match confidence_band=${p.confidence_band}`));
  }
  if (p.restriction.policy_version !== p.policy_version) {
    violations.push(
      v(L10HypothesisRelianceViolationCode.REL_POLICY_VERSION_MISMATCH,
        `restriction.policy_version=${p.restriction.policy_version} does ` +
          `not match profile policy_version=${p.policy_version}`));
  }
  if (p.confidence.policy_version !== p.policy_version) {
    violations.push(
      v(L10HypothesisRelianceViolationCode.REL_POLICY_VERSION_MISMATCH,
        `confidence.policy_version=${p.confidence.policy_version} does ` +
          `not match profile policy_version=${p.policy_version}`));
  }

  // §10.7.9.4 — readiness consistency via canonical summarizer.
  const rights = new Set<L10HypothesisRestrictionRight>(p.restriction.rights);
  const hasEvidenceOnly = rights.has(
    L10HypothesisRestrictionRight.EVIDENCE_ONLY,
  );
  const hasFinalBlocked = rights.has(
    L10HypothesisRestrictionRight.FINAL_JUDGMENT_BLOCKED,
  );
  const derived = summarizeL10HypothesisRelianceReadiness({
    band: p.confidence_band,
    cap_hint: p.cap_chain.readiness_hint as L10HypothesisCapReadinessHint,
    spread_class: p.spread_class,
    has_evidence_only_right: hasEvidenceOnly,
    has_final_judgment_blocked_right: hasFinalBlocked,
    active_invalidation: input.active_invalidation,
    material_missing_confirmations: input.material_missing_confirmations,
  });
  if (derived !== p.readiness) {
    violations.push(
      v(L10HypothesisRelianceViolationCode.REL_READINESS_INCONSISTENT,
        `readiness=${p.readiness} does not match derived ${derived}`));
  }

  // §10.7.9.4 — UNRESOLVED band / BLOCKED readiness must not coexist
  // with a non-BLOCKED readiness that is not itself BLOCKED.
  if (
    p.confidence_band === L10HypothesisRelianceConfidenceBand.UNRESOLVED &&
    p.readiness !== L10HypothesisRelianceReadinessClass.BLOCKED
  ) {
    violations.push(
      v(L10HypothesisRelianceViolationCode.REL_READINESS_INCONSISTENT,
        `UNRESOLVED band with readiness=${p.readiness} (must be BLOCKED)`));
  }

  // §10.7.9.4 — live_competition without TIED spread is inconsistent
  // with STRONG_PRIMARY.
  if (
    input.live_competition &&
    p.readiness === L10HypothesisRelianceReadinessClass.STRONG_PRIMARY &&
    (p.spread_class === L10SpreadClass.NARROW ||
      p.spread_class === L10SpreadClass.TIED)
  ) {
    violations.push(
      v(L10HypothesisRelianceViolationCode.REL_READINESS_INCONSISTENT,
        'STRONG_PRIMARY declared while live competition is alive and ' +
          'spread is narrow/tied'));
  }

  return { ok: violations.length === 0, violations };
}

export function assertL10HypothesisRelianceProfileLegal(
  input: L10HypothesisRelianceProfileValidationInput,
): void {
  const r = validateL10HypothesisRelianceProfile(input);
  if (!r.ok) throw new L10HypothesisRelianceValidationError(r.violations);
}
