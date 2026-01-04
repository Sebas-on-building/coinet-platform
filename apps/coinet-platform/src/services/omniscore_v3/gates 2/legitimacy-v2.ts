/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🚨 LEGITIMACY GATE v2                                                     ║
 * ║                                                                               ║
 * ║   "Diabolical for investors" edge:                                           ║
 * ║   Prevents garbage and fake projects from entering the ranking               ║
 * ║                                                                               ║
 * ║   Deterministic decision tree with documented rules                          ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════════
// LEGITIMACY LABELS
// ═══════════════════════════════════════════════════════════════════════════════

export type LegitimacyLabel = 
  | 'LEGIT'              // Safe for all modes
  | 'WATCH'              // Caution, show with warnings
  | 'SUSPICIOUS'         // High risk, limited display
  | 'NOT_LEGIT'          // Block from trading recommendations
  | 'INSUFFICIENT_DATA'  // Cannot determine, fail-closed
  | 'SEVERE';            // Critical issues, full block

// ═══════════════════════════════════════════════════════════════════════════════
// LEGITIMACY FACTORS (Input)
// ═══════════════════════════════════════════════════════════════════════════════

export interface LegitimacyFactors {
  // Identity
  identityConfidence: number;        // 0-100
  hasVerifiedContract: boolean;
  providerIdCount: number;           // Number of matching provider IDs
  
  // Market integrity
  washTradingScore: number;          // 0-100, higher = more wash trading
  liquidityScore: number;            // 0-100
  volumeToMcapRatio: number;         // Ratio (normal: 0.01-0.5)
  bidAskSpreadPercent: number;       // Spread in %
  
  // Security
  adminRiskScore: number;            // 0-100, higher = more risk
  hasMintFunction: boolean;
  isContractRenounced: boolean;
  auditCount: number;
  incidentCount12m: number;
  maxIncidentSeverity: number;       // 0-10
  
