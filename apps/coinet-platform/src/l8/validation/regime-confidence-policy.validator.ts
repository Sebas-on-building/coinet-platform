/**
 * L8.7 — Regime Confidence Policy Validator
 *
 * §8.7.3 / §8.7.7 — Policy-level validation on top of the L8.3
 * structural confidence validator. Enforces:
 *   - every required factor group is populated
 *   - band maps correctly to score
 *   - required caps are applied given the derivation context
 *   - confidence cannot be emitted "clean" when caps were required
 */

import {
  L8RegimeConfidenceContract,
  L8RegimeConfidenceFactors,
} from '../contracts/regime-confidence.contract';
import {
  ALL_L8_REGIME_CONFIDENCE_FACTOR_GROUPS,
  L8_FACTOR_GROUP_TO_BREAKDOWN_KEY,
  L8RegimeConfidenceDerivationContext,
  requiredL8RegimeCapReasons,
  resolveL8RegimeConfidenceBandFromScore,
} from '../contracts/regime-confidence.policy';
import {
  L8RegimeCapReason,
  L8RegimeCapEntry,
} from '../contracts/regime-cap-chain';
import {
  L8RegimeRelianceViolation,
  L8RegimeRelianceViolationCode,
} from './l8-reliance-violation-codes';

export interface L8ConfidencePolicyInput {
  readonly confidence: L8RegimeConfidenceContract;
  readonly derivation_context: L8RegimeConfidenceDerivationContext;
  readonly subject_ref?: string;
}

export interface L8ConfidencePolicyResult {
  readonly ok: boolean;
  readonly violations: readonly L8RegimeRelianceViolation[];
  readonly required_cap_reasons: readonly L8RegimeCapReason[];
}

const FACTOR_KEYS: readonly (keyof L8RegimeConfidenceFactors)[] = [
  'support_breadth', 'freshness', 'validation_quality_posture',
  'contradiction_pressure', 'transition_instability',
  'cross_domain_agreement', 'historical_reliability',
  'ambiguity_pressure',
];

function push(
  v: L8RegimeRelianceViolation[], code: L8RegimeRelianceViolationCode,
  detail: string, subject_ref?: string,
): void { v.push({ code, detail, subject_ref }); }

function inRange01(x: number): boolean {
  return Number.isFinite(x) && x >= 0 && x <= 1 + 1e-9;
}

/**
 * Map the L8.3 union cap-reason shape to the L8.7 governance enum. The
 * L8.3 enum does not contain `CROSS_DOMAIN_CONTRADICTION` and
 * `HISTORICAL_RELIABILITY_WEAK`; they will never appear from the L8.3
 * contract shape, which is fine — we validate governance-level
 * completeness against the derivation context.
 */
function toGovernanceCapReason(
  r: L8RegimeConfidenceContract['cap_chain'][number]['cap_reason'],
): L8RegimeCapReason | null {
  switch (r) {
    case 'TRANSITION_HIGH': return L8RegimeCapReason.CAP_TRANSITION_HIGH;
    case 'VALIDATION_WEAK': return L8RegimeCapReason.CAP_RESTRICTION_NARROWED;
    case 'RESTRICTION_TIGHT': return L8RegimeCapReason.CAP_RESTRICTION_NARROWED;
    case 'AMBIGUITY_MATERIAL': return L8RegimeCapReason.CAP_AMBIGUITY_HIGH;
    case 'STALENESS_MATERIAL': return L8RegimeCapReason.CAP_FRESHNESS_WEAK;
    case 'DEGRADATION_MATERIAL':
      return L8RegimeCapReason.CAP_DEGRADATION_MATERIAL;
    case 'L7_CONFIDENCE_LOW':
      return L8RegimeCapReason.CAP_RESTRICTION_NARROWED;
    default: return null;
  }
}

