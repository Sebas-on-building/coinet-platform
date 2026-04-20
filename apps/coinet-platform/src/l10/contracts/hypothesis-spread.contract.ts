/**
 * L10.3 — Hypothesis Spread Profile Contract
 *
 * §10.3.7.1 — The executable, versioned, replay-safe spread object.
 * Narrow / tied spreads must never be hidden inside confidence alone;
 * this contract forces them out into an explicit object.
 */

import type {
  L10RankingStabilityClass,
} from './hypothesis-ranking';
import type { L10SpreadClass } from './hypothesis-spread-profile';

export interface L10HypothesisSpreadLineageRefs {
  readonly trace_id: string;
  readonly manifest_id: string;
  readonly upstream_refs: readonly string[];
}

export interface L10HypothesisSpreadProfileContract {
  // Identity (§10.3.7.1)
  readonly spread_profile_id: string;
  readonly hypothesis_subject_id: string;
  readonly ranking_ref: string;

  // Contract versioning (§10.3.8.1)
  readonly spread_contract_version: string;
  readonly schema_version: string;
  readonly policy_version: string;

  // Time
  readonly as_of: string;

  // Refs (§10.3.7.1)
  readonly primary_hypothesis_ref: string;
  readonly secondary_hypothesis_ref: string | null;

  // Spread (§10.3.7.1)
  readonly confidence_spread: number;
  readonly spread_class: L10SpreadClass;
  readonly ranking_stability_class: L10RankingStabilityClass;
  readonly narrow_spread_flag: boolean;
  readonly competition_size: number;

  // Persistence / replay
  readonly evidence_pack_ref: string;
  readonly replay_hash: string;
  readonly lineage_refs: L10HypothesisSpreadLineageRefs;
}

export const L10_SPREAD_CONTRACT_REQUIRED_FIELDS: readonly string[] = [
  'spread_profile_id', 'hypothesis_subject_id', 'ranking_ref',
  'spread_contract_version', 'schema_version', 'policy_version',
  'as_of',
  'primary_hypothesis_ref',
  'confidence_spread', 'spread_class', 'ranking_stability_class',
  'narrow_spread_flag', 'competition_size',
  'evidence_pack_ref', 'replay_hash', 'lineage_refs',
];
