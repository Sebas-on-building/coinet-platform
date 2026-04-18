/**
 * L6.2 — Event Contract
 *
 * §6.2.6.3 — Event contract minimum surface.
 * An event = governed CHANGE descriptor. Must declare trigger, confirmation,
 * resolution, expiry, severity, suppression, and evidence contracts.
 */

import { L6PrimitiveClass } from './primitive-class';
import { L6EventKind, EventLifecycleShape } from './event-kind';
import { CommonPrimitiveContract } from './primitive-contract';

export enum L6EventLifecycleState {
  CANDIDATE = 'CANDIDATE',
  CONFIRMED = 'CONFIRMED',
  ACTIVE = 'ACTIVE',
  COOLING = 'COOLING',
  RESOLVED = 'RESOLVED',
  EXPIRED = 'EXPIRED',
  SUPPRESSED = 'SUPPRESSED',
  QUARANTINED = 'QUARANTINED',
}

export const ALL_EVENT_LIFECYCLE_STATES: readonly L6EventLifecycleState[] = Object.values(L6EventLifecycleState);

export enum L6EventSeverityLevel {
  INFO = 'INFO',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface TriggerSpec {
  readonly triggerId: string;
  readonly kind: 'THRESHOLD' | 'CHANGE_POINT' | 'CLUSTER_MEMBERSHIP' | 'SCHEDULE' | 'RISK_DELTA' | 'CROSS_SOURCE';
  readonly parameters: Record<string, unknown>;
  readonly direction?: 'UP' | 'DOWN' | 'EITHER' | 'NONE';
}

export interface ConfirmationSpec {
  readonly confirmationId: string;
  readonly method: 'PERSISTENCE' | 'CORROBORATION' | 'CROSS_SOURCE' | 'MULTI_WINDOW' | 'NONE';
  readonly minDurationSeconds: number;
  readonly minCorroboratingInputs: number;
}

export interface ResolutionSpec {
  readonly method: 'THRESHOLD_REVERSAL' | 'TIME_DECAY' | 'EXPLICIT_RESOLVER' | 'SCHEDULED_END' | 'LIFECYCLE_TRANSITION';
  readonly parameters: Record<string, unknown>;
}

export interface ExpirySpec {
  readonly maxActiveSeconds: number;
  readonly forceExpireOnStaleInputs: boolean;
}

export interface LifecyclePolicySpec {
  readonly shape: EventLifecycleShape;
  readonly allowedStates: readonly L6EventLifecycleState[];
  readonly allowedTransitions: readonly [L6EventLifecycleState, L6EventLifecycleState][];
}

export interface SeveritySpec {
  readonly method: 'FIXED' | 'DERIVED_FROM_MAGNITUDE' | 'DERIVED_FROM_RISK_DELTA' | 'RULE_BASED';
  readonly allowedLevels: readonly L6EventSeverityLevel[];
  readonly carriesNumericMagnitude: boolean;
}

export interface DedupeSpec {
  readonly dedupeKeyFields: readonly string[];
  readonly dedupeWindowSeconds: number;
  readonly collapseBehavior: 'MERGE_INSTANCE' | 'REJECT_DUPLICATE' | 'QUARANTINE_ON_CONFLICT';
}

export interface SuppressionSpec {
  readonly suppresses: boolean;
  readonly suppressionRuleIds: readonly string[];
  readonly rationale: string;
}

export interface CooldownPolicySpec {
  readonly cooldownSeconds: number;
  readonly resetOnResolution: boolean;
}

export interface EvidenceRequirementSpec {
  readonly minEvidenceSources: number;
  readonly requiredInputReferences: readonly string[];
  readonly requiresTimestampedSnapshots: boolean;
}

export interface EventContract extends CommonPrimitiveContract {
  readonly primitive_class: L6PrimitiveClass.EVENT;
  readonly event_kind: L6EventKind;
  readonly trigger_spec: TriggerSpec;
  readonly confirmation_spec: ConfirmationSpec;
  readonly resolution_spec: ResolutionSpec;
  readonly expiry_spec: ExpirySpec;
  readonly lifecycle_policy: LifecyclePolicySpec;
  readonly severity_spec: SeveritySpec;
  readonly dedupe_spec: DedupeSpec;
  readonly suppression_spec: SuppressionSpec;
  readonly cooldown_policy: CooldownPolicySpec;
  readonly evidence_requirements: EvidenceRequirementSpec;
}
