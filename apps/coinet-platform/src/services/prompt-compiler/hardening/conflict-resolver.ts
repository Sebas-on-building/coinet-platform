/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     ⚔️ CONFLICT CLASSIFIER + TIE-BREAK RULES                                 ║
 * ║                                                                               ║
 * ║   Deterministic behavior when Grok and Gemini disagree.                      ║
 * ║   No silent picking — explicit handling of conflicts.                        ║
 * ║                                                                               ║
 * ║   CONFLICT CLASSES:                                                           ║
 * ║   - HARD: Opposite direction / incompatible causal story                     ║
 * ║   - SOFT: Different emphasis, both plausible                                 ║
 * ║   - COVERAGE: One engine relies on weaker/missing evidence                   ║
 * ║                                                                               ║
 * ║   @version 1.0.0 - Production hardening                                      ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { logger } from '../../../utils/logger';
import type { InsightPack, InsightDriver, InsightRisk, ConfidenceLevel } from '../research-engine';

// ============================================================================
// TYPES
// ============================================================================

export type ConflictClass = 'HARD' | 'SOFT' | 'COVERAGE' | 'NONE';

export interface DriverConflict {
  grokDriver: InsightDriver | null;
  geminiDriver: InsightDriver | null;
  conflictClass: ConflictClass;
  reason: string;
  resolution: ConflictResolution;
}

export interface RiskConflict {
  grokRisk: InsightRisk | null;
  geminiRisk: InsightRisk | null;
  conflictClass: ConflictClass;
  reason: string;
  resolution: ConflictResolution;
}

export interface ConflictResolution {
  action: 'KEEP_BOTH' | 'PREFER_GROK' | 'PREFER_GEMINI' | 'MERGE' | 'DEMOTE_BOTH' | 'FLAG_MIXED';
  confidenceAdjustment: 'NONE' | 'DOWNGRADE_ONE' | 'DOWNGRADE_BOTH' | 'CAP_AT_MEDIUM';
  addUnknown: string | null;
  triggerRefresh: boolean;
}

export interface ConflictAnalysis {
  driverConflicts: DriverConflict[];
  riskConflicts: RiskConflict[];
  scenarioConflict: {
    hasConflict: boolean;
    conflictClass: ConflictClass;
    reason: string;
  };
  overallConflictLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
  maxAllowedConfidence: ConfidenceLevel;
  mustShowMixedSignals: boolean;
  shouldTriggerRefresh: boolean;
  unknownsToAdd: string[];
}

// ============================================================================
// DIRECTION DETECTION
// ============================================================================

const BULLISH_INDICATORS = [
  /\b(bullish|positive|upside|growth|rally|pump|moon|breakout|accumulation)\b/i,
  /\b(strong|increasing|rising|improving|surging)\b/i,
  /\b(buy|long|accumulate|support|floor)\b/i,
];

const BEARISH_INDICATORS = [
  /\b(bearish|negative|downside|decline|dump|crash|breakdown|distribution)\b/i,
  /\b(weak|decreasing|falling|declining|dropping)\b/i,
  /\b(sell|short|distribute|resistance|ceiling)\b/i,
];

const RISK_INDICATORS = [
  /\b(risk|danger|warning|concern|problem|issue|red flag)\b/i,
  /\b(rug|scam|honeypot|fraud|manipulation)\b/i,
  /\b(concentrated|whale|insider|dump)\b/i,
];

type Direction = 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'RISK_FOCUSED';

function detectDirection(text: string): Direction {
  const bullishScore = BULLISH_INDICATORS.filter(p => p.test(text)).length;
  const bearishScore = BEARISH_INDICATORS.filter(p => p.test(text)).length;
  const riskScore = RISK_INDICATORS.filter(p => p.test(text)).length;
  
  if (riskScore >= 2) return 'RISK_FOCUSED';
  if (bullishScore > bearishScore + 1) return 'BULLISH';
  if (bearishScore > bullishScore + 1) return 'BEARISH';
  return 'NEUTRAL';
}

function directionsConflict(d1: Direction, d2: Direction): boolean {
  if (d1 === 'BULLISH' && d2 === 'BEARISH') return true;
  if (d1 === 'BEARISH' && d2 === 'BULLISH') return true;
  return false;
}

// ============================================================================
// TOPIC SIMILARITY (reused from aggregator)
// ============================================================================

