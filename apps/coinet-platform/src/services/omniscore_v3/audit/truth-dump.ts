/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🔍 TRUTH DUMP                                                             ║
 * ║                                                                               ║
 * ║   "If you can't tell where a score came from in 20 seconds,                  ║
 * ║    the engine isn't auditable yet."                                          ║
 * ║                                                                               ║
 * ║   For every result, this module provides:                                    ║
 * ║   (i)   Canonical asset IDs used                                             ║
 * ║   (ii)  QS/OS/Risk coverage and confidence                                   ║
 * ║   (iii) Top contributing features with raw + normalized values               ║
 * ║   (iv)  Missing sources list                                                 ║
 * ║   (v)   Penalties applied                                                    ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { ENGINE_VERSION, METHODOLOGY_ID } from '../constants';
import type { OmniScoreSnapshot } from '../pipeline';
import type { DataPoint } from '../types';
import type { FeatureResult } from '../features/types';
import type { LegitimacyResult } from '../gates/legitimacy-v2';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Complete truth dump for a single asset score
 * This is THE audit trail - if you can't explain a score from this, something is wrong
 */
export interface TruthDump {
  /** Dump metadata */
  meta: {
    generatedAt: string;
    engineVersion: string;
    methodologyId: string;
    formulaFrozen: boolean;
  };
  
  /** (i) Canonical asset IDs used */
  identity: {
    canonicalId: string;
    symbol: string;
    name: string;
    chain?: string;
    contract?: string;
    providerIds: {
      coingecko?: string;
      coinmarketcap?: string;
      defillama?: string;
      github?: string;
    };
    identityConfidence: number;
    identityConfidenceExplanation: string;
  };
  
  /** (ii) Coverage and confidence breakdown */
  coverage: {
    qs: {
      coverage: number;
      availableFeatures: number;
      totalFeatures: number;
      missingFeatures: string[];
    };
    os: {
      coverage: number;
      availableFeatures: number;
      totalFeatures: number;
      missingFeatures: string[];
      gated: boolean;
      gateReason?: string;
    };
    risk: {
      coverage: number;
      availableFeatures: number;
      totalFeatures: number;
      missingFeatures: string[];
    };
    overall: {
      confidence: number;
      confidenceLevel: string;
      confidenceFormula: string;
      confidenceBreakdown: {
        qsContribution: number;
        osContribution: number;
        freshnessContribution: number;
        penalties: number;
      };
    };
  };
  
  /** (iii) Top contributing features to each score */
  contributions: {
    qs: FeatureContribution[];
    os: FeatureContribution[];
    risk: FeatureContribution[];
  };
  
  /** (iv) Missing sources */
  missingSources: {
    source: string;
    expectedFor: string[];
    impact: 'high' | 'medium' | 'low';
  }[];
  
  /** (v) Penalties applied */
  penalties: {
    type: string;
    amount: number;
    reason: string;
    affectedScores: ('qs' | 'os' | 'risk' | 'pos' | 'confidence')[];
  }[];
  
  /** Final scores */
  scores: {
    qs: number;
    os: number | null;
    risk: number;
    safety: number;
    posRaw: number;
    posSmoothed: number;
    posFinal: number | null;
    tier: string | null;
    formula: string;
  };
  
  /** Legitimacy assessment */
  legitimacy: {
    label: string;
    warnings: string[];
    criticalIssues: string[];
    allowAllocatorView: boolean;
    allowTraderView: boolean;
    allowRanking: boolean;
  };
  
  /** Data quality metrics */
  dataQuality: {
    totalDataPoints: number;
    availableDataPoints: number;
    staleDataPoints: number;
    derivedDataPoints: number;
    averageFreshnessHours: number;
    sourceCount: number;
    sources: string[];
  };
  
  /** Gating decisions */
  gates: {
    qsCoverageGate: { passed: boolean; threshold: number; actual: number };
    osCoverageGate: { passed: boolean; threshold: number; actual: number };
    confidenceGate: { passed: boolean; threshold: number; actual: number };
    legitimacyGate: { passed: boolean; label: string };
    finalDecision: 'scored' | 'partial' | 'gated';
    gateReason?: string;
  };
}

