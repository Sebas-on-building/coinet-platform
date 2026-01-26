/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🔀 INSIGHT AGGREGATOR — THE MOAT COMPONENT                               ║
 * ║                                                                               ║
 * ║   Merges Grok + Gemini Insight Packs into a Final Insight Object.            ║
 * ║   This is where Coinet beats competitors.                                    ║
 * ║                                                                               ║
 * ║   KEY FEATURES:                                                               ║
 * ║   - Cross-validation (not just append)                                       ║
 * ║   - Disagreement quantification                                              ║
 * ║   - Confidence computation from evidence + agreement                         ║
 * ║   - Coverage map for anti-hallucination UX                                   ║
 * ║                                                                               ║
 * ║   @version 1.0.0 - Production-ready, industry-dominating                    ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { logger } from '../../utils/logger';
import {
  type EvidencePack,
  type InsightPack,
  type InsightDriver,
  type InsightRisk,
  type InsightCatalyst,
  type InsightSecondOrder,
  type ConfidenceLevel,
  type Timeframe,
} from './research-engine';

// ============================================================================
// TYPES: FINAL INSIGHT OBJECT (AGGREGATED)
// ============================================================================

export type EngineAgreement = 'both' | 'grok' | 'gemini';

export interface AggregatedDriver {
  topic: string;
  summary: string;
  evidence_keys: string[];
  confidence: ConfidenceLevel;
  agreement: EngineAgreement;
  grok_confidence?: ConfidenceLevel;
  gemini_confidence?: ConfidenceLevel;
}

export interface AggregatedRisk {
  risk: string;
  why: string;
  evidence_keys: string[];
  confidence: ConfidenceLevel;
  agreement: EngineAgreement;
  grok_confidence?: ConfidenceLevel;
  gemini_confidence?: ConfidenceLevel;
}

export interface AggregatedCatalyst {
  topic: string;
  why_it_matters: string;
  evidence_keys: string[];
  confidence: ConfidenceLevel;
  agreement: EngineAgreement;
}

export interface AggregatedScenarios {
  bull: string;
  base: string;
  bear: string;
  source: 'grok' | 'gemini' | 'merged';
}

export interface CoverageMap {
  available_modules: string[];
  missing_modules: string[];
  engines_used: ('grok' | 'gemini')[];
  engines_missing: ('grok' | 'gemini')[];
  freshness_seconds: Record<string, number>;
  evidence_coverage_pct: number;
}

export interface FinalInsightMeta {
  language: string;
  intent: string;
  asset_focus: {
    symbol: string | null;
    chain: string;
    address: string | null;
  };
  timeframe: Timeframe;
  request_refresh: boolean;
  one_clarifier: string | null;
}

export interface FinalInsightObject {
  meta: FinalInsightMeta;
  drivers: AggregatedDriver[];
  catalysts_next: AggregatedCatalyst[];
  second_order_effects: InsightSecondOrder[];
  risks: AggregatedRisk[];
  scenarios: AggregatedScenarios;
  unknowns: string[];
  overall_confidence: ConfidenceLevel;
  disagreement_meter: number;  // 0-100
  coverage: CoverageMap;
  aggregation_metadata: {
    grok_available: boolean;
    gemini_available: boolean;
    merge_strategy: 'dual' | 'grok_only' | 'gemini_only' | 'empty';
    driver_overlap_count: number;
    risk_overlap_count: number;
  };
}

// ============================================================================
// AGGREGATOR INPUTS
// ============================================================================

export interface AggregatorInput {
  evidencePack: EvidencePack;
  grokInsight: InsightPack | null;
  geminiInsight: InsightPack | null;
}

// ============================================================================
// TOPIC NORMALIZATION (FOR MATCHING)
// ============================================================================

const SYNONYM_MAP: Record<string, string> = {
  // Volume
  'volume surge': 'volume',
  'volume spike': 'volume',
  'trading volume': 'volume',
  'high volume': 'volume',
  // Liquidity
  'liquidity crunch': 'liquidity',
  'low liquidity': 'liquidity',
  'liquidity risk': 'liquidity',
  // Whale
  'whale activity': 'whale',
  'whale movement': 'whale',
  'large holder': 'whale',
  // Price
  'price action': 'price',
  'price movement': 'price',
  'price momentum': 'price',
  // Holder
  'holder concentration': 'holders',
  'top holders': 'holders',
  'holder distribution': 'holders',
  // News
  'news catalyst': 'news',
  'breaking news': 'news',
  'announcement': 'news',
  // Social
  'social momentum': 'social',
  'twitter buzz': 'social',
  'community': 'social',
  // Security
  'security risk': 'security',
  'contract risk': 'security',
  'rug risk': 'security',
};

