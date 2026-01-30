/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🔀 INSIGHT PACK AGGREGATOR                                                ║
 * ║                                                                               ║
 * ║   Merges Grok and Gemini Insight Packs into FinalInsightObject.               ║
 * ║   Deterministic ranking, topic canonicalization, disagreement meter.          ║
 * ║                                                                               ║
 * ║   OUTPUT CONTRACT:                                                            ║
 * ║   - Merged drivers (ranked, bounded to 5)                                     ║
 * ║   - Merged risks (bounded to 5)                                               ║
 * ║   - Merged scenarios (from higher-confidence engine)                          ║
 * ║   - Agreement tags per item                                                   ║
 * ║   - Disagreement meter (0-100)                                                ║
 * ║   - Final confidence (capped by disagreement)                                 ║
 * ║                                                                               ║
 * ║   @version 1.0.0                                                              ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { z } from 'zod';
import { logger } from '../../utils/logger';
import { EvidencePack } from '../evidence-pack/types';
import { InsightPackV1, Driver, Risk, Scenarios, Unknown, ConfidenceLevel } from './types';

// ============================================================================
// TOPIC CANONICALIZATION
// ============================================================================

/**
 * Canonical topic synonyms map.
 * Grows from observed logs - keep intentionally small.
 */
const TOPIC_SYNONYMS: Record<string, string> = {
  // Liquidations
  'liq_wipeout': 'liquidations',
  'stop_run': 'liquidations',
  'liquidation_cascade': 'liquidations',
  'liq': 'liquidations',
  
  // Funding/OI
  'derivs': 'funding_oi',
  'derivatives': 'funding_oi',
  'open_interest': 'funding_oi',
  'funding': 'funding_oi',
  'funding_rate': 'funding_oi',
  'oi': 'funding_oi',
  
  // News
  'news': 'news_catalyst',
  'headline': 'news_catalyst',
  'announcement': 'news_catalyst',
  'breaking': 'news_catalyst',
  
  // Macro
  'macro_news': 'macro',
  'market_macro': 'macro',
  'btc_correlation': 'macro',
  
  // Sentiment
  'sentiment': 'sentiment_shift',
  'social': 'sentiment_shift',
  'ct_sentiment': 'sentiment_shift',
  'fear_greed': 'sentiment_shift',
  
  // Security
  'security': 'security_flags',
  'rug_risk': 'security_flags',
  'honeypot': 'security_flags',
  'scam': 'security_flags',
  
  // Holders
  'holders': 'holders_concentration',
  'whale_holders': 'holders_concentration',
  'concentration': 'holders_concentration',
  'top_holders': 'holders_concentration',
  
  // On-chain
  'onchain': 'onchain_flows',
  'whale_flows': 'onchain_flows',
  'exchange_flows': 'onchain_flows',
  
  // Orderflow
  'order_flow': 'orderflow',
  'buys_sells': 'orderflow',
  'txns': 'orderflow',
  
  // Structure
  'breakout': 'structure_break',
  'breakdown': 'structure_break',
  'trend_change': 'structure_break',
  
  // Range
  'range': 'range_chop',
  'consolidation': 'range_chop',
  'sideways': 'range_chop',
  
  // Price
  'price': 'price_momentum',
  'momentum': 'price_momentum',
  'price_action': 'price_momentum',
  
  // Liquidity
  'liquidity': 'liquidity_depth',
  'depth': 'liquidity_depth',
  'thin_liquidity': 'liquidity_depth',
  
  // Whales
  'whale': 'whale_activity',
  'whales': 'whale_activity',
  'big_wallet': 'whale_activity',
};

/**
 * Normalize a topic to canonical form.
 */
export function normalizeTopic(topic: string): string {
  // Clean and lowercase
  const cleaned = topic.toLowerCase().trim().replace(/\s+/g, '_');
  
  // Check synonym map
  if (TOPIC_SYNONYMS[cleaned]) {
    return TOPIC_SYNONYMS[cleaned];
  }
  
  // Check if already canonical
  const canonicalTopics = new Set(Object.values(TOPIC_SYNONYMS));
  if (canonicalTopics.has(cleaned)) {
    return cleaned;
  }
  
  // Return cleaned version
  return cleaned;
}

