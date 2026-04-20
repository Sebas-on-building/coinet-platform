/**
 * L9.1 — Mission Contract
 *
 * §9.1.1.2 — Canonical mission: "Layer 9 converts governed lower-layer
 * truth into governed temporal meaning by classifying ordered signal
 * chains, lead-lag structure, phase progression, change points, and
 * decay posture without inventing causality, bypassing contradiction
 * law, or leaking into judgment."
 *
 * §9.1.7 — First principle: sequence meaning is governed by ordered
 * evidence, validated timing structure, explicit ambiguity posture, and
 * explicit decay posture — never by rhetorical storytelling over
 * unordered events.
 *
 * Encoded as the machine-enforced `L9MissionConstraint` that every later
 * L9 component is checked against.
 */

import {
  L9AllowedCapability,
  L9DependencyLayer,
  L9OutputSurfaceClass,
  L9SubjectClass,
} from './l9-constitutional-types';

export const L9_MISSION = {
  name: 'Layer 9 — Sequence & Temporal Engine',
  canonical:
    'Layer 9 converts governed lower-layer truth into governed temporal ' +
    'meaning by classifying ordered signal chains, lead-lag structure, ' +
    'phase progression, change points, and decay posture — without ' +
    'inventing causality, bypassing contradiction law, or leaking into ' +
    'judgment, scenario, scoring, or recommendation behaviour.',
  compression:
    'Layer 9 classifies how governed truths unfolded through time.',
  firstPrinciple:
    'Sequence meaning is governed by ordered evidence, validated timing ' +
    'structure, explicit ambiguity posture, and explicit decay posture — ' +
    'not by rhetorical storytelling over unordered events.',
  truthTestingBoundary: [
    'ordered signal chain',
    'lead-lag structure',
    'phase progression',
    'change-point evidence',
    'decay state',
    'post-event window',
    'sequence confidence',
    'sequence restriction profile',
  ] as const,
  offLimits: [
    'final scenario selection',
    'final judgment',
    'final score',
    'recommendation output',
    'hypothesis engine behaviour',
    'validation truth redefinition',
    'regime reinterpretation',
    'contradiction laundering from L7',
    'restriction bypass from L7',
    'regime-posture bypass from L8',
    'causal certainty from temporal adjacency',
    'flattening of ambiguous ordering',
  ] as const,
  frozenDependencies: [
    L9DependencyLayer.L3,
    L9DependencyLayer.L4,
    L9DependencyLayer.L5,
    L9DependencyLayer.L6,
    L9DependencyLayer.L7,
    L9DependencyLayer.L8,
  ] as const,
  subjectClasses: [
    L9SubjectClass.ORDERED_SIGNAL_CHAIN,
    L9SubjectClass.LEAD_LAG_STRUCTURE,
    L9SubjectClass.PHASE_PROGRESSION,
    L9SubjectClass.CHANGE_POINT_EVIDENCE,
    L9SubjectClass.DECAY_STATE,
    L9SubjectClass.POST_EVENT_WINDOW,
  ] as const,
  outputClasses: [
    L9OutputSurfaceClass.SEQUENCE_ASSESSMENT,
    L9OutputSurfaceClass.SEQUENCE_CHAIN,
    L9OutputSurfaceClass.LEAD_LAG_PROFILE,
    L9OutputSurfaceClass.PHASE_STATE,
    L9OutputSurfaceClass.DECAY_PROFILE,
    L9OutputSurfaceClass.SEQUENCE_RESTRICTION_PROFILE,
    L9OutputSurfaceClass.SEQUENCE_EVIDENCE_READ_SURFACE,
  ] as const,
} as const;

export interface L9MissionConstraint {
  readonly allowedOutputClasses: readonly L9OutputSurfaceClass[];
  readonly forbiddenOutputClasses: readonly string[];
  readonly allowedSubjectClasses: readonly L9SubjectClass[];
  readonly allowedDependencySources: readonly L9DependencyLayer[];
  readonly allowedCapabilities: readonly L9AllowedCapability[];
  readonly contradictionPosturePreservationRequired: boolean;
  readonly restrictionPosturePreservationRequired: boolean;
  readonly regimePosturePreservationRequired: boolean;
  readonly ambiguityPreservationRequired: boolean;
  readonly causalRestraintRequired: boolean;
  readonly storageRoutingRequired: boolean;
}

