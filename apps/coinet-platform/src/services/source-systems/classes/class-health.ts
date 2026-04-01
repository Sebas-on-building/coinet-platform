/**
 * Class Health — class-level degradation rules and downstream impact.
 *
 * Defines what happens to judgment when a whole truth class becomes
 * weak or unavailable.
 */

import type { TruthClass } from '../registry';
import { TRUTH_CLASSES } from '../registry';
import type { ClassVisibility } from './types';

export interface ClassDegradationRule {
  truthClass: TruthClass;
  confidencePenalty: number;
  affectedEngines: string[];
  affectedHypotheses: string[];
  hardBlocker: boolean;
  hardBlockerCondition?: string;
  degradationMessage: string;
}

export const CLASS_DEGRADATION_RULES: Record<string, ClassDegradationRule> = {
  [TRUTH_CLASSES.MARKET_SURFACE]: {
    truthClass: TRUTH_CLASSES.MARKET_SURFACE,
    confidencePenalty: 0.35,
    affectedEngines: ['state_engine', 'timing_engine', 'scenario_engine', 'confidence_engine'],
    affectedHypotheses: ['all'],
    hardBlocker: false,
    degradationMessage: 'Market surface visibility is degraded — price-location and volume awareness reduced.',
  },
  [TRUTH_CLASSES.DEX_EMERGENCE]: {
    truthClass: TRUTH_CLASSES.DEX_EMERGENCE,
    confidencePenalty: 0.15,
    affectedEngines: ['state_engine', 'hypothesis_engine'],
    affectedHypotheses: ['LOW_QUALITY_MANIPULATED_LAUNCH'],
    hardBlocker: false,
    degradationMessage: 'DEX emergence data unavailable — early discovery signals absent.',
  },
  [TRUTH_CLASSES.DERIVATIVES_PRESSURE]: {
    truthClass: TRUTH_CLASSES.DERIVATIVES_PRESSURE,
    confidencePenalty: 0.30,
    affectedEngines: ['hypothesis_engine', 'contradiction_engine', 'timing_engine', 'confidence_engine'],
    affectedHypotheses: ['LEVERAGE_DRIVEN_SQUEEZE', 'FORCED_LIQUIDATION_CASCADE', 'DISTRIBUTION_UNDER_HYPE'],
    hardBlocker: false,
    degradationMessage: 'Derivatives visibility degraded — crowding, liquidation, and leverage interpretation less certain.',
  },
  [TRUTH_CLASSES.PROTOCOL_SUBSTANCE]: {
    truthClass: TRUTH_CLASSES.PROTOCOL_SUBSTANCE,
    confidencePenalty: 0.20,
    affectedEngines: ['hypothesis_engine', 'scenario_engine', 'confidence_engine'],
    affectedHypotheses: ['FUNDAMENTALLY_IMPROVING_RERATING', 'SECTOR_SPILLOVER_REPRICING'],
    hardBlocker: false,
    degradationMessage: 'Protocol fundamentals unavailable — rerating and valuation quality judgments structurally limited.',
  },
  [TRUTH_CLASSES.ONCHAIN_BEHAVIOR]: {
    truthClass: TRUTH_CLASSES.ONCHAIN_BEHAVIOR,
    confidencePenalty: 0.30,
    affectedEngines: ['hypothesis_engine', 'contradiction_engine', 'confidence_engine'],
    affectedHypotheses: ['GENUINE_EARLY_ACCUMULATION', 'TREASURY_LED_DISTRIBUTION', 'POST_UNLOCK_REDISTRIBUTION'],
    hardBlocker: false,
    degradationMessage: 'On-chain coverage partial — whale and treasury behavior conclusions carry elevated uncertainty.',
  },
  [TRUTH_CLASSES.STRUCTURAL_SAFETY]: {
    truthClass: TRUTH_CLASSES.STRUCTURAL_SAFETY,
    confidencePenalty: 0.40,
    affectedEngines: ['hypothesis_engine', 'confidence_engine', 'doctrine_enforcer'],
    affectedHypotheses: ['LOW_QUALITY_MANIPULATED_LAUNCH'],
    hardBlocker: true,
    hardBlockerCondition: 'When asset is new/low-liquidity and safety cannot be assessed',
    degradationMessage: 'Structural safety visibility reduced — confidence hard-capped for early-stage or unknown assets.',
  },
  [TRUTH_CLASSES.NARRATIVE_ATTENTION]: {
    truthClass: TRUTH_CLASSES.NARRATIVE_ATTENTION,
    confidencePenalty: 0.10,
    affectedEngines: ['hypothesis_engine', 'scenario_engine'],
    affectedHypotheses: ['NARRATIVE_ONLY_REFLEXIVE_PUMP', 'DISTRIBUTION_UNDER_HYPE'],
    hardBlocker: false,
    degradationMessage: 'Narrative attention unavailable — memetic and attention-driven interpretations weakened.',
  },
  [TRUTH_CLASSES.ENTITY_CONTEXT]: {
    truthClass: TRUTH_CLASSES.ENTITY_CONTEXT,
    confidencePenalty: 0.15,
    affectedEngines: ['hypothesis_engine'],
    affectedHypotheses: ['GENUINE_EARLY_ACCUMULATION', 'TREASURY_LED_DISTRIBUTION'],
    hardBlocker: false,
    degradationMessage: 'Entity labeling unavailable — actor significance and smart-money interpretation uncertain.',
  },
  [TRUTH_CLASSES.REASONING_EXPRESSION]: {
    truthClass: TRUTH_CLASSES.REASONING_EXPRESSION,
    confidencePenalty: 0.05,
    affectedEngines: ['chat', 'token_page', 'alerts'],
    affectedHypotheses: [],
    hardBlocker: false,
    degradationMessage: 'Reasoning expression degraded — explanation quality reduced, structured judgment intact.',
  },
};