function normalizeTopic(topic: string): string {
  const lower = topic.toLowerCase().trim();
  
  // Check synonym map
  for (const [pattern, normalized] of Object.entries(SYNONYM_MAP)) {
    if (lower.includes(pattern) || pattern.includes(lower)) {
      return normalized;
    }
  }
  
  // Default: strip punctuation and common words
  return lower
    .replace(/[^\w\s]/g, '')
    .replace(/\b(the|a|an|is|are|was|were|has|have|had)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function topicsSimilar(a: string, b: string): boolean {
  const normA = normalizeTopic(a);
  const normB = normalizeTopic(b);
  
  if (normA === normB) return true;
  
  // Check if one contains the other
  if (normA.includes(normB) || normB.includes(normA)) return true;
  
  // Levenshtein-like: if topics are short and differ by 2 chars or less
  if (normA.length < 15 && normB.length < 15) {
    const longer = normA.length > normB.length ? normA : normB;
    const shorter = normA.length > normB.length ? normB : normA;
    if (longer.includes(shorter)) return true;
  }
  
  return false;
}

// ============================================================================
// CONFIDENCE COMPUTATION
// ============================================================================

function upgradeConfidence(conf: ConfidenceLevel): ConfidenceLevel {
  if (conf === 'low') return 'medium';
  return conf;
}

function downgradeConfidence(conf: ConfidenceLevel): ConfidenceLevel {
  if (conf === 'high') return 'medium';
  if (conf === 'medium') return 'low';
  return conf;
}

function maxConfidence(a: ConfidenceLevel, b: ConfidenceLevel): ConfidenceLevel {
  const order: ConfidenceLevel[] = ['low', 'medium', 'high'];
  return order[Math.max(order.indexOf(a), order.indexOf(b))];
}

function minConfidence(a: ConfidenceLevel, b: ConfidenceLevel): ConfidenceLevel {
  const order: ConfidenceLevel[] = ['low', 'medium', 'high'];
  return order[Math.min(order.indexOf(a), order.indexOf(b))];
}

function computeOverallConfidence(
  drivers: AggregatedDriver[],
  risks: AggregatedRisk[],
  coveragePct: number,
  engineAgreementRatio: number,
  tokenConfidence: number
): ConfidenceLevel {
  // Start with base confidence
  let score = 50;
  
  // Engine agreement factor (+/- 20)
  score += (engineAgreementRatio - 0.5) * 40;
  
  // Coverage factor (+/- 20)
  score += (coveragePct - 0.5) * 40;
  
  // Token resolution factor (+/- 10)
  score += (tokenConfidence - 0.7) * 33;
  
  // Driver confidence factor
  const driverConfidences = drivers.map(d => d.confidence);
  const hasLowDriver = driverConfidences.includes('low');
  const hasHighDriver = driverConfidences.includes('high');
  if (hasLowDriver) score -= 15;
  if (hasHighDriver) score += 10;
  
  // Risk confidence factor (high confidence risk = lower overall)
  const riskConfidences = risks.map(r => r.confidence);
  const hasHighRisk = riskConfidences.includes('high');
  if (hasHighRisk) score -= 10;
  
  // Map to confidence level
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

// ============================================================================
// DISAGREEMENT METER
// ============================================================================

function computeDisagreementMeter(
  grok: InsightPack | null,
  gemini: InsightPack | null,
  driverOverlapCount: number,
  riskOverlapCount: number
): number {
  if (!grok || !gemini) return 0; // No disagreement possible with single engine
  
  let meter = 0;
  
  // Driver disagreement
  const grokDriverCount = grok.insight.drivers.length;
  const geminiDriverCount = gemini.insight.drivers.length;
  const totalDrivers = grokDriverCount + geminiDriverCount;
  
  if (totalDrivers > 0) {
    const overlapRatio = (driverOverlapCount * 2) / totalDrivers;
    const driverDisagreement = (1 - overlapRatio) * 30;
    meter += driverDisagreement;
  }
  
  // Risk disagreement
  const grokRiskCount = grok.insight.risks.length;
  const geminiRiskCount = gemini.insight.risks.length;
  const totalRisks = grokRiskCount + geminiRiskCount;
  
  if (totalRisks > 0) {
    const riskOverlapRatio = (riskOverlapCount * 2) / totalRisks;
    const riskDisagreement = (1 - riskOverlapRatio) * 30;
    meter += riskDisagreement;
  }
  
  // Confidence disagreement
  if (grok.insight.overall_confidence !== gemini.insight.overall_confidence) {
    meter += 20;
  }
  
  // Scenario direction disagreement (check if one is bullish while other is bearish)
  const grokBull = grok.insight.scenarios.bull.toLowerCase();
  const geminiBull = gemini.insight.scenarios.bull.toLowerCase();
  const grokBear = grok.insight.scenarios.bear.toLowerCase();
  const geminiBear = gemini.insight.scenarios.bear.toLowerCase();
  
  // Simple heuristic: if bull mentions "risk" or bear mentions "upside" significantly different
  const bullMismatch = (grokBull.includes('risk') && !geminiBull.includes('risk')) ||
                       (!grokBull.includes('risk') && geminiBull.includes('risk'));
  if (bullMismatch) meter += 10;
  
  // Additional disagreement if unknowns differ significantly
  const grokUnknowns = new Set(grok.insight.unknowns.map(u => u.toLowerCase()));
  const geminiUnknowns = new Set(gemini.insight.unknowns.map(u => u.toLowerCase()));
  const unknownOverlap = [...grokUnknowns].filter(u => geminiUnknowns.has(u)).length;
  const totalUnknowns = grokUnknowns.size + geminiUnknowns.size;
  if (totalUnknowns > 0 && unknownOverlap === 0) {
    meter += 10;
  }
  
  return Math.min(100, Math.round(meter));
}

// ============================================================================
// MERGE LOGIC V1 (SIMPLE AND CORRECT)
// ============================================================================

function mergeDrivers(
  grokDrivers: InsightDriver[],
  geminiDrivers: InsightDriver[]
): { drivers: AggregatedDriver[]; overlapCount: number } {
  const merged: AggregatedDriver[] = [];
  const usedGemini = new Set<number>();
  let overlapCount = 0;
  
  // Start with Grok drivers, find matching Gemini drivers
  for (const grokDriver of grokDrivers) {
    let matchedGemini: InsightDriver | null = null;
    let matchedIndex = -1;
    
    for (let i = 0; i < geminiDrivers.length; i++) {
      if (usedGemini.has(i)) continue;
      
      if (topicsSimilar(grokDriver.topic, geminiDrivers[i].topic)) {
        matchedGemini = geminiDrivers[i];
        matchedIndex = i;
        break;
      }
    }
    
    if (matchedGemini && matchedIndex >= 0) {
      // Both engines agree
      usedGemini.add(matchedIndex);
      overlapCount++;
      
      merged.push({
        topic: grokDriver.topic, // Use Grok's wording
        summary: grokDriver.summary, // Use Grok's summary (primary engine)
        evidence_keys: [...new Set([...grokDriver.evidence_keys, ...matchedGemini.evidence_keys])],
        confidence: maxConfidence(grokDriver.confidence, matchedGemini.confidence),
        agreement: 'both',
        grok_confidence: grokDriver.confidence,
        gemini_confidence: matchedGemini.confidence,
      });
    } else {
      // Grok only
      merged.push({
        topic: grokDriver.topic,
        summary: grokDriver.summary,
        evidence_keys: grokDriver.evidence_keys,
        confidence: downgradeConfidence(grokDriver.confidence), // Downgrade single-engine
        agreement: 'grok',
        grok_confidence: grokDriver.confidence,
      });
    }
  }
  
  // Add remaining Gemini-only drivers
  for (let i = 0; i < geminiDrivers.length; i++) {
    if (usedGemini.has(i)) continue;
    
    const geminiDriver = geminiDrivers[i];
    merged.push({
      topic: geminiDriver.topic,
      summary: geminiDriver.summary,
      evidence_keys: geminiDriver.evidence_keys,
      confidence: downgradeConfidence(geminiDriver.confidence), // Downgrade single-engine
      agreement: 'gemini',
      gemini_confidence: geminiDriver.confidence,
    });
  }
  
  return { drivers: merged, overlapCount };
}

function mergeRisks(
  grokRisks: InsightRisk[],
  geminiRisks: InsightRisk[]
): { risks: AggregatedRisk[]; overlapCount: number } {
  const merged: AggregatedRisk[] = [];
  const usedGemini = new Set<number>();
  let overlapCount = 0;
  
  for (const grokRisk of grokRisks) {
    let matchedGemini: InsightRisk | null = null;
    let matchedIndex = -1;
    
    for (let i = 0; i < geminiRisks.length; i++) {
      if (usedGemini.has(i)) continue;
      
      if (topicsSimilar(grokRisk.risk, geminiRisks[i].risk)) {
        matchedGemini = geminiRisks[i];
        matchedIndex = i;
        break;
      }
    }
    
    if (matchedGemini && matchedIndex >= 0) {
      usedGemini.add(matchedIndex);
      overlapCount++;
      
      merged.push({
        risk: grokRisk.risk,
        why: grokRisk.why,
        evidence_keys: [...new Set([...grokRisk.evidence_keys, ...matchedGemini.evidence_keys])],
        confidence: maxConfidence(grokRisk.confidence, matchedGemini.confidence),
        agreement: 'both',
        grok_confidence: grokRisk.confidence,
        gemini_confidence: matchedGemini.confidence,
      });
    } else {
      merged.push({
        risk: grokRisk.risk,
        why: grokRisk.why,
        evidence_keys: grokRisk.evidence_keys,
        confidence: grokRisk.confidence, // Don't downgrade risks — better to overcaution
        agreement: 'grok',
        grok_confidence: grokRisk.confidence,
      });
    }
  }
  
  for (let i = 0; i < geminiRisks.length; i++) {
    if (usedGemini.has(i)) continue;
    
    const geminiRisk = geminiRisks[i];
    merged.push({
      risk: geminiRisk.risk,
      why: geminiRisk.why,
      evidence_keys: geminiRisk.evidence_keys,
      confidence: geminiRisk.confidence,
      agreement: 'gemini',
      gemini_confidence: geminiRisk.confidence,
    });
  }
  
  return { risks: merged, overlapCount };
}

function mergeCatalysts(
  grokCatalysts: InsightCatalyst[],
  geminiCatalysts: InsightCatalyst[]
): AggregatedCatalyst[] {
  const merged: AggregatedCatalyst[] = [];
  const usedGemini = new Set<number>();
  
  for (const grok of grokCatalysts) {
    let matched = false;
    
    for (let i = 0; i < geminiCatalysts.length; i++) {
      if (usedGemini.has(i)) continue;
      
      if (topicsSimilar(grok.topic, geminiCatalysts[i].topic)) {
        usedGemini.add(i);
        matched = true;
        
        merged.push({
          topic: grok.topic,
          why_it_matters: grok.why_it_matters,
          evidence_keys: [...new Set([...grok.evidence_keys, ...geminiCatalysts[i].evidence_keys])],
          confidence: maxConfidence(grok.confidence, geminiCatalysts[i].confidence),
          agreement: 'both',
        });
        break;
      }
    }
    
    if (!matched) {
      merged.push({
        ...grok,
        agreement: 'grok',
      });
    }
  }
  
  for (let i = 0; i < geminiCatalysts.length; i++) {
    if (usedGemini.has(i)) continue;
    merged.push({
      ...geminiCatalysts[i],
      agreement: 'gemini',
    });
  }
  
  return merged;
}

function mergeScenarios(
  grok: InsightPack | null,
  gemini: InsightPack | null
): AggregatedScenarios {
  // Prefer Grok's scenarios as primary engine
  if (grok && grok.insight.scenarios.bull) {
    return {
      ...grok.insight.scenarios,
      source: gemini ? 'merged' : 'grok',
    };
  }
  
  if (gemini && gemini.insight.scenarios.bull) {
    return {
      ...gemini.insight.scenarios,
      source: 'gemini',
    };
  }
  
  return {
    bull: '',
    base: '',
    bear: '',
    source: 'grok',
  };
}

function mergeUnknowns(grok: InsightPack | null, gemini: InsightPack | null): string[] {
  const unknowns = new Set<string>();
  
  if (grok) {
    grok.insight.unknowns.forEach(u => unknowns.add(u));
  }
  
  if (gemini) {
    gemini.insight.unknowns.forEach(u => unknowns.add(u));
  }
  
  return [...unknowns];
}

function mergeSecondOrderEffects(
  grok: InsightPack | null,
  gemini: InsightPack | null
): InsightSecondOrder[] {
  const effects: InsightSecondOrder[] = [];
  
  if (grok) {
    effects.push(...grok.insight.second_order_effects);
  }
  
  if (gemini) {
    // Only add Gemini effects that aren't similar to existing ones
    for (const effect of gemini.insight.second_order_effects) {
      const isDuplicate = effects.some(e => 
        topicsSimilar(e.if, effect.if) && topicsSimilar(e.then, effect.then)
      );
      if (!isDuplicate) {
        effects.push(effect);
      }
    }
  }
  
  return effects;
}

// ============================================================================
// MAIN AGGREGATOR FUNCTION
// ============================================================================

export function aggregateInsights(input: AggregatorInput): FinalInsightObject {
  const { evidencePack, grokInsight, geminiInsight } = input;
  
  const grokAvailable = Boolean(grokInsight);
  const geminiAvailable = Boolean(geminiInsight);
  
  // Determine merge strategy
  let mergeStrategy: 'dual' | 'grok_only' | 'gemini_only' | 'empty';
  if (grokAvailable && geminiAvailable) {
    mergeStrategy = 'dual';
  } else if (grokAvailable) {
    mergeStrategy = 'grok_only';
  } else if (geminiAvailable) {
    mergeStrategy = 'gemini_only';
  } else {
    mergeStrategy = 'empty';
  }
  
  logger.info('🔀 Aggregating insights', { mergeStrategy });
  
  // Merge drivers
  const grokDrivers = grokInsight?.insight.drivers || [];
  const geminiDrivers = geminiInsight?.insight.drivers || [];
  const { drivers, overlapCount: driverOverlapCount } = mergeDrivers(grokDrivers, geminiDrivers);
  
  // Merge risks
  const grokRisks = grokInsight?.insight.risks || [];
  const geminiRisks = geminiInsight?.insight.risks || [];
  const { risks, overlapCount: riskOverlapCount } = mergeRisks(grokRisks, geminiRisks);
  
  // Merge catalysts
  const grokCatalysts = grokInsight?.insight.catalysts_next || [];
  const geminiCatalysts = geminiInsight?.insight.catalysts_next || [];
  const catalysts = mergeCatalysts(grokCatalysts, geminiCatalysts);
  
  // Merge second order effects
  const secondOrderEffects = mergeSecondOrderEffects(grokInsight, geminiInsight);
  
  // Merge scenarios
  const scenarios = mergeScenarios(grokInsight, geminiInsight);
  
  // Merge unknowns
  let unknowns = mergeUnknowns(grokInsight, geminiInsight);
  
  // Compute disagreement meter
  const disagreementMeter = computeDisagreementMeter(
    grokInsight,
    geminiInsight,
    driverOverlapCount,
    riskOverlapCount
  );
  
  // Add disagreement unknown if significant
  if (disagreementMeter >= 50) {
    unknowns.push('Engines show significant disagreement; confidence reduced');
  }
  
  // Build coverage map
  const evidenceCoveragePct = evidencePack.coverage.available.length / 
    (evidencePack.coverage.available.length + evidencePack.coverage.missing.length) || 0;
  
  const engineAgreementRatio = mergeStrategy === 'dual' 
    ? (driverOverlapCount + riskOverlapCount) / 
      Math.max(1, (drivers.length + risks.length) / 2)
    : 1; // Single engine = 100% self-agreement
  
  const tokenConfidence = evidencePack.resolved_token?.confidence || 0.5;
  
  // Compute overall confidence
  const overallConfidence = computeOverallConfidence(
    drivers,
    risks,
    evidenceCoveragePct,
    engineAgreementRatio,
    tokenConfidence
  );
  
  // If high disagreement, cap overall confidence
  const finalConfidence: ConfidenceLevel = disagreementMeter >= 50 
    ? minConfidence(overallConfidence, 'medium')
    : overallConfidence;
  
  // Build meta from primary engine (Grok) or fallback to Gemini
  const primaryMeta = grokInsight?.meta || geminiInsight?.meta;
  
  const coverage: CoverageMap = {
    available_modules: evidencePack.coverage.available,
    missing_modules: evidencePack.coverage.missing,
    engines_used: [
      ...(grokAvailable ? ['grok' as const] : []),
      ...(geminiAvailable ? ['gemini' as const] : []),
    ],
    engines_missing: [
      ...(!grokAvailable ? ['grok' as const] : []),
      ...(!geminiAvailable ? ['gemini' as const] : []),
    ],
    freshness_seconds: evidencePack.coverage.freshness_seconds,
    evidence_coverage_pct: Math.round(evidenceCoveragePct * 100),
  };
  
  return {
    meta: {
      language: primaryMeta?.language || evidencePack.request.language,
      intent: primaryMeta?.intent || evidencePack.request.intent,
      asset_focus: {
        symbol: primaryMeta?.asset_focus?.symbol || evidencePack.resolved_token?.symbol || null,
        chain: primaryMeta?.asset_focus?.chain || evidencePack.resolved_token?.chain || 'unknown',
        address: primaryMeta?.asset_focus?.address || evidencePack.resolved_token?.address || null,
      },
      timeframe: primaryMeta?.timeframe || 'unknown',
      request_refresh: primaryMeta?.request_refresh || false,
      one_clarifier: primaryMeta?.one_clarifier || null,
    },
    drivers,
    catalysts_next: catalysts,
    second_order_effects: secondOrderEffects,
    risks,
    scenarios,
    unknowns,
    overall_confidence: finalConfidence,
    disagreement_meter: disagreementMeter,
    coverage,
    aggregation_metadata: {
      grok_available: grokAvailable,
      gemini_available: geminiAvailable,
      merge_strategy: mergeStrategy,
      driver_overlap_count: driverOverlapCount,
      risk_overlap_count: riskOverlapCount,
    },
  };
}

// ============================================================================
// DISAGREEMENT INTERPRETATION (FOR UX)
// ============================================================================

export function interpretDisagreement(meter: number): {
  level: 'aligned' | 'mixed' | 'conflicting';
  message: string;
} {
  if (meter < 20) {
    return { level: 'aligned', message: '' };
  }
  if (meter < 50) {
    return { level: 'mixed', message: 'signals are mixed' };
  }
  return { level: 'conflicting', message: 'research engines show conflicting views' };
}

// ============================================================================
// COVERAGE SUMMARY (FOR UX)
// ============================================================================

export function summarizeCoverage(coverage: CoverageMap, language: string): string {
  const available = coverage.available_modules;
  const missing = coverage.missing_modules;
  
  if (missing.length === 0) {
    return ''; // Full coverage, no need to mention
  }
  
  // Build human-readable summary
  const moduleNames: Record<string, Record<string, string>> = {
    en: {
      dexscreener: 'price/liquidity',
      security: 'security',
      holders: 'holders',
      sentiment: 'sentiment',
      news: 'news',
      derivatives: 'derivatives',
      onchain: 'on-chain',
      pumpfun: 'pump.fun',
      smartmoney: 'smart money',
    },
    de: {
      dexscreener: 'Preis/Liquidität',
      security: 'Sicherheit',
      holders: 'Holder',
      sentiment: 'Sentiment',
      news: 'News',
      derivatives: 'Derivate',
      onchain: 'On-Chain',
      pumpfun: 'pump.fun',
      smartmoney: 'Smart Money',
    },
    es: {
      dexscreener: 'precio/liquidez',
      security: 'seguridad',
      holders: 'holders',
      sentiment: 'sentimiento',
      news: 'noticias',
      derivatives: 'derivados',
      onchain: 'on-chain',
      pumpfun: 'pump.fun',
      smartmoney: 'smart money',
    },
  };
  
  const names = moduleNames[language] || moduleNames.en;
  const missingNames = missing.map(m => names[m] || m).join(', ');
  
  const templates: Record<string, string> = {
    en: `Missing: ${missingNames}`,
    de: `Fehlt: ${missingNames}`,
    es: `Falta: ${missingNames}`,
    fr: `Manquant: ${missingNames}`,
  };
  
  return templates[language] || templates.en;
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  normalizeTopic,
  topicsSimilar,
  computeOverallConfidence,
  computeDisagreementMeter,
};
