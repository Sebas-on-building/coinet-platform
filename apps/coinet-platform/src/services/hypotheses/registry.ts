/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     HYPOTHESIS REGISTRY v1 — Canonical Definitions                            ║
 * ║                                                                               ║
 * ║   12 market-explanation classes with explicit evidence patterns,              ║
 * ║   confirmation rules, invalidation rules, regime/sequence affinity.          ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type { HypothesisDefinition, HypothesisId } from './types';

export const HYPOTHESIS_REGISTRY_VERSION = 'hypothesis-registry-v1' as const;

const V = HYPOTHESIS_REGISTRY_VERSION;

export const HYPOTHESIS_DEFINITIONS: Record<HypothesisId, HypothesisDefinition> = {
  GENUINE_EARLY_ACCUMULATION: {
    id: 'GENUINE_EARLY_ACCUMULATION',
    name: 'Genuine Early Accumulation',
    description: 'Smart money quietly building a position before broad market awareness. Low narrative, rising on-chain conviction, moderate or improving fundamentals.',
    idealContext: ['low narrative intensity', 'rising whale activity', 'exchange outflows', 'modest but positive price action', 'low leverage'],
    typicalSupports: ['whale.activity.rising', 'exchange.outflow.elevated', 'leverage.pressure.low', 'narrative.intensity.low', 'price.momentum.modest_positive', 'volume.moderate'],
    typicalContradictions: ['whale.entry.late_stage', 'sentiment.extreme_high', 'narrative.intensity.high_without_fundamentals'],
    regimeAffinity: ['risk_on', 'neutral'],
    sequenceAffinity: ['whale_before_price', 'outflow_before_narrative'],
    requiredForHighConfidence: ['whale.activity.rising', 'exchange.outflow.elevated'],
    confirmationRules: [
      { id: 'ea_conf_1', description: 'Sustained outflows with price holding or rising over 48h', requiredEvidenceKeys: ['exchange.outflow.elevated', 'price.momentum.modest_positive'], strength: 'strong' },
      { id: 'ea_conf_2', description: 'Whale accumulation deepens without narrative spike', requiredEvidenceKeys: ['whale.activity.rising', 'narrative.intensity.low'], strength: 'medium' },
    ],
    invalidationRules: [
      { id: 'ea_inv_1', description: 'Whale activity disappears while narrative spikes — likely narrative-driven not accumulation', triggerType: 'hard', requiredEvidenceKeys: ['whale.activity.absent', 'narrative.intensity.high'], thresholdLogic: 'whale drops below 0.15 AND narrative exceeds 0.6', severity: 0.7 },
      { id: 'ea_inv_2', description: 'Exchange inflows rise sharply — distribution not accumulation', triggerType: 'soft', requiredEvidenceKeys: ['exchange.inflow.elevated'], thresholdLogic: 'inflow exceeds 0.4', severity: 0.4 },
    ],
    excludedWith: ['LOW_QUALITY_MANIPULATED_LAUNCH', 'DISTRIBUTION_UNDER_HYPE'],
    version: V,
  },

  LEVERAGE_DRIVEN_SQUEEZE: {
    id: 'LEVERAGE_DRIVEN_SQUEEZE',
    name: 'Leverage-Driven Squeeze',
    description: 'Price continuation driven primarily by derivatives pressure rather than broad spot-led structural demand. Elevated OI, stretched funding, liquidation clustering.',
    idealContext: ['rising OI velocity', 'elevated funding', 'liquidation clustering near spot', 'weaker spot confirmation'],
    typicalSupports: ['oi.velocity.high', 'funding.rate.stretched', 'liquidation.cluster.near_spot', 'price.momentum.positive', 'leverage.over.spot'],
    typicalContradictions: ['spot.volume.strong_relative', 'protocol.inflows.strong', 'whale.accumulation.clean', 'funding.cooling_while_price_holds'],
    regimeAffinity: ['leverage_led_expansion', 'thin_liquidity_fragility'],
    sequenceAffinity: ['oi_before_spot', 'narrative_after_price', 'funding_expanding_late'],
    requiredForHighConfidence: ['oi.velocity.high', 'funding.rate.stretched'],
    confirmationRules: [
      { id: 'ls_conf_1', description: 'Price holds while liquidation density stays elevated and spot does not improve', requiredEvidenceKeys: ['oi.velocity.high', 'liquidation.cluster.near_spot'], strength: 'strong' },
      { id: 'ls_conf_2', description: 'Funding continues expanding with OI growth', requiredEvidenceKeys: ['funding.rate.stretched', 'oi.velocity.high'], strength: 'medium' },
    ],
    invalidationRules: [
      { id: 'ls_inv_1', description: 'Spot demand strengthens while funding cools and price holds — morphing to spot-led', triggerType: 'soft', requiredEvidenceKeys: ['spot.volume.strong_relative', 'funding.cooling_while_price_holds'], thresholdLogic: 'both present within same evaluation window', severity: 0.55 },
      { id: 'ls_inv_2', description: 'OI collapses while price drops — squeeze resolved via liquidation', triggerType: 'hard', requiredEvidenceKeys: ['oi.velocity.collapsing', 'price.momentum.negative'], thresholdLogic: 'OI drops >20% within window AND price negative', severity: 0.8 },
    ],
    excludedWith: ['GENUINE_EARLY_ACCUMULATION', 'SPOT_LED_HEALTHY_CONTINUATION'],
    version: V,
  },

  NARRATIVE_ONLY_REFLEXIVE_PUMP: {
    id: 'NARRATIVE_ONLY_REFLEXIVE_PUMP',
    name: 'Narrative-Only Reflexive Pump',
    description: 'Price driven by attention and sentiment without fundamental backing. High narrative, weak fundamentals, retail-dominated, low whale participation.',
    idealContext: ['high narrative intensity', 'high sentiment', 'weak fundamentals', 'low whale activity', 'retail volume'],
    typicalSupports: ['narrative.intensity.high', 'sentiment.elevated', 'fundamentals.weak', 'whale.activity.low', 'price.momentum.positive'],
    typicalContradictions: ['fundamentals.strength.improving', 'whale.accumulation.present', 'security.risk.low'],
    regimeAffinity: ['risk_on', 'narrative_ignition'],
    sequenceAffinity: ['narrative_before_fundamentals', 'sentiment_before_volume'],
    requiredForHighConfidence: ['narrative.intensity.high', 'fundamentals.weak'],
    confirmationRules: [
      { id: 'np_conf_1', description: 'Narrative intensity keeps rising while fundamentals stay flat', requiredEvidenceKeys: ['narrative.intensity.high', 'fundamentals.weak'], strength: 'strong' },
    ],
    invalidationRules: [
      { id: 'np_inv_1', description: 'Fundamentals materially improve — move may have real backing', triggerType: 'soft', requiredEvidenceKeys: ['fundamentals.strength.improving'], thresholdLogic: 'fundamentals_strength exceeds 0.45', severity: 0.5 },
      { id: 'np_inv_2', description: 'Smart money starts accumulating — not purely retail narrative', triggerType: 'soft', requiredEvidenceKeys: ['whale.accumulation.present'], thresholdLogic: 'whale_activity exceeds 0.35', severity: 0.4 },
    ],
    excludedWith: ['FUNDAMENTALLY_IMPROVING_RERATING'],
    version: V,
  },

  FUNDAMENTALLY_IMPROVING_RERATING: {
    id: 'FUNDAMENTALLY_IMPROVING_RERATING',
    name: 'Fundamentally Improving Rerating',
    description: 'Price appreciation driven by genuine protocol/business improvement. Rising TVL, revenue quality, and adoption with reasonable security.',
    idealContext: ['strong fundamentals', 'rising TVL', 'improving revenue', 'moderate price appreciation', 'low security risk'],
    typicalSupports: ['fundamentals.strength.high', 'tvl.trend.positive', 'revenue.quality.improving', 'price.momentum.moderate_positive', 'security.risk.low'],
    typicalContradictions: ['tvl.vs_inflows.divergent', 'price.vs_fundamentals.overextended'],
    regimeAffinity: ['neutral', 'risk_on'],
    sequenceAffinity: ['fundamentals_before_price', 'tvl_before_narrative'],
    requiredForHighConfidence: ['fundamentals.strength.high', 'tvl.trend.positive'],
    confirmationRules: [
      { id: 'fr_conf_1', description: 'TVL growth sustained with revenue improvement over multiple periods', requiredEvidenceKeys: ['tvl.trend.positive', 'revenue.quality.improving'], strength: 'strong' },
      { id: 'fr_conf_2', description: 'Narrative recognition follows fundamental improvement', requiredEvidenceKeys: ['fundamentals.strength.high', 'narrative.intensity.moderate'], strength: 'medium' },
    ],
    invalidationRules: [
      { id: 'fr_inv_1', description: 'TVL drops while price continues rising — decoupling from fundamentals', triggerType: 'soft', requiredEvidenceKeys: ['tvl.trend.negative', 'price.momentum.positive'], thresholdLogic: 'TVL negative while price positive for >48h', severity: 0.5 },
      { id: 'fr_inv_2', description: 'Security issue discovered — fundamental thesis compromised', triggerType: 'hard', requiredEvidenceKeys: ['security.risk.elevated'], thresholdLogic: 'security_risk exceeds 0.6', severity: 0.75 },
    ],
    excludedWith: ['NARRATIVE_ONLY_REFLEXIVE_PUMP', 'LOW_QUALITY_MANIPULATED_LAUNCH'],
    version: V,
  },

  LOW_QUALITY_MANIPULATED_LAUNCH: {
    id: 'LOW_QUALITY_MANIPULATED_LAUNCH',
    name: 'Low-Quality / Manipulated Launch',
    description: 'High security risk, concentrated holders, thin liquidity, very new pair. Likely manipulated or structurally dangerous.',
    idealContext: ['high security risk', 'concentrated holders', 'thin liquidity', 'very new pair age'],
    typicalSupports: ['security.risk.elevated', 'holder.concentration.high', 'liquidity.thin', 'pair.age.very_new'],
    typicalContradictions: ['security.risk.low', 'liquidity.depth.improving', 'holder.distribution.healthy'],
    regimeAffinity: ['any'],
    sequenceAffinity: ['launch_phase'],
    requiredForHighConfidence: ['security.risk.elevated', 'holder.concentration.high'],
    confirmationRules: [
      { id: 'lq_conf_1', description: 'Security flags persist while liquidity remains thin', requiredEvidenceKeys: ['security.risk.elevated', 'liquidity.thin'], strength: 'strong' },
    ],
    invalidationRules: [
      { id: 'lq_inv_1', description: 'Security audit clears, liquidity deepens, holders diversify — legitimacy emerging', triggerType: 'hard', requiredEvidenceKeys: ['security.risk.low', 'liquidity.depth.improving', 'holder.distribution.healthy'], thresholdLogic: 'all three present', severity: 0.8 },
    ],
    excludedWith: ['GENUINE_EARLY_ACCUMULATION', 'FUNDAMENTALLY_IMPROVING_RERATING'],
    version: V,
  },

  POST_UNLOCK_REDISTRIBUTION: {
    id: 'POST_UNLOCK_REDISTRIBUTION',
    name: 'Post-Unlock Redistribution',
    description: 'Selling pressure driven by token unlock events. Rising exchange inflows, declining price, weak whale accumulation.',
    idealContext: ['high unlock pressure', 'elevated exchange inflows', 'declining price', 'weak whale buying'],
    typicalSupports: ['unlock.pressure.high', 'exchange.inflow.elevated', 'price.momentum.negative', 'whale.activity.low'],
    typicalContradictions: ['whale.accumulation.absorbing_supply', 'fundamentals.strength.improving'],
    regimeAffinity: ['neutral', 'risk_off'],
    sequenceAffinity: ['unlock_before_inflow', 'inflow_before_price_drop'],
    requiredForHighConfidence: ['unlock.pressure.high', 'exchange.inflow.elevated'],
    confirmationRules: [
      { id: 'pu_conf_1', description: 'Inflows persist post-unlock with price continuing to decline', requiredEvidenceKeys: ['unlock.pressure.high', 'exchange.inflow.elevated', 'price.momentum.negative'], strength: 'strong' },
    ],
    invalidationRules: [
      { id: 'pu_inv_1', description: 'Whale activity absorbs unlock supply — price stabilizes', triggerType: 'soft', requiredEvidenceKeys: ['whale.accumulation.absorbing_supply', 'price.momentum.stabilizing'], thresholdLogic: 'whale_activity > 0.35 AND price momentum near zero', severity: 0.5 },
    ],
    version: V,
  },

  TREASURY_LED_DISTRIBUTION: {
    id: 'TREASURY_LED_DISTRIBUTION',
    name: 'Treasury-Led Distribution',
    description: 'Protocol or team treasury selling into market strength. Exchange inflows from identified treasury wallets, potentially masked by positive narrative.',
    idealContext: ['treasury wallet outflows to exchange', 'exchange inflows elevated', 'narrative may be positive', 'price flat or rising'],
    typicalSupports: ['exchange.inflow.elevated', 'whale.activity.distribution_pattern', 'price.momentum.flat_or_positive', 'narrative.intensity.moderate'],
    typicalContradictions: ['whale.accumulation.clean', 'exchange.outflow.elevated'],
    regimeAffinity: ['any'],
    sequenceAffinity: ['inflow_during_strength'],
    requiredForHighConfidence: ['exchange.inflow.elevated', 'whale.activity.distribution_pattern'],
    confirmationRules: [
      { id: 'td_conf_1', description: 'Inflows correlate with identified treasury wallet movements', requiredEvidenceKeys: ['exchange.inflow.elevated', 'whale.activity.distribution_pattern'], strength: 'decisive' },
    ],
    invalidationRules: [
      { id: 'td_inv_1', description: 'Exchange inflows reverse to outflows — distribution paused', triggerType: 'soft', requiredEvidenceKeys: ['exchange.outflow.elevated'], thresholdLogic: 'outflow exceeds inflow for >24h', severity: 0.5 },
    ],
    version: V,
  },

  SECTOR_SPILLOVER_REPRICING: {
    id: 'SECTOR_SPILLOVER_REPRICING',
    name: 'Sector Spillover Repricing',
    description: 'Price movement driven by sector-wide flow rotation rather than asset-specific fundamentals. Moderate narrative, weak individual fundamentals, correlated sector moves.',
    idealContext: ['moderate narrative', 'sector momentum', 'weak individual fundamentals', 'low leverage', 'correlated sector price action'],
    typicalSupports: ['narrative.intensity.moderate', 'price.momentum.positive', 'fundamentals.weak', 'leverage.pressure.low', 'volume.moderate'],
    typicalContradictions: ['fundamentals.strength.high', 'narrative.specific_to_asset'],
    regimeAffinity: ['risk_on', 'neutral'],
    sequenceAffinity: ['sector_leader_first', 'narrative_before_fundamentals'],
    requiredForHighConfidence: ['narrative.intensity.moderate', 'fundamentals.weak'],
    confirmationRules: [
      { id: 'ss_conf_1', description: 'Correlated sector assets move similarly without individual catalysts', requiredEvidenceKeys: ['narrative.intensity.moderate', 'fundamentals.weak'], strength: 'medium' },
    ],
    invalidationRules: [
      { id: 'ss_inv_1', description: 'Asset develops strong individual fundamentals — outgrowing sector', triggerType: 'soft', requiredEvidenceKeys: ['fundamentals.strength.high'], thresholdLogic: 'fundamentals exceeds 0.5', severity: 0.4 },
    ],
    version: V,
  },

  CAPITULATION_RESET: {
    id: 'CAPITULATION_RESET',
    name: 'Capitulation Reset',
    description: 'Broad selling exhaustion with potential bottom formation. Sharp price decline, elevated exchange inflows, negative sentiment, liquidation activity.',
    idealContext: ['sharp price decline', 'elevated exchange inflows', 'negative sentiment', 'high liquidation density', 'weak buy-sell ratio'],
    typicalSupports: ['price.momentum.sharp_negative', 'exchange.inflow.elevated', 'sentiment.negative', 'liquidation.density.elevated', 'buy_sell.ratio.weak'],
    typicalContradictions: ['volume.still_elevated', 'whale.still_active'],
    regimeAffinity: ['risk_off', 'high_volatility'],
    sequenceAffinity: ['price_drop_before_volume_dry', 'liquidation_before_recovery'],
    requiredForHighConfidence: ['price.momentum.sharp_negative', 'exchange.inflow.elevated'],
    confirmationRules: [
      { id: 'cr_conf_1', description: 'Volume dries up after sharp decline — selling exhaustion confirmed', requiredEvidenceKeys: ['price.momentum.sharp_negative', 'volume.declining'], strength: 'strong' },
      { id: 'cr_conf_2', description: 'Funding resets to neutral/negative from stretched positive', requiredEvidenceKeys: ['funding.rate.reset'], strength: 'medium' },
    ],
    invalidationRules: [
      { id: 'cr_inv_1', description: 'Price continues dropping with sustained volume — not capitulation, ongoing distribution', triggerType: 'soft', requiredEvidenceKeys: ['price.momentum.negative', 'volume.still_elevated'], thresholdLogic: 'continued decline with elevated volume >48h', severity: 0.5 },
    ],
    version: V,
  },

  FORCED_LIQUIDATION_CASCADE: {
    id: 'FORCED_LIQUIDATION_CASCADE',
    name: 'Forced Liquidation Cascade',
    description: 'Rapid unwinding of leveraged positions creating cascade selling. Extreme liquidation density, high leverage, rapid price movement.',
    idealContext: ['extreme liquidation density', 'high leverage pressure', 'high funding', 'rapid price movement'],
    typicalSupports: ['liquidation.density.extreme', 'leverage.pressure.extreme', 'funding.rate.stretched', 'price.momentum.rapid'],
    typicalContradictions: ['leverage.pressure.low', 'liquidation.density.low'],
    regimeAffinity: ['leverage_led_expansion', 'high_volatility', 'risk_off'],
    sequenceAffinity: ['oi_spike_before_cascade', 'funding_extreme_before_reversal'],
    requiredForHighConfidence: ['liquidation.density.extreme', 'leverage.pressure.extreme'],
    confirmationRules: [
      { id: 'fl_conf_1', description: 'OI drops sharply with price while liquidation events cluster', requiredEvidenceKeys: ['liquidation.density.extreme', 'leverage.pressure.extreme'], strength: 'decisive' },
    ],
    invalidationRules: [
      { id: 'fl_inv_1', description: 'Leverage resets and price stabilizes — cascade resolved', triggerType: 'hard', requiredEvidenceKeys: ['leverage.pressure.low', 'price.momentum.stabilizing'], thresholdLogic: 'leverage drops below 0.3 AND price stable', severity: 0.7 },
    ],
    version: V,
  },

  DISTRIBUTION_UNDER_HYPE: {
    id: 'DISTRIBUTION_UNDER_HYPE',
    name: 'Distribution Under Hype',
    description: 'Smart money distributing while retail buys the narrative. Elevated exchange inflows, high narrative, declining whale activity, price flat or slightly positive.',
    idealContext: ['elevated exchange inflows', 'high narrative', 'declining whale activity', 'price flat or slightly up'],
    typicalSupports: ['exchange.inflow.elevated', 'narrative.intensity.high', 'whale.activity.declining', 'price.momentum.flat', 'volume.moderate'],
    typicalContradictions: ['whale.accumulation.clean', 'exchange.outflow.elevated', 'fundamentals.improving'],
    regimeAffinity: ['risk_on', 'neutral'],
    sequenceAffinity: ['narrative_before_distribution', 'price_flat_during_inflow'],
    requiredForHighConfidence: ['exchange.inflow.elevated', 'narrative.intensity.high'],
    confirmationRules: [
      { id: 'dh_conf_1', description: 'Inflows persist while narrative remains strong and whale accumulation absent', requiredEvidenceKeys: ['exchange.inflow.elevated', 'narrative.intensity.high', 'whale.activity.declining'], strength: 'strong' },
    ],
    invalidationRules: [
      { id: 'dh_inv_1', description: 'Whales resume accumulation — distribution thesis weakened', triggerType: 'soft', requiredEvidenceKeys: ['whale.accumulation.clean'], thresholdLogic: 'whale_activity exceeds 0.4', severity: 0.5 },
    ],
    excludedWith: ['GENUINE_EARLY_ACCUMULATION'],
    version: V,
  },

  SPOT_LED_HEALTHY_CONTINUATION: {
    id: 'SPOT_LED_HEALTHY_CONTINUATION',
    name: 'Spot-Led Healthy Continuation',
    description: 'Genuine broad-based demand driving price higher. Strong spot volume relative to leverage, healthy buy-sell ratio, improving liquidity, moderate fundamentals.',
    idealContext: ['strong spot volume', 'healthy buy-sell ratio', 'improving liquidity', 'moderate leverage', 'spot over leverage'],
    typicalSupports: ['volume.strong', 'buy_sell.ratio.healthy', 'liquidity.improving', 'leverage.pressure.moderate', 'spot.over.leverage', 'whale.activity.moderate'],
    typicalContradictions: ['leverage.over.spot', 'funding.rate.extreme', 'exchange.inflow.elevated'],
    regimeAffinity: ['risk_on', 'neutral'],
    sequenceAffinity: ['spot_before_leverage', 'volume_before_narrative'],
    requiredForHighConfidence: ['volume.strong', 'buy_sell.ratio.healthy'],
    confirmationRules: [
      { id: 'sc_conf_1', description: 'Spot volume sustains above leverage with healthy ratio over multiple periods', requiredEvidenceKeys: ['volume.strong', 'spot.over.leverage'], strength: 'strong' },
      { id: 'sc_conf_2', description: 'Liquidity deepens as price rises', requiredEvidenceKeys: ['liquidity.improving', 'price.momentum.positive'], strength: 'medium' },
    ],
    invalidationRules: [
      { id: 'sc_inv_1', description: 'Leverage overtakes spot and funding stretches — morphing to leverage-driven', triggerType: 'soft', requiredEvidenceKeys: ['leverage.over.spot', 'funding.rate.stretched'], thresholdLogic: 'leverage exceeds spot volume AND funding > 0.5', severity: 0.55 },
      { id: 'sc_inv_2', description: 'Volume dries up while price stalls — continuation thesis fading', triggerType: 'soft', requiredEvidenceKeys: ['volume.declining', 'price.momentum.stalling'], thresholdLogic: 'volume < 0.2 AND momentum near zero', severity: 0.4 },
    ],
    excludedWith: ['LEVERAGE_DRIVEN_SQUEEZE'],
    version: V,
  },
};

export function getHypothesisDefinition(id: HypothesisId): HypothesisDefinition {
  return HYPOTHESIS_DEFINITIONS[id];
}

export function getAllHypothesisDefinitions(): HypothesisDefinition[] {
  return Object.values(HYPOTHESIS_DEFINITIONS);
}
