/**
 * Challenger Matrix — Strategy 2: Challenger Rights.
 *
 * A challenger is not merely a backup. It is a source that can weaken
 * or dispute a primary claim even when the primary is healthy.
 *
 * Key distinction:
 *   - Metric challengers dispute the raw data value
 *   - Interpretation challengers dispute what the data means for a thesis
 */

import { TRUTH_CLASSES } from '../registry';
import type { ChallengerRule } from './types';

const TC = TRUTH_CLASSES;

export const CHALLENGER_RULES: ChallengerRule[] = [
  // ── Derivatives claims challenged by spot/behavior ─────────────────────
  {
    challengerId: 'market_surface_composite',
    challengerClass: TC.MARKET_SURFACE,
    targetAtomId: 'oi.velocity',
    targetPrimaryId: 'coinglass',
    challengeType: 'interpretation',
    weakenStrength: 0.25,
    description: 'Spot volume and price action can challenge whether OI velocity reflects real directional conviction or leverage-only noise',
    triggerCondition: 'spot_volume_diverges_from_oi_direction',
  },
  {
    challengerId: 'onchain_behavior_composite',
    challengerClass: TC.ONCHAIN_BEHAVIOR,
    targetAtomId: 'funding.rate',
    targetPrimaryId: 'coinglass',
    challengeType: 'interpretation',
    weakenStrength: 0.20,
    description: 'On-chain spot accumulation can challenge whether stretched funding implies imminent reversal',
    triggerCondition: 'strong_spot_accumulation_despite_stretched_funding',
  },
  {
    challengerId: 'onchain_behavior_composite',
    challengerClass: TC.ONCHAIN_BEHAVIOR,
    targetAtomId: 'crowding.index',
    targetPrimaryId: 'coinglass',
    challengeType: 'interpretation',
    weakenStrength: 0.30,
    description: 'On-chain flows can challenge whether crowding is purely speculative or backed by real demand',
    triggerCondition: 'strong_exchange_outflows_despite_high_crowding',
  },

  // ── Protocol substance challenged by behavior ──────────────────────────
  {
    challengerId: 'onchain_behavior_composite',
    challengerClass: TC.ONCHAIN_BEHAVIOR,
    targetAtomId: 'protocol.tvl',
    targetPrimaryId: 'defillama',
    challengeType: 'interpretation',
    weakenStrength: 0.20,
    description: 'On-chain behavior can challenge whether TVL growth reflects real participation or mercenary capital',
    triggerCondition: 'tvl_growing_but_wallet_diversity_declining',
  },
  {
    challengerId: 'market_surface_composite',
    challengerClass: TC.MARKET_SURFACE,
    targetAtomId: 'protocol.revenue.usd',
    targetPrimaryId: 'defillama',
    challengeType: 'interpretation',
    weakenStrength: 0.15,
    description: 'Market surface can challenge whether revenue growth is reflected in market pricing or is already priced in',
    triggerCondition: 'revenue_growing_but_price_flat_or_declining',
  },

  // ── Structural safety challenged by behavior ──────────────────────────
  {
    challengerId: 'onchain_behavior_composite',
    challengerClass: TC.ONCHAIN_BEHAVIOR,
    targetAtomId: 'security.risk_score',
    targetPrimaryId: 'goplus',
    challengeType: 'interpretation',
    weakenStrength: 0.25,
    description: 'Sustained healthy on-chain behavior can challenge whether static security flags remain at initial severity',
    triggerCondition: 'security_flags_present_but_no_exploit_exercise_over_time',
  },
  {
    challengerId: 'onchain_behavior_composite',
    challengerClass: TC.ONCHAIN_BEHAVIOR,
    targetAtomId: 'security.ownership_conc',
    targetPrimaryId: 'goplus',
    challengeType: 'interpretation',
    weakenStrength: 0.20,
    description: 'Deepening liquidity and diverse holder growth can challenge whether ownership concentration severity holds',
    triggerCondition: 'holder_growth_and_liquidity_deepening',
  },

  // ── Narrative challenged by substance and safety ──────────────────────
  {
    challengerId: 'protocol_substance_composite',
    challengerClass: TC.PROTOCOL_SUBSTANCE,
    targetAtomId: 'narrative.intensity',
    targetPrimaryId: 'lunarcrush',
    challengeType: 'interpretation',
    weakenStrength: 0.30,
    description: 'Weak or absent protocol substance challenges whether narrative intensity reflects real quality',
    triggerCondition: 'narrative_hot_but_substance_weak_or_declining',
  },
  {
    challengerId: 'structural_safety_composite',
    challengerClass: TC.STRUCTURAL_SAFETY,
    targetAtomId: 'social.acceleration',
    targetPrimaryId: 'lunarcrush',
    challengeType: 'interpretation',
    weakenStrength: 0.35,
    description: 'Safety red flags challenge whether social acceleration on a structurally unsafe token should be trusted',
    triggerCondition: 'social_hot_but_safety_flags_elevated',
  },

  // ── Market surface challenged by DEX emergence ────────────────────────
  {
    challengerId: 'dex_emergence_composite',
    challengerClass: TC.DEX_EMERGENCE,
    targetAtomId: 'price.spot',
    targetPrimaryId: 'coingecko',
    challengeType: 'metric',
    weakenStrength: 0.15,
    description: 'DEX-native pricing can challenge CEX-aggregated spot when liquidity is primarily DEX-based',
    triggerCondition: 'majority_liquidity_on_dex_not_cex',
  },

  // ── Entity context challenged by behavior ─────────────────────────────
  {
    challengerId: 'onchain_behavior_composite',
    challengerClass: TC.ONCHAIN_BEHAVIOR,
    targetAtomId: 'entity.label_confidence',
    targetPrimaryId: 'arkham',
    challengeType: 'interpretation',
    weakenStrength: 0.20,
    description: 'Actual on-chain behavior can challenge stale or low-confidence entity labels',
    triggerCondition: 'entity_label_stale_and_behavior_contradicts_assumed_role',
  },

  // ── On-chain behavior interpretation escalated by entity context ──────
  {
    challengerId: 'entity_context_composite',
    challengerClass: TC.ENTITY_CONTEXT,
    targetAtomId: 'wallet.whale_flow',
    targetPrimaryId: 'alchemy',
    challengeType: 'interpretation',
    weakenStrength: 0.20,
    description: 'Entity identity challenges raw whale flow interpretation — known exchange hot wallet vs real accumulator',
    triggerCondition: 'whale_flow_detected_but_entity_is_exchange_or_contract',
  },
];

export function getChallengersForAtom(truthAtomId: string): ChallengerRule[] {
  return CHALLENGER_RULES.filter(r => r.targetAtomId === truthAtomId);
}

export function getChallengersForPrimary(primarySourceId: string): ChallengerRule[] {
  return CHALLENGER_RULES.filter(r => r.targetPrimaryId === primarySourceId);
}

export function getChallengersByClass(truthClass: string): ChallengerRule[] {
  return CHALLENGER_RULES.filter(r => r.challengerClass === truthClass);
}

export function getMetricChallengers(): ChallengerRule[] {
  return CHALLENGER_RULES.filter(r => r.challengeType === 'metric');
}

export function getInterpretationChallengers(): ChallengerRule[] {
  return CHALLENGER_RULES.filter(r => r.challengeType === 'interpretation');
}
