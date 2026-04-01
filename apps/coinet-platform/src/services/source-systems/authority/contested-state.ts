/**
 * Contested State Handler — produces unresolved authority states
 * when conflict should NOT be flattened.
 *
 * Key principle: preserving truthful disagreement is more valuable
 * than forcing false consensus.
 */

import type { TruthAtomId, ResolvedAuthority, AuthorityStatus } from './types';
import type { ChallengerRule } from './types';

export interface ContestedState {
  truthAtomId: TruthAtomId;
  primaryClaim: string;
  challengerClaims: ContestedClaim[];
  severity: 'mild' | 'moderate' | 'severe';
  preserveTension: boolean;
  resolutionAdvice: string;
  downstreamImpact: string[];
}

export interface ContestedClaim {
  challengerId: string;
  challengeType: 'metric' | 'interpretation';
  weakenStrength: number;
  description: string;
}

export function buildContestedState(
  resolved: ResolvedAuthority,
  activeChallengers: ChallengerRule[],
): ContestedState | null {
  if (resolved.outcome !== 'PRIMARY_CONTESTED' && resolved.outcome !== 'UNRESOLVED_CONFLICT') {
    return null;
  }

  const totalWeaken = activeChallengers.reduce((sum, c) => sum + c.weakenStrength, 0);

  let severity: ContestedState['severity'];
  if (totalWeaken >= 0.5) severity = 'severe';
  else if (totalWeaken >= 0.25) severity = 'moderate';
  else severity = 'mild';

  const hasMetric = activeChallengers.some(c => c.challengeType === 'metric');
  const hasInterpretation = activeChallengers.some(c => c.challengeType === 'interpretation');

  const preserveTension = severity !== 'mild';

  let resolutionAdvice: string;
  if (hasMetric && hasInterpretation) {
    resolutionAdvice = 'Both raw metric and interpretation are disputed — flag both in output, reduce claim strength significantly';
  } else if (hasMetric) {
    resolutionAdvice = 'Raw metric value is disputed — use median or cross-validation, flag disagreement';
  } else {
    resolutionAdvice = 'Metric value stands but thesis interpretation is challenged — preserve tension in explanation';
  }

  const downstreamImpact: string[] = [];
  if (severity === 'severe') {
    downstreamImpact.push('Confidence should be meaningfully reduced');
    downstreamImpact.push('Hypothesis ranking should widen ambiguity');
    downstreamImpact.push('Scenario language should acknowledge contested state');
  } else if (severity === 'moderate') {
    downstreamImpact.push('Confidence may be slightly reduced');
    downstreamImpact.push('Explanation should note contested interpretation');
  } else {
    downstreamImpact.push('Minimal downstream impact — note in audit trail');
  }

  return {
    truthAtomId: resolved.truthAtomId,
    primaryClaim: `${resolved.activePrimary ?? 'unknown'} asserts authority`,
    challengerClaims: activeChallengers.map(c => ({
      challengerId: c.challengerId,
      challengeType: c.challengeType,
      weakenStrength: c.weakenStrength,
      description: c.description,
    })),
    severity,
    preserveTension,
    resolutionAdvice,
    downstreamImpact,
  };
}

export function getContestedSummary(states: ContestedState[]): {
  total: number;
  severe: number;
  moderate: number;
  mild: number;
  summary: string[];
} {
  const severe = states.filter(s => s.severity === 'severe').length;
  const moderate = states.filter(s => s.severity === 'moderate').length;
  const mild = states.filter(s => s.severity === 'mild').length;

  const summary: string[] = [];
  if (severe > 0) summary.push(`${severe} severe contest(s) — claim strength significantly limited`);
  if (moderate > 0) summary.push(`${moderate} moderate contest(s) — interpretive confidence reduced`);
  if (mild > 0) summary.push(`${mild} mild contest(s) — noted in audit`);

  return { total: states.length, severe, moderate, mild, summary };
}