// ============================================================================
// MODULE TRUST WEIGHTS
// ============================================================================

/**
 * Module trust weights for driver scoring.
 * Higher = more trustworthy.
 */
const MODULE_TRUST_WEIGHTS: Record<string, number> = {
  'dexscreener': 3,
  'derivatives': 3,
  'onchain': 3,
  'security': 2,
  'holders': 2,
  'market_snapshot': 2,
  'sentiment': 1,
  'news': 1,
};

/**
 * Extract module from evidence key.
 */
function extractModuleFromKey(evidenceKey: string): string | null {
  const match = evidenceKey.match(/^evidence\.(\w+)\./);
  return match ? match[1] : null;
}

/**
 * Calculate trust score for evidence keys.
 */
function calculateTrustScore(evidenceKeys: string[]): number {
  let score = 0;
  for (const key of evidenceKeys) {
    const module = extractModuleFromKey(key);
    if (module && MODULE_TRUST_WEIGHTS[module]) {
      score += MODULE_TRUST_WEIGHTS[module];
    }
  }
  return score;
}

// ============================================================================
// TYPES
// ============================================================================

export type AgreementTag = 'both' | 'grok' | 'gemini';

export type DisagreementLevel = 'aligned' | 'mixed' | 'conflicting';

export interface MergedDriver {
  topic: string;
  summary: string;
  evidence_keys: string[];
  confidence: ConfidenceLevel;
  direction: string;
  agreement: AgreementTag;
  score: number;
}

export interface MergedRisk {
  risk: string;
  why: string;
  evidence_keys: string[];
  severity: string;
  agreement: AgreementTag;
}

export interface MergedScenarios {
  bull: { summary: string; probability: string; key_triggers: string[]; source: AgreementTag };
  base: { summary: string; probability: string; key_triggers: string[]; source: AgreementTag };
  bear: { summary: string; probability: string; key_triggers: string[]; source: AgreementTag };
}

export interface MergedUnknown {
  what: string;
  why_unknown: string;
  would_help: string | null;
  source: AgreementTag;
}

// ============================================================================
// FINAL INSIGHT OBJECT CONTRACT (For Pass-2)
// ============================================================================

export const FinalInsightObjectSchema = z.object({
  // Version
  version: z.literal('1.0.0'),
  
  // Source info
  sources: z.object({
    grok_available: z.boolean(),
    gemini_available: z.boolean(),
    mode: z.enum(['single', 'dual']),
  }),
  
  // Merged content
  drivers: z.array(z.object({
    topic: z.string(),
    summary: z.string(),
    evidence_keys: z.array(z.string()),
    confidence: z.enum(['high', 'medium', 'low']),
    direction: z.string(),
    agreement: z.enum(['both', 'grok', 'gemini']),
  })).max(5),
  
  risks: z.array(z.object({
    risk: z.string(),
    why: z.string(),
    evidence_keys: z.array(z.string()),
    severity: z.string(),
    agreement: z.enum(['both', 'grok', 'gemini']),
  })).max(5),
  
  scenarios: z.object({
    bull: z.object({
      summary: z.string(),
      probability: z.string(),
      key_triggers: z.array(z.string()),
      source: z.enum(['both', 'grok', 'gemini']),
    }),
    base: z.object({
      summary: z.string(),
      probability: z.string(),
      key_triggers: z.array(z.string()),
      source: z.enum(['both', 'grok', 'gemini']),
    }),
    bear: z.object({
      summary: z.string(),
      probability: z.string(),
      key_triggers: z.array(z.string()),
      source: z.enum(['both', 'grok', 'gemini']),
    }),
  }),
  
  to_watch: z.array(z.string()).max(6),
  
  unknowns: z.array(z.object({
    what: z.string(),
    why_unknown: z.string(),
    would_help: z.string().nullable(),
    source: z.enum(['both', 'grok', 'gemini']),
  })).max(10),
  
  // Confidence & agreement
  confidence_final: z.enum(['high', 'medium', 'low']),
  disagreement_meter: z.number().min(0).max(100),
  disagreement_level: z.enum(['aligned', 'mixed', 'conflicting']),
  
  // Coverage summary (for renderer)
  coverage_summary: z.object({
    available: z.array(z.string()),
    missing: z.array(z.string()),
    freshness_seconds: z.record(z.number()),
    quality_score: z.number(),
  }),
}).strict();

