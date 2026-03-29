/**
 * Hypothesis Ranker — scores, sorts, computes spread and ambiguity.
 */

import type { SignalSnapshot } from '../judgment/types';
import type { HypothesisId, RankedHypothesis, HypothesisOutput, AmbiguityLevel, CoverageState } from './types';
import { HYPOTHESIS_IDS } from './types';
import { HYPOTHESIS_DEFINITIONS } from './registry';
import { mapEvidenceForHypothesis } from './evidence-mapper';
import { computeSupportScore, computeContradictionScore, computeMissingPenalty, computeStalePenalty, buildSupportProfile } from './support-engine';
import { evaluateInvalidation } from './invalidation-engine';
import { computeRegimeModifier, computeSequenceModifier, computeCoverageModifier } from './modifiers';
import { buildRankingExplanation } from './explainer';
import { HYPOTHESIS_ENGINE_VERSION } from './versioning';

export function rankAllHypotheses(params: {
  signals: SignalSnapshot;
  coverage: CoverageState;
  regimePrimary?: string;
  sequenceState?: string;
}): HypothesisOutput {
  const { signals, coverage, regimePrimary, sequenceState } = params;
  const candidates: RankedHypothesis[] = [];

  for (const id of HYPOTHESIS_IDS) {
    const def = HYPOTHESIS_DEFINITIONS[id];
    const evidence = mapEvidenceForHypothesis(id, signals, coverage);
    const invalidation = evaluateInvalidation(id, signals, coverage);

    const supportScore = computeSupportScore(evidence.supportLinks);
    const contradictionScore = computeContradictionScore(evidence.contradictionLinks);
    const missingPenalty = computeMissingPenalty(evidence.missingLinks, def.requiredForHighConfidence);
    const stalePenalty = computeStalePenalty(evidence.supportLinks);
    const regimeModifier = computeRegimeModifier(id, regimePrimary);
    const sequenceModifier = computeSequenceModifier(id, sequenceState);
    const coverageModifier = computeCoverageModifier(id, coverage);
    const invalidationPenalty = invalidation.totalInvalidationPenalty;

    const profile = buildSupportProfile({
      supportScore, contradictionScore, missingPenalty, stalePenalty,
      regimeModifier, sequenceModifier, coverageModifier, invalidationPenalty,
    });

    const whyItFits: string[] = [];
    const topSupports = evidence.supportLinks.sort((a, b) => b.weight - a.weight).slice(0, 3);
    for (const s of topSupports) {
      whyItFits.push(s.reason);
    }
    if (regimeModifier > 0) whyItFits.push(`Regime alignment bonus (${regimePrimary})`);

    candidates.push({
      id,
      rank: 0,
      score: profile.finalScore,
      confidence: Math.max(0, Math.min(1, profile.finalScore)),
      profile,
      supportLinks: evidence.supportLinks,
      contradictionLinks: evidence.contradictionLinks,
      missingLinks: evidence.missingLinks,
      triggeredConfirmationRules: invalidation.triggeredConfirmationRules,
      triggeredInvalidationRules: invalidation.triggeredInvalidationRules,
      whyItFits,
      whatWouldConfirmNext: invalidation.whatWouldConfirmNext,
      whatWouldBreakIt: invalidation.whatWouldBreakIt,
    });
  }

  candidates.sort((a, b) => b.score - a.score);

  for (let i = 0; i < candidates.length; i++) {
    candidates[i].rank = i + 1;
    candidates[i].spreadFromLeader = i === 0 ? 0 : candidates[0].score - candidates[i].score;
  }

  const primary = candidates[0];
  const secondary = candidates.length > 1 ? candidates[1] : null;
  const spread = secondary ? primary.score - secondary.score : 1;
  const ambiguityLevel = computeAmbiguity(spread);
  const alternatives = candidates.slice(2);

  const decisiveMissing = collectDecisiveMissingEvidence(primary, secondary);
  const rankingExplanation = buildRankingExplanation(primary, secondary, ambiguityLevel);

  return {
    primary,
    secondary,
    alternatives,
    ambiguityLevel,
    rankingExplanation,
    decisiveMissingEvidence: decisiveMissing,
    outputVersion: HYPOTHESIS_ENGINE_VERSION,
  };
}

function computeAmbiguity(spread: number): AmbiguityLevel {
  if (spread < 0.08) return 'high';
  if (spread < 0.18) return 'medium';
  return 'low';
}

function collectDecisiveMissingEvidence(primary: RankedHypothesis, secondary: RankedHypothesis | null): string[] {
  const missing = new Set<string>();
  for (const link of primary.missingLinks) {
    missing.add(link.reason);
  }
  if (secondary) {
    for (const link of secondary.missingLinks.slice(0, 2)) {
      missing.add(link.reason);
    }
  }
  return [...missing].slice(0, 5);
}
