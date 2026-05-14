/**
 * L13.1 — Output Surface Contract
 *
 * §13.1.8 / §13.1.10 — First-class Layer 13 output surfaces. Every
 * legal output is grounded, evidence-ref-bound, lineage-bound,
 * confidence-disclosing, restriction-disclosing,
 * contradiction-disclosing-when-present,
 * uncertainty-disclosing-when-present, replay-safe, L5-routed, and
 * never trade/prediction/recommendation/final-judgment in shape.
 */

import {
  L13AllowedCapability,
  L13DownstreamConsumer,
  L13ForbiddenAction,
  L13OutputSurfaceClass,
} from './l13-constitutional-types';

export interface L13OutputSurfaceDescriptor {
  readonly surfaceId: string;
  readonly outputClass: L13OutputSurfaceClass;

  readonly allowedCapabilities: readonly L13AllowedCapability[];

  readonly evidenceRequired: boolean;
  readonly lineageRequired: boolean;
  readonly confidenceDisclosureRequired: boolean;
  readonly restrictionDisclosureRequired: boolean;
  readonly contradictionDisclosureRequiredWhenPresent: boolean;
  readonly uncertaintyDisclosureRequiredWhenPresent: boolean;

  readonly mayBeUserFacing: boolean;

  readonly mayIncludeInference: boolean;
  readonly mustSeparateObservationFromInference: boolean;

  /** §13.1.8 — These four flags are constitutionally `false`. */
  readonly mayContainTradeInstruction: false;
  readonly mayContainPrediction: false;
  readonly mayContainRecommendation: false;
  readonly mayContainFinalJudgment: false;

  readonly l5PersistenceRequired: boolean;
  readonly replaySafeRequired: boolean;

  readonly allowedDownstreamConsumers: readonly L13DownstreamConsumer[];
  readonly forbiddenSemantics: readonly L13ForbiddenAction[];

  readonly requiredLineageFields: readonly string[];
  readonly l5StorageRoute: string;

  readonly policyVersion: string;
  readonly description: string;
}

const POLICY_V = 'l13.constitution.v1';

const STD_LINEAGE_FIELDS: readonly string[] = [
  'ai_output_id',
  'subject_ref',
  'computed_at',
  'trace_id',
  'manifest_id',
  'replay_hash',
];

const STD_DOWNSTREAM: readonly L13DownstreamConsumer[] = [
  L13DownstreamConsumer.USER_FACING_DELIVERY,
  L13DownstreamConsumer.L14_DELIVERY,
  L13DownstreamConsumer.L15_FEEDBACK,
  L13DownstreamConsumer.L16_GOVERNANCE,
  L13DownstreamConsumer.INTERNAL_AUDIT,
];

const FORBIDDEN_FOR_L13: readonly L13ForbiddenAction[] = [
  L13ForbiddenAction.EMIT_BUY_INSTRUCTION,
  L13ForbiddenAction.EMIT_SELL_INSTRUCTION,
  L13ForbiddenAction.EMIT_HOLD_INSTRUCTION,
  L13ForbiddenAction.EMIT_AVOID_INSTRUCTION,
  L13ForbiddenAction.EMIT_LEVERAGE_INSTRUCTION,
  L13ForbiddenAction.EMIT_POSITION_SIZE_INSTRUCTION,
  L13ForbiddenAction.EMIT_ENTRY_EXIT_INSTRUCTION,
  L13ForbiddenAction.CLAIM_GUARANTEE,
  L13ForbiddenAction.CLAIM_CERTAINTY_UNSUPPORTED,
  L13ForbiddenAction.CALL_SCENARIO_WINNER,
  L13ForbiddenAction.CALL_HYPOTHESIS_FINAL_TRUTH,
  L13ForbiddenAction.SAY_SCORE_MEANS_RECOMMENDATION,
  L13ForbiddenAction.TREAT_SCENARIO_CONFIDENCE_AS_PROBABILITY,
  L13ForbiddenAction.HIDE_CONTRADICTION,
  L13ForbiddenAction.OMIT_ACTIVE_INVALIDATION,
  L13ForbiddenAction.OMIT_REQUIRED_TRIGGER,
  L13ForbiddenAction.PRETEND_MISSING_DATA_COMPLETE,
  L13ForbiddenAction.OUTPUT_UNGROUNDED_CLAIM,
];

