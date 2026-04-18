/**
 * L5.7 Assurance — Done-Gate Evaluator
 *
 * §5.7.14 — Layer 5 is complete only when functional, operational,
 * and constitutional done criteria are ALL satisfied.
 * §5.7.14.4 — evaluateL5DoneState(): L5DoneAssessment
 */

export enum L5DoneRecommendation {
  NOT_DONE = 'NOT_DONE',
  DONE_WITH_WARNINGS = 'DONE_WITH_WARNINGS',
  DONE = 'DONE',
}

export interface L5DoneAssessment {
  readonly functional_complete: boolean;
  readonly operational_complete: boolean;
  readonly constitutional_complete: boolean;
  readonly critical_blockers: readonly string[];
  readonly warning_backlog: readonly string[];
  readonly evidence_summary: readonly string[];
  readonly recommendation: L5DoneRecommendation;
}

export interface FunctionalConditions {
  readonly endToEndGoverned: boolean;
  readonly multiStoreScoreCoherence: boolean;
  readonly userStateSurvivesCacheLoss: boolean;
  readonly idempotencyIntegrity: boolean;
  readonly lateDataHonesty: boolean;
}

export interface OperationalConditions {
  readonly stuckManifestsRepairable: boolean;
  readonly boundedRetries: boolean;
  readonly redisDegradationHonesty: boolean;
  readonly replayCompleteness: boolean;
  readonly artifactIntegrity: boolean;
  readonly securityClosure: boolean;
}

export interface ConstitutionalConditions {
  readonly noInventedIdentity: boolean;
  readonly noMetriclessTimeSeries: boolean;
  readonly noSilentUnresolvedUpgrade: boolean;
  readonly noArchivelessFinalization: boolean;
  readonly noFailureHiddenByProjection: boolean;
  readonly noLowerLayerRedefinition: boolean;
  readonly noSilentSecurityCompromise: boolean;
}

export function evaluateL5DoneState(
  functional: FunctionalConditions,
  operational: OperationalConditions,
  constitutional: ConstitutionalConditions,
): L5DoneAssessment {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const evidence: string[] = [];

  if (!functional.endToEndGoverned) blockers.push('End-to-end governed write path not verified');
  if (!functional.multiStoreScoreCoherence) blockers.push('Multi-store score coherence not verified');
  if (!functional.userStateSurvivesCacheLoss) blockers.push('User state cache-loss resilience not verified');
  if (!functional.idempotencyIntegrity) blockers.push('Idempotency integrity not verified');
  if (!functional.lateDataHonesty) blockers.push('Late-data honesty not verified');

  if (!operational.stuckManifestsRepairable) blockers.push('Stuck manifest repairability not verified');
  if (!operational.boundedRetries) blockers.push('Bounded retry visibility not verified');
  if (!operational.redisDegradationHonesty) warnings.push('Redis degradation honesty not fully verified');
  if (!operational.replayCompleteness) blockers.push('Replay completeness not verified');
  if (!operational.artifactIntegrity) blockers.push('Artifact integrity not verified');
  if (!operational.securityClosure) blockers.push('Security closure not verified');

  if (!constitutional.noInventedIdentity) blockers.push('CONSTITUTIONAL: Invented identity detected');
  if (!constitutional.noMetriclessTimeSeries) blockers.push('CONSTITUTIONAL: Metricless time-series detected');
  if (!constitutional.noSilentUnresolvedUpgrade) blockers.push('CONSTITUTIONAL: Silent unresolved upgrade detected');
  if (!constitutional.noArchivelessFinalization) blockers.push('CONSTITUTIONAL: Archive-less finalization detected');
  if (!constitutional.noFailureHiddenByProjection) blockers.push('CONSTITUTIONAL: Failure hidden by projection');
  if (!constitutional.noLowerLayerRedefinition) blockers.push('CONSTITUTIONAL: Lower-layer redefinition detected');
  if (!constitutional.noSilentSecurityCompromise) blockers.push('CONSTITUTIONAL: Silent security compromise detected');

  const functionalComplete = functional.endToEndGoverned && functional.multiStoreScoreCoherence
    && functional.userStateSurvivesCacheLoss && functional.idempotencyIntegrity && functional.lateDataHonesty;

  const operationalComplete = operational.stuckManifestsRepairable && operational.boundedRetries
    && operational.redisDegradationHonesty && operational.replayCompleteness
    && operational.artifactIntegrity && operational.securityClosure;

  const constitutionalComplete = constitutional.noInventedIdentity && constitutional.noMetriclessTimeSeries
    && constitutional.noSilentUnresolvedUpgrade && constitutional.noArchivelessFinalization
    && constitutional.noFailureHiddenByProjection && constitutional.noLowerLayerRedefinition
    && constitutional.noSilentSecurityCompromise;

  if (functionalComplete) evidence.push('Functional: ALL 5 conditions satisfied');
  if (operationalComplete) evidence.push('Operational: ALL 6 conditions satisfied');
  if (constitutionalComplete) evidence.push('Constitutional: ALL 7 conditions satisfied');

  let recommendation: L5DoneRecommendation;
  if (blockers.length > 0) {
    recommendation = L5DoneRecommendation.NOT_DONE;
  } else if (warnings.length > 0) {
    recommendation = L5DoneRecommendation.DONE_WITH_WARNINGS;
  } else {
    recommendation = L5DoneRecommendation.DONE;
  }

  return {
    functional_complete: functionalComplete,
    operational_complete: operationalComplete,
    constitutional_complete: constitutionalComplete,
    critical_blockers: blockers,
    warning_backlog: warnings,
    evidence_summary: evidence,
    recommendation,
  };
}
