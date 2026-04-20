/**
 * L9.2 — Sequence Output Classes and Object Violation Codes
 *
 * §9.2.10.4 — Object-level audit codes for L9.2. Disjoint from L9.1's
 * constitutional violation codes so audit records remain unambiguous
 * about which tier rejected a sequence artifact.
 *
 * The seven L9 first-class output classes align with L9.1's
 * `L9OutputSurfaceClass` (§9.1.5.4). L9.2 re-declares them as
 * `L9SequenceOutputClass` so the object-model layer is self-contained
 * and registration is unambiguous.
 */

/**
 * §9.2.10.2 / §9.1.5.4 — Seven first-class L9 outputs.
 *
 * The full set must match L9.1's L9OutputSurfaceClass enum value-for-value
 * (checked by invariant INV-9.2-B).
 */
export enum L9SequenceOutputClass {
  SEQUENCE_ASSESSMENT = 'SEQUENCE_ASSESSMENT',
  SEQUENCE_CHAIN = 'SEQUENCE_CHAIN',
  LEAD_LAG_PROFILE = 'LEAD_LAG_PROFILE',
  PHASE_STATE = 'PHASE_STATE',
  DECAY_PROFILE = 'DECAY_PROFILE',
  SEQUENCE_RESTRICTION_PROFILE = 'SEQUENCE_RESTRICTION_PROFILE',
  SEQUENCE_EVIDENCE_READ_SURFACE = 'SEQUENCE_EVIDENCE_READ_SURFACE',
}

export const ALL_L9_SEQUENCE_OUTPUT_CLASSES:
  readonly L9SequenceOutputClass[] =
    Object.values(L9SequenceOutputClass);

/**
 * §9.2.10.4 — Object-level violation codes. Prefixed `L9O_` so the L9.1
 * constitutional log and L9.2 object log remain easy to distinguish.
 */
export enum L9SequenceObjectViolationCode {
  // Subject / template
  SUBJECT_UNREGISTERED_FAMILY = 'L9O_SUBJECT_UNREGISTERED_FAMILY',
  SUBJECT_MISSING_IDENTITY = 'L9O_SUBJECT_MISSING_IDENTITY',
  SUBJECT_MISSING_SCOPE = 'L9O_SUBJECT_MISSING_SCOPE',
  SUBJECT_SCOPE_ILLEGAL_FOR_FAMILY = 'L9O_SUBJECT_SCOPE_ILLEGAL_FOR_FAMILY',
  SUBJECT_MISSING_TIME_ANCHOR = 'L9O_SUBJECT_MISSING_TIME_ANCHOR',
  SUBJECT_MISSING_WINDOW = 'L9O_SUBJECT_MISSING_WINDOW',
  SUBJECT_MISSING_LEAD_LAG_WINDOW = 'L9O_SUBJECT_MISSING_LEAD_LAG_WINDOW',
  SUBJECT_MISSING_TEMPLATE = 'L9O_SUBJECT_MISSING_TEMPLATE',
  SUBJECT_MISSING_INPUT_REFS = 'L9O_SUBJECT_MISSING_INPUT_REFS',
  SUBJECT_MISSING_VALIDATION_REFS = 'L9O_SUBJECT_MISSING_VALIDATION_REFS',
  SUBJECT_MISSING_REGIME_REFS = 'L9O_SUBJECT_MISSING_REGIME_REFS',
  SUBJECT_MISSING_LINEAGE = 'L9O_SUBJECT_MISSING_LINEAGE',

  // Family / state legality
  FAMILY_UNREGISTERED = 'L9O_FAMILY_UNREGISTERED',
  STATE_UNREGISTERED = 'L9O_STATE_UNREGISTERED',
  STATE_NOT_IN_FAMILY = 'L9O_STATE_NOT_IN_FAMILY',
  STATE_SCOPE_ILLEGAL = 'L9O_STATE_SCOPE_ILLEGAL',

