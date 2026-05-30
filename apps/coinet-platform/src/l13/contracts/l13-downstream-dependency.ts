/**
 * L13.12 — Downstream (L14) Dependency Contract
 *
 * §13.12.14 — L14 may consume Layer 13's durable outputs but may
 * not rebuild, mutate, or reinterpret them.
 */

export enum L13DownstreamConsumerClass {
  L14_DELIVERY = 'L14_DELIVERY',
  L14_FEEDBACK = 'L14_FEEDBACK',
  L14_CALIBRATION = 'L14_CALIBRATION',
}

export enum L13DownstreamConsumableSurface {
  FINAL_AI_OUTPUTS = 'FINAL_AI_OUTPUTS',
  DURABLE_PRODUCT_MODE_PAYLOADS = 'DURABLE_PRODUCT_MODE_PAYLOADS',
  USER_FEEDBACK = 'USER_FEEDBACK',
  QUALITY_METRICS = 'QUALITY_METRICS',
  AUDIT_EVENTS = 'AUDIT_EVENTS',
  ROLLOUT_STATUS = 'ROLLOUT_STATUS',
  FAILURE_RECORDS = 'FAILURE_RECORDS',
}

export enum L13DownstreamProhibitedAction {
  REBUILD_L13_OUTPUT_FROM_RAW = 'REBUILD_L13_OUTPUT_FROM_RAW',
  BYPASS_SAFETY_DECISION = 'BYPASS_SAFETY_DECISION',
  MUTATE_HISTORICAL_ARTIFACT = 'MUTATE_HISTORICAL_ARTIFACT',
  REINTERPRET_BLOCKED_CLAIM = 'REINTERPRET_BLOCKED_CLAIM',
  TREAT_FEEDBACK_AS_TRUTH = 'TREAT_FEEDBACK_AS_TRUTH',
}

export interface L13DownstreamDependencyContract {
  readonly downstream_dependency_contract_id: string;
  readonly consumer_class: L13DownstreamConsumerClass;
  readonly allowed_surfaces: readonly L13DownstreamConsumableSurface[];
  readonly prohibited_actions: readonly L13DownstreamProhibitedAction[];
  readonly approved: boolean;
  readonly policy_version: string;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
}
