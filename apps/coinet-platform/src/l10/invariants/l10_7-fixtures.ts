/**
 * L10.7 — Invariant Fixtures (green pipeline)
 *
 * §10.7.10.3 / §10.7.11 — Canonical "green" inputs used by the L10.7
 * invariants runner. Every fixture here represents a reliance state
 * that must pass every L10.7 validator cleanly. The invariants then
 * perturb these inputs to prove that each doctrinal rule actually
 * catches its violation (INV-10.7-A through INV-10.7-G).
 */

import {
  L10HypothesisCapReason,
} from '../contracts/hypothesis-cap-chain';
import {
  L10HypothesisConfidenceFactorClass,
} from '../contracts/hypothesis-confidence.policy';
import {
  L10HypothesisRelianceEngineInput,
} from '../reliance/hypothesis-reliance-engine';
import {
  L10SpreadClass,
} from '../contracts/hypothesis-spread-profile';

const POLICY_VERSION = 'l10.7-fixture-v1';
const SUBJECT_ID = 'hsub_fixture_subject_01';
const PRIMARY_REF = 'hyp_candidate_primary_01';
const SECONDARY_REF = 'hyp_candidate_secondary_02';

export interface GreenL10_7RelianceFixture {
  readonly input: L10HypothesisRelianceEngineInput;
}

/**
 * §10.7.10.3 — A maximally-clean reliance input: strong support,
 * minimal contradiction, complete confirmations, no invalidation risk,
 * wide spread, clean sequence / regime / validation / template
 * posture, and no caps applied. Yields:
 *   - confidence band HIGH
 *   - cap chain CLEAN
 *   - default HIGH-band rights
 *   - readiness STRONG_PRIMARY
 */
export function buildGreenL10_7RelianceFixture(): GreenL10_7RelianceFixture {
  const contributions: Record<L10HypothesisConfidenceFactorClass, number> = {
    [L10HypothesisConfidenceFactorClass.SUPPORT_STRENGTH]: 0.92,
    [L10HypothesisConfidenceFactorClass.CONTRADICTION_PRESSURE]: 0.10,
    [L10HypothesisConfidenceFactorClass.CONFIRMATION_COMPLETENESS]: 0.95,
    [L10HypothesisConfidenceFactorClass.INVALIDATION_RISK]: 0.05,
    [L10HypothesisConfidenceFactorClass.SEQUENCE_QUALITY]: 0.88,
    [L10HypothesisConfidenceFactorClass.REGIME_COMPATIBILITY]: 0.90,
    [L10HypothesisConfidenceFactorClass.VALIDATION_POSTURE]: 0.85,
    [L10HypothesisConfidenceFactorClass.TEMPLATE_RELIABILITY]: 0.82,
    [L10HypothesisConfidenceFactorClass.SPREAD_VS_SECONDARY]: 0.85,
  };

  const input: L10HypothesisRelianceEngineInput = {
    hypothesis_subject_id: SUBJECT_ID,
    primary_hypothesis_ref: PRIMARY_REF,
    secondary_hypothesis_ref: SECONDARY_REF,
    contributions,
    applied_caps: [],
    spread_class: L10SpreadClass.WIDE,
    active_contradiction: false,
    active_invalidation: false,
    material_missing_confirmations: false,
    lineage_refs: [
      'l7:supp:strong',
      'l8:regime:compat',
      'l9:sequence:clean',
    ],
    policy_version: POLICY_VERSION,
  };
  return { input };
}

/**
 * §10.7.7 — A narrowed-but-legal reliance input: medium confidence
 * with a missing-confirmation cap and narrow spread. Yields:
 *   - band MEDIUM
 *   - cap chain NARROWED
 *   - narrowed rights (additional_confirmation_required)
 *   - readiness NARROWED_PRIMARY
 */
