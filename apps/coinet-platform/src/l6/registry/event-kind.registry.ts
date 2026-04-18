/**
 * L6.2 — Event Kind Registry
 *
 * §6.2.5.4 / §6.2.5.6 — Every legal event kind is declared here, with its
 * required contract fields, forbidden contract fields, allowed lifecycle
 * shapes, minimum evidence expectations, and downstream compatibility notes.
 */

import {
  L6EventKind,
  EventKindDescriptor,
  EventLifecycleShape,
} from '../contracts/event-kind';

const DESCRIPTORS: Record<L6EventKind, EventKindDescriptor> = {
  [L6EventKind.THRESHOLD_CROSS]: {
    kind: L6EventKind.THRESHOLD_CROSS,
    semanticDescription:
      'A change onset triggered by a governed input crossing a declared threshold with a declared direction.',
    requiredContractFields: ['trigger_spec', 'confirmation_spec', 'resolution_spec', 'severity_spec', 'lifecycle_policy', 'evidence_requirements'],
    forbiddenContractFields: ['baseline_spec', 'normalization_spec', 'composite_spec', 'vector_aggregation'],
    allowedLifecycleShapes: ['CANDIDATE_CONFIRMATION_RESOLUTION', 'SIMPLE_ONSET_RESOLUTION'],
    minEvidenceExpectation: 'TRIGGER_AND_CONFIRMATION',
    downstreamCompatibilityNotes:
      'Threshold direction and deactivation rule must be declared. Symmetric cross events must be modeled as two kinds.',
  },
  [L6EventKind.CHANGE_POINT]: {
    kind: L6EventKind.CHANGE_POINT,
    semanticDescription:
      'A governed change-point detection event indicating a structural shift in a monitored input.',
    requiredContractFields: ['trigger_spec', 'confirmation_spec', 'resolution_spec', 'lifecycle_policy', 'evidence_requirements'],
    forbiddenContractFields: ['baseline_spec', 'composite_spec', 'vector_aggregation'],
    allowedLifecycleShapes: ['CANDIDATE_CONFIRMATION_RESOLUTION', 'POINT_IN_TIME'],
    minEvidenceExpectation: 'TRIGGER_CONFIRMATION_AND_CONTEXT',
    downstreamCompatibilityNotes: 'Change-point detector must be versioned and replay-deterministic.',
  },
  [L6EventKind.CLUSTER]: {
    kind: L6EventKind.CLUSTER,
    semanticDescription:
      'A cluster event where multiple governed observations group coherently under a membership rule.',
    requiredContractFields: ['trigger_spec', 'confirmation_spec', 'resolution_spec', 'lifecycle_policy', 'evidence_requirements'],
    forbiddenContractFields: ['baseline_spec', 'normalization_spec'],
    allowedLifecycleShapes: ['PERSISTENT_STATEFUL', 'CANDIDATE_CONFIRMATION_RESOLUTION'],
    minEvidenceExpectation: 'TRIGGER_CONFIRMATION_AND_CONTEXT',
    downstreamCompatibilityNotes:
      'Cluster coherence threshold and persistence rule must be declared in trigger_spec parameters.',
  },
  [L6EventKind.SCHEDULED]: {
    kind: L6EventKind.SCHEDULED,
    semanticDescription:
      'A scheduled event anchored to a governed calendar or protocol schedule surface.',
    requiredContractFields: ['trigger_spec', 'resolution_spec', 'expiry_spec', 'lifecycle_policy'],
    forbiddenContractFields: ['baseline_spec', 'normalization_spec', 'composite_spec'],
    allowedLifecycleShapes: ['POINT_IN_TIME', 'SIMPLE_ONSET_RESOLUTION'],
    minEvidenceExpectation: 'SCHEDULE_ANCHOR',
    downstreamCompatibilityNotes: 'Schedule anchor must be traceable to a governed L3/L4 surface.',
  },
  [L6EventKind.LIFECYCLE]: {
    kind: L6EventKind.LIFECYCLE,
    semanticDescription:
      'A governed lifecycle transition (e.g., listing, delisting, governance-recognized status change).',
    requiredContractFields: ['trigger_spec', 'confirmation_spec', 'lifecycle_policy', 'evidence_requirements'],
    forbiddenContractFields: ['baseline_spec', 'normalization_spec', 'composite_spec'],
    allowedLifecycleShapes: ['PERSISTENT_STATEFUL', 'SIMPLE_ONSET_RESOLUTION'],
    minEvidenceExpectation: 'TRIGGER_AND_CONFIRMATION',
    downstreamCompatibilityNotes: 'Lifecycle transitions must align with governed L3/L4 authority.',
  },
  [L6EventKind.RISK_DELTA]: {
    kind: L6EventKind.RISK_DELTA,
    semanticDescription:
      'A governed risk-delta event where a monitored risk surface changes materially against a governed baseline.',
    requiredContractFields: ['trigger_spec', 'confirmation_spec', 'resolution_spec', 'severity_spec', 'lifecycle_policy', 'evidence_requirements'],
    forbiddenContractFields: ['composite_spec', 'vector_aggregation'],
    allowedLifecycleShapes: ['CANDIDATE_CONFIRMATION_RESOLUTION', 'PERSISTENT_STATEFUL'],
    minEvidenceExpectation: 'TRIGGER_CONFIRMATION_AND_CONTEXT',
    downstreamCompatibilityNotes:
      'Severity must be derived from governed magnitude; narrative severity is forbidden.',
  },
  [L6EventKind.DIVERGENCE]: {
    kind: L6EventKind.DIVERGENCE,
    semanticDescription:
      'A governed divergence event between two governed surfaces that preserves source separation.',
    requiredContractFields: ['trigger_spec', 'confirmation_spec', 'resolution_spec', 'lifecycle_policy', 'evidence_requirements'],
    forbiddenContractFields: ['baseline_spec', 'composite_spec'],
    allowedLifecycleShapes: ['CANDIDATE_CONFIRMATION_RESOLUTION', 'PERSISTENT_STATEFUL'],
    minEvidenceExpectation: 'TRIGGER_CONFIRMATION_AND_CONTEXT',
    downstreamCompatibilityNotes: 'Must preserve contradiction; may not collapse to single-source truth.',
  },
  [L6EventKind.CROSS_SOURCE_ANOMALY]: {
    kind: L6EventKind.CROSS_SOURCE_ANOMALY,
    semanticDescription:
      'A cross-source anomaly event where multiple governed sources disagree materially on the same underlying state.',
    requiredContractFields: ['trigger_spec', 'confirmation_spec', 'resolution_spec', 'lifecycle_policy', 'evidence_requirements'],
    forbiddenContractFields: ['composite_spec', 'vector_aggregation'],
    allowedLifecycleShapes: ['CANDIDATE_CONFIRMATION_RESOLUTION', 'PERSISTENT_STATEFUL'],
    minEvidenceExpectation: 'TRIGGER_CONFIRMATION_AND_CONTEXT',
    downstreamCompatibilityNotes:
      'Anomaly must carry evidence for each disagreeing source; no silent source selection.',
  },
};

export function getEventKindDescriptor(kind: L6EventKind): EventKindDescriptor | null {
  return DESCRIPTORS[kind] ?? null;
}

export function isRegisteredEventKind(kind: string): kind is L6EventKind {
  return kind in DESCRIPTORS;
}

export function allEventKindDescriptors(): readonly EventKindDescriptor[] {
  return Object.values(DESCRIPTORS);
}

export function eventKindAllowsLifecycleShape(
  kind: L6EventKind,
  shape: EventLifecycleShape,
): boolean {
  const desc = DESCRIPTORS[kind];
  if (!desc) return false;
  return desc.allowedLifecycleShapes.includes(shape);
}

export function eventKindRequiredFields(kind: L6EventKind): readonly string[] {
  return DESCRIPTORS[kind]?.requiredContractFields ?? [];
}

export function eventKindForbiddenFields(kind: L6EventKind): readonly string[] {
  return DESCRIPTORS[kind]?.forbiddenContractFields ?? [];
}
