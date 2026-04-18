/**
 * L8.1 — Mission Contract
 *
 * §8.1.1.2 — Canonical mission: "Layer 8 classifies the current market
 * environment that governed truths belong to." §8.1.1.5 — First principle:
 * a signal does not mean the same thing in every environment. L8 exists to
 * classify the environment before later layers interpret what validated
 * truths imply.
 *
 * §8.1.7.3 — Encoded as the machine-enforced `L8MissionConstraint` that
 * every later L8 component is checked against.
 */

import {
  L8AllowedCapability,
  L8DependencyLayer,
  L8OutputSurfaceClass,
  L8SubjectClass,
} from './l8-constitutional-types';

export const L8_MISSION = {
  name: 'Layer 8 — Regime Engine',
  canonical:
    'Layer 8 takes governed primitives, governed truth-tested validation ' +
    'surfaces, and governed relational context and classifies the current ' +
    'market environment those truths belong to — across regime dimensions ' +
    'like macro risk, volatility, liquidity, leverage, and sector posture.',
  compression:
    'Layer 8 classifies the environment governed truths are occurring inside.',
  firstPrinciple:
    'A signal does not mean the same thing in every environment. Layer 8 ' +
    'exists to classify the environment before later layers interpret what ' +
    'validated truths imply.',
  truthTestingBoundary: [
    'primary regime',
    'secondary regime',
    'multi-family coexistence',
    'transition detection',
    'regime confidence',
    'transition risk',
    'regime multiplier',
  ] as const,
  offLimits: [
    'final scenario ranking',
    'final actionability',
    'final trade desirability',
    'final judgment',
    'final score',
    'recommendation output',
    'validation truth redefinition',
    'contradiction laundering from L7',
    'restriction bypass from L7',
  ] as const,
  frozenDependencies: [
    L8DependencyLayer.L3,
    L8DependencyLayer.L4,
    L8DependencyLayer.L5,
    L8DependencyLayer.L6,
    L8DependencyLayer.L7,
  ] as const,
  subjectClasses: [
    L8SubjectClass.MARKET_REGIME,
    L8SubjectClass.SECTOR_REGIME,
    L8SubjectClass.ASSET_REGIME,
    L8SubjectClass.LEVERAGE_REGIME,
    L8SubjectClass.LIQUIDITY_REGIME,
  ] as const,
  outputClasses: [
    L8OutputSurfaceClass.REGIME_STATE,
    L8OutputSurfaceClass.REGIME_CONFIDENCE_PROFILE,
    L8OutputSurfaceClass.REGIME_TRANSITION_PROFILE,
    L8OutputSurfaceClass.REGIME_MULTIPLIER_PROFILE,
    L8OutputSurfaceClass.REGIME_EVIDENCE_READ_SURFACE,
  ] as const,
} as const;

export interface L8MissionConstraint {
  readonly allowedOutputClasses: readonly L8OutputSurfaceClass[];
  readonly forbiddenOutputClasses: readonly string[];
  readonly allowedSubjectClasses: readonly L8SubjectClass[];
  readonly allowedDependencySources: readonly L8DependencyLayer[];
  readonly allowedCapabilities: readonly L8AllowedCapability[];
  readonly contradictionPosturePreservationRequired: boolean;
  readonly restrictionPosturePreservationRequired: boolean;
  readonly ambiguityPreservationRequired: boolean;
  readonly storageRoutingRequired: boolean;
}

export const L8_MISSION_CONSTRAINT: L8MissionConstraint = {
  allowedOutputClasses: [...L8_MISSION.outputClasses],
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
    'BEST_REGIME_WINNER',
    'WINNING_THESIS',
    'CONVICTION_TRADE',
  ],
  allowedSubjectClasses: [...L8_MISSION.subjectClasses],
  allowedDependencySources: [...L8_MISSION.frozenDependencies],
  allowedCapabilities: [...Object.values(L8AllowedCapability)],
  contradictionPosturePreservationRequired: true,
  restrictionPosturePreservationRequired: true,
  ambiguityPreservationRequired: true,
  storageRoutingRequired: true,
};

export function isL8LegalOutputClass(cls: string): boolean {
  return (L8_MISSION_CONSTRAINT.allowedOutputClasses as readonly string[]).includes(cls);
}

export function isL8ForbiddenOutputClass(cls: string): boolean {
  return L8_MISSION_CONSTRAINT.forbiddenOutputClasses.includes(cls);
}

/**
 * §8.1.1.5 — Machine-readable mission rule: does this component classify
 * an environment, or does it smuggle in validation, judgment, scenario,
 * or recommendation behavior?
 */
export function matchesL8Mission(description: string): boolean {
  const lower = description.toLowerCase();
  const regime =
    lower.includes('regime') ||
    lower.includes('environment') ||
    lower.includes('transition') ||
    lower.includes('multiplier') ||
    lower.includes('coexistence') ||
    lower.includes('posture') ||
    lower.includes('liquidity') ||
    lower.includes('leverage') ||
    lower.includes('volatility');
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
    lower.includes('best regime') ||
    lower.includes('winning thesis') ||
    lower.includes('actionability') ||
    lower.includes('re-validate');
  return regime && !judgmental;
}
