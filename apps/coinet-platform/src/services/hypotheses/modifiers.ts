/**
 * Regime, Sequence, and Coverage modifiers for hypothesis scoring.
 */

import type { HypothesisId, CoverageState } from './types';
import { HYPOTHESIS_DEFINITIONS } from './registry';

export function computeRegimeModifier(
  hypothesisId: HypothesisId,
  regimePrimary?: string,
): number {
  const def = HYPOTHESIS_DEFINITIONS[hypothesisId];
  if (!regimePrimary) return 0;

  const regimeLower = regimePrimary.toLowerCase();
  const affinities = def.regimeAffinity.map(r => r.toLowerCase());

  if (affinities.includes('any')) return 0;
  if (affinities.some(a => regimeLower.includes(a))) return 0.06;

  const bearishRegimes = ['risk_off', 'high_volatility', 'contraction'];
  const bullishRegimes = ['risk_on', 'neutral', 'expansion'];
  const bearishHypotheses: HypothesisId[] = ['CAPITULATION_RESET', 'FORCED_LIQUIDATION_CASCADE', 'DISTRIBUTION_UNDER_HYPE', 'POST_UNLOCK_REDISTRIBUTION'];
  const bullishHypotheses: HypothesisId[] = ['GENUINE_EARLY_ACCUMULATION', 'FUNDAMENTALLY_IMPROVING_RERATING', 'SPOT_LED_HEALTHY_CONTINUATION'];

  if (bearishRegimes.some(r => regimeLower.includes(r)) && bullishHypotheses.includes(hypothesisId)) {
    return -0.08;
  }
  if (bullishRegimes.some(r => regimeLower.includes(r)) && bearishHypotheses.includes(hypothesisId)) {
    return -0.06;
  }

  return 0;
}

export function computeSequenceModifier(
  hypothesisId: HypothesisId,
  sequenceState?: string,
): number {
  if (!sequenceState) return 0;
  const def = HYPOTHESIS_DEFINITIONS[hypothesisId];
  const seqLower = sequenceState.toLowerCase();
  if (def.sequenceAffinity.some(a => seqLower.includes(a.toLowerCase()))) return 0.04;
  return 0;
}

export function computeCoverageModifier(
  hypothesisId: HypothesisId,
  coverage: CoverageState,
): number {
  const def = HYPOTHESIS_DEFINITIONS[hypothesisId];
  const requiredDomains = new Set<string>();
  for (const key of def.requiredForHighConfidence) {
    const parts = key.split('.');
    if (parts[0] === 'whale' || parts[0] === 'exchange') requiredDomains.add('onchain_behavior');
    if (parts[0] === 'oi' || parts[0] === 'funding' || parts[0] === 'liquidation' || parts[0] === 'leverage') requiredDomains.add('derivatives_pressure');
    if (parts[0] === 'fundamentals' || parts[0] === 'tvl' || parts[0] === 'revenue' || parts[0] === 'protocol' || parts[0] === 'unlock') requiredDomains.add('protocol_substance');
    if (parts[0] === 'security' || parts[0] === 'holder') requiredDomains.add('structural_safety');
    if (parts[0] === 'narrative' || parts[0] === 'sentiment') requiredDomains.add('narrative_attention');
    if (parts[0] === 'liquidity' || parts[0] === 'pair') requiredDomains.add('dex_emergence');
    if (parts[0] === 'volume' || parts[0] === 'price' || parts[0] === 'buy_sell' || parts[0] === 'spot') requiredDomains.add('market_surface');
  }

  let penalty = 0;
  for (const domain of requiredDomains) {
    if (coverage.missingDomains.includes(domain)) penalty -= 0.1;
    else if (coverage.staleDomains.includes(domain)) penalty -= 0.04;
  }

  if (coverage.overallCompleteness < 0.5) penalty -= 0.06;

  return Math.max(-0.3, penalty);
}