export function getDegradationRule(truthClass: TruthClass): ClassDegradationRule | undefined {
  return CLASS_DEGRADATION_RULES[truthClass];
}

export function getConfidencePenaltyForDegraded(truthClass: TruthClass, visibility: ClassVisibility): number {
  const rule = CLASS_DEGRADATION_RULES[truthClass];
  if (!rule) return 0;

  const multiplier: Record<ClassVisibility, number> = {
    healthy: 0,
    partial: 0.4,
    degraded: 0.7,
    stale_dominant: 0.85,
    blind: 1.0,
  };

  return rule.confidencePenalty * (multiplier[visibility] ?? 0);
}

export function isHardBlocker(truthClass: TruthClass, visibility: ClassVisibility): boolean {
  const rule = CLASS_DEGRADATION_RULES[truthClass];
  if (!rule) return false;
  return rule.hardBlocker && (visibility === 'blind' || visibility === 'stale_dominant');
}

export function getDegradationMessages(classVisibilities: Record<string, ClassVisibility>): string[] {
  const messages: string[] = [];
  for (const [tc, vis] of Object.entries(classVisibilities)) {
    if (vis === 'healthy' || vis === 'partial') continue;
    const rule = CLASS_DEGRADATION_RULES[tc];
    if (rule) messages.push(rule.degradationMessage);
  }
  return messages;
}

export function getAffectedHypothesisIds(classVisibilities: Record<string, ClassVisibility>): string[] {
  const affected = new Set<string>();
  for (const [tc, vis] of Object.entries(classVisibilities)) {
    if (vis === 'healthy') continue;
    const rule = CLASS_DEGRADATION_RULES[tc];
    if (rule) {
      for (const h of rule.affectedHypotheses) {
        affected.add(h);
      }
    }
  }
  return [...affected];
}

export function computeAggregatePenalty(classVisibilities: Record<string, ClassVisibility>): number {
  let totalPenalty = 0;
  for (const [tc, vis] of Object.entries(classVisibilities)) {
    totalPenalty += getConfidencePenaltyForDegraded(tc as TruthClass, vis);
  }
  return Math.min(totalPenalty, 0.75);
}
