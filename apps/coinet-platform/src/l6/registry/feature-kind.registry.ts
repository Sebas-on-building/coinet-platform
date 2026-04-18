/**
 * L6.2 — Feature Kind Registry
 *
 * §6.2.5.4 / §6.2.5.6 — Every legal feature kind is declared here, with its
 * required contract fields, forbidden contract fields, allowed value shapes,
 * minimum evidence expectations, and downstream compatibility notes.
 */

import {
  L6FeatureKind,
  FeatureKindDescriptor,
  FeatureValueShape,
} from '../contracts/feature-kind';

const DESCRIPTORS: Record<L6FeatureKind, FeatureKindDescriptor> = {
  [L6FeatureKind.SCALAR_NUMERIC]: {
    kind: L6FeatureKind.SCALAR_NUMERIC,
    semanticDescription:
      'A single numeric state measurement (raw or pre-normalized) describing a level, rate, or magnitude.',
    requiredContractFields: ['unit', 'value_kind', 'directionality', 'null_policy', 'freshness_budget'],
    forbiddenContractFields: ['trigger_spec', 'confirmation_spec', 'lifecycle_policy', 'resolution_spec'],
    allowedValueShapes: ['NUMBER'],
    minEvidenceExpectation: 'INPUT_REFERENCES',
    downstreamCompatibilityNotes: 'Safe for composites, normalization, and baseline comparison.',
  },
  [L6FeatureKind.SCALAR_BOOLEAN]: {
    kind: L6FeatureKind.SCALAR_BOOLEAN,
    semanticDescription: 'A boolean state flag describing whether a governed predicate is currently true.',
    requiredContractFields: ['value_kind', 'null_policy', 'freshness_budget'],
    forbiddenContractFields: ['trigger_spec', 'lifecycle_policy', 'severity_spec'],
    allowedValueShapes: ['BOOLEAN'],
    minEvidenceExpectation: 'INPUT_REFERENCES',
    downstreamCompatibilityNotes: 'Never emit as an event; boolean is a state, not a change.',
  },
  [L6FeatureKind.SCALAR_ORDINAL]: {
    kind: L6FeatureKind.SCALAR_ORDINAL,
    semanticDescription: 'An ordinal state category with a governed, versioned ordering.',
    requiredContractFields: ['value_kind', 'null_policy', 'freshness_budget'],
    forbiddenContractFields: ['trigger_spec', 'lifecycle_policy'],
    allowedValueShapes: ['ORDINAL'],
    minEvidenceExpectation: 'INPUT_REFERENCES',
    downstreamCompatibilityNotes: 'Ordinal thresholds are meaningful; cardinal arithmetic is not.',
  },
  [L6FeatureKind.VECTOR_MULTI_HORIZON]: {
    kind: L6FeatureKind.VECTOR_MULTI_HORIZON,
    semanticDescription:
      'A state descriptor across an ordered horizon set; each element is a scalar state at that horizon.',
    requiredContractFields: ['unit', 'value_kind', 'vector_aggregation', 'null_policy', 'freshness_budget'],
    forbiddenContractFields: ['trigger_spec', 'lifecycle_policy'],
    allowedValueShapes: ['NUMBER_VECTOR'],
    minEvidenceExpectation: 'INPUT_REFERENCES_AND_BASELINE',
    downstreamCompatibilityNotes: 'Horizons must be ordered and missing-horizon policy declared explicitly.',
  },
  [L6FeatureKind.PERCENTILE_NORMALIZED]: {
    kind: L6FeatureKind.PERCENTILE_NORMALIZED,
    semanticDescription: 'A percentile-normalized state value against a declared baseline distribution.',
    requiredContractFields: ['unit', 'value_kind', 'baseline_spec', 'normalization_spec', 'null_policy'],
    forbiddenContractFields: ['trigger_spec', 'lifecycle_policy'],
    allowedValueShapes: ['NUMBER'],
    minEvidenceExpectation: 'INPUT_REFERENCES_AND_BASELINE',
    downstreamCompatibilityNotes: 'Baseline must be versioned; percentile semantics must be monotonic.',
  },
  [L6FeatureKind.Z_SCORE_NORMALIZED]: {
    kind: L6FeatureKind.Z_SCORE_NORMALIZED,
    semanticDescription: 'A z-score normalized state value against a declared baseline window.',
    requiredContractFields: ['unit', 'value_kind', 'baseline_spec', 'normalization_spec', 'null_policy'],
    forbiddenContractFields: ['trigger_spec', 'lifecycle_policy'],
    allowedValueShapes: ['NUMBER'],
    minEvidenceExpectation: 'INPUT_REFERENCES_AND_BASELINE',
    downstreamCompatibilityNotes: 'Requires baseline mean/variance specification and version tag.',
  },
  [L6FeatureKind.RATIO_OR_SPREAD]: {
    kind: L6FeatureKind.RATIO_OR_SPREAD,
    semanticDescription: 'A ratio or spread between two governed state inputs.',
    requiredContractFields: ['unit', 'value_kind', 'null_policy', 'directionality'],
    forbiddenContractFields: ['trigger_spec', 'lifecycle_policy'],
    allowedValueShapes: ['NUMBER'],
    minEvidenceExpectation: 'INPUT_REFERENCES',
    downstreamCompatibilityNotes: 'Denominator-zero behavior must be declared in null_policy rationale.',
  },
  [L6FeatureKind.DETERMINISTIC_COMPOSITE]: {
    kind: L6FeatureKind.DETERMINISTIC_COMPOSITE,
    semanticDescription:
      'A deterministic composite of registered constituent primitives with an explicit, versioned formula.',
    requiredContractFields: ['value_kind', 'composite_spec', 'null_policy'],
    forbiddenContractFields: ['trigger_spec', 'lifecycle_policy'],
    allowedValueShapes: ['NUMBER', 'COMPOSITE'],
    minEvidenceExpectation: 'COMPOSITE_CONSTITUENTS',
    downstreamCompatibilityNotes:
      'Formula must be deterministic and versioned; composites may not embed judgment.',
  },
  [L6FeatureKind.DIVERGENCE_FEATURE]: {
    kind: L6FeatureKind.DIVERGENCE_FEATURE,
    semanticDescription:
      'A two-input state divergence feature preserving source separation as a first-class contradiction surface.',
    requiredContractFields: ['value_kind', 'null_policy', 'contradiction_support'],
    forbiddenContractFields: ['trigger_spec', 'lifecycle_policy'],
    allowedValueShapes: ['DIVERGENCE_PAIR', 'NUMBER'],
    minEvidenceExpectation: 'INPUT_REFERENCES',
    downstreamCompatibilityNotes:
      'Contradiction support must be DIVERGENCE_FEATURE; must not collapse sources.',
  },
  [L6FeatureKind.STATE_FLAG]: {
    kind: L6FeatureKind.STATE_FLAG,
    semanticDescription: 'A governed boolean-or-ordinal state flag distinct from event lifecycle.',
    requiredContractFields: ['value_kind', 'null_policy', 'freshness_budget'],
    forbiddenContractFields: ['trigger_spec', 'confirmation_spec', 'lifecycle_policy'],
    allowedValueShapes: ['BOOLEAN', 'ORDINAL'],
    minEvidenceExpectation: 'INPUT_REFERENCES',
    downstreamCompatibilityNotes: 'State flags may not carry onset/resolution timestamps; those are event fields.',
  },
};

export function getFeatureKindDescriptor(kind: L6FeatureKind): FeatureKindDescriptor | null {
  return DESCRIPTORS[kind] ?? null;
}

export function isRegisteredFeatureKind(kind: string): kind is L6FeatureKind {
  return kind in DESCRIPTORS;
}

export function allFeatureKindDescriptors(): readonly FeatureKindDescriptor[] {
  return Object.values(DESCRIPTORS);
}

export function featureKindAllowsValueShape(
  kind: L6FeatureKind,
  shape: FeatureValueShape,
): boolean {
  const desc = DESCRIPTORS[kind];
  if (!desc) return false;
  return desc.allowedValueShapes.includes(shape);
}

export function featureKindRequiredFields(kind: L6FeatureKind): readonly string[] {
  return DESCRIPTORS[kind]?.requiredContractFields ?? [];
}

export function featureKindForbiddenFields(kind: L6FeatureKind): readonly string[] {
  return DESCRIPTORS[kind]?.forbiddenContractFields ?? [];
}
