/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     JUDGMENT EVALUATOR — Quality Control for Judgment Outputs                 ║
 * ║                                                                               ║
 * ║   Checks whether each judgment is internally healthy:                         ║
 * ║   - Does confidence align with contradiction load?                            ║
 * ║   - Is the chosen state too close to the secondary?                           ║
 * ║   - Is scenario output too generic?                                           ║
 * ║   - Are there too few evidence items?                                         ║
 * ║   - Is cause dependent on a single category only?                             ║
 * ║                                                                               ║
 * ║   This is the quality-control layer for the judgment engine itself.            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type { SignalSnapshot } from './signal-snapshot';
import type { JudgmentOutput } from './types';

export interface EvaluationIssue {
  code: string;
  severity: 'info' | 'warning' | 'error';
  message: string;
}

export interface JudgmentEvaluation {
  healthy: boolean;
  issues: EvaluationIssue[];
  score: number;
}

function toNumber(value: unknown): number {
  return Number(value);
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? (value as string[]) : [];
}

/**
 * Evaluate the internal health of a judgment output.
 * Returns issues and an overall health score (0–1).
 */
export function evaluateJudgment(
  judgment: JudgmentOutput,
  signals: SignalSnapshot
): JudgmentEvaluation {
  const issues: EvaluationIssue[] = [];

  // 1. Confidence vs contradiction alignment
  checkConfidenceContradictionAlignment(judgment, issues);

  // 2. State ambiguity
  checkStateAmbiguity(judgment, issues);

  // 3. Scenario specificity
  checkScenarioSpecificity(judgment, issues);

  // 4. Evidence depth
  checkEvidenceDepth(judgment, issues);

  // 5. Cause diversity
  checkCauseDiversity(judgment, issues);

  // 6. Timing vs state coherence
  checkTimingStateCoherence(judgment, issues);

  // 7. Thesis without contradiction handling
  checkThesisContradictionCoverage(judgment, issues);

  // 8. Data dependency
  checkDataDependency(signals, issues);

  // 9. Quality check pass rate
  checkQualityPassRate(judgment, issues);

  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const score = Math.max(0, 1 - (errorCount * 0.2 + warningCount * 0.05));

  return {
    healthy: errorCount === 0,
    issues,
    score,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// INDIVIDUAL CHECKS
// ═══════════════════════════════════════════════════════════════════════════════

function checkConfidenceContradictionAlignment(j: JudgmentOutput, issues: EvaluationIssue[]) {
  const contradictionLoad = toNumber(j.contradictions.load);
  const confidenceScore = toNumber(j.confidence.score);

  if (contradictionLoad > 0.5 && confidenceScore > 0.7) {
    issues.push({
      code: 'CONF_CONTRADICTION_MISMATCH',
      severity: 'warning',
      message: `High contradiction load (${(contradictionLoad * 100).toFixed(0)}%) but confidence remains high (${(confidenceScore * 100).toFixed(0)}%). Penalties may be insufficient.`,
    });
  }

  if (Boolean(j.contradictions.structural_warning) && confidenceScore > 0.6) {
    issues.push({
      code: 'STRUCTURAL_CONTRADICTION_HIGH_CONF',
      severity: 'error',
      message: 'Structural contradiction present but confidence is above 60%. This should be penalized more.',
    });
  }
}

function checkStateAmbiguity(j: JudgmentOutput, issues: EvaluationIssue[]) {
  const stateConfidence = toNumber(j.state.confidence);

  if (stateConfidence < 0.25) {
    issues.push({
      code: 'STATE_VERY_LOW_CONFIDENCE',
      severity: 'error',
      message: `State classification confidence is very low (${(stateConfidence * 100).toFixed(0)}%). The primary state may not be meaningful.`,
    });
  } else if (stateConfidence < 0.4) {
    issues.push({
      code: 'STATE_LOW_CONFIDENCE',
      severity: 'warning',
      message: `State classification confidence is low (${(stateConfidence * 100).toFixed(0)}%). Consider whether signals are sufficient.`,
    });
  }
}

function checkScenarioSpecificity(j: JudgmentOutput, issues: EvaluationIssue[]) {
  const generic = [
    'Active expansion with positive momentum.',
    'Crowded continuation with elevated fragility.',
    'Distribution or structural weakness present.',
    'Early-stage formation with limited data.',
  ];
  if (generic.some(g => j.scenario.base_case.startsWith(g)) && j.scenario.base_case.length < 80) {
    issues.push({
      code: 'SCENARIO_TOO_GENERIC',
      severity: 'info',
      message: 'Scenario base case appears generic. Will improve when contradiction/state context enriches it.',
    });
  }
}

function checkEvidenceDepth(j: JudgmentOutput, issues: EvaluationIssue[]) {
  const positiveEvidence = toStringArray(j.evidence.positive);
  const negativeEvidence = toStringArray(j.evidence.negative);
  const confidenceScore = toNumber(j.confidence.score);
  const totalEvidence = positiveEvidence.length + negativeEvidence.length;
  if (totalEvidence < 2) {
    issues.push({
      code: 'EVIDENCE_TOO_THIN',
      severity: 'warning',
      message: `Only ${totalEvidence} evidence items. Judgment may lack substantiation.`,
    });
  }

  if (positiveEvidence.length > 0 && negativeEvidence.length === 0 && confidenceScore > 0.7) {
    issues.push({
      code: 'EVIDENCE_ONE_SIDED_POSITIVE',
      severity: 'info',
      message: 'Evidence is entirely positive with no negative items. Consider whether risks are being detected.',
    });
  }

  if (negativeEvidence.length > 0 && positiveEvidence.length === 0 && confidenceScore > 0.5) {
    issues.push({
      code: 'EVIDENCE_ONE_SIDED_NEGATIVE',
      severity: 'info',
      message: 'Evidence is entirely negative with no positive items. Confidence may be too high.',
    });
  }
}

function checkCauseDiversity(j: JudgmentOutput, issues: EvaluationIssue[]) {
  const positiveDrivers = Array.isArray(j.cause.positive_drivers)
    ? (j.cause.positive_drivers as Array<{ family: string }>)
    : [];
  const negativeDrivers = Array.isArray(j.cause.negative_drivers)
    ? (j.cause.negative_drivers as Array<{ family: string }>)
    : [];
  const allDrivers = [...positiveDrivers, ...negativeDrivers];
  if (allDrivers.length === 1) {
    issues.push({
      code: 'CAUSE_SINGLE_FAMILY',
      severity: 'info',
      message: `Only one causal family detected (${allDrivers[0].family}). Cause explanation may feel thin.`,
    });
  }

  if (positiveDrivers.length === 0 && negativeDrivers.length === 0) {
    issues.push({
      code: 'CAUSE_EMPTY',
      severity: 'error',
      message: 'No causal drivers detected. The cause field will be empty.',
    });
  }
}

function checkTimingStateCoherence(j: JudgmentOutput, issues: EvaluationIssue[]) {
  const discoveryStates = ['dormant', 'fresh_discovery', 'early_liquidity_formation', 'new_narrative_ignition'];
  const riskStates = ['distribution', 'treasury_sell_pressure', 'unlock_overhang', 'structurally_weak_rally', 'manipulation_risk'];
  const earlyPhases = ['pre_signal', 'early', 'early_validating'];
  const latePhases = ['late_reflexive', 'post_peak', 'decay_distribution'];

  const primaryState = String(j.state.primary);
  const timingPhase = String(j.timing.phase);
  const isDiscoveryState = discoveryStates.includes(primaryState);
  const isRiskState = riskStates.includes(primaryState);
  const isEarlyPhase = earlyPhases.includes(timingPhase);
  const isLatePhase = latePhases.includes(timingPhase);

  if (isRiskState && isEarlyPhase) {
    issues.push({
      code: 'TIMING_STATE_INCOHERENT',
      severity: 'warning',
      message: `State is risk/distribution but timing says early. These should rarely co-occur.`,
    });
  }

  if (isDiscoveryState && isLatePhase) {
    issues.push({
      code: 'TIMING_STATE_INCOHERENT',
      severity: 'warning',
      message: `State is discovery but timing says late. These should rarely co-occur.`,
    });
  }
}

function checkThesisContradictionCoverage(j: JudgmentOutput, issues: EvaluationIssue[]) {
  const contradictionItems = Array.isArray(j.contradictions.items) ? j.contradictions.items : [];
  const contradictionScore = toNumber(j.thesis.primary.contradiction_score);
  if (contradictionItems.length > 0 && contradictionScore < 0.05) {
    issues.push({
      code: 'THESIS_IGNORES_CONTRADICTIONS',
      severity: 'warning',
      message: 'Contradictions detected but thesis contradiction_score is near zero. Hypothesis ranking may not be accounting for them.',
    });
  }
}

function checkDataDependency(signals: SignalSnapshot, issues: EvaluationIssue[]) {
  const dataCompleteness = toNumber(signals.data_completeness);
  const dataFreshness = toNumber(signals.data_freshness);

  if (dataCompleteness < 0.3) {
    issues.push({
      code: 'DATA_CRITICALLY_LOW',
      severity: 'error',
      message: `Data completeness is critically low (${(dataCompleteness * 100).toFixed(0)}%). Judgment may be unreliable.`,
    });
  }

  if (dataFreshness < 0.3) {
    issues.push({
      code: 'DATA_MOSTLY_STALE',
      severity: 'warning',
      message: `Most data sources are stale (freshness ${(dataFreshness * 100).toFixed(0)}%).`,
    });
  }
}

function checkQualityPassRate(j: JudgmentOutput, issues: EvaluationIssue[]) {
  if (!j.quality_checks.all_passed) {
    const failed: string[] = [];
    if (!j.quality_checks.has_clear_state) failed.push('clear state');
    if (!j.quality_checks.has_top_causes) failed.push('top causes');
    if (!j.quality_checks.has_contradictions) failed.push('contradictions');
    if (!j.quality_checks.has_timing) failed.push('timing');
    if (!j.quality_checks.has_next_conditions) failed.push('next conditions');
    if (!j.quality_checks.has_honest_confidence) failed.push('honest confidence');

    issues.push({
      code: 'QUALITY_CHECKS_FAILED',
      severity: 'error',
      message: `Quality checks failed: ${failed.join(', ')}. Judgment does not meet the 6-check standard.`,
    });
  }
}
