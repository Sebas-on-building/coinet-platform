/**
 * L7.1 — Mission Contract
 *
 * §7.1.2 — Canonical mission: "Layer 7 tests whether governed primitives
 * actually support a claim." §7.1.2.4 — Encoded as the machine-enforced
 * `L7MissionConstraint` that every later L7 component is checked against.
 */

import {
  L7AllowedCapability,
  L7DependencyLayer,
  L7OutputSurfaceClass,
  L7SubjectClass,
} from './l7-constitutional-types';

export const L7_MISSION = {
  name: 'Layer 7 — Validation & Contradiction Engine',
  canonical:
    'Layer 7 takes governed primitives from Layer 6 and determines whether ' +
    'major market stories, composite signal states, and claim candidates ' +
    'are confirmed, weakly confirmed, conflicting, insufficient, stale, ' +
    'ambiguous, or degraded.',
  compression: 'Layer 7 tests whether governed primitives actually support a claim.',
  truthTestingBoundary: [
    'support',
    'contradiction',
    'incompleteness',
    'staleness',
    'ambiguity',
    'degradation',
    'justified confidence',
  ] as const,
  offLimits: [
    'final scenario ranking',
    'final actionability',
    'final trade desirability',
    'final portfolio priority',
    'final narrative dominance',
  ] as const,
  frozenDependencies: [
    L7DependencyLayer.L3,
    L7DependencyLayer.L4,
    L7DependencyLayer.L5,
    L7DependencyLayer.L6,
  ] as const,
  subjectClasses: [
    L7SubjectClass.CLAIM_CANDIDATE,
    L7SubjectClass.MARKET_STORY,
    L7SubjectClass.COMPOSITE_SIGNAL_STATE,
  ] as const,
  outputClasses: [
    L7OutputSurfaceClass.VALIDATION_ASSESSMENT,
    L7OutputSurfaceClass.CONTRADICTION_BUNDLE,
    L7OutputSurfaceClass.CONFIDENCE_ASSESSMENT,
    L7OutputSurfaceClass.RESTRICTION_PROFILE,
    L7OutputSurfaceClass.VALIDATION_EVIDENCE_READ_SURFACE,
  ] as const,
} as const;

export interface L7MissionConstraint {
  readonly allowedOutputClasses: readonly L7OutputSurfaceClass[];
  readonly forbiddenOutputClasses: readonly string[];
  readonly allowedSubjectClasses: readonly L7SubjectClass[];
  readonly allowedDependencySources: readonly L7DependencyLayer[];
  readonly allowedCapabilities: readonly L7AllowedCapability[];
  readonly contradictionPreservationRequired: boolean;
  readonly ambiguityPreservationRequired: boolean;
  readonly stalenessVisibilityRequired: boolean;
  readonly storageRoutingRequired: boolean;
}

export const L7_MISSION_CONSTRAINT: L7MissionConstraint = {
  allowedOutputClasses: [...L7_MISSION.outputClasses],
  forbiddenOutputClasses: [
    'FINAL_REGIME_CLASS',
    'FINAL_SCENARIO_WINNER',
    'FINAL_SCORE',
    'FINAL_OPPORTUNITY_RANKING',
    'FINAL_ACTION_RECOMMENDATION',
    'FINAL_EXPLANATION_NARRATIVE',
    'TRADE_RECOMMENDATION',
    'PORTFOLIO_PRIORITY',
    'BUY_SIGNAL',
    'SELL_SIGNAL',
  ],
  allowedSubjectClasses: [...L7_MISSION.subjectClasses],
  allowedDependencySources: [...L7_MISSION.frozenDependencies],
  allowedCapabilities: [...Object.values(L7AllowedCapability)],
  contradictionPreservationRequired: true,
  ambiguityPreservationRequired: true,
  stalenessVisibilityRequired: true,
  storageRoutingRequired: true,
};

export function isLegalOutputClass(cls: string): boolean {
  return (L7_MISSION_CONSTRAINT.allowedOutputClasses as readonly string[]).includes(cls);
}

export function isForbiddenOutputClass(cls: string): boolean {
  return L7_MISSION_CONSTRAINT.forbiddenOutputClasses.includes(cls);
}

/**
 * §7.1.2.4 — Machine-readable mission rule: does this component test
 * support, or invent judgment?
 */
export function matchesMission(description: string): boolean {
  const lower = description.toLowerCase();
  const tests = lower.includes('support') ||
    lower.includes('contradiction') ||
    lower.includes('ambiguity') ||
    lower.includes('staleness') ||
    lower.includes('incomplete') ||
    lower.includes('degrad') ||
    lower.includes('validation') ||
    lower.includes('confidence');
  const judgmental = lower.includes('recommendation') ||
    lower.includes('final scenario') ||
    lower.includes('final score') ||
    lower.includes('trade signal') ||
    lower.includes('best trade') ||
    lower.includes('buy signal') ||
    lower.includes('sell signal') ||
    lower.includes('judgment override') ||
    lower.includes('actionability');
  return tests && !judgmental;
}
