/**
 * L9.3 — SequenceRestrictionProfile Contract
 *
 * §9.3.6.4 — Any sequence result must carry a sequence restriction
 * posture that says how later layers may consume it. Sequence truth is
 * not equally usable everywhere (§9.2.4.11 law).
 *
 * Illegal if: reliance band absent, allowed_uses absent, blocked_uses
 * absent when required, or lineage absent.
 */

import type {
  L9SequenceRelianceBand,
  L9AllowedDownstreamUse,
  L9SequenceNarrowingReason,
} from './sequence-restriction-profile';

export interface L9SequenceRestrictionProfileContract {
  // Identity
  readonly sequence_restriction_profile_id: string;
  readonly sequence_result_id: string;
  readonly sequence_subject_id: string;

  // Contract versioning
  readonly restriction_contract_version: string;
  readonly schema_version: string;
  readonly policy_version: string;

  // Restriction posture (§9.3.6.4)
  readonly reliance_band: L9SequenceRelianceBand;
  readonly allowed_downstream_uses: readonly L9AllowedDownstreamUse[];
  readonly blocked_uses: readonly L9AllowedDownstreamUse[];
  readonly required_disclosures: readonly string[];
  readonly narrowing_reasons: readonly L9SequenceNarrowingReason[];

  // Lineage + replay
  readonly lineage_refs: {
    readonly trace_id: string;
    readonly manifest_id: string;
    readonly upstream_refs: readonly string[];
  };
  readonly compute_run_id: string;
  readonly replay_hash: string;

  readonly description: string;
}

export const L9_RESTRICTION_CONTRACT_REQUIRED_FIELDS: readonly string[] = [
  'sequence_restriction_profile_id', 'sequence_result_id',
  'sequence_subject_id',
  'restriction_contract_version', 'schema_version', 'policy_version',
  'reliance_band', 'allowed_downstream_uses', 'blocked_uses',
  'required_disclosures', 'narrowing_reasons',
  'lineage_refs', 'compute_run_id', 'replay_hash',
];
