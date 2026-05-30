/**
 * L14.3 — Delivery Runtime Stage + Context
 *
 * §14.3.4 / §14.3.5 / §14.3.7 / §14.3.8 — Frozen runtime stage
 * enum and the immutable runtime context that flows through it.
 */

export enum L14DeliveryRuntimeStage {
  CANDIDATE_ASSEMBLY = 'CANDIDATE_ASSEMBLY',
  DELIVERY_ELIGIBILITY = 'DELIVERY_ELIGIBILITY',
  AUDIENCE_RESOLUTION = 'AUDIENCE_RESOLUTION',
  CHANNEL_RESOLUTION = 'CHANNEL_RESOLUTION',
  PREFERENCE_ENTITLEMENT_RESOLUTION = 'PREFERENCE_ENTITLEMENT_RESOLUTION',
  PRIORITY_URGENCY_DERIVATION = 'PRIORITY_URGENCY_DERIVATION',
  DUPLICATION_COOLDOWN_CHECK = 'DUPLICATION_COOLDOWN_CHECK',
  SUPPRESSION_MERGE_DECISION = 'SUPPRESSION_MERGE_DECISION',
  CHANNEL_PAYLOAD_ASSEMBLY = 'CHANNEL_PAYLOAD_ASSEMBLY',
  DELIVERY_EXECUTION = 'DELIVERY_EXECUTION',
  DELIVERY_EVENT_MATERIALIZATION_INTENT = 'DELIVERY_EVENT_MATERIALIZATION_INTENT',
  FEEDBACK_EXPECTATION_REGISTRATION = 'FEEDBACK_EXPECTATION_REGISTRATION',
}

export const ALL_L14_DELIVERY_RUNTIME_STAGES:
  readonly L14DeliveryRuntimeStage[] =
  Object.values(L14DeliveryRuntimeStage);

/**
 * §14.3.6 — Canonical forward-only stage order. Stage N may only
 * be entered after stage N-1 has been sealed.
 */
export const L14_RUNTIME_STAGE_ORDER:
  readonly L14DeliveryRuntimeStage[] = [
  L14DeliveryRuntimeStage.CANDIDATE_ASSEMBLY,
  L14DeliveryRuntimeStage.DELIVERY_ELIGIBILITY,
  L14DeliveryRuntimeStage.AUDIENCE_RESOLUTION,
  L14DeliveryRuntimeStage.CHANNEL_RESOLUTION,
  L14DeliveryRuntimeStage.PREFERENCE_ENTITLEMENT_RESOLUTION,
  L14DeliveryRuntimeStage.PRIORITY_URGENCY_DERIVATION,
  L14DeliveryRuntimeStage.DUPLICATION_COOLDOWN_CHECK,
  L14DeliveryRuntimeStage.SUPPRESSION_MERGE_DECISION,
  L14DeliveryRuntimeStage.CHANNEL_PAYLOAD_ASSEMBLY,
  L14DeliveryRuntimeStage.DELIVERY_EXECUTION,
  L14DeliveryRuntimeStage.DELIVERY_EVENT_MATERIALIZATION_INTENT,
  L14DeliveryRuntimeStage.FEEDBACK_EXPECTATION_REGISTRATION,
];

export function l14StageIndex(s: L14DeliveryRuntimeStage): number {
  return L14_RUNTIME_STAGE_ORDER.indexOf(s);
}

export interface L14DeliveryRuntimeContext {
  readonly runtime_run_id: string;
  readonly candidate_ref?: string;
  readonly eligibility_result_ref?: string;
  readonly audience_resolution_ref?: string;
  readonly channel_resolution_ref?: string;
  readonly preference_binding_ref?: string;
  readonly priority_profile_ref?: string;
  readonly urgency_profile_ref?: string;
  readonly duplication_result_ref?: string;
  readonly cooldown_result_ref?: string;
  readonly suppression_decision_ref?: string;
  readonly assembled_payload_ref?: string;
  readonly execution_record_ref?: string;
  readonly materialization_intent_ref?: string;
  readonly feedback_expectation_ref?: string;
  readonly current_stage: L14DeliveryRuntimeStage;
  readonly sealed_stages: readonly L14DeliveryRuntimeStage[];
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}