export interface FeatureContribution {
  featureId: string;
  featureName: string;
  
  /** Raw value from data source */
  rawValue: number | null;
  
  /** Normalized value (0-100) */
  normalizedValue: number | null;
  
  /** Base weight in category */
  baseWeight: number;
  
  /** Reliability factor (0-1) */
  reliability: number;
  
  /** Effective weight = baseWeight × reliability */
  effectiveWeight: number;
  
  /** Contribution to category score */
  contribution: number;
  
  /** Contribution as percentage of category total */
  contributionPercent: number;
  
  /** Data source */
  source: string;
  
  /** Freshness in hours */
  freshnessHours: number;
  
  /** Is this value derived? */
  isDerived: boolean;
  
  /** Derivation explanation if derived */
  derivationExplanation?: string;
  
  /** Direction (higher_better or lower_better) */
  direction: 'higher_better' | 'lower_better';
  
  /** Any warnings */
  warnings: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRUTH DUMP GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

export interface TruthDumpInput {
  snapshot: OmniScoreSnapshot;
  dataPoints: DataPoint[];
  features: {
    qs: FeatureResult[];
    os: FeatureResult[];
    risk: FeatureResult[];
  };
  legitimacy: LegitimacyResult;
  providerIds?: Record<string, string>;
}

/**
 * Generate a complete truth dump for an asset score
 */
export function generateTruthDump(input: TruthDumpInput): TruthDump {
  const { snapshot, dataPoints, features, legitimacy, providerIds = {} } = input;
  
  // Calculate coverage details
  const qsCoverage = calculateCoverageDetails(features.qs, 'qs');
  const osCoverage = calculateCoverageDetails(features.os, 'os');
  const riskCoverage = calculateCoverageDetails(features.risk, 'risk');
  
  // Calculate contributions
  const qsContributions = calculateContributions(features.qs, dataPoints);
  const osContributions = calculateContributions(features.os, dataPoints);
  const riskContributions = calculateContributions(features.risk, dataPoints);
  
  // Find missing sources
  const missingSources = findMissingSources(dataPoints, features);
  
  // Calculate penalties
  const penalties = calculatePenalties(snapshot, dataPoints, legitimacy);
  
  // Data quality metrics
  const dataQuality = calculateDataQuality(dataPoints);
  
  // Confidence breakdown
  const confidenceBreakdown = calculateConfidenceBreakdown(
    snapshot.coverageQS,
    snapshot.coverageOS,
    dataQuality.averageFreshnessHours,
    penalties
  );
  
  return {
    meta: {
      generatedAt: new Date().toISOString(),
      engineVersion: ENGINE_VERSION,
      methodologyId: METHODOLOGY_ID,
      formulaFrozen: true, // Formula is frozen per user's advice
    },
    
    identity: {
      canonicalId: snapshot.identity.id,
      symbol: snapshot.identity.symbol,
      name: snapshot.identity.name,
      chain: snapshot.identity.chain,
      contract: snapshot.identity.contract,
      providerIds,
      identityConfidence: snapshot.identity.confidence,
      identityConfidenceExplanation: explainIdentityConfidence(snapshot.identity.confidence),
    },
    
    coverage: {
      qs: qsCoverage,
      os: {
        ...osCoverage,
        gated: snapshot.osGated,
        gateReason: snapshot.osGateReason,
      },
      risk: riskCoverage,
      overall: {
        confidence: snapshot.confidence,
        confidenceLevel: snapshot.confidenceLevel,
        confidenceFormula: '100 × clamp(0.6×covQS + 0.3×covOS + 0.1×freshness - penalties)',
        confidenceBreakdown,
      },
    },
    
    contributions: {
      qs: qsContributions,
      os: osContributions,
      risk: riskContributions,
    },
    
    missingSources,
    penalties,
    
    scores: {
      qs: snapshot.qs,
      os: snapshot.os,
      risk: snapshot.risk,
      safety: 100 - snapshot.risk,
      posRaw: snapshot.posRaw,
      posSmoothed: snapshot.posSmoothed,
      posFinal: snapshot.posFinal,
      tier: snapshot.posTier,
      formula: snapshot.osGated
        ? '0.80×QS + 0.20×(100-Risk) [OS gated]'
        : '0.60×QS + 0.25×OS + 0.15×(100-Risk)',
    },
    
    legitimacy: {
      label: snapshot.legitimacy,
      warnings: snapshot.legitimacyDetails.warnings,
      criticalIssues: snapshot.legitimacyDetails.criticalIssues,
      allowAllocatorView: snapshot.legitimacyDetails.allowAllocator,
      allowTraderView: snapshot.legitimacyDetails.allowTrader,
      allowRanking: snapshot.legitimacyDetails.allowRanking,
    },
    
    dataQuality,
    
    gates: {
      qsCoverageGate: {
        passed: snapshot.coverageQS >= 0.60,
        threshold: 0.60,
        actual: snapshot.coverageQS,
      },
      osCoverageGate: {
        passed: snapshot.coverageOS >= 0.40,
        threshold: 0.40,
        actual: snapshot.coverageOS,
      },
      confidenceGate: {
        passed: snapshot.confidence >= 65,
        threshold: 65,
        actual: snapshot.confidence,
      },
      legitimacyGate: {
        passed: !['INSUFFICIENT_DATA', 'SEVERE'].includes(snapshot.legitimacy),
        label: snapshot.legitimacy,
      },
      finalDecision: snapshot.status,
      gateReason: snapshot.posFinal === null
        ? determineGateReason(snapshot)
        : undefined,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function calculateCoverageDetails(
  features: FeatureResult[],
  category: string
): { coverage: number; availableFeatures: number; totalFeatures: number; missingFeatures: string[] } {
  const available = features.filter(f => f.available && f.normalized !== null);
  const missing = features.filter(f => !f.available || f.normalized === null);
  
  const totalWeight = features.reduce((sum, f) => sum + f.weight, 0);
  const availableWeight = available.reduce((sum, f) => sum + f.weight, 0);
  
  return {
    coverage: totalWeight > 0 ? availableWeight / totalWeight : 0,
    availableFeatures: available.length,
    totalFeatures: features.length,
    missingFeatures: missing.map(f => f.name),
  };
}

function calculateContributions(
  features: FeatureResult[],
  dataPoints: DataPoint[]
): FeatureContribution[] {
  const available = features.filter(f => f.available && f.normalized !== null);
  const totalEffectiveWeight = available.reduce((sum, f) => {
    const reliability = f.quality?.confidence ?? 1;
    return sum + f.weight * reliability;
  }, 0);
  
  return features.map(f => {
    const reliability = f.quality?.confidence ?? 1;
    const effectiveWeight = f.weight * reliability;
    const contribution = f.normalized !== null ? f.normalized * effectiveWeight : 0;
    
    // Find matching data point
    const dp = dataPoints.find(d => d.key === f.id || f.inputs?.includes(d.key));
    
    return {
      featureId: f.id,
      featureName: f.name,
      rawValue: dp?.raw ?? null,
      normalizedValue: f.normalized,
      baseWeight: f.weight,
      reliability,
      effectiveWeight,
      contribution,
      contributionPercent: totalEffectiveWeight > 0 
        ? (contribution / totalEffectiveWeight) * 100 
        : 0,
      source: dp?.source ?? 'unknown',
      freshnessHours: dp ? dp.freshnessSeconds / 3600 : 0,
      isDerived: dp?.isDerived ?? false,
      derivationExplanation: dp?.derivationFormula,
      direction: f.id.includes('risk') ? 'lower_better' : 'higher_better',
      warnings: dp?.warnings ?? [],
    };
  });
}

function findMissingSources(
  dataPoints: DataPoint[],
  features: { qs: FeatureResult[]; os: FeatureResult[]; risk: FeatureResult[] }
): TruthDump['missingSources'] {
  const missing: TruthDump['missingSources'] = [];
  const requiredSources = new Map<string, string[]>();
  
  // Check for expected sources based on features
  const allFeatures = [...features.qs, ...features.os, ...features.risk];
  
  for (const f of allFeatures) {
    if (!f.available || f.normalized === null) {
      const expectedSource = f.inputs?.[0] ?? f.id;
      const existing = requiredSources.get(expectedSource) ?? [];
      existing.push(f.name);
      requiredSources.set(expectedSource, existing);
    }
  }
  
  for (const [source, expectedFor] of requiredSources) {
    const isHighImpact = expectedFor.some(f => 
      f.includes('security') || f.includes('liquidity') || f.includes('adoption')
    );
    
    missing.push({
      source,
      expectedFor,
      impact: isHighImpact ? 'high' : 'medium',
    });
  }
  
  return missing;
}

function calculatePenalties(
  snapshot: OmniScoreSnapshot,
  dataPoints: DataPoint[],
  legitimacy: LegitimacyResult
): TruthDump['penalties'] {
  const penalties: TruthDump['penalties'] = [];
  
  // Staleness penalty
  const stalePoints = dataPoints.filter(dp => dp.isStale);
  if (stalePoints.length > 0) {
    const stalePercent = (stalePoints.length / dataPoints.length) * 100;
    if (stalePercent > 20) {
      penalties.push({
        type: 'staleness',
        amount: Math.min(stalePercent * 0.5, 15),
        reason: `${stalePercent.toFixed(0)}% of data points are stale`,
        affectedScores: ['confidence'],
      });
    }
  }
  
  // Legitimacy penalties
  if (legitimacy.label === 'SUSPICIOUS') {
    penalties.push({
      type: 'legitimacy_suspicious',
      amount: 10,
      reason: 'Asset flagged as suspicious',
      affectedScores: ['confidence', 'pos'],
    });
  }
  
  // Low identity confidence penalty
  if (snapshot.identity.confidence < 80) {
    penalties.push({
      type: 'low_identity_confidence',
      amount: (80 - snapshot.identity.confidence) * 0.3,
      reason: `Identity confidence ${snapshot.identity.confidence}% below 80%`,
      affectedScores: ['confidence'],
    });
  }
  
  return penalties;
}

function calculateDataQuality(dataPoints: DataPoint[]): TruthDump['dataQuality'] {
  const available = dataPoints.filter(dp => dp.raw !== null);
  const stale = dataPoints.filter(dp => dp.isStale);
  const derived = dataPoints.filter(dp => dp.isDerived);
  
  const totalFreshness = available.reduce((sum, dp) => sum + dp.freshnessSeconds, 0);
  const avgFreshnessHours = available.length > 0 
    ? (totalFreshness / available.length) / 3600 
    : 0;
  
  const sources = new Set(available.map(dp => dp.source));
  
  return {
    totalDataPoints: dataPoints.length,
    availableDataPoints: available.length,
    staleDataPoints: stale.length,
    derivedDataPoints: derived.length,
    averageFreshnessHours: avgFreshnessHours,
    sourceCount: sources.size,
    sources: Array.from(sources),
  };
}

function calculateConfidenceBreakdown(
  covQS: number,
  covOS: number,
  avgFreshnessHours: number,
  penalties: TruthDump['penalties']
): TruthDump['coverage']['overall']['confidenceBreakdown'] {
  const freshnessScore = Math.max(0, 1 - avgFreshnessHours / 24);
  const totalPenalties = penalties
    .filter(p => p.affectedScores.includes('confidence'))
    .reduce((sum, p) => sum + p.amount, 0);
  
  return {
    qsContribution: 0.6 * covQS * 100,
    osContribution: 0.3 * covOS * 100,
    freshnessContribution: 0.1 * freshnessScore * 100,
    penalties: totalPenalties,
  };
}

function explainIdentityConfidence(confidence: number): string {
  if (confidence >= 95) return 'Very high - multiple verified sources agree';
  if (confidence >= 80) return 'High - primary sources verified';
  if (confidence >= 60) return 'Medium - some source disagreement';
  if (confidence >= 40) return 'Low - limited verification';
  return 'Very low - identity uncertain';
}

function determineGateReason(snapshot: OmniScoreSnapshot): string {
  if (snapshot.legitimacy === 'INSUFFICIENT_DATA') {
    return 'Insufficient data to produce reliable score';
  }
  if (snapshot.legitimacy === 'SEVERE') {
    return 'Severe integrity issues detected';
  }
  if (snapshot.coverageQS < 0.60) {
    return `QS coverage ${(snapshot.coverageQS * 100).toFixed(0)}% below minimum 60%`;
  }
  if (snapshot.confidence < 65) {
    return `Confidence ${snapshot.confidence.toFixed(0)} below minimum 65`;
  }
  return 'Unknown gate reason';
}

// ═══════════════════════════════════════════════════════════════════════════════
// FORMATTING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Format truth dump as human-readable text
 */
export function formatTruthDumpAsText(dump: TruthDump): string {
  const lines: string[] = [];
  
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push(`  TRUTH DUMP: ${dump.identity.symbol} (${dump.identity.canonicalId})`);
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');
  
  // Identity
  lines.push('📋 IDENTITY');
  lines.push(`   Symbol: ${dump.identity.symbol}`);
  lines.push(`   Name: ${dump.identity.name}`);
  lines.push(`   Chain: ${dump.identity.chain ?? 'N/A'}`);
  lines.push(`   Contract: ${dump.identity.contract ?? 'N/A'}`);
  lines.push(`   Identity Confidence: ${dump.identity.identityConfidence}% - ${dump.identity.identityConfidenceExplanation}`);
  lines.push('');
  
  // Scores
  lines.push('📊 SCORES');
  lines.push(`   QS: ${dump.scores.qs.toFixed(1)}`);
  lines.push(`   OS: ${dump.scores.os?.toFixed(1) ?? 'GATED'}`);
  lines.push(`   Risk: ${dump.scores.risk.toFixed(1)}`);
  lines.push(`   Safety: ${dump.scores.safety.toFixed(1)}`);
  lines.push(`   POS Raw: ${dump.scores.posRaw.toFixed(1)}`);
  lines.push(`   POS Final: ${dump.scores.posFinal?.toFixed(1) ?? 'GATED'}`);
  lines.push(`   Tier: ${dump.scores.tier ?? 'N/A'}`);
  lines.push(`   Formula: ${dump.scores.formula}`);
  lines.push('');
  
  // Coverage
  lines.push('📈 COVERAGE');
  lines.push(`   QS: ${(dump.coverage.qs.coverage * 100).toFixed(0)}% (${dump.coverage.qs.availableFeatures}/${dump.coverage.qs.totalFeatures} features)`);
  lines.push(`   OS: ${(dump.coverage.os.coverage * 100).toFixed(0)}% (${dump.coverage.os.availableFeatures}/${dump.coverage.os.totalFeatures} features)${dump.coverage.os.gated ? ' [GATED]' : ''}`);
  lines.push(`   Risk: ${(dump.coverage.risk.coverage * 100).toFixed(0)}% (${dump.coverage.risk.availableFeatures}/${dump.coverage.risk.totalFeatures} features)`);
  lines.push(`   Confidence: ${dump.coverage.overall.confidence.toFixed(0)} (${dump.coverage.overall.confidenceLevel})`);
  lines.push('');
  
  // Top contributors
  lines.push('🎯 TOP QS CONTRIBUTORS');
  const topQs = dump.contributions.qs
    .filter(c => c.normalizedValue !== null)
    .sort((a, b) => b.contributionPercent - a.contributionPercent)
    .slice(0, 5);
  for (const c of topQs) {
    lines.push(`   ${c.featureName}: ${c.normalizedValue?.toFixed(1)} (${c.contributionPercent.toFixed(1)}%) [raw: ${c.rawValue}, source: ${c.source}]`);
  }
  lines.push('');
  
  // Missing sources
  if (dump.missingSources.length > 0) {
    lines.push('⚠️ MISSING SOURCES');
    for (const m of dump.missingSources) {
      lines.push(`   [${m.impact.toUpperCase()}] ${m.source} → affects: ${m.expectedFor.join(', ')}`);
    }
    lines.push('');
  }
  
  // Penalties
  if (dump.penalties.length > 0) {
    lines.push('🚨 PENALTIES');
    for (const p of dump.penalties) {
      lines.push(`   ${p.type}: -${p.amount.toFixed(1)} (${p.reason})`);
    }
    lines.push('');
  }
  
  // Gates
  lines.push('🚦 GATES');
  lines.push(`   QS Coverage: ${dump.gates.qsCoverageGate.passed ? '✅' : '❌'} (${(dump.gates.qsCoverageGate.actual * 100).toFixed(0)}% vs ${dump.gates.qsCoverageGate.threshold * 100}% min)`);
  lines.push(`   OS Coverage: ${dump.gates.osCoverageGate.passed ? '✅' : '❌'} (${(dump.gates.osCoverageGate.actual * 100).toFixed(0)}% vs ${dump.gates.osCoverageGate.threshold * 100}% min)`);
  lines.push(`   Confidence: ${dump.gates.confidenceGate.passed ? '✅' : '❌'} (${dump.gates.confidenceGate.actual.toFixed(0)} vs ${dump.gates.confidenceGate.threshold} min)`);
  lines.push(`   Legitimacy: ${dump.gates.legitimacyGate.passed ? '✅' : '❌'} (${dump.gates.legitimacyGate.label})`);
  lines.push(`   Final: ${dump.gates.finalDecision.toUpperCase()}`);
  if (dump.gates.gateReason) {
    lines.push(`   Reason: ${dump.gates.gateReason}`);
  }
  lines.push('');
  
  // Data quality
  lines.push('📦 DATA QUALITY');
  lines.push(`   Data points: ${dump.dataQuality.availableDataPoints}/${dump.dataQuality.totalDataPoints}`);
  lines.push(`   Stale: ${dump.dataQuality.staleDataPoints}`);
  lines.push(`   Derived: ${dump.dataQuality.derivedDataPoints}`);
  lines.push(`   Avg freshness: ${dump.dataQuality.averageFreshnessHours.toFixed(1)} hours`);
  lines.push(`   Sources: ${dump.dataQuality.sources.join(', ')}`);
  lines.push('');
  
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push(`Generated: ${dump.meta.generatedAt}`);
  lines.push(`Engine: ${dump.meta.engineVersion} | Methodology: ${dump.meta.methodologyId}`);
  lines.push(`Formula frozen: ${dump.meta.formulaFrozen ? 'YES' : 'NO'}`);
  
  return lines.join('\n');
}

/**
 * Format as JSON (for logging/storage)
 */
export function formatTruthDumpAsJSON(dump: TruthDump): string {
  return JSON.stringify(dump, null, 2);
}

/**
 * Format as compact summary (one-liner for logs)
 */
export function formatTruthDumpAsCompact(dump: TruthDump): string {
  return `[${dump.identity.symbol}] POS=${dump.scores.posFinal?.toFixed(1) ?? 'GATED'} ` +
    `QS=${dump.scores.qs.toFixed(0)} OS=${dump.scores.os?.toFixed(0) ?? 'G'} ` +
    `Risk=${dump.scores.risk.toFixed(0)} Conf=${dump.coverage.overall.confidence.toFixed(0)} ` +
    `Cov(QS=${(dump.coverage.qs.coverage * 100).toFixed(0)}%,OS=${(dump.coverage.os.coverage * 100).toFixed(0)}%) ` +
    `${dump.gates.finalDecision.toUpperCase()} ${dump.legitimacy.label}`;
}