export type FinalInsightObject = z.infer<typeof FinalInsightObjectSchema>;

// ============================================================================
// AGGREGATOR
// ============================================================================

export interface AggregatorInput {
  evidencePack: EvidencePack;
  grokInsight: InsightPackV1 | null;
  geminiInsight: InsightPackV1 | null;
}

/**
 * Merge Grok and Gemini Insight Packs into FinalInsightObject.
 */
export function aggregateInsightPacks(input: AggregatorInput): FinalInsightObject {
  const { evidencePack, grokInsight, geminiInsight } = input;
  
  const hasGrok = grokInsight !== null;
  const hasGemini = geminiInsight !== null;
  const mode = hasGrok && hasGemini ? 'dual' : 'single';

  logger.info('🔀 Aggregator: Starting merge', { hasGrok, hasGemini, mode });

  // Merge drivers
  const mergedDrivers = mergeDrivers(grokInsight, geminiInsight);
  
  // Merge risks
  const mergedRisks = mergeRisks(grokInsight, geminiInsight);
  
  // Merge scenarios
  const mergedScenarios = mergeScenarios(grokInsight, geminiInsight);
  
  // Merge to_watch (union from catalysts)
  const toWatch = mergeToWatch(grokInsight, geminiInsight);
  
  // Merge unknowns
  const mergedUnknowns = mergeUnknowns(grokInsight, geminiInsight, evidencePack);
  
  // Calculate disagreement meter
  const { disagreementMeter, disagreementLevel, hasDirectionConflict } = calculateDisagreement(
    grokInsight,
    geminiInsight,
    evidencePack
  );
  
  // Calculate final confidence
  const confidenceFinal = calculateFinalConfidence(
    grokInsight,
    geminiInsight,
    disagreementLevel,
    evidencePack
  );

  // If there's direction conflict, add to unknowns
  if (hasDirectionConflict) {
    mergedUnknowns.push({
      what: 'Engines disagree on directional outlook',
      why_unknown: 'unverifiable',
      would_help: 'Additional price/flow data or time passage',
      source: 'both',
    });
  }

  const result: FinalInsightObject = {
    version: '1.0.0',
    sources: {
      grok_available: hasGrok,
      gemini_available: hasGemini,
      mode,
    },
    drivers: mergedDrivers.slice(0, 5),
    risks: mergedRisks.slice(0, 5),
    scenarios: mergedScenarios,
    to_watch: toWatch.slice(0, 6),
    unknowns: mergedUnknowns.slice(0, 10),
    confidence_final: confidenceFinal,
    disagreement_meter: disagreementMeter,
    disagreement_level: disagreementLevel,
    coverage_summary: {
      available: evidencePack.coverage.available,
      missing: evidencePack.coverage.missing,
      freshness_seconds: evidencePack.coverage.freshness_seconds,
      quality_score: evidencePack.coverage.quality_score,
    },
  };

  logger.info('🔀 Aggregator: Merge complete', {
    driverCount: result.drivers.length,
    riskCount: result.risks.length,
    unknownsCount: result.unknowns.length,
    disagreementMeter,
    confidenceFinal,
  });

  return result;
}

// ============================================================================
// DRIVER MERGING
// ============================================================================

interface DriverCandidate {
  normalizedTopic: string;
  driver: Driver;
  source: 'grok' | 'gemini';
}

