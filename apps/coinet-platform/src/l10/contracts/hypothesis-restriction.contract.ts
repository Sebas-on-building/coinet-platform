/**
 * L10.3 — Hypothesis Restriction Profile Contract
 *
 * §10.3.7.3 — The executable restriction profile that governs how
 * later layers may use the explanatory result. L10 may never emit
 * unrestricted explanatory truth by default.
 */

import type {
  L10BlockedUse,
  L10RelianceBand,
  L10RestrictionRight,
} from './hypothesis-restriction-profile';

export interface L10HypothesisRestrictionLineageRefs {
  readonly trace_id: string;
  readonly manifest_id: string;
  readonly upstream_refs: readonly string[];
}

export interface L10HypothesisRestrictionProfileContract {
  // Identity (§10.3.7.3)
  readonly hypothesis_restriction_profile_id: string;
  readonly hypothesis_subject_id: string;
  readonly hypothesis_assessment_ref: string;

  // Contract versioning (§10.3.8.1)
  readonly restriction_contract_version: string;
  readonly schema_version: string;
  readonly policy_version: string;

  // Time
  readonly as_of: string;

  // Posture (§10.3.7.3)
  readonly reliance_band: L10RelianceBand;
  readonly allowed_downstream_uses: readonly L10RestrictionRight[];
  readonly blocked_uses: readonly L10BlockedUse[];
  readonly required_disclosures: readonly string[];
  readonly narrowing_reasons: readonly string[];

  // Competition posture (§10.3.7.3 — illegal to be decisive while close)
  readonly competition_live_flag: boolean;
  readonly narrow_spread_flag: boolean;

  // Persistence / replay
  readonly replay_hash: string;
  readonly lineage_refs: L10HypothesisRestrictionLineageRefs;
  readonly description: string;
}

export const L10_RESTRICTION_CONTRACT_REQUIRED_FIELDS: readonly string[] = [
  'hypothesis_restriction_profile_id', 'hypothesis_subject_id',
  'hypothesis_assessment_ref',
  'restriction_contract_version', 'schema_version', 'policy_version',
  'as_of',
  'reliance_band', 'allowed_downstream_uses', 'blocked_uses',
  'narrowing_reasons',
  'replay_hash', 'lineage_refs',
];
