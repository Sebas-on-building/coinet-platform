/**
 * Invalidation & Confirmation Engine — evaluates formal rules per hypothesis.
 */

import type { SignalSnapshot } from '../judgment/types';
import type { HypothesisId, HypothesisRuleRef, HypothesisInvalidationRule, HypothesisConfirmationRule, CoverageState } from './types';
import { HYPOTHESIS_DEFINITIONS } from './registry';
import { EVIDENCE_KEY_MAP } from './evidence-mapper-keys';

export interface InvalidationResult {
  triggeredInvalidationRules: HypothesisRuleRef[];
  triggeredConfirmationRules: HypothesisRuleRef[];
  totalInvalidationPenalty: number;
  whatWouldConfirmNext: string[];
  whatWouldBreakIt: string[];
}

function evaluateRuleKeys(keys: string[], signals: SignalSnapshot, coverage: CoverageState): { allPresent: boolean; avgStrength: number } {
  let presentCount = 0;
  let strengthSum = 0;
  for (const key of keys) {
    const mapping = EVIDENCE_KEY_MAP[key];
    if (!mapping) continue;
    const domainMissing = mapping.sourceDomains.some(d => coverage.missingDomains.includes(d));
    if (domainMissing) continue;
    const val = Math.max(0, Math.min(1, mapping.extract(signals)));
    if (val >= 0.25) {
      presentCount++;
      strengthSum += val;
    }
  }
  return {
    allPresent: presentCount >= keys.length,
    avgStrength: keys.length > 0 ? strengthSum / keys.length : 0,
  };
}

export function evaluateInvalidation(
  hypothesisId: HypothesisId,
  signals: SignalSnapshot,
  coverage: CoverageState,
): InvalidationResult {
  const def = HYPOTHESIS_DEFINITIONS[hypothesisId];
  const triggeredInv: HypothesisRuleRef[] = [];
  const triggeredConf: HypothesisRuleRef[] = [];
  let totalPenalty = 0;

  for (const rule of def.invalidationRules) {
    const result = evaluateRuleKeys(rule.requiredEvidenceKeys, signals, coverage);
    if (result.allPresent && result.avgStrength >= 0.3) {
      const effectiveSeverity = rule.triggerType === 'hard'
        ? rule.severity * 1.0
        : rule.severity * 0.7;
      triggeredInv.push({
        ruleId: rule.id,
        strength: result.avgStrength >= 0.6 ? 'strong' : 'medium',
        reason: rule.description,
      });
      totalPenalty += effectiveSeverity * Math.min(1, result.avgStrength);
    }
  }

  for (const rule of def.confirmationRules) {
    const result = evaluateRuleKeys(rule.requiredEvidenceKeys, signals, coverage);
    if (result.allPresent && result.avgStrength >= 0.3) {
      triggeredConf.push({
        ruleId: rule.id,
        strength: rule.strength,
        reason: rule.description,
      });
    }
  }

  const whatWouldConfirmNext = def.confirmationRules
    .filter(r => !triggeredConf.some(t => t.ruleId === r.id))
    .map(r => r.description);

  const whatWouldBreakIt = def.invalidationRules
    .filter(r => !triggeredInv.some(t => t.ruleId === r.id))
    .map(r => r.description);

  return {
    triggeredInvalidationRules: triggeredInv,
    triggeredConfirmationRules: triggeredConf,
    totalInvalidationPenalty: Math.min(0.8, totalPenalty),
    whatWouldConfirmNext,
    whatWouldBreakIt,
  };
}