function mergeDrivers(
  grok: InsightPackV1 | null,
  gemini: InsightPackV1 | null
): MergedDriver[] {
  const candidates: DriverCandidate[] = [];

  // Collect from Grok
  if (grok?.drivers) {
    for (const driver of grok.drivers.slice(0, 5)) {
      candidates.push({
        normalizedTopic: normalizeTopic(driver.topic),
        driver,
        source: 'grok',
      });
    }
  }

  // Collect from Gemini
  if (gemini?.drivers) {
    for (const driver of gemini.drivers.slice(0, 5)) {
      candidates.push({
        normalizedTopic: normalizeTopic(driver.topic),
        driver,
        source: 'gemini',
      });
    }
  }

  // Group by normalized topic
  const grouped = new Map<string, DriverCandidate[]>();
  for (const candidate of candidates) {
    const existing = grouped.get(candidate.normalizedTopic) || [];
    existing.push(candidate);
    grouped.set(candidate.normalizedTopic, existing);
  }

  // Merge each group
  const merged: MergedDriver[] = [];
  for (const [topic, group] of grouped) {
    const hasGrok = group.some(c => c.source === 'grok');
    const hasGemini = group.some(c => c.source === 'gemini');
    const agreement: AgreementTag = hasGrok && hasGemini ? 'both' : (hasGrok ? 'grok' : 'gemini');

    // Collect all evidence keys
    const allEvidenceKeys = new Set<string>();
    for (const c of group) {
      for (const key of c.driver.evidence_keys || []) {
        allEvidenceKeys.add(key);
      }
    }
    const evidenceKeys = [...allEvidenceKeys];

    // Pick summary: prefer more evidence, then shorter
    const sorted = [...group].sort((a, b) => {
      const aKeys = a.driver.evidence_keys?.length || 0;
      const bKeys = b.driver.evidence_keys?.length || 0;
      if (aKeys !== bKeys) return bKeys - aKeys;
      return a.driver.summary.length - b.driver.summary.length;
    });
    const best = sorted[0].driver;

    // Calculate score
    let score = 0;
    if (agreement === 'both') score += 3;
    if (evidenceKeys.length >= 3) score += 2;
    else if (evidenceKeys.length >= 2) score += 1;
    score += calculateTrustScore(evidenceKeys) * 0.5;

    merged.push({
      topic,
      summary: best.summary,
      evidence_keys: evidenceKeys,
      confidence: best.confidence || 'medium',
      direction: best.direction || 'neutral',
      agreement,
      score,
    });
  }

  // Rank by score
  merged.sort((a, b) => b.score - a.score);

  return merged;
}

// ============================================================================
// RISK MERGING
// ============================================================================

