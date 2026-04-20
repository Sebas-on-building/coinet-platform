/**
 * L9.2 — SequenceChain Contract
 *
 * §9.2.4.5 — The ordered temporal spine of a sequence subject. Every
 * emitted sequence assessment must be traceable to at least one chain
 * (§9.2.4.5 law + INV-9.2-B).
 */

/**
 * §9.2.4.5 — Chain integrity flags. Kept as a typed set so downstream
 * consumers always see *which* integrity issue is active.
 */
export enum L9ChainIntegrityFlag {
  ORDERING_AMBIGUITY = 'ORDERING_AMBIGUITY',
  LATE_PARTICIPATION = 'LATE_PARTICIPATION',
  CONTRADICTION_PRESENT = 'CONTRADICTION_PRESENT',
  DECAY_MATERIAL = 'DECAY_MATERIAL',
  MISSING_INITIATOR = 'MISSING_INITIATOR',
  MISSING_CONFIRMATION = 'MISSING_CONFIRMATION',
  POST_EVENT_ANCHOR_MISSING = 'POST_EVENT_ANCHOR_MISSING',
}

export const ALL_L9_CHAIN_INTEGRITY_FLAGS: readonly L9ChainIntegrityFlag[] =
  Object.values(L9ChainIntegrityFlag);

/**
 * §9.2.4.5 / §9.1.3.5 — Causal-confidence class kept on the chain so
 * every consumer sees the engine's restraint. This is never elevated
 * to "causality" by L9.
 */
export enum L9CausalConfidenceClass {
  TEMPORAL_ONLY = 'TEMPORAL_ONLY',
  CORRELATED_TEMPORAL = 'CORRELATED_TEMPORAL',
  PATTERN_ALIGNED_TEMPORAL = 'PATTERN_ALIGNED_TEMPORAL',
}

export const ALL_L9_CAUSAL_CONFIDENCE_CLASSES:
  readonly L9CausalConfidenceClass[] =
    Object.values(L9CausalConfidenceClass);

/**
 * §9.2.4.5 — The SequenceChain object.
 */
export interface L9SequenceChain {
  readonly sequence_chain_id: string;
  readonly sequence_subject_id: string;
  readonly ordered_node_refs: readonly string[];
  readonly ordered_event_refs: readonly string[];
  readonly ordered_link_refs: readonly string[];
  readonly chain_start_at: string;
  readonly chain_end_at: string;
  readonly chain_integrity_flags: readonly L9ChainIntegrityFlag[];
  /** 0..1 — higher = more complete chain. */
  readonly sequence_completeness_score: number;
  /** 0..1 — higher = more ambiguous ordering. */
  readonly ambiguity_score: number;
  readonly causal_confidence_class: L9CausalConfidenceClass;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
}