export const L13_OUTPUT_SURFACES:
  readonly L13OutputSurfaceDescriptor[] = [
  {
    surfaceId: 'l13:ai_explanation_output',
    outputClass: L13OutputSurfaceClass.AI_EXPLANATION_OUTPUT,
    allowedCapabilities: [
      L13AllowedCapability.EXPLAIN_ENGINE_STATE,
      L13AllowedCapability.SUMMARIZE_MARKET_STATE,
      L13AllowedCapability.EXPLAIN_SCENARIOS,
      L13AllowedCapability.EXPLAIN_SCORES,
      L13AllowedCapability.EXPLAIN_HYPOTHESES,
      L13AllowedCapability.EXPLAIN_REGIME,
      L13AllowedCapability.EXPLAIN_SEQUENCE,
      L13AllowedCapability.DISCLOSE_CONTRADICTION,
      L13AllowedCapability.DISCLOSE_UNCERTAINTY,
      L13AllowedCapability.CITE_EVIDENCE_REFS,
      L13AllowedCapability.RESPECT_RESTRICTIONS,
      L13AllowedCapability.ADAPT_TONE_AND_LANGUAGE,
    ],
    evidenceRequired: true,
    lineageRequired: true,
    confidenceDisclosureRequired: true,
    restrictionDisclosureRequired: true,
    contradictionDisclosureRequiredWhenPresent: true,
    uncertaintyDisclosureRequiredWhenPresent: true,
    mayBeUserFacing: true,
    mayIncludeInference: true,
    mustSeparateObservationFromInference: true,
    mayContainTradeInstruction: false,
    mayContainPrediction: false,
    mayContainRecommendation: false,
    mayContainFinalJudgment: false,
    l5PersistenceRequired: true,
    replaySafeRequired: true,
    allowedDownstreamConsumers: STD_DOWNSTREAM,
    forbiddenSemantics: FORBIDDEN_FOR_L13,
    requiredLineageFields: STD_LINEAGE_FIELDS,
    l5StorageRoute: 'l5:materialization_route -> l13.ai_explanation',
    policyVersion: POLICY_V,
    description: 'AI explanation of governed engine state — primary L13 surface',
  },
  {
    surfaceId: 'l13:ai_question_answer_output',
    outputClass: L13OutputSurfaceClass.AI_QUESTION_ANSWER_OUTPUT,
    allowedCapabilities: [
      L13AllowedCapability.ANSWER_USER_QUESTION,
      L13AllowedCapability.EXPLAIN_ENGINE_STATE,
      L13AllowedCapability.DISCLOSE_CONTRADICTION,
      L13AllowedCapability.DISCLOSE_UNCERTAINTY,
      L13AllowedCapability.CITE_EVIDENCE_REFS,
      L13AllowedCapability.RESPECT_RESTRICTIONS,
      L13AllowedCapability.REFUSE_UNSUPPORTED_CONCLUSION,
      L13AllowedCapability.ADAPT_TONE_AND_LANGUAGE,
    ],
    evidenceRequired: true,
    lineageRequired: true,
    confidenceDisclosureRequired: true,
    restrictionDisclosureRequired: true,
    contradictionDisclosureRequiredWhenPresent: true,
    uncertaintyDisclosureRequiredWhenPresent: true,
    mayBeUserFacing: true,
    mayIncludeInference: true,
    mustSeparateObservationFromInference: true,
    mayContainTradeInstruction: false,
    mayContainPrediction: false,
    mayContainRecommendation: false,
    mayContainFinalJudgment: false,
    l5PersistenceRequired: true,
    replaySafeRequired: true,
    allowedDownstreamConsumers: STD_DOWNSTREAM,
    forbiddenSemantics: FORBIDDEN_FOR_L13,
    requiredLineageFields: STD_LINEAGE_FIELDS,
    l5StorageRoute: 'l5:materialization_route -> l13.ai_question_answer',
    policyVersion: POLICY_V,
    description: 'AI answer to a user question — must refuse unsupported conclusions',
  },
  {
    surfaceId: 'l13:ai_alert_output',
    outputClass: L13OutputSurfaceClass.AI_ALERT_OUTPUT,
    allowedCapabilities: [
      L13AllowedCapability.WRITE_ALERT_TEXT,
      L13AllowedCapability.EXPLAIN_SCENARIOS,
      L13AllowedCapability.DISCLOSE_CONTRADICTION,
      L13AllowedCapability.DISCLOSE_UNCERTAINTY,
      L13AllowedCapability.CITE_EVIDENCE_REFS,
      L13AllowedCapability.RESPECT_RESTRICTIONS,
    ],
    evidenceRequired: true,
    lineageRequired: true,
    confidenceDisclosureRequired: true,
    restrictionDisclosureRequired: true,
    contradictionDisclosureRequiredWhenPresent: true,
    uncertaintyDisclosureRequiredWhenPresent: true,
    mayBeUserFacing: true,
    mayIncludeInference: false,
    mustSeparateObservationFromInference: true,
    mayContainTradeInstruction: false,
    mayContainPrediction: false,
    mayContainRecommendation: false,
    mayContainFinalJudgment: false,
    l5PersistenceRequired: true,
    replaySafeRequired: true,
    allowedDownstreamConsumers: STD_DOWNSTREAM,
    forbiddenSemantics: FORBIDDEN_FOR_L13,
    requiredLineageFields: STD_LINEAGE_FIELDS,
    l5StorageRoute: 'l5:materialization_route -> l13.ai_alert',
    policyVersion: POLICY_V,
    description: 'AI alert text — trigger/invalidation/score/scenario-change grounded',
  },
  {
    surfaceId: 'l13:ai_structured_report_output',
    outputClass: L13OutputSurfaceClass.AI_STRUCTURED_REPORT_OUTPUT,
    allowedCapabilities: [
      L13AllowedCapability.WRITE_STRUCTURED_REPORT,
      L13AllowedCapability.EXPLAIN_ENGINE_STATE,
      L13AllowedCapability.EXPLAIN_SCENARIOS,
      L13AllowedCapability.EXPLAIN_SCORES,
      L13AllowedCapability.EXPLAIN_HYPOTHESES,
      L13AllowedCapability.EXPLAIN_REGIME,
      L13AllowedCapability.EXPLAIN_SEQUENCE,
      L13AllowedCapability.DISCLOSE_CONTRADICTION,
      L13AllowedCapability.DISCLOSE_UNCERTAINTY,
      L13AllowedCapability.CITE_EVIDENCE_REFS,
      L13AllowedCapability.RESPECT_RESTRICTIONS,
    ],
    evidenceRequired: true,
    lineageRequired: true,
    confidenceDisclosureRequired: true,
    restrictionDisclosureRequired: true,
    contradictionDisclosureRequiredWhenPresent: true,
    uncertaintyDisclosureRequiredWhenPresent: true,
    mayBeUserFacing: true,
    mayIncludeInference: true,
    mustSeparateObservationFromInference: true,
    mayContainTradeInstruction: false,
    mayContainPrediction: false,
    mayContainRecommendation: false,
    mayContainFinalJudgment: false,
    l5PersistenceRequired: true,
    replaySafeRequired: true,
    allowedDownstreamConsumers: STD_DOWNSTREAM,
    forbiddenSemantics: FORBIDDEN_FOR_L13,
    requiredLineageFields: STD_LINEAGE_FIELDS,
    l5StorageRoute: 'l5:materialization_route -> l13.ai_structured_report',
    policyVersion: POLICY_V,
    description: 'AI structured report — multi-section governed reasoning expression',
  },
  {
    surfaceId: 'l13:ai_comparison_output',
    outputClass: L13OutputSurfaceClass.AI_COMPARISON_OUTPUT,
    allowedCapabilities: [
      L13AllowedCapability.COMPARE_ASSETS,
      L13AllowedCapability.COMPARE_THESES,
      L13AllowedCapability.DISCLOSE_CONTRADICTION,
      L13AllowedCapability.DISCLOSE_UNCERTAINTY,
      L13AllowedCapability.CITE_EVIDENCE_REFS,
      L13AllowedCapability.RESPECT_RESTRICTIONS,
    ],
    evidenceRequired: true,
    lineageRequired: true,
    confidenceDisclosureRequired: true,
    restrictionDisclosureRequired: true,
    contradictionDisclosureRequiredWhenPresent: true,
    uncertaintyDisclosureRequiredWhenPresent: true,
    mayBeUserFacing: true,
    mayIncludeInference: true,
    mustSeparateObservationFromInference: true,
    mayContainTradeInstruction: false,
    mayContainPrediction: false,
    mayContainRecommendation: false,
    mayContainFinalJudgment: false,
    l5PersistenceRequired: true,
    replaySafeRequired: true,
    allowedDownstreamConsumers: STD_DOWNSTREAM,
    forbiddenSemantics: FORBIDDEN_FOR_L13,
    requiredLineageFields: STD_LINEAGE_FIELDS,
    l5StorageRoute: 'l5:materialization_route -> l13.ai_comparison',
    policyVersion: POLICY_V,
    description: 'AI comparison output — never says "A is the better buy"',
  },
  {
    surfaceId: 'l13:ai_uncertainty_disclosure_output',
    outputClass: L13OutputSurfaceClass.AI_UNCERTAINTY_DISCLOSURE_OUTPUT,
    allowedCapabilities: [
      L13AllowedCapability.DISCLOSE_UNCERTAINTY,
      L13AllowedCapability.CITE_EVIDENCE_REFS,
      L13AllowedCapability.RESPECT_RESTRICTIONS,
    ],
    evidenceRequired: false,
    lineageRequired: true,
    confidenceDisclosureRequired: true,
    restrictionDisclosureRequired: true,
    contradictionDisclosureRequiredWhenPresent: true,
    uncertaintyDisclosureRequiredWhenPresent: true,
    mayBeUserFacing: true,
    mayIncludeInference: false,
    mustSeparateObservationFromInference: true,
    mayContainTradeInstruction: false,
    mayContainPrediction: false,
    mayContainRecommendation: false,
    mayContainFinalJudgment: false,
    l5PersistenceRequired: true,
    replaySafeRequired: true,
    allowedDownstreamConsumers: STD_DOWNSTREAM,
    forbiddenSemantics: FORBIDDEN_FOR_L13,
    requiredLineageFields: STD_LINEAGE_FIELDS,
    l5StorageRoute: 'l5:materialization_route -> l13.ai_uncertainty_disclosure',
    policyVersion: POLICY_V,
    description: 'Uncertainty disclosure — explains why the engine is not cleanly confident',
  },
  {
    surfaceId: 'l13:ai_contradiction_disclosure_output',
    outputClass: L13OutputSurfaceClass.AI_CONTRADICTION_DISCLOSURE_OUTPUT,
    allowedCapabilities: [
      L13AllowedCapability.DISCLOSE_CONTRADICTION,
      L13AllowedCapability.CITE_EVIDENCE_REFS,
      L13AllowedCapability.RESPECT_RESTRICTIONS,
    ],
    evidenceRequired: true,
    lineageRequired: true,
    confidenceDisclosureRequired: true,
    restrictionDisclosureRequired: true,
    contradictionDisclosureRequiredWhenPresent: true,
    uncertaintyDisclosureRequiredWhenPresent: true,
    mayBeUserFacing: true,
    mayIncludeInference: false,
    mustSeparateObservationFromInference: true,
    mayContainTradeInstruction: false,
    mayContainPrediction: false,
    mayContainRecommendation: false,
    mayContainFinalJudgment: false,
    l5PersistenceRequired: true,
    replaySafeRequired: true,
    allowedDownstreamConsumers: STD_DOWNSTREAM,
    forbiddenSemantics: FORBIDDEN_FOR_L13,
    requiredLineageFields: STD_LINEAGE_FIELDS,
    l5StorageRoute: 'l5:materialization_route -> l13.ai_contradiction_disclosure',
    policyVersion: POLICY_V,
    description: 'Contradiction disclosure — exposes L7 contradictions to the user',
  },
  {
    surfaceId: 'l13:ai_blocked_output',
    outputClass: L13OutputSurfaceClass.AI_BLOCKED_OUTPUT,
    allowedCapabilities: [
      L13AllowedCapability.REFUSE_UNSUPPORTED_CONCLUSION,
      L13AllowedCapability.RESPECT_RESTRICTIONS,
    ],
    evidenceRequired: false,
    lineageRequired: true,
    confidenceDisclosureRequired: false,
    restrictionDisclosureRequired: true,
    contradictionDisclosureRequiredWhenPresent: false,
    uncertaintyDisclosureRequiredWhenPresent: false,
    mayBeUserFacing: true,
    mayIncludeInference: false,
    mustSeparateObservationFromInference: false,
    mayContainTradeInstruction: false,
    mayContainPrediction: false,
    mayContainRecommendation: false,
    mayContainFinalJudgment: false,
    l5PersistenceRequired: true,
    replaySafeRequired: true,
    allowedDownstreamConsumers: STD_DOWNSTREAM,
    forbiddenSemantics: FORBIDDEN_FOR_L13,
    requiredLineageFields: STD_LINEAGE_FIELDS,
    l5StorageRoute: 'l5:materialization_route -> l13.ai_blocked',
    policyVersion: POLICY_V,
    description: 'Refusal output — used when restriction or capability policy denies',
  },
  {
    surfaceId: 'l13:ai_grounding_audit_output',
    outputClass: L13OutputSurfaceClass.AI_GROUNDING_AUDIT_OUTPUT,
    allowedCapabilities: [
      L13AllowedCapability.CITE_EVIDENCE_REFS,
      L13AllowedCapability.RESPECT_RESTRICTIONS,
    ],
    evidenceRequired: true,
    lineageRequired: true,
    confidenceDisclosureRequired: true,
    restrictionDisclosureRequired: true,
    contradictionDisclosureRequiredWhenPresent: true,
    uncertaintyDisclosureRequiredWhenPresent: true,
    mayBeUserFacing: false,
    mayIncludeInference: false,
    mustSeparateObservationFromInference: true,
    mayContainTradeInstruction: false,
    mayContainPrediction: false,
    mayContainRecommendation: false,
    mayContainFinalJudgment: false,
    l5PersistenceRequired: true,
    replaySafeRequired: true,
    allowedDownstreamConsumers: [
      L13DownstreamConsumer.INTERNAL_AUDIT,
      L13DownstreamConsumer.L16_GOVERNANCE,
    ],
    forbiddenSemantics: FORBIDDEN_FOR_L13,
    requiredLineageFields: STD_LINEAGE_FIELDS,
    l5StorageRoute: 'l5:materialization_route -> l13.ai_grounding_audit',
    policyVersion: POLICY_V,
    description: 'Grounding audit — records which surfaces backed the explanation',
  },
];

