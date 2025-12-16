/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     📋 FEATURE SPEC SHEETS                                                    ║
 * ║                                                                               ║
 * ║   For every input metric, document:                                          ║
 * ║   - Source                                                                   ║
 * ║   - Time window                                                              ║
 * ║   - Transformation (winsorize/log/percentile)                               ║
 * ║   - Direction (higher better/worse)                                          ║
 * ║   - Scope (global vs sector)                                                 ║
 * ║   - What happens when missing                                               ║
 * ║   - Which asset types it applies to                                         ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type FeatureDirection = 'higher_better' | 'lower_better';
export type FeatureScope = 'global' | 'sector' | 'chain';
export type AssetType = 'L1' | 'L2' | 'DeFi' | 'Payment' | 'Memecoin' | 'Stablecoin' | 'NFT' | 'Gaming' | 'All';
export type Transformation = 'raw' | 'log' | 'sqrt' | 'percentile' | 'winsorize' | 'boolean' | 'ratio';
export type MissingBehavior = 'exclude' | 'penalize' | 'default_neutral' | 'require_gate';

export interface FeatureSpec {
  /** Feature ID */
  id: string;
  
  /** Human-readable name */
  name: string;
  
  /** Detailed description */
  description: string;
  
  /** Category: QS, OS, or Risk */
  category: 'QS' | 'OS' | 'Risk';
  
  /** Primary data source */
  source: string;
  
  /** Fallback sources */
  fallbackSources: string[];
  
  /** Time window for the metric */
  timeWindow: string;
  
  /** Transformation applied */
  transformation: Transformation;
  
  /** Winsorization bounds (if applicable) */
  winsorize?: {
    lower: number;
    upper: number;
  };
  
  /** Direction (higher is better or worse) */
  direction: FeatureDirection;
  
  /** Normalization scope */
  scope: FeatureScope;
  
  /** What happens when missing */
  missingBehavior: MissingBehavior;
  
  /** Default value when missing (if applicable) */
  defaultValue?: number;
  
  /** Asset types this applies to */
  appliesTo: AssetType[];
  
  /** Asset types this does NOT apply to */
  notApplicableTo: AssetType[];
  
  /** Unit of raw value */
  unit: string;
  
  /** Expected range of raw values */
  expectedRange: {
    min: number;
    max: number;
  };
  
  /** Base weight in category */
  weight: number;
  
  /** Notes and caveats */
  notes: string;
  
