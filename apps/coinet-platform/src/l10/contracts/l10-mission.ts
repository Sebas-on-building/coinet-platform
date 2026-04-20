/**
 * L10.1 — Mission Contract
 *
 * §10.1.1.2 — Canonical mission: "Layer 10 constructs and ranks competing
 * governed explanations for why the current market state exists, using
 * only L3–L9 governed truth, preserving explicit alternatives, spread,
 * evidence asymmetry, and shift conditions — without inventing truth,
 * overriding lower-layer posture, impersonating final judgment, or
 * promoting temporal support into proven cause."
 *
 * §10.1.7 — First principle: an explanation is legal only if it survives
 * governed competition against at least one plausible alternative
 * explanation, with preserved spread, evidence asymmetry, and
 * shift-condition set.
 */

import {
  L10AllowedCapability,
  L10DependencyLayer,
  L10OutputSurfaceClass,
  L10SubjectClass,
} from './l10-constitutional-types';

export const L10_MISSION = {
  name: 'Layer 10 — Hypothesis Engine',
  canonical:
    'Layer 10 constructs and ranks competing governed explanations for ' +
    'why the current market state exists, using only L3–L9 governed ' +
    'truth, preserving explicit alternatives, spread, evidence ' +
    'asymmetry, confirmation gaps, invalidation posture, and shift ' +
    'conditions — without inventing truth, overriding lower-layer ' +
    'posture, impersonating final judgment, emitting recommendations, ' +
    'or promoting temporal support into proven cause.',
  compression:
    'Layer 10 explains the present through competing, governed hypotheses.',
  firstPrinciple:
    'An explanation is legal only if it survives governed competition ' +
    'against at least one plausible alternative, with preserved spread, ' +
    'evidence asymmetry, and shift-condition set.',
  explanationConstructionBoundary: [
    'hypothesis subject',
    'hypothesis candidate',
    'hypothesis competition',
    'hypothesis ranking',
    'hypothesis spread',
    'evidence support-domain binding',
    'evidence contradiction-domain binding',
    'confirmation-gap classification',
    'invalidation-risk classification',
    'shift-condition set',
    'hypothesis restriction profile',
  ] as const,
  offLimits: [
    'final scenario selection',
    'final judgment',
    'final score',
    'recommendation output',
    'conviction ranking',
    'validation truth redefinition',
    'regime reinterpretation',
    'sequence reinterpretation',
    'contradiction laundering from L7',
    'restriction bypass from L7',
    'regime-posture bypass from L8',
    'sequence-posture bypass from L9',
    'causal certainty from support or adjacency',
    'silencing of plausible alternatives',
    'single-story collapse',
    'primary-as-final-truth masquerade',
  ] as const,
  frozenDependencies: [
    L10DependencyLayer.L3,
    L10DependencyLayer.L4,
    L10DependencyLayer.L5,
    L10DependencyLayer.L6,
    L10DependencyLayer.L7,
    L10DependencyLayer.L8,
    L10DependencyLayer.L9,
  ] as const,
  subjectClasses: [
    L10SubjectClass.HYPOTHESIS_CANDIDATE,
    L10SubjectClass.HYPOTHESIS_COMPETITION,
    L10SubjectClass.HYPOTHESIS_RANKING,
    L10SubjectClass.SUPPORT_DOMAIN,
    L10SubjectClass.CONTRADICTION_DOMAIN,
    L10SubjectClass.CONFIRMATION_GAP,
    L10SubjectClass.INVALIDATION_RISK,
    L10SubjectClass.SHIFT_CONDITION,
  ] as const,
  outputClasses: [
    L10OutputSurfaceClass.HYPOTHESIS_ASSESSMENT,
    L10OutputSurfaceClass.HYPOTHESIS_RANKING,
    L10OutputSurfaceClass.HYPOTHESIS_SPREAD_PROFILE,
    L10OutputSurfaceClass.SHIFT_CONDITION_SET,
    L10OutputSurfaceClass.HYPOTHESIS_EVIDENCE_READ_SURFACE,
  ] as const,
} as const;

export interface L10MissionConstraint {
  readonly allowedOutputClasses: readonly L10OutputSurfaceClass[];
  readonly forbiddenOutputClasses: readonly string[];
  readonly allowedSubjectClasses: readonly L10SubjectClass[];
  readonly allowedDependencySources: readonly L10DependencyLayer[];
  readonly allowedCapabilities: readonly L10AllowedCapability[];
  readonly contradictionPosturePreservationRequired: boolean;
  readonly restrictionPosturePreservationRequired: boolean;
  readonly regimePosturePreservationRequired: boolean;
  readonly sequencePosturePreservationRequired: boolean;
  readonly competitionPreservationRequired: boolean;
  readonly spreadPreservationRequired: boolean;
  readonly alternativePreservationRequired: boolean;
  readonly shiftConditionPreservationRequired: boolean;
  readonly causalRestraintRequired: boolean;
  readonly storageRoutingRequired: boolean;
}