export function validateRegimeConfidencePolicy(
  input: L8ConfidencePolicyInput,
): L8ConfidencePolicyResult {
  const { confidence: c, derivation_context: ctx, subject_ref } = input;
  const violations: L8RegimeRelianceViolation[] = [];
  const required = requiredL8RegimeCapReasons(ctx);

  // §8.7.3.4 — every required factor group must be populated and in range.
  for (const key of FACTOR_KEYS) {
    const v = c.factor_breakdown?.[key];
    if (v === undefined || v === null) {
      push(violations,
        L8RegimeRelianceViolationCode.CONFIDENCE_MISSING_FACTOR_GROUP,
        `factor.${key}=missing`, subject_ref);
      continue;
    }
    if (!inRange01(v as unknown as number)) {
      push(violations,
        L8RegimeRelianceViolationCode.CONFIDENCE_FACTOR_OUT_OF_RANGE,
        `factor.${key}=${v}`, subject_ref);
    }
  }
  for (const g of ALL_L8_REGIME_CONFIDENCE_FACTOR_GROUPS) {
    const k = L8_FACTOR_GROUP_TO_BREAKDOWN_KEY[g] as keyof L8RegimeConfidenceFactors;
    if (c.factor_breakdown?.[k] === undefined) {
      push(violations,
        L8RegimeRelianceViolationCode.CONFIDENCE_MISSING_FACTOR_GROUP,
        `group=${g} maps_to=${String(k)} missing`, subject_ref);
    }
  }

  // §8.7.3.6 — score-band coherence and range
  if (!inRange01(c.confidence_score_raw)) {
    push(violations,
      L8RegimeRelianceViolationCode.CONFIDENCE_SCORE_OUT_OF_RANGE,
      `raw=${c.confidence_score_raw}`, subject_ref);
  }
  if (!inRange01(c.confidence_score_capped)) {
    push(violations,
      L8RegimeRelianceViolationCode.CONFIDENCE_SCORE_OUT_OF_RANGE,
      `capped=${c.confidence_score_capped}`, subject_ref);
  }
  if (c.confidence_score_capped > c.confidence_score_raw + 1e-9) {
    push(violations,
      L8RegimeRelianceViolationCode.CONFIDENCE_CAPPED_ABOVE_RAW,
      `capped=${c.confidence_score_capped} > raw=${c.confidence_score_raw}`,
      subject_ref);
  }
  const expectedBand =
    resolveL8RegimeConfidenceBandFromScore(c.confidence_score_capped);
  if (c.confidence_band !== expectedBand) {
    push(violations,
      L8RegimeRelianceViolationCode.CONFIDENCE_SCORE_BAND_MISMATCH,
      `band=${c.confidence_band} expected=${expectedBand} capped=${c.confidence_score_capped}`,
      subject_ref);
  }

  // §8.7.7 — required caps must appear in the cap chain (regardless of
  // which cap-reason alphabet the L8.3 contract uses).
  const appliedGovReasons = new Set<L8RegimeCapReason>();
  const tightestApplied: number[] = [];
  for (const cap of c.cap_chain) {
    if (!cap.applied) continue;
    const gov = toGovernanceCapReason(cap.cap_reason);
    if (gov) appliedGovReasons.add(gov);
    if (Number.isFinite(cap.max_after_cap)) tightestApplied.push(cap.max_after_cap);
  }
  const tightest =
    tightestApplied.length > 0 ? Math.min(...tightestApplied)
      : Number.POSITIVE_INFINITY;
  if (Number.isFinite(tightest) &&
      c.confidence_score_capped > tightest + 1e-9) {
    push(violations,
      L8RegimeRelianceViolationCode.CONFIDENCE_CAPPED_EXCEEDS_MAX,
      `capped=${c.confidence_score_capped} > tightest=${tightest}`,
      subject_ref);
  }

  for (const r of required) {
    if (!appliedGovReasons.has(r)) {
      push(violations,
        L8RegimeRelianceViolationCode.CONFIDENCE_CAP_REQUIRED_BUT_MISSING,
        `required_cap=${r}`, subject_ref);
    }
  }

  // §8.7.7.6 — clean-confidence masquerade: caps required but band is HIGH/FULL.
  if (required.length > 0 &&
      (c.confidence_band === 'HIGH' || c.confidence_band === 'FULL') &&
      appliedGovReasons.size === 0) {
    push(violations,
      L8RegimeRelianceViolationCode.CONFIDENCE_MASQUERADE_CLEAN,
      `band=${c.confidence_band} while ${required.length} cap reason(s) required`,
      subject_ref);
  }

  // §8.7.8.1 — if restriction_narrowed is true, the contract must have
  // at least one l7_restriction_profile_ref consumed.
  if (ctx.restriction_narrowed &&
      (!c.l7_restriction_profile_refs ||
       c.l7_restriction_profile_refs.length === 0)) {
    push(violations,
      L8RegimeRelianceViolationCode.CONFIDENCE_RESTRICTION_NOT_CONSUMED,
      `restriction_narrowed=true but no l7_restriction_profile_refs`,
      subject_ref);
  }
  if (ctx.contradiction_unresolved &&
      (!c.l7_contradiction_bundle_refs ||
       c.l7_contradiction_bundle_refs.length === 0)) {
    push(violations,
      L8RegimeRelianceViolationCode.CONFIDENCE_CONTRADICTION_NOT_CONSUMED,
      `contradiction_unresolved=true but no l7_contradiction_bundle_refs`,
      subject_ref);
  }

  return { ok: violations.length === 0, violations, required_cap_reasons: required };
}

/** Helper to summarise applied cap entries for the cap-chain validator. */
export function toCapEntriesFromConfidence(
  c: L8RegimeConfidenceContract,
): L8RegimeCapEntry[] {
  return c.cap_chain.map((cap, idx) => ({
    cap_id: `${c.confidence_assessment_id}.cap.${idx}`,
    cap_reason:
      toGovernanceCapReason(cap.cap_reason) ?? L8RegimeCapReason.CAP_RESTRICTION_NARROWED,
    max_after_cap: cap.max_after_cap,
    applied: cap.applied,
  }));
}