function mergeRisks(
  grok: InsightPackV1 | null,
  gemini: InsightPackV1 | null
): MergedRisk[] {
  const merged: MergedRisk[] = [];
  const seen = new Set<string>();

  // Helper to normalize risk text for dedup
  const normalizeRiskText = (text: string): string => {
    return text.toLowerCase().trim().replace(/[^\w\s]/g, '');
  };

  // Add Grok risks
  if (grok?.risks) {
    for (const risk of grok.risks.slice(0, 5)) {
      const key = normalizeRiskText(risk.risk);
      if (!seen.has(key)) {
        seen.add(key);
        merged.push({
          risk: risk.risk,
          why: risk.why,
          evidence_keys: risk.evidence_keys || [],
          severity: risk.severity || 'medium',
          agreement: 'grok',
        });
      }
    }
  }

  // Add Gemini risks (check for duplicates)
  if (gemini?.risks) {
    for (const risk of gemini.risks.slice(0, 5)) {
      const key = normalizeRiskText(risk.risk);
      
      // Check if similar risk exists
      const existingIdx = merged.findIndex(r => 
        normalizeRiskText(r.risk) === key
      );
      
      if (existingIdx >= 0) {
        // Mark as both
        merged[existingIdx].agreement = 'both';
        // Merge evidence keys
        for (const ek of risk.evidence_keys || []) {
          if (!merged[existingIdx].evidence_keys.includes(ek)) {
            merged[existingIdx].evidence_keys.push(ek);
          }
        }
      } else if (!seen.has(key)) {
        seen.add(key);
        merged.push({
          risk: risk.risk,
          why: risk.why,
          evidence_keys: risk.evidence_keys || [],
          severity: risk.severity || 'medium',
          agreement: 'gemini',
        });
      }
    }
  }

  // Sort: both > high severity > medium > low
  merged.sort((a, b) => {
    if (a.agreement === 'both' && b.agreement !== 'both') return -1;
    if (b.agreement === 'both' && a.agreement !== 'both') return 1;
    
    const severityOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
    return (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
  });

  return merged;
}

// ============================================================================
// SCENARIO MERGING
// ============================================================================

function mergeScenarios(
  grok: InsightPackV1 | null,
  gemini: InsightPackV1 | null
): MergedScenarios {
  // Determine which engine has higher confidence
  const grokConf = confidenceToNumber(grok?.overall_confidence);
  const geminiConf = confidenceToNumber(gemini?.overall_confidence);
  const preferGrok = grokConf >= geminiConf;

  const primary = preferGrok ? grok : gemini;
  const secondary = preferGrok ? gemini : grok;
  const primaryTag: AgreementTag = preferGrok ? 'grok' : 'gemini';

  // Default scenarios
  const defaultScenario = {
    summary: 'Insufficient data for scenario projection.',
    probability: 'possible' as const,
    key_triggers: [] as string[],
  };

  return {
    bull: {
      ...(primary?.scenarios?.bull || secondary?.scenarios?.bull || defaultScenario),
      source: primary?.scenarios?.bull ? primaryTag : (secondary?.scenarios?.bull ? (preferGrok ? 'gemini' : 'grok') : primaryTag),
    },
    base: {
      ...(primary?.scenarios?.base || secondary?.scenarios?.base || defaultScenario),
      source: primary?.scenarios?.base ? primaryTag : (secondary?.scenarios?.base ? (preferGrok ? 'gemini' : 'grok') : primaryTag),
    },
    bear: {
      ...(primary?.scenarios?.bear || secondary?.scenarios?.bear || defaultScenario),
      source: primary?.scenarios?.bear ? primaryTag : (secondary?.scenarios?.bear ? (preferGrok ? 'gemini' : 'grok') : primaryTag),
    },
  };
}

function confidenceToNumber(conf: string | undefined): number {
  if (conf === 'high') return 3;
  if (conf === 'medium') return 2;
  return 1;
}

// ============================================================================
// TO-WATCH MERGING
// ============================================================================

function mergeToWatch(
  grok: InsightPackV1 | null,
  gemini: InsightPackV1 | null
): string[] {
  const items = new Set<string>();

  // Extract from catalysts
  if (grok?.catalysts_next) {
    for (const c of grok.catalysts_next) {
      items.add(c.topic);
    }
  }
  if (gemini?.catalysts_next) {
    for (const c of gemini.catalysts_next) {
      items.add(c.topic);
    }
  }

  return [...items];
}

// ============================================================================
// UNKNOWNS MERGING
// ============================================================================

function mergeUnknowns(
  grok: InsightPackV1 | null,
  gemini: InsightPackV1 | null,
  evidencePack: EvidencePack
): MergedUnknown[] {
  const merged: MergedUnknown[] = [];
  const seen = new Set<string>();

  // Add from Grok
  if (grok?.unknowns) {
    for (const u of grok.unknowns) {
      const key = u.what.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        merged.push({
          what: u.what,
          why_unknown: u.why_unknown,
          would_help: u.would_help,
          source: 'grok',
        });
      }
    }
  }

  // Add from Gemini
  if (gemini?.unknowns) {
    for (const u of gemini.unknowns) {
      const key = u.what.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        merged.push({
          what: u.what,
          why_unknown: u.why_unknown,
          would_help: u.would_help,
          source: 'gemini',
        });
      } else {
        // Mark as both
        const existing = merged.find(m => m.what.toLowerCase() === key);
        if (existing) {
          existing.source = 'both';
        }
      }
    }
  }

  // Always include missing modules from EvidencePack
  for (const module of evidencePack.coverage.missing) {
    const key = `${module} data missing`;
    if (!seen.has(key.toLowerCase())) {
      merged.push({
        what: `${module} data missing`,
        why_unknown: 'missing_module',
        would_help: `Fetch ${module} module`,
        source: 'both',
      });
    }
  }

  return merged;
}

// ============================================================================
// DISAGREEMENT METER
// ============================================================================

interface DisagreementResult {
  disagreementMeter: number;
  disagreementLevel: DisagreementLevel;
  hasDirectionConflict: boolean;
}

