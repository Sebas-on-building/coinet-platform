/**
 * Conditional Authority Policies — authority changes with conditions:
 * freshness, health, chain, asset type, token age, coverage.
 *
 * Strategy 3: Authority is conditional, not static.
 */

import type { AuthorityCondition, AuthorityStrength, TruthAtomAuthorityRule } from './types';
import { getProviderHealth, isProviderAvailable } from '../health-monitor';

export interface AuthorityContext {
  chain?: string;
  assetClass?: string;
  tokenAge?: 'fresh_launch' | 'early_stage' | 'established' | 'mature';
  currentTimestamp?: number;
}

export interface PolicyEvaluation {
  passes: boolean;
  effectiveStrength: AuthorityStrength;
  reasons: string[];
}

const STRENGTH_ORDER: Record<AuthorityStrength, number> = {
  ABSOLUTE: 4,
  HIGH: 3,
  MEDIUM: 2,
  WEAK: 1,
};

function degradeStrength(base: AuthorityStrength, levels: number): AuthorityStrength {
  const current = STRENGTH_ORDER[base];
  const degraded = Math.max(1, current - levels);
  const entries = Object.entries(STRENGTH_ORDER) as [AuthorityStrength, number][];
  return entries.find(([, v]) => v === degraded)?.[0] ?? 'WEAK';
}

export function evaluateAuthorityPolicy(
  rule: TruthAtomAuthorityRule,
  context: AuthorityContext,
): PolicyEvaluation {
  const reasons: string[] = [];
  let effectiveStrength = rule.strength;
  let passes = true;

  const cond = rule.conditions;

  if (cond.supportedChains && cond.supportedChains.length > 0 && context.chain) {
    if (!cond.supportedChains.includes(context.chain) && !cond.supportedChains.includes('*')) {
      passes = false;
      reasons.push(`Chain '${context.chain}' not supported by ${rule.sourceId}`);
    }
  }

  if (cond.assetClasses && cond.assetClasses.length > 0 && context.assetClass) {
    if (!cond.assetClasses.includes(context.assetClass)) {
      passes = false;
      reasons.push(`Asset class '${context.assetClass}' not covered`);
    }
  }

  if (cond.tokenAgeBands && cond.tokenAgeBands.length > 0 && context.tokenAge) {
    if (!cond.tokenAgeBands.includes(context.tokenAge)) {
      effectiveStrength = degradeStrength(effectiveStrength, 1);
      reasons.push(`Token age '${context.tokenAge}' outside optimal band — strength degraded`);
    }
  }

  if (!isProviderAvailable(rule.sourceId)) {
    passes = false;
    reasons.push(`Provider ${rule.sourceId} is unavailable (circuit open)`);
  }

  const health = getProviderHealth(rule.sourceId);

  if (cond.requiredHealthScoreMin !== undefined && health.healthScore < cond.requiredHealthScoreMin) {
    effectiveStrength = degradeStrength(effectiveStrength, 1);
    reasons.push(`Health score ${health.healthScore.toFixed(2)} below required ${cond.requiredHealthScoreMin}`);
  }

  if (cond.freshnessMaxMs !== undefined && health.staleDurationMs > cond.freshnessMaxMs) {
    effectiveStrength = degradeStrength(effectiveStrength, 1);
    reasons.push(`Data stale: ${(health.staleDurationMs / 1000).toFixed(0)}s exceeds ${(cond.freshnessMaxMs / 1000).toFixed(0)}s max`);
    if (health.staleDurationMs > cond.freshnessMaxMs * 3) {
      passes = false;
      reasons.push('Severely stale — authority disqualified');
    }
  }

  if (health.isStale && passes) {
    effectiveStrength = degradeStrength(effectiveStrength, 1);
    reasons.push('Provider data marked stale — strength degraded');
  }

  if (reasons.length === 0) {
    reasons.push(`Authority conditions met for ${rule.sourceId} on ${rule.truthAtomId}`);
  }

  return { passes, effectiveStrength, reasons };
}

export function selectBestCandidateByPolicy(
  candidates: TruthAtomAuthorityRule[],
  context: AuthorityContext,
): { rule: TruthAtomAuthorityRule; evaluation: PolicyEvaluation } | null {
  const evaluated = candidates
    .map(rule => ({ rule, evaluation: evaluateAuthorityPolicy(rule, context) }))
    .filter(e => e.evaluation.passes)
    .sort((a, b) => STRENGTH_ORDER[b.evaluation.effectiveStrength] - STRENGTH_ORDER[a.evaluation.effectiveStrength]);

  return evaluated[0] ?? null;
}
