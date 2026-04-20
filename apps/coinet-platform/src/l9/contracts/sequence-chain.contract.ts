/**
 * L9.3 — SequenceChain Contract
 *
 * §9.3.5 — The ordered backbone of the temporal interpretation. Not
 * just a sorted list of events but an ordered, governed,
 * integrity-checked chain of temporal meaning.
 *
 * Every emitted sequence assessment must be traceable to at least one
 * chain (§9.2.4.5 law + INV-9.3-C). The contract form adds production
 * fields on top of the L9.2 object and enforces the integrity-flag
 * vocabulary.
 */

import type {
  L9ChainIntegrityFlag,
  L9CausalConfidenceClass,
} from './sequence-chain';

/**
 * §9.3.5.2 — The executable chain contract.
 */
export interface L9SequenceChainContract {
  // Identity
  readonly sequence_chain_id: string;
  readonly sequence_subject_id: string;

  // Contract versioning
  readonly chain_contract_version: string;
  readonly schema_version: string;
  readonly policy_version: string;

  // Ordered spine (§9.3.5.2)
  readonly ordered_node_refs: readonly string[];
  readonly ordered_event_refs: readonly string[];
  readonly ordered_link_refs: readonly string[];

  // Temporal bounds (§9.3.5.3)
  readonly chain_start_at: string;
  readonly chain_end_at: string;

  // Scores + posture (§9.3.5.2)
  readonly sequence_completeness_score: number; // 0..1
  readonly ambiguity_score: number;             // 0..1
  readonly causal_confidence_class: L9CausalConfidenceClass;
  readonly chain_integrity_flags: readonly L9ChainIntegrityFlag[];

  // Attached sub-object refs (§9.3.5.3)
  readonly phase_refs: readonly string[];
  readonly change_point_refs: readonly string[];
  readonly decay_profile_ref: string;
  readonly post_event_window_refs: readonly string[];
  readonly restriction_refs: readonly string[];

  // Lineage + replay
  readonly lineage_refs: {
    readonly trace_id: string;
    readonly manifest_id: string;
    readonly upstream_refs: readonly string[];
  };
  readonly compute_run_id: string;
  readonly replay_hash: string;
}

export const L9_CHAIN_CONTRACT_REQUIRED_FIELDS: readonly string[] = [
  'sequence_chain_id', 'sequence_subject_id',
  'chain_contract_version', 'schema_version', 'policy_version',
  'ordered_node_refs', 'ordered_event_refs',
  'chain_start_at', 'chain_end_at',
  'sequence_completeness_score', 'ambiguity_score',
  'causal_confidence_class', 'chain_integrity_flags',
  'decay_profile_ref',
  'lineage_refs', 'compute_run_id', 'replay_hash',
];
