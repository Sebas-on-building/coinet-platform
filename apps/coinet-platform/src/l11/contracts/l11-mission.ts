/**
 * L11.1 — Mission Contract
 *
 * §11.1.2 / §11.1.3 — Canonical mission: "Layer 11 is the Deterministic
 * Scoring Engine. It converts governed lower-layer truth from L3–L10
 * into deterministic, interpretable, attributable, versioned scores
 * with explicit meaning, attribution, missing-data posture, regime
 * modifiers, calibration hooks, and drift governance — without
 * inventing new truth, rebuilding lower-layer logic, hiding
 * contradiction or missing data inside a clean number, or emitting
 * final judgment, recommendation, scenario winner, or trade action."
 *
 * §11.1.4 — First principle: a score is a governed meaning claim
 * expressed quantitatively, not a number with vibes.
 */

import {
  L11AllowedCapability,
  L11DependencyLayer,
  L11OutputSurfaceClass,
  L11SubjectClass,
} from './l11-constitutional-types';

export const L11_MISSION = {
  name: 'Layer 11 — Deterministic Scoring Engine',
  canonical:
    'Layer 11 is the Deterministic Scoring Engine. It converts ' +
    'governed lower-layer truth from L3–L10 into deterministic, ' +
    'interpretable, attributable, versioned scores with explicit ' +
    'meaning, attribution, missing-data posture, regime modifiers, ' +
    'calibration hooks, and drift governance — without inventing ' +
    'new truth, rebuilding lower-layer logic, hiding contradiction ' +
    'or missing data inside a clean number, or emitting final ' +
    'judgment, recommendation, scenario winner, or trade action.',
  compression:
    'Layer 11 expresses governed truth as deterministic, attributable, versioned meaning-claim scores.',
  firstPrinciple:
    'A score is a governed meaning claim expressed quantitatively — ' +
    'not a number with vibes, and never a recommendation, judgment, ' +
    'or scenario winner.',
  scoreConstructionBoundary: [
    'score subject',
    'score family',
    'score formula version',
    'score component breakdown',
    'score attribution',
    'score modifier profile',
    'score missing-data profile',
    'score calibration hook',
    'score drift hook',
    'score restriction profile',
    'score evidence read surface',
  ] as const,
  offLimits: [
    'final judgment emission',
    'final recommendation emission',
    'scenario winner selection',
    'trade action emission',
    'vibe score creation',
    'unattributed score emission',
    'unversioned score emission',
    'meaning claim absence',
    'direction undeclared',
    'direction mixing',
    'missing data laundering',
    'contradiction laundering',
    'lower-layer rebuild',
    'L10 hypothesis rebuild',
    'regime override',
    'sequence override',
    'L7 live revalidation',
    'persistence bypass',
    'late-layer (L12+) consumption',
    'restriction bypass',
    'calibration hook absence',
    'score as action',
  ] as const,
  frozenDependencies: [
    L11DependencyLayer.L3,
    L11DependencyLayer.L4,
    L11DependencyLayer.L5,
    L11DependencyLayer.L6,
    L11DependencyLayer.L7,
    L11DependencyLayer.L8,
    L11DependencyLayer.L9,
    L11DependencyLayer.L10,
  ] as const,
  subjectClasses: [
    L11SubjectClass.SCORE_SUBJECT,
    L11SubjectClass.SCORE_FAMILY_SUBJECT,
    L11SubjectClass.SCORE_FORMULA_SUBJECT,
    L11SubjectClass.SCORE_COMPONENT_SUBJECT,
    L11SubjectClass.SCORE_ATTRIBUTION_SUBJECT,
    L11SubjectClass.SCORE_CALIBRATION_SUBJECT,
    L11SubjectClass.SCORE_DRIFT_SUBJECT,
  ] as const,
  outputClasses: [
    L11OutputSurfaceClass.SCORE_OUTPUT,
    L11OutputSurfaceClass.SCORE_COMPONENT_BREAKDOWN,
    L11OutputSurfaceClass.SCORE_ATTRIBUTION,
    L11OutputSurfaceClass.SCORE_MODIFIER_PROFILE,
    L11OutputSurfaceClass.SCORE_MISSING_DATA_PROFILE,
    L11OutputSurfaceClass.SCORE_CALIBRATION_HOOK,
    L11OutputSurfaceClass.SCORE_DRIFT_HOOK,
    L11OutputSurfaceClass.SCORE_EVIDENCE_READ_SURFACE,
  ] as const,
} as const;

export interface L11MissionConstraint {
  readonly allowedOutputClasses: readonly L11OutputSurfaceClass[];
  readonly forbiddenOutputClasses: readonly string[];
  readonly allowedSubjectClasses: readonly L11SubjectClass[];
  readonly allowedDependencySources: readonly L11DependencyLayer[];
  readonly allowedCapabilities: readonly L11AllowedCapability[];
  readonly meaningClaimRequired: boolean;
  readonly directionDeclarationRequired: boolean;
  readonly attributionRequired: boolean;
  readonly versionDeclarationRequired: boolean;
  readonly missingDataDisclosureRequired: boolean;
  readonly contradictionDisclosureRequired: boolean;
  readonly hypothesisPosturePreservationRequired: boolean;
  readonly regimePosturePreservationRequired: boolean;
  readonly sequencePosturePreservationRequired: boolean;
  readonly restrictionPosturePreservationRequired: boolean;
  readonly storageRoutingRequired: boolean;
  readonly calibrationHookCapabilityRequired: boolean;
  readonly noJudgmentEmission: boolean;
  readonly noRecommendationEmission: boolean;
  readonly noScenarioWinnerEmission: boolean;
  readonly noTradeActionEmission: boolean;
}

