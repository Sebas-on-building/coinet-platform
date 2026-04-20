/**
 * L9.2 — SequenceEventLink Contract
 *
 * §9.2.4.3 — Atomic temporal edge between two governed signals or
 * events. Links are not chains: they are first-class atomic edges the
 * chain assembler composes into a SequenceChain.
 */

/**
 * §9.2.4.3 — Ordering relation between two signals. Temporal adjacency
 * must never be promoted into causal certainty (§9.1.3.5), so this
 * enum never declares a `CAUSED` relation.
 */
export enum L9OrderingRelation {
  /** Source strictly precedes target within the lead-lag window. */
  PRECEDES = 'PRECEDES',
  /** Source and target are concurrent within the lead-lag tolerance. */
  CONCURRENT = 'CONCURRENT',
  /** Source follows target. */
  FOLLOWS = 'FOLLOWS',
  /** Ordering is ambiguous within the resolution of the data. */
  AMBIGUOUS = 'AMBIGUOUS',
}

export const ALL_L9_ORDERING_RELATIONS: readonly L9OrderingRelation[] =
  Object.values(L9OrderingRelation);

/**
 * §9.2.4.3 — Relation quality class: how much weight the chain
 * assembler should place on this edge.
 */
export enum L9RelationQualityClass {
  REINFORCING = 'REINFORCING',
  NEUTRAL = 'NEUTRAL',
  WEAK = 'WEAK',
  LATE = 'LATE',
  CONTRADICTORY = 'CONTRADICTORY',
  DECAYED = 'DECAYED',
}

export const ALL_L9_RELATION_QUALITY_CLASSES: readonly L9RelationQualityClass[] =
  Object.values(L9RelationQualityClass);

/**
 * §9.2.4.3 — Atomic sequence edge. The chain assembler may reject or
 * downgrade chains that contain late / contradictory / decayed edges
 * beyond a template-defined threshold.
 */
export interface L9SequenceEventLink {
  readonly sequence_event_link_id: string;
  readonly sequence_subject_id: string;
  readonly source_signal_ref: string;
  readonly target_signal_ref: string;
  readonly ordering_relation: L9OrderingRelation;
  readonly temporal_gap_ms: number;
  readonly relation_quality_class: L9RelationQualityClass;
  readonly late_flag: boolean;
  readonly contradiction_flag: boolean;
  /**
   * §9.2.4.8 — Explicit decay adjustment applied by the decay profile.
   * Kept alongside the link so downstream validators can check whether
   * decay was applied consistently.
   */
  readonly decay_adjustment: number; // 0..1 — 0 = not decayed
  readonly lineage_refs: readonly string[];
}