export function getL13OutputSurface(
  surfaceId: string,
): L13OutputSurfaceDescriptor | undefined {
  return L13_OUTPUT_SURFACES.find(s => s.surfaceId === surfaceId);
}

export function isL13RegisteredOutput(surfaceId: string): boolean {
  return L13_OUTPUT_SURFACES.some(s => s.surfaceId === surfaceId);
}

export function isL13RegisteredOutputClass(
  cls: L13OutputSurfaceClass,
): boolean {
  return L13_OUTPUT_SURFACES.some(s => s.outputClass === cls);
}

export function getL13OutputsByClass(
  cls: L13OutputSurfaceClass,
): readonly L13OutputSurfaceDescriptor[] {
  return L13_OUTPUT_SURFACES.filter(s => s.outputClass === cls);
}

export function getL13OutputsRequiringEvidence():
  readonly L13OutputSurfaceDescriptor[] {
  return L13_OUTPUT_SURFACES.filter(s => s.evidenceRequired);
}

export function getL13OutputsRequiringLineage():
  readonly L13OutputSurfaceDescriptor[] {
  return L13_OUTPUT_SURFACES.filter(s => s.lineageRequired);
}

export function getL13OutputsRequiringConfidenceDisclosure():
  readonly L13OutputSurfaceDescriptor[] {
  return L13_OUTPUT_SURFACES.filter(
    s => s.confidenceDisclosureRequired,
  );
}

export function getL13OutputsRequiringRestrictionDisclosure():
  readonly L13OutputSurfaceDescriptor[] {
  return L13_OUTPUT_SURFACES.filter(
    s => s.restrictionDisclosureRequired,
  );
}

export function getL13OutputsRequiringL5Persistence():
  readonly L13OutputSurfaceDescriptor[] {
  return L13_OUTPUT_SURFACES.filter(s => s.l5PersistenceRequired);
}

export function getAllL13RequiredLineageFields(): readonly string[] {
  const fields = new Set<string>();
  for (const s of L13_OUTPUT_SURFACES) {
    for (const f of s.requiredLineageFields) fields.add(f);
  }
  return [...fields];
}

export function isL13AllowedDownstreamConsumer(
  surfaceId: string,
  consumer: L13DownstreamConsumer,
): boolean {
  const s = getL13OutputSurface(surfaceId);
  if (!s) return false;
  return s.allowedDownstreamConsumers.includes(consumer);
}
