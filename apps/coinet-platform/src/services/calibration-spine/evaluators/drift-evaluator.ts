/**
 * Drift Evaluator — detects reliability changes across versions and time.
 *
 * Compares calibration metrics between config versions or time periods.
 */

import type {
  JudgmentSnapshotRecord,
  ForwardOutcomeRecord,
  DriftComparison,
  DriftSeverity,
  VersionDriftReport,
  OutcomeWindow,
} from '../types';
import { evaluateConfidence } from './confidence-evaluator';
import { evaluateScores } from './score-evaluator';

interface Pair {
  snapshot: JudgmentSnapshotRecord;
  outcome: ForwardOutcomeRecord;
}

function classifySeverity(delta: number): DriftSeverity {
  const abs = Math.abs(delta);
  if (abs < 0.03) return 'none';
  if (abs < 0.08) return 'minor';
  if (abs < 0.15) return 'moderate';
  return 'severe';
}

export function compareVersions(
  pairs: Pair[],
  fromVersion: string,
  toVersion: string,
  window: OutcomeWindow,
): VersionDriftReport {
  const fromPairs = pairs.filter(p => p.snapshot.hypothesisConfigVersion === fromVersion);
  const toPairs = pairs.filter(p => p.snapshot.hypothesisConfigVersion === toVersion);

  const comparisons: DriftComparison[] = [];

  if (fromPairs.length >= 5 && toPairs.length >= 5) {
    const fromConf = evaluateConfidence(fromPairs);
    const toConf = evaluateConfidence(toPairs);
    comparisons.push({
      dimension: 'calibration_error',
      previousValue: fromConf.calibrationError,
      currentValue: toConf.calibrationError,
      delta: toConf.calibrationError - fromConf.calibrationError,
      severity: classifySeverity(toConf.calibrationError - fromConf.calibrationError),
    });
    comparisons.push({
      dimension: 'overconfidence_rate',
      previousValue: fromConf.overconfidenceRate,
      currentValue: toConf.overconfidenceRate,
      delta: toConf.overconfidenceRate - fromConf.overconfidenceRate,
      severity: classifySeverity(toConf.overconfidenceRate - fromConf.overconfidenceRate),
    });

    const fromScores = evaluateScores(fromPairs);
    const toScores = evaluateScores(toPairs);
    comparisons.push({
      dimension: 'opportunity_separation',
      previousValue: fromScores.separation.opportunityTopVsBottom,
      currentValue: toScores.separation.opportunityTopVsBottom,
      delta: toScores.separation.opportunityTopVsBottom - fromScores.separation.opportunityTopVsBottom,
      severity: classifySeverity(toScores.separation.opportunityTopVsBottom - fromScores.separation.opportunityTopVsBottom),
    });
  }

  const worstSeverity = comparisons.reduce<DriftSeverity>((worst, c) => {
    const order: DriftSeverity[] = ['none', 'minor', 'moderate', 'severe'];
    return order.indexOf(c.severity) > order.indexOf(worst) ? c.severity : worst;
  }, 'none');

  const recommendation = worstSeverity === 'severe'
    ? `Version ${toVersion} shows severe drift vs ${fromVersion}. Review scoring logic changes.`
    : worstSeverity === 'moderate'
      ? `Version ${toVersion} shows moderate drift. Monitor closely.`
      : `No significant drift detected between ${fromVersion} and ${toVersion}.`;

  return {
    fromVersion, toVersion, window,
    comparisons,
    overallSeverity: worstSeverity,
    recommendation,
  };
}

export function detectTemporalDrift(
  pairs: Pair[],
  splitTimestamp: number,
  window: OutcomeWindow,
): VersionDriftReport {
  const before = pairs.filter(p => new Date(p.snapshot.judgmentTimestamp).getTime() < splitTimestamp);
  const after = pairs.filter(p => new Date(p.snapshot.judgmentTimestamp).getTime() >= splitTimestamp);

  return compareVersions(
    [...before, ...after],
    'period_before',
    'period_after',
    window,
  );
}