  // Assessment identity / completeness
  ASSESSMENT_MISSING_ID = 'L9O_ASSESSMENT_MISSING_ID',
  ASSESSMENT_MISSING_SUBJECT = 'L9O_ASSESSMENT_MISSING_SUBJECT',
  ASSESSMENT_MISSING_PRIMARY_STATE = 'L9O_ASSESSMENT_MISSING_PRIMARY_STATE',
  ASSESSMENT_SECONDARY_EQUALS_PRIMARY = 'L9O_ASSESSMENT_SECONDARY_EQUALS_PRIMARY',
  ASSESSMENT_SECONDARY_WRONG_FAMILY = 'L9O_ASSESSMENT_SECONDARY_WRONG_FAMILY',
  ASSESSMENT_MISSING_ORDERED_REFS = 'L9O_ASSESSMENT_MISSING_ORDERED_REFS',
  ASSESSMENT_MISSING_CHAIN = 'L9O_ASSESSMENT_MISSING_CHAIN',
  ASSESSMENT_MISSING_LEAD_LAG = 'L9O_ASSESSMENT_MISSING_LEAD_LAG',
  ASSESSMENT_MISSING_PHASE = 'L9O_ASSESSMENT_MISSING_PHASE',
  ASSESSMENT_MISSING_DECAY = 'L9O_ASSESSMENT_MISSING_DECAY',
  ASSESSMENT_MISSING_POST_EVENT_WINDOW = 'L9O_ASSESSMENT_MISSING_POST_EVENT_WINDOW',
  ASSESSMENT_MISSING_VALIDATION_REFS = 'L9O_ASSESSMENT_MISSING_VALIDATION_REFS',
  ASSESSMENT_MISSING_REGIME_REFS = 'L9O_ASSESSMENT_MISSING_REGIME_REFS',
  ASSESSMENT_MISSING_RESTRICTION_PROFILE = 'L9O_ASSESSMENT_MISSING_RESTRICTION_PROFILE',
  ASSESSMENT_MISSING_EVIDENCE_PACK = 'L9O_ASSESSMENT_MISSING_EVIDENCE_PACK',
  ASSESSMENT_MISSING_INPUT_SNAPSHOT = 'L9O_ASSESSMENT_MISSING_INPUT_SNAPSHOT',
  ASSESSMENT_MISSING_COMPUTE_RUN = 'L9O_ASSESSMENT_MISSING_COMPUTE_RUN',
  ASSESSMENT_MISSING_REPLAY_HASH = 'L9O_ASSESSMENT_MISSING_REPLAY_HASH',
  ASSESSMENT_MISSING_LINEAGE = 'L9O_ASSESSMENT_MISSING_LINEAGE',
  ASSESSMENT_MISSING_POLICY_VERSION = 'L9O_ASSESSMENT_MISSING_POLICY_VERSION',
  ASSESSMENT_MISSING_CAUSAL_RESTRAINT = 'L9O_ASSESSMENT_MISSING_CAUSAL_RESTRAINT',

  // Scores
  ASSESSMENT_CONFIDENCE_OUT_OF_RANGE = 'L9O_ASSESSMENT_CONFIDENCE_OOR',
  ASSESSMENT_CONFIDENCE_BAND_INCONSISTENT = 'L9O_ASSESSMENT_CONFIDENCE_BAND_INCONSISTENT',
  ASSESSMENT_DECAY_SCORE_OUT_OF_RANGE = 'L9O_ASSESSMENT_DECAY_SCORE_OOR',
  ASSESSMENT_DECAY_CLASS_INCONSISTENT = 'L9O_ASSESSMENT_DECAY_CLASS_INCONSISTENT',
  ASSESSMENT_AMBIGUITY_SCORE_OUT_OF_RANGE = 'L9O_ASSESSMENT_AMBIGUITY_OOR',
  ASSESSMENT_COMPLETENESS_SCORE_OUT_OF_RANGE = 'L9O_ASSESSMENT_COMPLETENESS_OOR',
  ASSESSMENT_STALENESS_SCORE_OUT_OF_RANGE = 'L9O_ASSESSMENT_STALENESS_OOR',
  ASSESSMENT_DEGRADATION_SCORE_OUT_OF_RANGE = 'L9O_ASSESSMENT_DEGRADATION_OOR',

  // Coexistence law
  COEXISTENCE_ILLEGAL_COLLISION = 'L9O_COEXISTENCE_ILLEGAL_COLLISION',
  COEXISTENCE_FAKE_CLEAN_SINGLE = 'L9O_COEXISTENCE_FAKE_CLEAN_SINGLE',
  COEXISTENCE_MISSING_TRANSITION = 'L9O_COEXISTENCE_MISSING_TRANSITION',
  COEXISTENCE_MISSING_AMBIGUITY = 'L9O_COEXISTENCE_MISSING_AMBIGUITY',
  COEXISTENCE_CROSS_FAMILY_ILLEGAL = 'L9O_COEXISTENCE_CROSS_FAMILY_ILLEGAL',
  COEXISTENCE_CROSS_FAMILY_DUPLICATE = 'L9O_COEXISTENCE_CROSS_FAMILY_DUPLICATE',
  COEXISTENCE_STATE_FORBIDS_CLEAN_SINGLE = 'L9O_COEXISTENCE_STATE_FORBIDS_CLEAN_SINGLE',
  COEXISTENCE_MISSING_POST_EVENT_ANCHOR = 'L9O_COEXISTENCE_MISSING_POST_EVENT_ANCHOR',

  // Chain / ordering integrity
  CHAIN_AMBIGUITY_LAUNDERED = 'L9O_CHAIN_AMBIGUITY_LAUNDERED',
  CHAIN_CAUSAL_OVERCLAIM = 'L9O_CHAIN_CAUSAL_OVERCLAIM',
  CHAIN_DECAY_OMITTED = 'L9O_CHAIN_DECAY_OMITTED',
  CHAIN_MISSING_ORDER = 'L9O_CHAIN_MISSING_ORDER',