export function buildNarrowedL10_7RelianceFixture(): GreenL10_7RelianceFixture {
  const contributions: Record<L10HypothesisConfidenceFactorClass, number> = {
    [L10HypothesisConfidenceFactorClass.SUPPORT_STRENGTH]: 0.75,
    [L10HypothesisConfidenceFactorClass.CONTRADICTION_PRESSURE]: 0.35,
    [L10HypothesisConfidenceFactorClass.CONFIRMATION_COMPLETENESS]: 0.55,
    [L10HypothesisConfidenceFactorClass.INVALIDATION_RISK]: 0.20,
    [L10HypothesisConfidenceFactorClass.SEQUENCE_QUALITY]: 0.70,
    [L10HypothesisConfidenceFactorClass.REGIME_COMPATIBILITY]: 0.65,
    [L10HypothesisConfidenceFactorClass.VALIDATION_POSTURE]: 0.70,
    [L10HypothesisConfidenceFactorClass.TEMPLATE_RELIABILITY]: 0.60,
    [L10HypothesisConfidenceFactorClass.SPREAD_VS_SECONDARY]: 0.40,
  };

  const input: L10HypothesisRelianceEngineInput = {
    hypothesis_subject_id: SUBJECT_ID + '_narrowed',
    primary_hypothesis_ref: PRIMARY_REF,
    secondary_hypothesis_ref: SECONDARY_REF,
    contributions,
    applied_caps: [
      L10HypothesisCapReason.NARROW_SPREAD,
      L10HypothesisCapReason.CONFIRMATION_INCOMPLETE,
    ],
    spread_class: L10SpreadClass.NARROW,
    active_contradiction: false,
    active_invalidation: false,
    material_missing_confirmations: true,
    lineage_refs: ['l7:supp:medium', 'l9:sequence:medium'],
    policy_version: POLICY_VERSION,
  };
  return { input };
}

/**
 * §10.7.7 — A blocked reliance input: active invalidation and tied
 * spread. Yields:
 *   - band LOW or UNRESOLVED (via caps)
 *   - cap chain BLOCKED
 *   - evidence-only + final-judgment blocked
 *   - readiness BLOCKED
 */
export function buildBlockedL10_7RelianceFixture(): GreenL10_7RelianceFixture {
  const contributions: Record<L10HypothesisConfidenceFactorClass, number> = {
    [L10HypothesisConfidenceFactorClass.SUPPORT_STRENGTH]: 0.50,
    [L10HypothesisConfidenceFactorClass.CONTRADICTION_PRESSURE]: 0.80,
    [L10HypothesisConfidenceFactorClass.CONFIRMATION_COMPLETENESS]: 0.20,
    [L10HypothesisConfidenceFactorClass.INVALIDATION_RISK]: 0.90,
    [L10HypothesisConfidenceFactorClass.SEQUENCE_QUALITY]: 0.40,
    [L10HypothesisConfidenceFactorClass.REGIME_COMPATIBILITY]: 0.30,
    [L10HypothesisConfidenceFactorClass.VALIDATION_POSTURE]: 0.40,
    [L10HypothesisConfidenceFactorClass.TEMPLATE_RELIABILITY]: 0.35,
    [L10HypothesisConfidenceFactorClass.SPREAD_VS_SECONDARY]: 0.02,
  };

  const input: L10HypothesisRelianceEngineInput = {
    hypothesis_subject_id: SUBJECT_ID + '_blocked',
    primary_hypothesis_ref: PRIMARY_REF,
    secondary_hypothesis_ref: SECONDARY_REF,
    contributions,
    applied_caps: [
      L10HypothesisCapReason.INVALIDATION_RISK_HIGH,
      L10HypothesisCapReason.CONTRADICTION_HIGH,
      L10HypothesisCapReason.UNRESOLVED_SPREAD,
    ],
    spread_class: L10SpreadClass.TIED,
    active_contradiction: true,
    active_invalidation: true,
    material_missing_confirmations: true,
    lineage_refs: ['l7:supp:low', 'l9:sequence:weak'],
    policy_version: POLICY_VERSION,
  };
  return { input };
}