export const L11_MISSION_CONSTRAINT: L11MissionConstraint = {
  allowedOutputClasses: [...L11_MISSION.outputClasses],
  forbiddenOutputClasses: [
    'FINAL_JUDGMENT',
    'FINAL_RECOMMENDATION',
    'TRADE_RECOMMENDATION',
    'SCENARIO_WINNER',
    'FINAL_SCENARIO',
    'BUY_SIGNAL',
    'SELL_SIGNAL',
    'AVOID_SIGNAL',
    'TRADE_SIGNAL',
    'PORTFOLIO_ALLOCATION',
    'BEST_TRADE',
    'BEST_OPPORTUNITY',
    'WINNING_SCORE',
    'WINNING_SCENARIO',
    'CAUSAL_PROOF',
    'UNVERSIONED_SCORE',
    'UNATTRIBUTED_SCORE',
    'VIBE_SCORE',
    'CONVICTION_SIGNAL',
    'ACTIONABLE_SCORE',
    'TRADE_READY_SCORE',
    'ENTRY_READY_SCORE',
    'GUARANTEED_SETUP',
    'SAFEST_TRADE',
    'CLEAR_BUY_SCORE',
    'CLEAR_SELL_SCORE',
  ],
  allowedSubjectClasses: [...L11_MISSION.subjectClasses],
  allowedDependencySources: [...L11_MISSION.frozenDependencies],
  allowedCapabilities: [...Object.values(L11AllowedCapability)],
  meaningClaimRequired: true,
  directionDeclarationRequired: true,
  attributionRequired: true,
  versionDeclarationRequired: true,
  missingDataDisclosureRequired: true,
  contradictionDisclosureRequired: true,
  hypothesisPosturePreservationRequired: true,
  regimePosturePreservationRequired: true,
  sequencePosturePreservationRequired: true,
  restrictionPosturePreservationRequired: true,
  storageRoutingRequired: true,
  calibrationHookCapabilityRequired: true,
  noJudgmentEmission: true,
  noRecommendationEmission: true,
  noScenarioWinnerEmission: true,
  noTradeActionEmission: true,
};

export function isL11LegalOutputClass(cls: string): boolean {
  return (L11_MISSION_CONSTRAINT.allowedOutputClasses as readonly string[])
    .includes(cls);
}

export function isL11ForbiddenOutputClass(cls: string): boolean {
  return L11_MISSION_CONSTRAINT.forbiddenOutputClasses.includes(cls);
}

/**
 * §11.1.3 — Machine-readable mission rule: does this component build
 * governed deterministic-scoring behaviour, or does it smuggle in
 * judgment, recommendation, scenario selection, trade action, vibe
 * scoring, missing-data laundering, or hypothesis rebuild?
 */
export function matchesL11Mission(description: string): boolean {
  const lower = description.toLowerCase();
  const scoring =
    lower.includes('score') ||
    lower.includes('scoring') ||
    lower.includes('component breakdown') ||
    lower.includes('attribution') ||
    lower.includes('modifier') ||
    lower.includes('missing data') ||
    lower.includes('missing-data') ||
    lower.includes('calibration') ||
    lower.includes('drift') ||
    lower.includes('meaning claim') ||
    lower.includes('meaning-claim') ||
    lower.includes('direction') ||
    lower.includes('quantitative interpretation');
  const judgmental =
    lower.includes('recommendation') ||
    lower.includes('final judgment') ||
    lower.includes('final scenario') ||
    lower.includes('scenario winner') ||
    lower.includes('trade signal') ||
    lower.includes('buy signal') ||
    lower.includes('sell signal') ||
    lower.includes('avoid signal') ||
    lower.includes('best trade') ||
    lower.includes('best opportunity') ||
    lower.includes('winning scenario') ||
    lower.includes('winning score') ||
    lower.includes('clear buy') ||
    lower.includes('clear sell') ||
    lower.includes('actionable score') ||
    lower.includes('trade ready') ||
    lower.includes('entry ready') ||
    lower.includes('guaranteed setup') ||
    lower.includes('safest trade') ||
    lower.includes('vibe score') ||
    lower.includes('unattributed') ||
    lower.includes('unversioned') ||
    lower.includes('rebuild hypothesis') ||
    lower.includes('rebuild hypotheses') ||
    lower.includes('reinterpret regime') ||
    lower.includes('override regime') ||
    lower.includes('reinterpret sequence') ||
    lower.includes('override sequence') ||
    lower.includes('re-validate') ||
    lower.includes('revalidate') ||
    lower.includes('launder missing data') ||
    lower.includes('launder contradiction');
  return scoring && !judgmental;
}