export const L9_MISSION_CONSTRAINT: L9MissionConstraint = {
  allowedOutputClasses: [...L9_MISSION.outputClasses],
  forbiddenOutputClasses: [
    'FINAL_SCENARIO_WINNER',
    'FINAL_SCORE',
    'FINAL_OPPORTUNITY_RANKING',
    'FINAL_ACTION_RECOMMENDATION',
    'FINAL_JUDGMENT',
    'FINAL_EXPLANATION_NARRATIVE',
    'TRADE_RECOMMENDATION',
    'PORTFOLIO_PRIORITY',
    'BUY_SIGNAL',
    'SELL_SIGNAL',
    'AVOID_SIGNAL',
    'BEST_SEQUENCE',
    'WINNING_SEQUENCE',
    'IDEAL_TIMING',
    'ALPHA_PHASE',
    'ACTIONABLE_SETUP',
    'TRADE_READY_SEQUENCE',
    'CONVICTION_SEQUENCE',
    'HYPOTHESIS_SEQUENCE',
    'SCENARIO_CHAIN',
    'CAUSAL_CERTAINTY',
  ],
  allowedSubjectClasses: [...L9_MISSION.subjectClasses],
  allowedDependencySources: [...L9_MISSION.frozenDependencies],
  allowedCapabilities: [...Object.values(L9AllowedCapability)],
  contradictionPosturePreservationRequired: true,
  restrictionPosturePreservationRequired: true,
  regimePosturePreservationRequired: true,
  ambiguityPreservationRequired: true,
  causalRestraintRequired: true,
  storageRoutingRequired: true,
};

export function isL9LegalOutputClass(cls: string): boolean {
  return (L9_MISSION_CONSTRAINT.allowedOutputClasses as readonly string[]).includes(cls);
}

export function isL9ForbiddenOutputClass(cls: string): boolean {
  return L9_MISSION_CONSTRAINT.forbiddenOutputClasses.includes(cls);
}

/**
 * §9.1.1.3 — Machine-readable mission rule: does this component build
 * governed sequence meaning, or does it smuggle in validation, regime,
 * judgment, scenario, scoring, or recommendation behavior?
 */
export function matchesL9Mission(description: string): boolean {
  const lower = description.toLowerCase();
  const sequence =
    lower.includes('sequence') ||
    lower.includes('ordering') ||
    lower.includes('ordered') ||
    lower.includes('lead-lag') ||
    lower.includes('lead lag') ||
    lower.includes('lead/lag') ||
    lower.includes('phase') ||
    lower.includes('change point') ||
    lower.includes('change-point') ||
    lower.includes('changepoint') ||
    lower.includes('decay') ||
    lower.includes('post-event') ||
    lower.includes('post event') ||
    lower.includes('temporal') ||
    lower.includes('chain');
  const judgmental =
    lower.includes('recommendation') ||
    lower.includes('final scenario') ||
    lower.includes('final score') ||
    lower.includes('trade signal') ||
    lower.includes('best trade') ||
    lower.includes('buy signal') ||
    lower.includes('sell signal') ||
    lower.includes('avoid signal') ||
    lower.includes('judgment override') ||
    lower.includes('final judgment') ||
    lower.includes('winning thesis') ||
    lower.includes('actionability') ||
    lower.includes('actionable') ||
    lower.includes('alpha phase') ||
    lower.includes('best sequence') ||
    lower.includes('winning sequence') ||
    lower.includes('ideal timing') ||
    lower.includes('trade-ready') ||
    lower.includes('conviction') ||
    lower.includes('hypothesis') ||
    lower.includes('causal certainty') ||
    lower.includes('re-validate') ||
    lower.includes('revalidate') ||
    lower.includes('reinterpret regime') ||
    lower.includes('override regime');
  return sequence && !judgmental;
}
