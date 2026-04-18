/**
 * L8.3 — Regime Confidence Contract Validator
 *
 * §8.3.4.6 — Enforces completeness and legality of
 * `L8RegimeConfidenceContract`: identity, factor groups, band/score
 * consistency, cap-chain law, rationale, rollout of restriction-aware
 * inputs, and replay identity.
 */

import {
  L8RegimeConfidenceContract,
  L8_REGIME_CONFIDENCE_FACTOR_NAMES,
  resolveL8RegimeConfidenceBand,
  l8CapChainIsLegal,
} from '../contracts/regime-confidence.contract';
import { L8RegimeContractViolationCode } from './l8-contract-violation-codes';

export interface L8ConfidenceContractIssue {
  readonly code: L8RegimeContractViolationCode;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export interface L8ConfidenceContractReport {
  readonly valid: boolean;
  readonly issues: readonly L8ConfidenceContractIssue[];
}

const SEMVER = /^\d+\.\d+\.\d+(?:-[\w.]+)?$/;

function inUnit(x: number): boolean {
  return Number.isFinite(x) && x >= 0 && x <= 1;
}

export interface L8ConfidenceValidationContext {
  /** Ambiguity score from the regime output this confidence came from. */
  readonly ambiguity_score: number;
  /** Whether the subject declared restriction consumption as required. */
  readonly restriction_required: boolean;
  /** Whether staleness is material on the parent regime output. */
  readonly staleness_material: boolean;
  /** Whether transition risk is high. */
  readonly transition_high: boolean;
}

export function validateRegimeConfidenceContract(
  c: L8RegimeConfidenceContract,
  ctx?: L8ConfidenceValidationContext,
): L8ConfidenceContractReport {
  const issues: L8ConfidenceContractIssue[] = [];

  if (!c.confidence_assessment_id) {
    issues.push({
      code: L8RegimeContractViolationCode.CONFIDENCE_MISSING_IDENTITY,
      message: 'confidence_assessment_id missing',
    });
  }
  if (!c.regime_subject_id) {
    issues.push({
      code: L8RegimeContractViolationCode.CONFIDENCE_MISSING_IDENTITY,
      message: 'regime_subject_id missing',
    });
  }
  if (!c.regime_result_id) {
    issues.push({
      code: L8RegimeContractViolationCode.CONFIDENCE_MISSING_RESULT_REF,
      message: 'regime_result_id missing',
    });
  }
  if (!c.confidence_contract_version ||
      !SEMVER.test(c.confidence_contract_version)) {
    issues.push({
      code: L8RegimeContractViolationCode.CONFIDENCE_MISSING_CONTRACT_VERSION,
      message:
        `confidence_contract_version missing or not semver: ${c.confidence_contract_version}`,
    });
  }
  if (!c.policy_version) {
    issues.push({
      code: L8RegimeContractViolationCode.CONFIDENCE_MISSING_POLICY_VERSION,
      message: 'policy_version missing',
    });
  }

  // Factor breakdown
  if (!c.factor_breakdown) {
    issues.push({
      code: L8RegimeContractViolationCode.CONFIDENCE_MISSING_FACTORS,
      message: 'factor_breakdown missing',
    });
  } else {
    for (const k of L8_REGIME_CONFIDENCE_FACTOR_NAMES) {
      const v = c.factor_breakdown[k];
      if (typeof v !== 'number' || !Number.isFinite(v)) {
        issues.push({
          code: L8RegimeContractViolationCode.CONFIDENCE_MISSING_FACTORS,
          message: `factor_breakdown.${k} missing or non-numeric`,
        });
      } else if (v < 0 || v > 1) {
        issues.push({
          code: L8RegimeContractViolationCode.CONFIDENCE_FACTORS_OUT_OF_RANGE,
          message: `factor_breakdown.${k} out of range: ${v}`,
        });
      }
    }
  }

  // Raw/capped sanity
  if (!inUnit(c.confidence_score_raw)) {
    issues.push({
      code: L8RegimeContractViolationCode.CONFIDENCE_FACTORS_OUT_OF_RANGE,
      message: `confidence_score_raw OOR: ${c.confidence_score_raw}`,
    });
  }
  if (!inUnit(c.confidence_score_capped)) {
    issues.push({
      code: L8RegimeContractViolationCode.CONFIDENCE_FACTORS_OUT_OF_RANGE,
      message: `confidence_score_capped OOR: ${c.confidence_score_capped}`,
    });
  }

  // Band / capped-score consistency
  const expectedBand = resolveL8RegimeConfidenceBand(c.confidence_score_capped);
  if (c.confidence_band !== expectedBand) {
    issues.push({
      code: L8RegimeContractViolationCode.CONFIDENCE_BAND_INCONSISTENT,
      message:
        `confidence_band ${c.confidence_band} inconsistent with capped score ${c.confidence_score_capped} (expected ${expectedBand})`,
    });
  }

  // Cap-chain legality
  if (!l8CapChainIsLegal({
    confidence_score_raw: c.confidence_score_raw,
    confidence_score_capped: c.confidence_score_capped,
    cap_chain: c.cap_chain ?? [],
  })) {
    issues.push({
      code: L8RegimeContractViolationCode.CONFIDENCE_CAP_CHAIN_ILLEGAL,
      message: 'cap-chain illegal given raw/capped scores',
    });
  }

  // Required caps when context says they're needed
  if (ctx) {
    const needsCap =
      ctx.transition_high ||
      ctx.ambiguity_score >= 0.4 ||
      ctx.staleness_material;
    if (needsCap && c.cap_chain && c.cap_chain.length === 0 &&
        c.confidence_score_capped >= c.confidence_score_raw - 1e-9) {
      issues.push({
        code: L8RegimeContractViolationCode.CONFIDENCE_MISSING_CAPS_WHEN_REQUIRED,
        message:
          'context requires confidence caps (transition/ambiguity/staleness) but none applied',
      });
    }
    if (ctx.restriction_required &&
        (!c.l7_restriction_profile_refs ||
         c.l7_restriction_profile_refs.length === 0)) {
      issues.push({
        code: L8RegimeContractViolationCode.CONFIDENCE_MISSING_CAPS_WHEN_REQUIRED,
        message:
          'subject required restriction consumption but l7_restriction_profile_refs empty',
      });
    }
    if (ctx.ambiguity_score >= 0.4 &&
        (c.confidence_band === 'HIGH' || c.confidence_band === 'FULL')) {
      issues.push({
        code: L8RegimeContractViolationCode.CONFIDENCE_CLEAN_WHILE_AMBIGUOUS,
        message:
          `confidence_band ${c.confidence_band} with material ambiguity_score=${ctx.ambiguity_score}`,
      });
    }
  }

  // Rationale + replay
  if (!c.rationale_codes) {
    issues.push({
      code: L8RegimeContractViolationCode.CONFIDENCE_MISSING_RATIONALE,
      message: 'rationale_codes missing',
    });
  }
  if (!c.replay_hash) {
    issues.push({
      code: L8RegimeContractViolationCode.CONFIDENCE_MISSING_REPLAY_HASH,
      message: 'replay_hash missing',
    });
  }

  return { valid: issues.length === 0, issues };
}
