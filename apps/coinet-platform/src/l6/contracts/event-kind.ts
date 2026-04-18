/**
 * L6.2 — Event Kind Contract
 *
 * §6.2.5.3 — Legal event kinds.
 * §6.2.5.6 — Kind-specific contract obligations.
 *
 * An event is a CHANGE descriptor. Every event must declare exactly one kind.
 * Each kind imposes structural requirements on trigger, confirmation, and lifecycle.
 */

export enum L6EventKind {
  THRESHOLD_CROSS = 'THRESHOLD_CROSS',
  CHANGE_POINT = 'CHANGE_POINT',
  CLUSTER = 'CLUSTER',
  SCHEDULED = 'SCHEDULED',
  LIFECYCLE = 'LIFECYCLE',
  RISK_DELTA = 'RISK_DELTA',
  DIVERGENCE = 'DIVERGENCE',
  CROSS_SOURCE_ANOMALY = 'CROSS_SOURCE_ANOMALY',
}

export const ALL_EVENT_KINDS: readonly L6EventKind[] = Object.values(L6EventKind);

export type EventLifecycleShape =
  | 'SIMPLE_ONSET_RESOLUTION'
  | 'CANDIDATE_CONFIRMATION_RESOLUTION'
  | 'PERSISTENT_STATEFUL'
  | 'POINT_IN_TIME';

export interface EventKindDescriptor {
  readonly kind: L6EventKind;
  readonly semanticDescription: string;
  readonly requiredContractFields: readonly string[];
  readonly forbiddenContractFields: readonly string[];
  readonly allowedLifecycleShapes: readonly EventLifecycleShape[];
  readonly minEvidenceExpectation:
    | 'TRIGGER_ONLY'
    | 'TRIGGER_AND_CONFIRMATION'
    | 'TRIGGER_CONFIRMATION_AND_CONTEXT'
    | 'SCHEDULE_ANCHOR';
  readonly downstreamCompatibilityNotes: string;
}