function normalizeTopic(topic: string): string {
  return topic.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\b(the|a|an|is|are|was|were|has|have|had)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function topicsSimilar(a: string, b: string): boolean {
  const normA = normalizeTopic(a);
  const normB = normalizeTopic(b);
  
  if (normA === normB) return true;
  if (normA.includes(normB) || normB.includes(normA)) return true;
  
  // Word overlap check
  const wordsA = new Set(normA.split(' ').filter(w => w.length > 2));
  const wordsB = new Set(normB.split(' ').filter(w => w.length > 2));
  const overlap = [...wordsA].filter(w => wordsB.has(w)).length;
  
  if (overlap >= 2) return true;
  if (overlap >= 1 && (wordsA.size <= 3 || wordsB.size <= 3)) return true;
  
  return false;
}

// ============================================================================
// CONFLICT CLASSIFICATION
// ============================================================================

function classifyDriverConflict(
  grok: InsightDriver | null,
  gemini: InsightDriver | null
): { conflictClass: ConflictClass; reason: string } {
  // No conflict if one is missing
  if (!grok || !gemini) {
    return { conflictClass: 'NONE', reason: 'Single engine only' };
  }
  
  // Check for direction conflict
  const grokDirection = detectDirection(grok.summary);
  const geminiDirection = detectDirection(gemini.summary);
  
  if (directionsConflict(grokDirection, geminiDirection)) {
    return {
      conflictClass: 'HARD',
      reason: `Direction mismatch: Grok=${grokDirection}, Gemini=${geminiDirection}`,
    };
  }
  
  // Check for confidence mismatch (one says high, other says low)
  if (
    (grok.confidence === 'high' && gemini.confidence === 'low') ||
    (grok.confidence === 'low' && gemini.confidence === 'high')
  ) {
    return {
      conflictClass: 'SOFT',
      reason: `Confidence mismatch: Grok=${grok.confidence}, Gemini=${gemini.confidence}`,
    };
  }
  
  // Check for coverage conflict (one has better evidence)
  const grokEvidence = grok.evidence_keys.length;
  const geminiEvidence = gemini.evidence_keys.length;
  
  if (grokEvidence === 0 && geminiEvidence > 0) {
    return {
      conflictClass: 'COVERAGE',
      reason: 'Grok lacks evidence, Gemini has evidence',
    };
  }
  if (geminiEvidence === 0 && grokEvidence > 0) {
    return {
      conflictClass: 'COVERAGE',
      reason: 'Gemini lacks evidence, Grok has evidence',
    };
  }
  
  // Different but not conflicting
  if (grok.summary !== gemini.summary) {
    return {
      conflictClass: 'SOFT',
      reason: 'Different emphasis, both plausible',
    };
  }
  
  return { conflictClass: 'NONE', reason: 'Aligned' };
}

function classifyRiskConflict(
  grok: InsightRisk | null,
  gemini: InsightRisk | null
): { conflictClass: ConflictClass; reason: string } {
  if (!grok || !gemini) {
    return { conflictClass: 'NONE', reason: 'Single engine only' };
  }
  
  // Risk severity mismatch
  if (
    (grok.confidence === 'high' && gemini.confidence === 'low') ||
    (grok.confidence === 'low' && gemini.confidence === 'high')
  ) {
    return {
      conflictClass: 'HARD',
      reason: `Risk severity mismatch: Grok=${grok.confidence}, Gemini=${gemini.confidence}`,
    };
  }
  
  // Coverage conflict
  if (grok.evidence_keys.length === 0 && gemini.evidence_keys.length > 0) {
    return {
      conflictClass: 'COVERAGE',
      reason: 'Grok risk lacks evidence',
    };
  }
  if (gemini.evidence_keys.length === 0 && grok.evidence_keys.length > 0) {
    return {
      conflictClass: 'COVERAGE',
      reason: 'Gemini risk lacks evidence',
    };
  }
  
  return { conflictClass: 'NONE', reason: 'Aligned on risk' };
}

// ============================================================================
// RESOLUTION RULES (DETERMINISTIC)
// ============================================================================

function resolveDriverConflict(
  conflictClass: ConflictClass,
  grok: InsightDriver | null,
  gemini: InsightDriver | null
): ConflictResolution {
  switch (conflictClass) {
    case 'HARD':
      return {
        action: 'FLAG_MIXED',
        confidenceAdjustment: 'CAP_AT_MEDIUM',
        addUnknown: `Engines disagree on direction for "${grok?.topic || gemini?.topic}"`,
        triggerRefresh: true,
      };
    
    case 'SOFT':
      return {
        action: 'KEEP_BOTH',
        confidenceAdjustment: 'DOWNGRADE_BOTH',
        addUnknown: null,
        triggerRefresh: false,
      };
    
    case 'COVERAGE':
      // Prefer the one with evidence
      const grokHasEvidence = (grok?.evidence_keys.length || 0) > 0;
      return {
        action: grokHasEvidence ? 'PREFER_GROK' : 'PREFER_GEMINI',
        confidenceAdjustment: 'DOWNGRADE_ONE',
        addUnknown: null,
        triggerRefresh: false,
      };
    
    case 'NONE':
    default:
      return {
        action: 'MERGE',
        confidenceAdjustment: 'NONE',
        addUnknown: null,
        triggerRefresh: false,
      };
  }
}

function resolveRiskConflict(
  conflictClass: ConflictClass,
  grok: InsightRisk | null,
  gemini: InsightRisk | null
): ConflictResolution {
  switch (conflictClass) {
    case 'HARD':
      // For risks, always err on the side of caution
      return {
        action: 'KEEP_BOTH',
        confidenceAdjustment: 'CAP_AT_MEDIUM',
        addUnknown: `Risk assessment differs: review both perspectives`,
        triggerRefresh: true,
      };
    
    case 'SOFT':
      return {
        action: 'KEEP_BOTH',
        confidenceAdjustment: 'NONE',
        addUnknown: null,
        triggerRefresh: false,
      };
    
    case 'COVERAGE':
      // Keep both but mark the one without evidence as lower confidence
      return {
        action: 'KEEP_BOTH',
        confidenceAdjustment: 'DOWNGRADE_ONE',
        addUnknown: null,
        triggerRefresh: false,
      };
    
    case 'NONE':
    default:
      return {
        action: 'MERGE',
        confidenceAdjustment: 'NONE',
        addUnknown: null,
        triggerRefresh: false,
      };
  }
}

// ============================================================================
// SCENARIO CONFLICT DETECTION
// ============================================================================

function analyzeScenarioConflict(
  grok: InsightPack | null,
  gemini: InsightPack | null
): { hasConflict: boolean; conflictClass: ConflictClass; reason: string } {
  if (!grok || !gemini) {
    return { hasConflict: false, conflictClass: 'NONE', reason: 'Single engine' };
  }
  
  const grokScenarios = grok.insight.scenarios;
  const geminiScenarios = gemini.insight.scenarios;
  
  // Check bull case direction
  const grokBullDir = detectDirection(grokScenarios.bull);
  const geminiBullDir = detectDirection(geminiScenarios.bull);
  
  if (directionsConflict(grokBullDir, geminiBullDir)) {
    return {
      hasConflict: true,
      conflictClass: 'HARD',
      reason: 'Bull scenarios have opposite directions',
    };
  }
  
  // Check bear case direction
  const grokBearDir = detectDirection(grokScenarios.bear);
  const geminiBearDir = detectDirection(geminiScenarios.bear);
  
  if (directionsConflict(grokBearDir, geminiBearDir)) {
    return {
      hasConflict: true,
      conflictClass: 'HARD',
      reason: 'Bear scenarios have opposite directions',
    };
  }
  
  // Check overall confidence alignment
  if (grok.insight.overall_confidence !== gemini.insight.overall_confidence) {
    const confDiff = Math.abs(
      ['low', 'medium', 'high'].indexOf(grok.insight.overall_confidence) -
      ['low', 'medium', 'high'].indexOf(gemini.insight.overall_confidence)
    );
    
    if (confDiff >= 2) {
      return {
        hasConflict: true,
        conflictClass: 'HARD',
        reason: `Large confidence gap: Grok=${grok.insight.overall_confidence}, Gemini=${gemini.insight.overall_confidence}`,
      };
    }
  }
  
  return { hasConflict: false, conflictClass: 'NONE', reason: 'Scenarios aligned' };
}

// ============================================================================
// MAIN ANALYSIS FUNCTION
// ============================================================================

export function analyzeConflicts(
  grok: InsightPack | null,
  gemini: InsightPack | null
): ConflictAnalysis {
  const driverConflicts: DriverConflict[] = [];
  const riskConflicts: RiskConflict[] = [];
  const unknownsToAdd: string[] = [];
  
  let hardConflictCount = 0;
  let softConflictCount = 0;
  let shouldTriggerRefresh = false;
  
  // Analyze driver conflicts
  const grokDrivers = grok?.insight.drivers || [];
  const geminiDrivers = gemini?.insight.drivers || [];
  const usedGeminiDrivers = new Set<number>();
  
  for (const grokDriver of grokDrivers) {
    // Find matching Gemini driver
    let matchedGemini: InsightDriver | null = null;
    let matchedIndex = -1;
    
    for (let i = 0; i < geminiDrivers.length; i++) {
      if (usedGeminiDrivers.has(i)) continue;
      if (topicsSimilar(grokDriver.topic, geminiDrivers[i].topic)) {
        matchedGemini = geminiDrivers[i];
        matchedIndex = i;
        break;
      }
    }
    
    if (matchedGemini && matchedIndex >= 0) {
      usedGeminiDrivers.add(matchedIndex);
    }
    
    const { conflictClass, reason } = classifyDriverConflict(grokDriver, matchedGemini);
    const resolution = resolveDriverConflict(conflictClass, grokDriver, matchedGemini);
    
    if (conflictClass === 'HARD') hardConflictCount++;
    if (conflictClass === 'SOFT') softConflictCount++;
    if (resolution.addUnknown) unknownsToAdd.push(resolution.addUnknown);
    if (resolution.triggerRefresh) shouldTriggerRefresh = true;
    
    driverConflicts.push({
      grokDriver,
      geminiDriver: matchedGemini,
      conflictClass,
      reason,
      resolution,
    });
  }
  
  // Add unmatched Gemini drivers
  for (let i = 0; i < geminiDrivers.length; i++) {
    if (usedGeminiDrivers.has(i)) continue;
    
    driverConflicts.push({
      grokDriver: null,
      geminiDriver: geminiDrivers[i],
      conflictClass: 'NONE',
      reason: 'Gemini-only driver',
      resolution: {
        action: 'KEEP_BOTH',
        confidenceAdjustment: 'DOWNGRADE_ONE',
        addUnknown: null,
        triggerRefresh: false,
      },
    });
  }
  
  // Analyze risk conflicts
  const grokRisks = grok?.insight.risks || [];
  const geminiRisks = gemini?.insight.risks || [];
  const usedGeminiRisks = new Set<number>();
  
  for (const grokRisk of grokRisks) {
    let matchedGemini: InsightRisk | null = null;
    let matchedIndex = -1;
    
    for (let i = 0; i < geminiRisks.length; i++) {
      if (usedGeminiRisks.has(i)) continue;
      if (topicsSimilar(grokRisk.risk, geminiRisks[i].risk)) {
        matchedGemini = geminiRisks[i];
        matchedIndex = i;
        break;
      }
    }
    
    if (matchedGemini && matchedIndex >= 0) {
      usedGeminiRisks.add(matchedIndex);
    }
    
    const { conflictClass, reason } = classifyRiskConflict(grokRisk, matchedGemini);
    const resolution = resolveRiskConflict(conflictClass, grokRisk, matchedGemini);
    
    if (conflictClass === 'HARD') hardConflictCount++;
    if (conflictClass === 'SOFT') softConflictCount++;
    if (resolution.addUnknown) unknownsToAdd.push(resolution.addUnknown);
    if (resolution.triggerRefresh) shouldTriggerRefresh = true;
    
    riskConflicts.push({
      grokRisk,
      geminiRisk: matchedGemini,
      conflictClass,
      reason,
      resolution,
    });
  }
  
  // Add unmatched Gemini risks
  for (let i = 0; i < geminiRisks.length; i++) {
    if (usedGeminiRisks.has(i)) continue;
    
    riskConflicts.push({
      grokRisk: null,
      geminiRisk: geminiRisks[i],
      conflictClass: 'NONE',
      reason: 'Gemini-only risk',
      resolution: {
        action: 'KEEP_BOTH',
        confidenceAdjustment: 'NONE', // Don't downgrade unique risks
        addUnknown: null,
        triggerRefresh: false,
      },
    });
  }
  
  // Analyze scenario conflict
  const scenarioConflict = analyzeScenarioConflict(grok, gemini);
  if (scenarioConflict.conflictClass === 'HARD') {
    hardConflictCount++;
    shouldTriggerRefresh = true;
    unknownsToAdd.push('Scenario narratives differ significantly');
  }
  
  // Determine overall conflict level
  let overallConflictLevel: ConflictAnalysis['overallConflictLevel'] = 'NONE';
  if (hardConflictCount >= 2) overallConflictLevel = 'HIGH';
  else if (hardConflictCount >= 1) overallConflictLevel = 'MEDIUM';
  else if (softConflictCount >= 2) overallConflictLevel = 'LOW';
  
  // Determine max allowed confidence
  let maxAllowedConfidence: ConfidenceLevel = 'high';
  if (hardConflictCount >= 1) maxAllowedConfidence = 'medium';
  if (hardConflictCount >= 2) maxAllowedConfidence = 'low';
  
  const mustShowMixedSignals = hardConflictCount >= 1 || softConflictCount >= 3;
  
  logger.info('⚔️ Conflict analysis complete', {
    hardConflicts: hardConflictCount,
    softConflicts: softConflictCount,
    overallLevel: overallConflictLevel,
    maxConfidence: maxAllowedConfidence,
    showMixed: mustShowMixedSignals,
  });
  
  return {
    driverConflicts,
    riskConflicts,
    scenarioConflict,
    overallConflictLevel,
    maxAllowedConfidence,
    mustShowMixedSignals,
    shouldTriggerRefresh,
    unknownsToAdd: [...new Set(unknownsToAdd)],
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  detectDirection,
  directionsConflict,
  classifyDriverConflict,
  classifyRiskConflict,
  resolveDriverConflict,
  resolveRiskConflict,
};