export const L10_MISSION_CONSTRAINT: L10MissionConstraint = {
  allowedOutputClasses: [...L10_MISSION.outputClasses],
  forbiddenOutputClasses: [
    'FINAL_SCENARIO_WINNER',
    'FINAL_EXPLANATION_WINNER',
    'FINAL_EXPLANATION_NARRATIVE',
    'FINAL_SCORE',
    'FINAL_OPPORTUNITY_RANKING',
    'FINAL_ACTION_RECOMMENDATION',
    'FINAL_JUDGMENT',
    'TRADE_RECOMMENDATION',
    'PORTFOLIO_PRIORITY',
    'BUY_SIGNAL',
    'SELL_SIGNAL',
    'AVOID_SIGNAL',
    'CONVICTION_RANKING',
    'HIGHEST_CONVICTION_EXPLANATION',
    'BEST_OPPORTUNITY',
    'BEST_EXPLANATION',
    'WINNING_EXPLANATION',
    'WINNING_THESIS',
    'PROVEN_CAUSE',
    'CAUSAL_CERTAINTY',
    'ALPHA_EXPLANATION',
    'ACTIONABLE_EXPLANATION',
    'CLEAR_BUY_EXPLANATION',
    'IDEAL_EXPLANATION',
  ],
  allowedSubjectClasses: [...L10_MISSION.subjectClasses],
  allowedDependencySources: [...L10_MISSION.frozenDependencies],
  allowedCapabilities: [...Object.values(L10AllowedCapability)],
  contradictionPosturePreservationRequired: true,
  restrictionPosturePreservationRequired: true,
  regimePosturePreservationRequired: true,
  sequencePosturePreservationRequired: true,
  competitionPreservationRequired: true,
  spreadPreservationRequired: true,
  alternativePreservationRequired: true,
  shiftConditionPreservationRequired: true,
  causalRestraintRequired: true,
  storageRoutingRequired: true,
};

export function isL10LegalOutputClass(cls: string): boolean {
  return (L10_MISSION_CONSTRAINT.allowedOutputClasses as readonly string[]).includes(cls);
}

export function isL10ForbiddenOutputClass(cls: string): boolean {
  return L10_MISSION_CONSTRAINT.forbiddenOutputClasses.includes(cls);
}

/**
 * §10.1.1.3 — Machine-readable mission rule: does this component build
 * governed competing-explanation behaviour, or does it smuggle in
 * judgment, scenario selection, scoring, recommendation, conviction,
 * or causal-certainty behaviour?
 */
export function matchesL10Mission(description: string): boolean {
  const lower = description.toLowerCase();
  const hypothesis =
    lower.includes('hypothesis') ||
    lower.includes('hypotheses') ||
    lower.includes('explanation') ||
    lower.includes('competing') ||
    lower.includes('candidate') ||
    lower.includes('alternative') ||
    lower.includes('spread') ||
    lower.includes('shift condition') ||
    lower.includes('shift-condition') ||
    lower.includes('confirmation gap') ||
    lower.includes('confirmation-gap') ||
    lower.includes('invalidation risk') ||
    lower.includes('invalidation-risk') ||
    lower.includes('support domain') ||
    lower.includes('contradiction domain') ||
    lower.includes('rank');
  const judgmental =
    lower.includes('recommendation') ||
    lower.includes('final scenario') ||
    lower.includes('final explanation') ||
    lower.includes('final score') ||
    lower.includes('final judgment') ||
    lower.includes('trade signal') ||
    lower.includes('buy signal') ||
    lower.includes('sell signal') ||
    lower.includes('avoid signal') ||
    lower.includes('best trade') ||
    lower.includes('best opportunity') ||
    lower.includes('best explanation') ||
    lower.includes('winning explanation') ||
    lower.includes('winning thesis') ||
    lower.includes('highest conviction') ||
    lower.includes('conviction ranking') ||
    lower.includes('clear buy explanation') ||
    lower.includes('ideal explanation') ||
    lower.includes('alpha explanation') ||
    lower.includes('actionable explanation') ||
    lower.includes('causal certainty') ||
    lower.includes('proven cause') ||
    lower.includes('re-validate') ||
    lower.includes('revalidate') ||
    lower.includes('reinterpret regime') ||
    lower.includes('override regime') ||
    lower.includes('override sequence') ||
    lower.includes('reinterpret sequence');
  return hypothesis && !judgmental;
}
