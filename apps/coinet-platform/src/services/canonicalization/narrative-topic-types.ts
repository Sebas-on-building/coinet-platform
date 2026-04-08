/**
 * L3.1 — Canonical Entity Ontology: Narrative Topic Types
 *
 * Narrative topics are the most ambiguity-prone canonical object class.
 * Provider trend labels, keywords, and hashtags must never silently
 * become canonical topics. Overlap, decay, and contested boundaries
 * are first-class ontology states.
 */

import type { CanonicalObjectBase, ConfidenceBand } from './canonical-entity-types';

// ═══════════════════════════════════════════════════════════════════════════════
// TOPIC CLASS TAXONOMY
// ═══════════════════════════════════════════════════════════════════════════════

export type TopicClass =
  | 'MACRO'
  | 'SECTOR'
  | 'TOKEN_SPECIFIC'
  | 'EVENT_SPECIFIC'
  | 'MEMETIC'
  | 'REGULATORY'
  | 'TECHNICAL'
  | 'UNKNOWN';

export type TopicStatus =
  | 'ACTIVE'
  | 'DECAYING'
  | 'ARCHIVED'
  | 'CONTESTED';

// ═══════════════════════════════════════════════════════════════════════════════
// TOPIC RELATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export type TopicRelationType =
  | 'PARENT'
  | 'CHILD'
  | 'OVERLAP'
  | 'COMPETES_WITH'
  | 'SUBTHEME';

export type TopicRelation = {
  relatedTopicId: string;
  relationType: TopicRelationType;
  confidence?: ConfidenceBand;
  sourceRefs: string[];
};

// ═══════════════════════════════════════════════════════════════════════════════
// AMBIGUITY AND OVERLAP MARKERS
// ═══════════════════════════════════════════════════════════════════════════════

export type AmbiguityMarkerKind =
  | 'BOUNDARY_UNCLEAR'
  | 'MULTIPLE_INTERPRETATIONS'
  | 'TEMPORAL_AMBIGUITY'
  | 'SCOPE_CONTESTED'
  | 'PHRASE_COLLISION';

export type AmbiguityMarker = {
  kind: AmbiguityMarkerKind;
  description: string;
  relatedTopicIds: string[];
  sourceRefs: string[];
};

export type OverlapMarkerKind =
  | 'SEMANTIC_OVERLAP'
  | 'TEMPORAL_OVERLAP'
  | 'AUDIENCE_OVERLAP'
  | 'ASSET_OVERLAP';

export type OverlapMarker = {
  kind: OverlapMarkerKind;
  overlappingTopicId: string;
  overlapDegree: 'HIGH' | 'MEDIUM' | 'LOW';
  sourceRefs: string[];
};

// ═══════════════════════════════════════════════════════════════════════════════
// NARRATIVE TOPIC OBJECT
// ═══════════════════════════════════════════════════════════════════════════════

export type NarrativeTopicObject = CanonicalObjectBase & {
  objectType: 'NARRATIVE_TOPIC';
  topicId: string;
  canonicalTitle: string;
  aliasPhraseSet: string[];
  topicClass: TopicClass;
  relations: TopicRelation[];
  status: TopicStatus;
  ambiguityMarkers: AmbiguityMarker[];
  overlapMarkers: OverlapMarker[];
  unresolvedFlags: string[];
};