  /** Last updated */
  lastUpdated: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// QS FEATURE SPECS
// ═══════════════════════════════════════════════════════════════════════════════

export const QS_FEATURE_SPECS: FeatureSpec[] = [
  {
    id: 'qs_security_posture',
    name: 'Security Posture',
    description: 'Composite score of audits, bug bounties, incident history, and contract verification',
    category: 'QS',
    source: 'coingecko',
    fallbackSources: ['defillama', 'manual'],
    timeWindow: '12 months',
    transformation: 'percentile',
    direction: 'higher_better',
    scope: 'global',
    missingBehavior: 'penalize',
    appliesTo: ['L1', 'L2', 'DeFi'],
    notApplicableTo: ['Memecoin', 'NFT'],
    unit: 'composite_score',
    expectedRange: { min: 0, max: 100 },
    weight: 0.20,
    notes: 'For L1s like BTC, audit_count is N/A but incident_count matters. Memecoins typically have no audits - this is expected, not a penalty.',
    lastUpdated: '2024-12-16',
  },
  {
    id: 'qs_dev_delivery',
    name: 'Development Delivery',
    description: 'Release cadence, active contributors, issue closure rate, GitHub activity',
    category: 'QS',
    source: 'github',
    fallbackSources: ['manual'],
    timeWindow: '90 days',
    transformation: 'percentile',
    direction: 'higher_better',
    scope: 'sector',
    missingBehavior: 'exclude',
    appliesTo: ['L1', 'L2', 'DeFi'],
    notApplicableTo: ['Memecoin', 'Payment'],
    unit: 'composite_score',
    expectedRange: { min: 0, max: 100 },
    weight: 0.20,
    notes: 'Not applicable to payment tokens (XRP) or memecoins. Compare within sector (L1 vs L1, DeFi vs DeFi).',
    lastUpdated: '2024-12-16',
  },
  {
    id: 'qs_adoption',
    name: 'Adoption',
    description: 'Fees paid, active addresses, DAU/MAU ratio, retention',
    category: 'QS',
    source: 'defillama',
    fallbackSources: ['coingecko', 'chain_native'],
    timeWindow: '30 days',
    transformation: 'log',
    winsorize: { lower: 1, upper: 99 },
    direction: 'higher_better',
    scope: 'sector',
    missingBehavior: 'penalize',
    appliesTo: ['All'],
    notApplicableTo: [],
    unit: 'composite_score',
    expectedRange: { min: 0, max: 100 },
    weight: 0.20,
    notes: 'Log transform prevents BTC/ETH from compressing all other scores. Compare within sector.',
    lastUpdated: '2024-12-16',
  },
  {
    id: 'qs_ecosystem_depth',
    name: 'Ecosystem Depth',
    description: 'TVL, protocol count, integrations, TVL/MCap ratio',
    category: 'QS',
    source: 'defillama',
    fallbackSources: ['coingecko'],
    timeWindow: 'current',
    transformation: 'log',
    winsorize: { lower: 1, upper: 99 },
    direction: 'higher_better',
    scope: 'sector',
    missingBehavior: 'exclude',
    appliesTo: ['L1', 'L2', 'DeFi'],
    notApplicableTo: ['Payment', 'Memecoin', 'Stablecoin'],
    unit: 'composite_score',
    expectedRange: { min: 0, max: 100 },
    weight: 0.15,
    notes: 'TVL is meaningless for payment tokens and stablecoins. Only applies to L1/L2/DeFi.',
    lastUpdated: '2024-12-16',
  },
  {
    id: 'qs_sustainability',
    name: 'Sustainability',
    description: 'Fee/incentive ratio, inflation rate, treasury runway',
    category: 'QS',
    source: 'defillama',
    fallbackSources: ['tokenterminal', 'manual'],
    timeWindow: 'current',
    transformation: 'percentile',
    direction: 'higher_better',
    scope: 'sector',
    missingBehavior: 'default_neutral',
    defaultValue: 50,
    appliesTo: ['L1', 'L2', 'DeFi'],
    notApplicableTo: ['Memecoin', 'Payment'],
    unit: 'composite_score',
    expectedRange: { min: 0, max: 100 },
    weight: 0.10,
    notes: 'BTC has no treasury - use neutral default. Memecoins have no sustainability model - exclude entirely.',
    lastUpdated: '2024-12-16',
  },
  {
    id: 'qs_decentralization',
    name: 'Decentralization',
    description: 'Validator count, Nakamoto coefficient, governance participation',
    category: 'QS',
    source: 'chain_native',
    fallbackSources: ['coingecko', 'manual'],
    timeWindow: 'current',
    transformation: 'percentile',
    direction: 'higher_better',
    scope: 'sector',
    missingBehavior: 'exclude',
    appliesTo: ['L1', 'L2'],
    notApplicableTo: ['DeFi', 'Payment', 'Memecoin', 'Stablecoin'],
    unit: 'composite_score',
    expectedRange: { min: 0, max: 100 },
    weight: 0.15,
    notes: 'Only meaningful for L1/L2 chains. DeFi protocols have different decentralization models (multisig vs DAO).',
    lastUpdated: '2024-12-16',
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// OS FEATURE SPECS
// ═══════════════════════════════════════════════════════════════════════════════

export const OS_FEATURE_SPECS: FeatureSpec[] = [
  {
    id: 'os_liquidity',
    name: 'Liquidity',
    description: 'Volume, bid-ask spread, slippage, depth',
    category: 'OS',
    source: 'coingecko',
    fallbackSources: ['coinmarketcap', 'dex_aggregator'],
    timeWindow: '24 hours',
    transformation: 'log',
    winsorize: { lower: 1, upper: 99 },
    direction: 'higher_better',
    scope: 'global',
    missingBehavior: 'require_gate',
    appliesTo: ['All'],
    notApplicableTo: [],
    unit: 'composite_score',
    expectedRange: { min: 0, max: 100 },
    weight: 0.25,
    notes: 'Critical for tradability. If missing, OS should be gated.',
    lastUpdated: '2024-12-16',
  },
  {
    id: 'os_volume_quality',
    name: 'Volume Quality',
    description: 'Wash trading detection, exchange diversity, trade size distribution',
    category: 'OS',
    source: 'coingecko',
    fallbackSources: ['coinmarketcap'],
    timeWindow: '7 days',
    transformation: 'percentile',
    direction: 'higher_better',
    scope: 'global',
    missingBehavior: 'penalize',
    appliesTo: ['All'],
    notApplicableTo: [],
    unit: 'composite_score',
    expectedRange: { min: 0, max: 100 },
    weight: 0.15,
    notes: 'High wash trading score (>70) triggers SUSPICIOUS legitimacy flag.',
    lastUpdated: '2024-12-16',
  },
  {
    id: 'os_momentum',
    name: 'Momentum',
    description: 'Multi-timeframe price returns (24h, 7d, 30d, 90d)',
    category: 'OS',
    source: 'coingecko',
    fallbackSources: ['coinmarketcap'],
    timeWindow: '90 days',
    transformation: 'percentile',
    direction: 'higher_better',
    scope: 'global',
    missingBehavior: 'require_gate',
    appliesTo: ['All'],
    notApplicableTo: ['Stablecoin'],
    unit: 'percent_change',
    expectedRange: { min: -100, max: 500 },
    weight: 0.25,
    notes: 'Not applicable to stablecoins. Neutral momentum (~50) is normal in sideways markets.',
    lastUpdated: '2024-12-16',
  },
  {
    id: 'os_vol_regime',
    name: 'Volatility Regime',
    description: 'Realized volatility at multiple timeframes, volatility percentile',
    category: 'OS',
    source: 'coingecko',
    fallbackSources: ['coinmarketcap'],
    timeWindow: '90 days',
    transformation: 'percentile',
    direction: 'lower_better',
    scope: 'sector',
    missingBehavior: 'default_neutral',
    defaultValue: 50,
    appliesTo: ['All'],
    notApplicableTo: ['Stablecoin'],
    unit: 'volatility_score',
    expectedRange: { min: 0, max: 100 },
    weight: 0.20,
    notes: 'LOWER volatility is better (less risky). Compare within sector - memecoins are expected to be volatile.',
    lastUpdated: '2024-12-16',
  },
  {
    id: 'os_flow_proxy',
    name: 'Flow Proxy',
    description: 'Exchange net flows, whale transactions, smart money indicators',
    category: 'OS',
    source: 'glassnode',
    fallbackSources: ['nansen', 'coingecko'],
    timeWindow: '7 days',
    transformation: 'percentile',
    direction: 'higher_better',
    scope: 'global',
    missingBehavior: 'exclude',
    appliesTo: ['L1', 'L2'],
    notApplicableTo: ['DeFi', 'Memecoin'],
    unit: 'flow_score',
    expectedRange: { min: 0, max: 100 },
    weight: 0.15,
    notes: 'On-chain flow data only available for major L1/L2 chains. Exclude if unavailable rather than penalize.',
    lastUpdated: '2024-12-16',
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// RISK FEATURE SPECS
// ═══════════════════════════════════════════════════════════════════════════════

export const RISK_FEATURE_SPECS: FeatureSpec[] = [
  {
    id: 'risk_liquidity_fragility',
    name: 'Liquidity Fragility',
    description: 'Thin books, high slippage, liquidity concentration',
    category: 'Risk',
    source: 'coingecko',
    fallbackSources: ['dex_aggregator'],
    timeWindow: '24 hours',
    transformation: 'percentile',
    direction: 'lower_better',
    scope: 'global',
    missingBehavior: 'penalize',
    appliesTo: ['All'],
    notApplicableTo: [],
    unit: 'risk_score',
    expectedRange: { min: 0, max: 100 },
    weight: 0.20,
    notes: 'HIGHER score = MORE risk. Missing data should increase risk score.',
    lastUpdated: '2024-12-16',
  },
  {
    id: 'risk_concentration',
    name: 'Concentration Risk',
    description: 'Top holder percentage, team holdings, exchange concentration',
    category: 'Risk',
    source: 'etherscan',
    fallbackSources: ['coingecko', 'manual'],
    timeWindow: 'current',
    transformation: 'percentile',
    direction: 'lower_better',
    scope: 'global',
    missingBehavior: 'penalize',
    appliesTo: ['All'],
    notApplicableTo: [],
    unit: 'risk_score',
    expectedRange: { min: 0, max: 100 },
    weight: 0.20,
    notes: 'BTC has low concentration (good). Many altcoins have high team/insider holdings (risky).',
    lastUpdated: '2024-12-16',
  },
  {
    id: 'risk_unlock',
    name: 'Unlock Risk',
    description: 'Upcoming unlock events, emission schedule',
    category: 'Risk',
    source: 'tokenterminal',
    fallbackSources: ['manual'],
    timeWindow: '90 days forward',
    transformation: 'percentile',
    direction: 'lower_better',
    scope: 'global',
    missingBehavior: 'default_neutral',
    defaultValue: 30,
    appliesTo: ['L1', 'L2', 'DeFi'],
    notApplicableTo: ['Payment', 'Stablecoin'],
    unit: 'risk_score',
    expectedRange: { min: 0, max: 100 },
    weight: 0.15,
    notes: 'BTC has no unlocks - use low default. Fully vested tokens (XRP) also have low unlock risk.',
    lastUpdated: '2024-12-16',
  },
  {
    id: 'risk_admin_privilege',
    name: 'Admin Privilege Risk',
    description: 'Mint functions, upgradeability, admin key concentration',
    category: 'Risk',
    source: 'etherscan',
    fallbackSources: ['manual'],
    timeWindow: 'current',
    transformation: 'boolean',
    direction: 'lower_better',
    scope: 'global',
    missingBehavior: 'penalize',
    appliesTo: ['DeFi', 'L2'],
    notApplicableTo: ['L1', 'Payment'],
    unit: 'risk_score',
    expectedRange: { min: 0, max: 100 },
    weight: 0.15,
    notes: 'L1 chains like BTC/ETH have no admin keys. This metric is for smart contract tokens.',
    lastUpdated: '2024-12-16',
  },
  {
    id: 'risk_incident',
    name: 'Incident Risk',
    description: 'Historical exploits, outages, severity',
    category: 'Risk',
    source: 'rekt.news',
    fallbackSources: ['manual'],
    timeWindow: '12 months',
    transformation: 'percentile',
    direction: 'lower_better',
    scope: 'global',
    missingBehavior: 'default_neutral',
    defaultValue: 20,
    appliesTo: ['All'],
    notApplicableTo: [],
    unit: 'risk_score',
    expectedRange: { min: 0, max: 100 },
    weight: 0.15,
    notes: 'No incidents = low risk (good). Recent major exploit = high risk.',
    lastUpdated: '2024-12-16',
  },
  {
    id: 'risk_data_integrity',
    name: 'Data Integrity Risk',
    description: 'Missing data, stale data, source disagreement',
    category: 'Risk',
    source: 'calculated',
    fallbackSources: [],
    timeWindow: 'current',
    transformation: 'raw',
    direction: 'lower_better',
    scope: 'global',
    missingBehavior: 'require_gate',
    appliesTo: ['All'],
    notApplicableTo: [],
    unit: 'risk_score',
    expectedRange: { min: 0, max: 100 },
    weight: 0.15,
    notes: 'This is a meta-risk: how confident are we in the other data? High data integrity risk → gate the entire score.',
    lastUpdated: '2024-12-16',
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// ALL SPECS
// ═══════════════════════════════════════════════════════════════════════════════

export const ALL_FEATURE_SPECS: FeatureSpec[] = [
  ...QS_FEATURE_SPECS,
  ...OS_FEATURE_SPECS,
  ...RISK_FEATURE_SPECS,
];

/**
 * Get spec by feature ID
 */
export function getFeatureSpec(featureId: string): FeatureSpec | undefined {
  return ALL_FEATURE_SPECS.find(s => s.id === featureId);
}

/**
 * Get all specs for a category
 */
export function getSpecsForCategory(category: 'QS' | 'OS' | 'Risk'): FeatureSpec[] {
  return ALL_FEATURE_SPECS.filter(s => s.category === category);
}

/**
 * Get applicable specs for an asset type
 */
export function getApplicableSpecs(assetType: AssetType): FeatureSpec[] {
  return ALL_FEATURE_SPECS.filter(s => 
    (s.appliesTo.includes('All') || s.appliesTo.includes(assetType)) &&
    !s.notApplicableTo.includes(assetType)
  );
}

/**
 * Check if a feature applies to an asset type
 */
export function isFeatureApplicable(featureId: string, assetType: AssetType): boolean {
  const spec = getFeatureSpec(featureId);
  if (!spec) return false;
  
  if (spec.notApplicableTo.includes(assetType)) return false;
  if (spec.appliesTo.includes('All')) return true;
  return spec.appliesTo.includes(assetType);
}

/**
 * Format specs as markdown documentation
 */
export function formatSpecsAsMarkdown(): string {
  const lines: string[] = [];
  
  lines.push('# OmniScore Feature Specifications');
  lines.push('');
  lines.push('This document defines every input metric used in OmniScore calculation.');
  lines.push('');
  
  for (const category of ['QS', 'OS', 'Risk'] as const) {
    lines.push(`## ${category} Features`);
    lines.push('');
    
    const specs = getSpecsForCategory(category);
    
    for (const spec of specs) {
      lines.push(`### ${spec.name} (\`${spec.id}\`)`);
      lines.push('');
      lines.push(`**Description:** ${spec.description}`);
      lines.push('');
      lines.push(`| Property | Value |`);
      lines.push(`|----------|-------|`);
      lines.push(`| Source | ${spec.source} |`);
      lines.push(`| Fallbacks | ${spec.fallbackSources.join(', ') || 'None'} |`);
      lines.push(`| Time Window | ${spec.timeWindow} |`);
      lines.push(`| Transformation | ${spec.transformation} |`);
      lines.push(`| Direction | ${spec.direction} |`);
      lines.push(`| Scope | ${spec.scope} |`);
      lines.push(`| When Missing | ${spec.missingBehavior} |`);
      lines.push(`| Weight | ${(spec.weight * 100).toFixed(0)}% |`);
      lines.push(`| Applies To | ${spec.appliesTo.join(', ')} |`);
      lines.push(`| Not For | ${spec.notApplicableTo.join(', ') || 'None'} |`);
      lines.push('');
      lines.push(`**Notes:** ${spec.notes}`);
      lines.push('');
    }
  }
  
  return lines.join('\n');
}
