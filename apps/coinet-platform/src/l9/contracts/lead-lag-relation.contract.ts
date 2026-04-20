/**
 * L9.3 — LeadLagRelation Contract
 *
 * §9.3.4 — Lead-lag is one of the strongest edges of Layer 9 but also
 * one of the most easily abused. It is a first-class contract object,
 * not metadata. This contract adds production fields (lag_window_ref,
 * scope, replay_hash_component) on top of the L9.2 object and binds
 * the causal-restraint disclaimer to the contract surface itself.
 */

import type {
  L9LagClass,
  L9LagSupportStrength,
  L9LagContradictionPosture,
  L9CausalRestraintFlags,
} from './lead-lag-relation';
import type { L9SequenceScopeType } from './sequence-family';

/**
 * §9.3.4.2 — Restriction consumption ref for a lead-lag relation.
 * Declares which L7 restriction profile the relation was built under
 * so audit and replay can reason about consumption rights.
 */
export interface L9LeadLagRestrictionRef {
  readonly restriction_profile_ref: string;
  readonly consumed_rights: readonly string[];
}

/**
 * §9.3.4.2 — Regime conditioning ref. Declares the L8 regime posture
 * the lead-lag was built under.
 */
export interface L9LeadLagRegimeRef {
  readonly regime_result_ref: string;
  readonly regime_family: string;
  readonly regime_confidence_band: string;
}

/**
 * §9.3.4.2 — Validation conditioning ref. Declares the L7 validation
 * surface the lead-lag was built under.
 */
export interface L9LeadLagValidationRef {
  readonly validation_ref: string;
  readonly validation_class: string;
}

/**
 * §9.3.4.1 — The LeadLagRelation contract. Extends the L9.2 object
 * with production lineage, replay, scope, and causal-restraint posture.
 */
export interface L9LeadLagRelationContract {
  // Identity
  readonly lead_lag_id: string;
  readonly sequence_subject_id: string;

  // Contract versioning
  readonly lead_lag_contract_version: string;
  readonly schema_version: string;
  readonly policy_version: string;

  // Endpoints (§9.3.4.2)
  readonly leading_signal_ref: string;
  readonly lagging_signal_ref: string;
  readonly lag_duration_ms: number;
  readonly lag_class: L9LagClass;

  // Semantic posture (§9.3.4.2)
  readonly support_strength: L9LagSupportStrength;
  readonly contradiction_posture: L9LagContradictionPosture;
  readonly decay_adjustment: number;      // 0..1
  readonly historical_reliability: number; // 0..1

  // Production fields (§9.3.4.3)
  readonly lag_window_ref: string;
  readonly scope_type: L9SequenceScopeType;
  readonly scope_id: string;
  readonly as_of: string;
  readonly causal_restraint_flag: true;
  readonly causal_restraint: L9CausalRestraintFlags;
  readonly restriction_consumption_refs: readonly L9LeadLagRestrictionRef[];
  readonly regime_conditioning_refs: readonly L9LeadLagRegimeRef[];
  readonly validation_conditioning_refs: readonly L9LeadLagValidationRef[];

  // Lineage + replay
  readonly lineage_refs: {
    readonly trace_id: string;
    readonly manifest_id: string;
  };
  readonly compute_run_id: string;
  readonly replay_hash: string;
  readonly replay_hash_component: string;
}

export const L9_LEAD_LAG_CONTRACT_REQUIRED_FIELDS: readonly string[] = [
  'lead_lag_id', 'sequence_subject_id',
  'lead_lag_contract_version', 'schema_version', 'policy_version',
  'leading_signal_ref', 'lagging_signal_ref',
  'lag_duration_ms', 'lag_class',
  'support_strength', 'contradiction_posture',
  'decay_adjustment', 'historical_reliability',
  'lag_window_ref', 'scope_type', 'scope_id', 'as_of',
  'causal_restraint_flag', 'causal_restraint',
  'lineage_refs', 'compute_run_id', 'replay_hash', 'replay_hash_component',
];
