/**
 * L8.7 — Regime Reliance Profile
 *
 * §8.7.2 — The reliance profile is the single governance object that
 * binds a regime call's confidence, transition-risk, and multiplier
 * posture together under a declared readiness class. This is what
 * downstream layers consume when deciding how far to trust a regime
 * output.
 *
 * §8.7.2.3 — These remain DISTINCT first-class surfaces; the reliance
 * profile does NOT collapse them into a single "regime score". It only
 * summarises readiness for downstream consumption.
 */

import { L8RegimeCapChain } from './regime-cap-chain';
import type { L8RegimeConfidenceBand } from './regime-state';
import type {
  L8RegimeTransitionRiskClass,
} from './regime-transition-risk.policy';
import type { L8RegimeMultiplierNarrowingReason }
  from './regime-multiplier.policy';

/**
 * §8.7.10.1 — Readiness class expresses how strongly later layers may
 * rely on this regime call. It is a DERIVED status computed from
 * confidence band, transition risk class, cap chain, and narrowing.
 */
export enum L8RegimeRelianceReadinessClass {
  /** Clean reliance permitted; no caps dominant, ambiguity/transition low. */
  STRONG = 'STRONG',
  /** Normal reliance with interpretive narrowing applied. */
  NARROWED = 'NARROWED',
  /** Material caps dominate; reliance degraded. */
  DEGRADED = 'DEGRADED',
  /** Reliance blocked; regime call must be treated as non-conditioning. */
  BLOCKED = 'BLOCKED',
}

export const ALL_L8_REGIME_RELIANCE_READINESS_CLASSES:
  readonly L8RegimeRelianceReadinessClass[] =
    Object.values(L8RegimeRelianceReadinessClass);

/**
 * §8.7.2 — Reliance profile. Links together the three first-class
 * surfaces plus derived readiness.
 */
export interface L8RegimeRelianceProfile {
  // Identity
  readonly reliance_profile_id: string;
  readonly regime_subject_id: string;
  readonly regime_result_id: string;

  // Versioning
  readonly reliance_contract_version: string;
  readonly schema_version: string;
  readonly policy_version: string;

  // Linked reliance surfaces (by ref; never inlined so they stay
  // first-class per §8.7.2.3).
  readonly confidence_assessment_id: string;
  readonly transition_profile_id: string;
  readonly multiplier_profile_id: string;

  // Summary posture (§8.7.2.2)
  readonly confidence_band: L8RegimeConfidenceBand;
  readonly transition_risk_class: L8RegimeTransitionRiskClass;
  readonly readiness_class: L8RegimeRelianceReadinessClass;

  // Cap + narrowing audit (§8.7.7.5 / §8.7.8.3)
  readonly cap_chain: L8RegimeCapChain;
  readonly narrowing_reason_codes:
    readonly L8RegimeMultiplierNarrowingReason[];

  // Upstream L7 posture references (§8.7.8.1)
  readonly l7_restriction_profile_refs: readonly string[];
  readonly l7_contradiction_bundle_refs: readonly string[];

  // Lineage + replay
  readonly lineage_refs: {
    readonly trace_id: string;
    readonly manifest_id: string;
  };
  readonly compute_run_id: string;
  readonly replay_hash: string;
}

/**
 * §8.7.10.1 — Derive the readiness class from a (band, transition,
 * cap chain) triple. This is used by the reliance-profile engine and
 * by validators to check that the emitted readiness is consistent.
 */
export function deriveL8RegimeRelianceReadinessClass(
  band: L8RegimeConfidenceBand,
  risk: L8RegimeTransitionRiskClass,
  cap: L8RegimeCapChain,
): L8RegimeRelianceReadinessClass {
  if (cap.readiness_hint === 'BLOCKED') {
    return L8RegimeRelianceReadinessClass.BLOCKED;
  }
  if (cap.readiness_hint === 'DEGRADED' || risk === 'HIGH') {
    return L8RegimeRelianceReadinessClass.DEGRADED;
  }
  if (cap.readiness_hint === 'CLEAN' &&
      (band === 'HIGH' || band === 'FULL') &&
      (risk === 'LOW' || risk === 'UNRESOLVED')) {
    return L8RegimeRelianceReadinessClass.STRONG;
  }
  return L8RegimeRelianceReadinessClass.NARROWED;
}

export const L8_REGIME_RELIANCE_CONTRACT_VERSION = 'v1.0.0';
export const L8_REGIME_RELIANCE_POLICY_VERSION = 'l8.7-reliance-policy-v1';

export const L8_RELIANCE_PROFILE_REQUIRED_FIELDS: readonly string[] = [
  'reliance_profile_id', 'regime_subject_id', 'regime_result_id',
  'reliance_contract_version', 'schema_version', 'policy_version',
  'confidence_assessment_id', 'transition_profile_id', 'multiplier_profile_id',
  'confidence_band', 'transition_risk_class', 'readiness_class',
  'cap_chain', 'narrowing_reason_codes',
  'l7_restriction_profile_refs', 'l7_contradiction_bundle_refs',
  'lineage_refs', 'compute_run_id', 'replay_hash',
];