  // Output object legality
  OUTPUT_UNREGISTERED_CLASS = 'L9O_OUTPUT_UNREGISTERED_CLASS',
  OUTPUT_JUDGMENT_LEAK = 'L9O_OUTPUT_JUDGMENT_LEAK',
  OUTPUT_SCENARIO_LEAK = 'L9O_OUTPUT_SCENARIO_LEAK',
  OUTPUT_SCORE_LEAK = 'L9O_OUTPUT_SCORE_LEAK',
  OUTPUT_RECOMMENDATION_LEAK = 'L9O_OUTPUT_RECOMMENDATION_LEAK',
  OUTPUT_HYPOTHESIS_LEAK = 'L9O_OUTPUT_HYPOTHESIS_LEAK',
  OUTPUT_ACTION_BIAS_LEAK = 'L9O_OUTPUT_ACTION_BIAS_LEAK',
  OUTPUT_MISSING_EVIDENCE = 'L9O_OUTPUT_MISSING_EVIDENCE',
  OUTPUT_MISSING_LINEAGE = 'L9O_OUTPUT_MISSING_LINEAGE',
  OUTPUT_MISSING_RESTRICTION = 'L9O_OUTPUT_MISSING_RESTRICTION',
}

export const ALL_L9_SEQUENCE_OBJECT_VIOLATION_CODES:
  readonly L9SequenceObjectViolationCode[] =
    Object.values(L9SequenceObjectViolationCode);

export interface L9SequenceOutputClassDescriptor {
  readonly outputClass: L9SequenceOutputClass;
  readonly description: string;
  /**
   * Per §9.2.4.10 and L9.1 output surfaces, every first-class L9 output
   * must carry evidence, lineage, and replay identity.
   */
  readonly requiresEvidence: boolean;
  readonly requiresLineage: boolean;
  readonly requiresReplayHash: boolean;
  /**
   * Per §9.2.4.11 — the SequenceRestrictionProfile is itself an output,
   * so not every output has to reference one. The assessment class must,
   * though.
   */
  readonly requiresRestrictionProfile: boolean;
}

export const L9_SEQUENCE_OUTPUT_CLASS_DESCRIPTORS:
  readonly L9SequenceOutputClassDescriptor[] = [
  {
    outputClass: L9SequenceOutputClass.SEQUENCE_ASSESSMENT,
    description: 'Top-level governed sequence verdict — rolls up all sub-objects.',
    requiresEvidence: true,
    requiresLineage: true,
    requiresReplayHash: true,
    requiresRestrictionProfile: true,
  },
  {
    outputClass: L9SequenceOutputClass.SEQUENCE_CHAIN,
    description: 'Ordered signal chain with explicit ambiguity and causal-restraint posture.',
    requiresEvidence: true,
    requiresLineage: true,
    requiresReplayHash: true,
    requiresRestrictionProfile: false,
  },
  {
    outputClass: L9SequenceOutputClass.LEAD_LAG_PROFILE,
    description: 'Lead-lag relation bundle for a subject.',
    requiresEvidence: true,
    requiresLineage: true,
    requiresReplayHash: true,
    requiresRestrictionProfile: false,
  },
  {
    outputClass: L9SequenceOutputClass.PHASE_STATE,
    description: 'Governed phase-progression state for a subject.',
    requiresEvidence: true,
    requiresLineage: true,
    requiresReplayHash: true,
    requiresRestrictionProfile: false,
  },
  {
    outputClass: L9SequenceOutputClass.DECAY_PROFILE,
    description: 'Governed decay state of sequence signals over time.',
    requiresEvidence: true,
    requiresLineage: true,
    requiresReplayHash: true,
    requiresRestrictionProfile: false,
  },
  {
    outputClass: L9SequenceOutputClass.SEQUENCE_RESTRICTION_PROFILE,
    description: 'Downstream reliance rights for a sequence assessment.',
    requiresEvidence: true,
    requiresLineage: true,
    requiresReplayHash: true,
    requiresRestrictionProfile: false,
  },
  {
    outputClass: L9SequenceOutputClass.SEQUENCE_EVIDENCE_READ_SURFACE,
    description: 'Governed evidence-backed read surface exposing historical sequence state.',
    requiresEvidence: true,
    requiresLineage: true,
    requiresReplayHash: true,
    requiresRestrictionProfile: false,
  },
];

export function getL9SequenceOutputClassDescriptor(
  cls: L9SequenceOutputClass,
): L9SequenceOutputClassDescriptor | undefined {
  return L9_SEQUENCE_OUTPUT_CLASS_DESCRIPTORS.find(d => d.outputClass === cls);
}

export function isL9RegisteredSequenceOutputClass(value: string): boolean {
  return L9_SEQUENCE_OUTPUT_CLASS_DESCRIPTORS.some(d => d.outputClass === value);
}