  // Data quality
  dataDisagreementScore: number;     // 0-100, higher = more disagreement
  anomalyCount: number;
  staleness: number;                 // Hours
  coverageQS: number;                // 0-1
  coverageOS: number;                // 0-1
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEGITIMACY THRESHOLDS
// ═══════════════════════════════════════════════════════════════════════════════

export const LEGITIMACY_THRESHOLDS = {
  // Identity
  identity: {
    minConfidence: 60,               // Below this = INSUFFICIENT_DATA
    warnConfidence: 80,              // Below this = WATCH
    minProviderIds: 2,               // Need at least 2 matching IDs
  },
  
  // Market integrity
  market: {
    maxWashTrading: 50,              // Above = SUSPICIOUS
    severeWashTrading: 75,           // Above = NOT_LEGIT
    minLiquidity: 20,                // Below = SUSPICIOUS
    maxVolumeRatio: 2.0,             // Above = SUSPICIOUS (possible manipulation)
    maxSpread: 5.0,                  // Above = SUSPICIOUS
    severeSpread: 10.0,              // Above = NOT_LEGIT
  },
  
  // Security
  security: {
    maxAdminRisk: 60,                // Above with no mitigations = WATCH
    severeAdminRisk: 80,             // Above = SUSPICIOUS
    criticalAdminRisk: 95,           // Above = NOT_LEGIT
    maxIncidents: 2,                 // More = WATCH
    severeIncidents: 4,              // More = SUSPICIOUS
    criticalSeverity: 8,             // Above = SUSPICIOUS
  },
  
  // Data quality
  data: {
    maxDisagreement: 30,             // Above = WATCH
    severeDisagreement: 50,          // Above = SUSPICIOUS
    maxAnomalies: 5,                 // Above = WATCH
    severeAnomalies: 10,             // Above = SUSPICIOUS
    maxStaleness: 24,                // Hours, above = WATCH
    severeStaleness: 72,             // Hours, above = INSUFFICIENT_DATA
    minCoverageQS: 0.40,             // Below = INSUFFICIENT_DATA
    minCoverageOS: 0.30,             // Below = gate OS, but not legitimacy
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// LEGITIMACY RESULT
// ═══════════════════════════════════════════════════════════════════════════════

export interface LegitimacyRuleResult {
  rule: string;
  passed: boolean;
  severity: 'info' | 'warn' | 'error' | 'critical';
  message: string;
  value?: number;
  threshold?: number;
}

export interface LegitimacyResult {
  /** Final legitimacy label */
  label: LegitimacyLabel;
  
  /** Detailed rule results */
  rules: LegitimacyRuleResult[];
  
  /** All triggered warnings */
  warnings: string[];
  
  /** Critical issues that caused NOT_LEGIT or SEVERE */
  criticalIssues: string[];
  
  /** Overall legitimacy score (0-100, for debugging) */
  score: number;
  
  /** Can this be shown to allocators? */
  allowAllocatorView: boolean;
  
  /** Can this be used for trading recommendations? */
  allowTraderView: boolean;
  
  /** Should this appear in rankings? */
  allowRanking: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DECISION TREE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Deterministic legitimacy decision tree
 * 
 * Order of evaluation matters - earlier rules take precedence
 * 
 * 1. SEVERE: Critical issues that warrant full block
 * 2. INSUFFICIENT_DATA: Cannot determine legitimacy
 * 3. NOT_LEGIT: Clear signs of problems, block trading
 * 4. SUSPICIOUS: High risk, limited display
 * 5. WATCH: Caution advised
 * 6. LEGIT: All clear
 */
export function determineLegitimacy(factors: LegitimacyFactors): LegitimacyResult {
  const rules: LegitimacyRuleResult[] = [];
  const warnings: string[] = [];
  const criticalIssues: string[] = [];
  
  const T = LEGITIMACY_THRESHOLDS;
  
  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE 1: Check for SEVERE issues (full block)
  // ─────────────────────────────────────────────────────────────────────────────
  
  // Rule: Critical incident with high severity
  if (factors.incidentCount12m > 0 && factors.maxIncidentSeverity >= 9) {
    rules.push({
      rule: 'SEVERE_INCIDENT',
      passed: false,
      severity: 'critical',
      message: 'Critical security incident with severity 9+',
      value: factors.maxIncidentSeverity,
      threshold: 9,
    });
    criticalIssues.push('Critical security incident detected');
  }
  
  // Rule: Extreme wash trading
  if (factors.washTradingScore >= 90) {
    rules.push({
      rule: 'EXTREME_WASH_TRADING',
      passed: false,
      severity: 'critical',
      message: 'Extreme wash trading detected (≥90%)',
      value: factors.washTradingScore,
      threshold: 90,
    });
    criticalIssues.push('Extreme wash trading detected');
  }
  
  // Rule: Extreme data disagreement + anomalies (manipulation suspected)
  if (factors.dataDisagreementScore >= 70 && factors.anomalyCount >= 15) {
    rules.push({
      rule: 'DATA_MANIPULATION',
      passed: false,
      severity: 'critical',
      message: 'Severe data anomalies suggest manipulation',
      value: factors.dataDisagreementScore,
    });
    criticalIssues.push('Data manipulation suspected');
  }
  
  // Return SEVERE if any critical issues
  if (criticalIssues.length > 0) {
    return {
      label: 'SEVERE',
      rules,
      warnings,
      criticalIssues,
      score: 0,
      allowAllocatorView: false,
      allowTraderView: false,
      allowRanking: false,
    };
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE 2: Check for INSUFFICIENT_DATA
  // ─────────────────────────────────────────────────────────────────────────────
  
  // Rule: Identity confidence too low
  if (factors.identityConfidence < T.identity.minConfidence) {
    rules.push({
      rule: 'LOW_IDENTITY_CONFIDENCE',
      passed: false,
      severity: 'error',
      message: `Identity confidence ${factors.identityConfidence}% below minimum ${T.identity.minConfidence}%`,
      value: factors.identityConfidence,
      threshold: T.identity.minConfidence,
    });
    
    return {
      label: 'INSUFFICIENT_DATA',
      rules,
      warnings: ['Cannot reliably identify this asset'],
      criticalIssues: [],
      score: 0,
      allowAllocatorView: false,
      allowTraderView: false,
      allowRanking: false,
    };
  }
  
  // Rule: Not enough provider IDs
  if (factors.providerIdCount < T.identity.minProviderIds) {
    rules.push({
      rule: 'INSUFFICIENT_PROVIDER_IDS',
      passed: false,
      severity: 'error',
      message: `Only ${factors.providerIdCount} provider IDs (need ${T.identity.minProviderIds})`,
      value: factors.providerIdCount,
      threshold: T.identity.minProviderIds,
    });
    
    return {
      label: 'INSUFFICIENT_DATA',
      rules,
      warnings: ['Insufficient data sources for reliable scoring'],
      criticalIssues: [],
      score: 0,
      allowAllocatorView: false,
      allowTraderView: false,
      allowRanking: false,
    };
  }
  
  // Rule: Data too stale
  if (factors.staleness >= T.data.severeStaleness) {
    rules.push({
      rule: 'SEVERE_STALENESS',
      passed: false,
      severity: 'error',
      message: `Data is ${factors.staleness}h old (limit: ${T.data.severeStaleness}h)`,
      value: factors.staleness,
      threshold: T.data.severeStaleness,
    });
    
    return {
      label: 'INSUFFICIENT_DATA',
      rules,
      warnings: ['Data too stale for reliable scoring'],
      criticalIssues: [],
      score: 0,
      allowAllocatorView: false,
      allowTraderView: false,
      allowRanking: false,
    };
  }
  
  // Rule: QS coverage too low
  if (factors.coverageQS < T.data.minCoverageQS) {
    rules.push({
      rule: 'LOW_QS_COVERAGE',
      passed: false,
      severity: 'error',
      message: `QS coverage ${(factors.coverageQS * 100).toFixed(0)}% below minimum ${(T.data.minCoverageQS * 100).toFixed(0)}%`,
      value: factors.coverageQS,
      threshold: T.data.minCoverageQS,
    });
    
    return {
      label: 'INSUFFICIENT_DATA',
      rules,
      warnings: ['Insufficient data coverage for Quality Score'],
      criticalIssues: [],
      score: 0,
      allowAllocatorView: false,
      allowTraderView: false,
      allowRanking: false,
    };
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE 3: Check for NOT_LEGIT
  // ─────────────────────────────────────────────────────────────────────────────
  
  let notLegitReasons: string[] = [];
  
  // Rule: Severe wash trading
  if (factors.washTradingScore >= T.market.severeWashTrading) {
    rules.push({
      rule: 'SEVERE_WASH_TRADING',
      passed: false,
      severity: 'error',
      message: `Severe wash trading detected (${factors.washTradingScore}%)`,
      value: factors.washTradingScore,
      threshold: T.market.severeWashTrading,
    });
    notLegitReasons.push('Severe wash trading');
  }
  
  // Rule: Extreme spread (illiquid/manipulated)
  if (factors.bidAskSpreadPercent >= T.market.severeSpread) {
    rules.push({
      rule: 'SEVERE_SPREAD',
      passed: false,
      severity: 'error',
      message: `Extreme bid-ask spread (${factors.bidAskSpreadPercent.toFixed(1)}%)`,
      value: factors.bidAskSpreadPercent,
      threshold: T.market.severeSpread,
    });
    notLegitReasons.push('Extreme market spread');
  }
  
  // Rule: Critical admin risk without mitigations
  if (factors.adminRiskScore >= T.security.criticalAdminRisk && !factors.isContractRenounced) {
    rules.push({
      rule: 'CRITICAL_ADMIN_RISK',
      passed: false,
      severity: 'error',
      message: `Critical admin risk (${factors.adminRiskScore}) with active keys`,
      value: factors.adminRiskScore,
      threshold: T.security.criticalAdminRisk,
    });
    notLegitReasons.push('Critical admin key risk');
  }
  
  // Rule: Unverified contract with mint function
  if (!factors.hasVerifiedContract && factors.hasMintFunction) {
    rules.push({
      rule: 'UNVERIFIED_WITH_MINT',
      passed: false,
      severity: 'error',
      message: 'Unverified contract with mint function',
    });
    notLegitReasons.push('Unverified contract can mint tokens');
  }
  
  if (notLegitReasons.length > 0) {
    return {
      label: 'NOT_LEGIT',
      rules,
      warnings: notLegitReasons,
      criticalIssues: [],
      score: 15,
      allowAllocatorView: true,  // Show with heavy warnings
      allowTraderView: false,    // Block trading
      allowRanking: false,
    };
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE 4: Check for SUSPICIOUS
  // ─────────────────────────────────────────────────────────────────────────────
  
  let suspiciousReasons: string[] = [];
  
  // Rule: Elevated wash trading
  if (factors.washTradingScore >= T.market.maxWashTrading) {
    rules.push({
      rule: 'HIGH_WASH_TRADING',
      passed: false,
      severity: 'warn',
      message: `Elevated wash trading (${factors.washTradingScore}%)`,
      value: factors.washTradingScore,
      threshold: T.market.maxWashTrading,
    });
    suspiciousReasons.push('Elevated wash trading signals');
  }
  
  // Rule: Low liquidity
  if (factors.liquidityScore < T.market.minLiquidity) {
    rules.push({
      rule: 'LOW_LIQUIDITY',
      passed: false,
      severity: 'warn',
      message: `Low liquidity score (${factors.liquidityScore})`,
      value: factors.liquidityScore,
      threshold: T.market.minLiquidity,
    });
    suspiciousReasons.push('Insufficient liquidity');
  }
  
  // Rule: Volume/MCap ratio too high (manipulation)
  if (factors.volumeToMcapRatio > T.market.maxVolumeRatio) {
    rules.push({
      rule: 'HIGH_VOLUME_RATIO',
      passed: false,
      severity: 'warn',
      message: `Suspicious volume/mcap ratio (${factors.volumeToMcapRatio.toFixed(2)})`,
      value: factors.volumeToMcapRatio,
      threshold: T.market.maxVolumeRatio,
    });
    suspiciousReasons.push('Unusually high trading volume');
  }
  
  // Rule: High spread
  if (factors.bidAskSpreadPercent >= T.market.maxSpread) {
    rules.push({
      rule: 'HIGH_SPREAD',
      passed: false,
      severity: 'warn',
      message: `Wide bid-ask spread (${factors.bidAskSpreadPercent.toFixed(1)}%)`,
      value: factors.bidAskSpreadPercent,
      threshold: T.market.maxSpread,
    });
    suspiciousReasons.push('Wide market spreads');
  }
  
  // Rule: Severe admin risk
  if (factors.adminRiskScore >= T.security.severeAdminRisk) {
    rules.push({
      rule: 'SEVERE_ADMIN_RISK',
      passed: false,
      severity: 'warn',
      message: `Severe admin risk (${factors.adminRiskScore})`,
      value: factors.adminRiskScore,
      threshold: T.security.severeAdminRisk,
    });
    suspiciousReasons.push('High admin key risk');
  }
  
  // Rule: Multiple incidents
  if (factors.incidentCount12m >= T.security.severeIncidents) {
    rules.push({
      rule: 'MANY_INCIDENTS',
      passed: false,
      severity: 'warn',
      message: `${factors.incidentCount12m} security incidents in 12 months`,
      value: factors.incidentCount12m,
      threshold: T.security.severeIncidents,
    });
    suspiciousReasons.push('Multiple security incidents');
  }
  
  // Rule: High severity incident
  if (factors.maxIncidentSeverity >= T.security.criticalSeverity) {
    rules.push({
      rule: 'HIGH_SEVERITY_INCIDENT',
      passed: false,
      severity: 'warn',
      message: `High severity incident (${factors.maxIncidentSeverity}/10)`,
      value: factors.maxIncidentSeverity,
      threshold: T.security.criticalSeverity,
    });
    suspiciousReasons.push('High severity security incident');
  }
  
  // Rule: Severe data disagreement
  if (factors.dataDisagreementScore >= T.data.severeDisagreement) {
    rules.push({
      rule: 'SEVERE_DISAGREEMENT',
      passed: false,
      severity: 'warn',
      message: `High data source disagreement (${factors.dataDisagreementScore}%)`,
      value: factors.dataDisagreementScore,
      threshold: T.data.severeDisagreement,
    });
    suspiciousReasons.push('Data sources disagree significantly');
  }
  
  // Rule: Many anomalies
  if (factors.anomalyCount >= T.data.severeAnomalies) {
    rules.push({
      rule: 'MANY_ANOMALIES',
      passed: false,
      severity: 'warn',
      message: `${factors.anomalyCount} data anomalies detected`,
      value: factors.anomalyCount,
      threshold: T.data.severeAnomalies,
    });
    suspiciousReasons.push('Multiple data anomalies');
  }
  
  if (suspiciousReasons.length >= 2) { // Need 2+ issues for SUSPICIOUS
    return {
      label: 'SUSPICIOUS',
      rules,
      warnings: suspiciousReasons,
      criticalIssues: [],
      score: 35,
      allowAllocatorView: true,  // Show with warnings
      allowTraderView: false,    // Block trading
      allowRanking: true,        // Can appear in rankings with badge
    };
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE 5: Check for WATCH
  // ─────────────────────────────────────────────────────────────────────────────
  
  let watchReasons: string[] = [];
  
  // Carry over single suspicious reasons to watch
  watchReasons.push(...suspiciousReasons);
  
  // Rule: Identity confidence below warning threshold
  if (factors.identityConfidence < T.identity.warnConfidence) {
    rules.push({
      rule: 'LOW_IDENTITY_WARN',
      passed: false,
      severity: 'info',
      message: `Identity confidence ${factors.identityConfidence}% below optimal`,
      value: factors.identityConfidence,
      threshold: T.identity.warnConfidence,
    });
    watchReasons.push('Identity confidence below optimal');
  }
  
  // Rule: Elevated admin risk
  if (factors.adminRiskScore >= T.security.maxAdminRisk && !factors.isContractRenounced) {
    rules.push({
      rule: 'ELEVATED_ADMIN_RISK',
      passed: false,
      severity: 'info',
      message: `Elevated admin risk (${factors.adminRiskScore})`,
      value: factors.adminRiskScore,
      threshold: T.security.maxAdminRisk,
    });
    watchReasons.push('Elevated admin risk');
  }
  
  // Rule: Has mint function without audit
  if (factors.hasMintFunction && factors.auditCount === 0) {
    rules.push({
      rule: 'MINT_NO_AUDIT',
      passed: false,
      severity: 'info',
      message: 'Contract has mint function but no audits',
    });
    watchReasons.push('Mint function without audit');
  }
  
  // Rule: Some incidents
  if (factors.incidentCount12m > 0 && factors.incidentCount12m <= T.security.maxIncidents) {
    rules.push({
      rule: 'SOME_INCIDENTS',
      passed: false,
      severity: 'info',
      message: `${factors.incidentCount12m} incident(s) in 12 months`,
      value: factors.incidentCount12m,
      threshold: T.security.maxIncidents,
    });
    watchReasons.push('Recent security incidents');
  }
  
  // Rule: Some data disagreement
  if (factors.dataDisagreementScore >= T.data.maxDisagreement) {
    rules.push({
      rule: 'SOME_DISAGREEMENT',
      passed: false,
      severity: 'info',
      message: `Data sources show some disagreement (${factors.dataDisagreementScore}%)`,
      value: factors.dataDisagreementScore,
      threshold: T.data.maxDisagreement,
    });
    watchReasons.push('Minor data source disagreement');
  }
  
  // Rule: Some anomalies
  if (factors.anomalyCount >= T.data.maxAnomalies && factors.anomalyCount < T.data.severeAnomalies) {
    rules.push({
      rule: 'SOME_ANOMALIES',
      passed: false,
      severity: 'info',
      message: `${factors.anomalyCount} data anomalies`,
      value: factors.anomalyCount,
      threshold: T.data.maxAnomalies,
    });
    watchReasons.push('Some data anomalies');
  }
  
  // Rule: Data getting stale
  if (factors.staleness >= T.data.maxStaleness) {
    rules.push({
      rule: 'STALE_DATA',
      passed: false,
      severity: 'info',
      message: `Data is ${factors.staleness}h old`,
      value: factors.staleness,
      threshold: T.data.maxStaleness,
    });
    watchReasons.push('Data freshness concern');
  }
  
  if (watchReasons.length > 0) {
    return {
      label: 'WATCH',
      rules,
      warnings: watchReasons,
      criticalIssues: [],
      score: 65,
      allowAllocatorView: true,
      allowTraderView: true,   // Allow with caution
      allowRanking: true,
    };
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE 6: LEGIT
  // ─────────────────────────────────────────────────────────────────────────────
  
  // Add passing rules
  rules.push({
    rule: 'IDENTITY_OK',
    passed: true,
    severity: 'info',
    message: `Identity confidence ${factors.identityConfidence}% OK`,
    value: factors.identityConfidence,
  });
  
  rules.push({
    rule: 'MARKET_OK',
    passed: true,
    severity: 'info',
    message: 'Market integrity checks passed',
  });
  
  rules.push({
    rule: 'SECURITY_OK',
    passed: true,
    severity: 'info',
    message: 'Security checks passed',
  });
  
  rules.push({
    rule: 'DATA_OK',
    passed: true,
    severity: 'info',
    message: 'Data quality checks passed',
  });
  
  return {
    label: 'LEGIT',
    rules,
    warnings: [],
    criticalIssues: [],
    score: 100,
    allowAllocatorView: true,
    allowTraderView: true,
    allowRanking: true,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: Create default factors
// ═══════════════════════════════════════════════════════════════════════════════

export function createDefaultFactors(): LegitimacyFactors {
  return {
    identityConfidence: 100,
    hasVerifiedContract: true,
    providerIdCount: 3,
    washTradingScore: 0,
    liquidityScore: 80,
    volumeToMcapRatio: 0.05,
    bidAskSpreadPercent: 0.1,
    adminRiskScore: 20,
    hasMintFunction: false,
    isContractRenounced: false,
    auditCount: 2,
    incidentCount12m: 0,
    maxIncidentSeverity: 0,
    dataDisagreementScore: 5,
    anomalyCount: 0,
    staleness: 1,
    coverageQS: 0.9,
    coverageOS: 0.8,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: Mode-specific checks
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if asset can be shown in Allocator mode
 */
export function canShowToAllocator(result: LegitimacyResult): boolean {
  return result.allowAllocatorView;
}

/**
 * Check if asset can be used for Trader recommendations
 */
export function canShowToTrader(result: LegitimacyResult): boolean {
  return result.allowTraderView;
}

/**
 * Check if asset can appear in rankings
 */
export function canAppearInRankings(result: LegitimacyResult): boolean {
  return result.allowRanking;
}

/**
 * Get human-readable summary
 */
export function getLegitimacySummary(result: LegitimacyResult): string {
  switch (result.label) {
    case 'LEGIT':
      return 'All legitimacy checks passed';
    case 'WATCH':
      return `Caution advised: ${result.warnings.slice(0, 2).join(', ')}`;
    case 'SUSPICIOUS':
      return `High risk: ${result.warnings.slice(0, 2).join(', ')}`;
    case 'NOT_LEGIT':
      return `Blocked: ${result.warnings.slice(0, 2).join(', ')}`;
    case 'INSUFFICIENT_DATA':
      return 'Cannot determine legitimacy due to insufficient data';
    case 'SEVERE':
      return `Critical issues: ${result.criticalIssues.slice(0, 2).join(', ')}`;
    default:
      return 'Unknown legitimacy status';
  }
}