function calculateDisagreement(
  grok: InsightPackV1 | null,
  gemini: InsightPackV1 | null,
  evidencePack: EvidencePack
): DisagreementResult {
  // If only one engine, no disagreement
  if (!grok || !gemini) {
    return {
      disagreementMeter: 0,
      disagreementLevel: 'aligned',
      hasDirectionConflict: false,
    };
  }

  // 1. Topic Overlap
  const grokTopics = new Set((grok.drivers || []).map(d => normalizeTopic(d.topic)));
  const geminiTopics = new Set((gemini.drivers || []).map(d => normalizeTopic(d.topic)));
  
  const intersection = new Set([...grokTopics].filter(t => geminiTopics.has(t)));
  const union = new Set([...grokTopics, ...geminiTopics]);
  
  const overlap = union.size > 0 ? intersection.size / union.size : 1;
  const agreementScore = overlap * 100;

  // 2. Directional Conflict
  const grokDirection = inferOverallDirection(grok);
  const geminiDirection = inferOverallDirection(gemini);
  const hasDirectionConflict = (
    (grokDirection === 'bullish' && geminiDirection === 'bearish') ||
    (grokDirection === 'bearish' && geminiDirection === 'bullish')
  );
  const directionPenalty = hasDirectionConflict ? 25 : 0;

  // 3. Coverage Penalty
  const coveragePct = evidencePack.coverage.available.length / 
    (evidencePack.coverage.available.length + evidencePack.coverage.missing.length);
  const coveragePenalty = coveragePct < 0.5 ? 20 : 0;

  // Calculate final meter
  const disagreementMeter = Math.min(100, Math.max(0,
    100 - agreementScore + directionPenalty + coveragePenalty
  ));

  // Determine level
  let disagreementLevel: DisagreementLevel;
  if (disagreementMeter <= 25) {
    disagreementLevel = 'aligned';
  } else if (disagreementMeter <= 60) {
    disagreementLevel = 'mixed';
  } else {
    disagreementLevel = 'conflicting';
  }

  return {
    disagreementMeter: Math.round(disagreementMeter),
    disagreementLevel,
    hasDirectionConflict,
  };
}

function inferOverallDirection(pack: InsightPackV1): 'bullish' | 'bearish' | 'neutral' {
  const drivers = pack.drivers || [];
  let bullishCount = 0;
  let bearishCount = 0;

  for (const d of drivers) {
    if (d.direction === 'bullish') bullishCount++;
    if (d.direction === 'bearish') bearishCount++;
  }

  // Check scenarios for cues
  const bullScenario = pack.scenarios?.bull?.summary?.toLowerCase() || '';
  const bearScenario = pack.scenarios?.bear?.summary?.toLowerCase() || '';
  
  if (bullScenario.includes('breakout') || bullScenario.includes('impulse')) bullishCount++;
  if (bearScenario.includes('breakdown') || bearScenario.includes('crash')) bearishCount++;

  if (bullishCount > bearishCount + 1) return 'bullish';
  if (bearishCount > bullishCount + 1) return 'bearish';
  return 'neutral';
}

// ============================================================================
// FINAL CONFIDENCE
// ============================================================================

function calculateFinalConfidence(
  grok: InsightPackV1 | null,
  gemini: InsightPackV1 | null,
  disagreementLevel: DisagreementLevel,
  evidencePack: EvidencePack
): ConfidenceLevel {
  // Start from engines' confidence (take lower)
  let confidence: ConfidenceLevel;
  
  if (grok && gemini) {
    const grokConf = confidenceToNumber(grok.overall_confidence);
    const geminiConf = confidenceToNumber(gemini.overall_confidence);
    confidence = Math.min(grokConf, geminiConf) === 3 ? 'high' :
                 Math.min(grokConf, geminiConf) === 2 ? 'medium' : 'low';
  } else {
    const pack = grok || gemini;
    confidence = (pack?.overall_confidence as ConfidenceLevel) || 'low';
  }

  // Adjust for disagreement
  if (disagreementLevel === 'conflicting') {
    confidence = 'low';
  }

  // Adjust for coverage
  if (evidencePack.coverage.quality_score < 0.5) {
    if (confidence === 'high') confidence = 'medium';
  }

  // Check critical modules for intent
  const availableModules = evidencePack.coverage.available;
  if (evidencePack.kind === 'TOKEN' && !availableModules.includes('dexscreener')) {
    confidence = 'low';
  }

  return confidence;
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  normalizeTopic,
  TOPIC_SYNONYMS,
  MODULE_TRUST_WEIGHTS,
  calculateTrustScore,
  calculateDisagreement,
  calculateFinalConfidence,
};
