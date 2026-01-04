/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🏛️ CIS LAYER 2 - FSS REGISTRY                                            ║
 * ║                                                                               ║
 * ║   The Feature Specification Sheets Registry                                  ║
 * ║   "The Semantic Bible"                                                        ║
 * ║                                                                               ║
 * ║   Every metric_id MUST have a corresponding entry here.                      ║
 * ║   Metrics applied outside their allowed_sectors are SEMANTIC ERRORS.         ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type { FeatureSpecificationSheet, FSSRegistry, Sector } from './fss-types';

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: Create FSS Entry
// ═══════════════════════════════════════════════════════════════════════════════

const now = new Date().toISOString();

function createFSS(
  overrides: Partial<FeatureSpecificationSheet> & {
    metric_id: string;
    name: string;
    definition: string;
    score_category: 'QS' | 'OS' | 'RISK' | 'META';
    direction: 'higher_is_better' | 'higher_is_worse' | 'neutral';
    allowed_sectors: Sector[];
  }
): FeatureSpecificationSheet {
  return {
    fss_version: '1.0.0',
    last_updated: now,
    changelog: [{
      version: '1.0.0',
      date: now.split('T')[0],
      changes: 'Initial specification',
      author: 'CIS Team',
    }],
    investor_relevance: overrides.investor_relevance ?? 'Standard metric for asset evaluation.',
    expected_unit: overrides.expected_unit ?? 'SCORE_0_100',
    base_weight: overrides.base_weight ?? 0.1,
    forbidden_sectors: overrides.forbidden_sectors ?? [],
    time_window: overrides.time_window ?? '24h',
    scope: overrides.scope ?? 'global',
    primary_source: overrides.primary_source ?? 'aggregator',
    fallback_sources: overrides.fallback_sources ?? [],
    staleness_threshold_seconds: overrides.staleness_threshold_seconds ?? 3600,
    min_sources_for_confidence: overrides.min_sources_for_confidence ?? 1,
    normalization: overrides.normalization ?? {
      method: 'percentile',
      output_min: 0,
      output_max: 100,
      comparable_universe: 'top_200',
    },
    sanity_bounds: overrides.sanity_bounds ?? {
      hard_min: 0,
      hard_max: null,
      warn_min: null,
      warn_max: null,
      rationale: 'Standard bounds',
    },
    fmea: overrides.fmea ?? [{
      failure_mode: 'source_outage',
      description: 'Primary data source unavailable',
      severity: 'marginal',
      occurrence_probability: 0.05,
      detection_difficulty: 2,
      rpn: 10,
      compensation: ['use_fallback', 'reduce_confidence'],
      mitigation_steps: ['Monitor source health', 'Maintain fallback sources'],
    }],
    when_missing: overrides.when_missing ?? 'exclude_from_score',
    confidence_when_present: overrides.confidence_when_present ?? 1.0,
    confidence_when_missing: overrides.confidence_when_missing ?? 0.8,
    limitations: overrides.limitations ?? [],
    related_metrics: overrides.related_metrics ?? [],
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUALITY SCORE (QS) METRICS
// ═══════════════════════════════════════════════════════════════════════════════

const QS_SPECIFICATIONS: Record<string, FeatureSpecificationSheet> = {
  /**
   * ┌─────────────────────────────────────────────────────────────────────────────┐
   * │  TVL (Total Value Locked)                                                   │
   * │                                                                             │
   * │  CRITICAL SEMANTIC CONSTRAINT:                                             │
   * │  TVL is ONLY meaningful for DeFi protocols and L1/L2 ecosystems.           │
   * │  Applying TVL to Payment tokens (XRP, XLM) is a SEMANTIC ERROR.            │
   * │                                                                             │
   * │  "XRP looks weak because it has no TVL" → WRONG INTERPRETATION             │
   * │  The correct interpretation: TVL is not applicable to XRP's sector.        │
   * └─────────────────────────────────────────────────────────────────────────────┘
   */
  'qs_tvl_v1': createFSS({
    metric_id: 'qs_tvl_v1',
    name: 'Total Value Locked (TVL)',
    definition: 'The total USD value of crypto assets deposited in a protocol\'s smart contracts. Measures capital committed to the ecosystem.',
    investor_relevance: 'Indicates trust and utility of DeFi protocols. Higher TVL suggests more capital efficiency and user confidence.',
    score_category: 'QS',
    direction: 'higher_is_better',
    expected_unit: 'USD',
    base_weight: 0.15,
    
    // CRITICAL: TVL only makes sense for these sectors
    allowed_sectors: ['DeFi', 'L1', 'L2'],
    
    // FORBIDDEN: Applying TVL to these is semantically incorrect
    forbidden_sectors: ['Payment', 'Memecoin', 'Stablecoin', 'Exchange', 'Privacy'],
    
    time_window: 'spot',
    primary_source: 'defillama',
    fallback_sources: ['coingecko', 'dune_analytics'],
    staleness_threshold_seconds: 3600,
    
    normalization: {
      method: 'log_transform',
      output_min: 0,
      output_max: 100,
      comparable_universe: 'sector',
      notes: 'Log transform due to extreme TVL variance ($1M to $50B range)',
    },
    
    sanity_bounds: {
      hard_min: 0,
      hard_max: 500_000_000_000, // $500B (exceeds all DeFi combined)
      warn_min: 1000, // Less than $1k TVL is suspicious
      warn_max: 100_000_000_000, // >$100B is unusual
      rationale: 'TVL cannot be negative. Upper bound based on total DeFi market.',
    },
    
    fmea: [
      {
        failure_mode: 'semantic_mismatch',
        description: 'TVL metric applied to asset where TVL is not meaningful (e.g., Payment tokens like XRP)',
        severity: 'catastrophic',
        occurrence_probability: 0.1,
        detection_difficulty: 3,
        rpn: 30,
        compensation: ['exclude_metric'],
        mitigation_steps: [
          'Check asset sector classification before applying TVL',
          'If sector not in allowed_sectors, EXCLUDE metric entirely',
          'Do NOT penalize asset for missing TVL if sector is not applicable',
        ],
        example: 'XRP is a Payment token. TVL is undefined for XRP. Excluding TVL from XRP\'s QS calculation is CORRECT. Penalizing XRP for "zero TVL" is INCORRECT.',
      },
      {
        failure_mode: 'stale_data',
        description: 'TVL data older than 1 hour',
        severity: 'marginal',
        occurrence_probability: 0.15,
        detection_difficulty: 2,
        rpn: 15,
        compensation: ['reduce_confidence', 'flag_for_review'],
        mitigation_steps: ['Check defillama timestamp', 'Use cached value with staleness penalty'],
      },
      {
        failure_mode: 'manipulation_signal',
        description: 'TVL inflated through recursive deposits or wash liquidity',
        severity: 'critical',
        occurrence_probability: 0.05,
        detection_difficulty: 8,
        rpn: 40,
        compensation: ['reduce_confidence', 'flag_for_review'],
        mitigation_steps: ['Cross-reference with actual usage metrics', 'Check TVL/volume ratio'],
      },
    ],
    
    when_missing: 'exclude_from_score',
    confidence_when_present: 1.0,
    confidence_when_missing: 0.9, // Missing TVL for DeFi is bad; for Payment is expected
    
    limitations: [
      'Double-counting possible in protocols with recursive strategies',
      'Does not distinguish between quality and quantity of deposits',
      'Can be inflated by protocol incentives',
    ],
    related_metrics: ['qs_ecosystem_depth_v1', 'qs_protocol_revenue_v1'],
  }),

  /**
   * Security Posture
   */
  'qs_security_posture_v1': createFSS({
    metric_id: 'qs_security_posture_v1',
    name: 'Security Posture',
    definition: 'Composite score of security indicators: audit status, bug bounty program, incident history, and code quality.',
    investor_relevance: 'Higher security posture reduces risk of hacks, exploits, and loss of funds.',
    score_category: 'QS',
    direction: 'higher_is_better',
    expected_unit: 'SCORE_0_100',
    base_weight: 0.20,
    
    allowed_sectors: ['L1', 'L2', 'DeFi', 'Infrastructure', 'Gaming', 'Exchange'],
    forbidden_sectors: ['Memecoin'], // Memecoins typically have no security infrastructure
    
    time_window: '90d',
    primary_source: 'manual_audit_aggregation',
    fallback_sources: ['defisafety', 'certik'],
    
    sanity_bounds: {
      hard_min: 0,
      hard_max: 100,
      warn_min: null,
      warn_max: null,
      rationale: 'Normalized score 0-100',
    },
    
    fmea: [
      {
        failure_mode: 'stale_data',
        description: 'Audit information outdated (no recent audits)',
        severity: 'marginal',
        occurrence_probability: 0.2,
        detection_difficulty: 3,
        rpn: 18,
        compensation: ['reduce_confidence'],
        mitigation_steps: ['Track audit dates', 'Penalize old audits'],
      },
    ],
    
    when_missing: 'exclude_from_score',
    limitations: ['Audits do not guarantee security', 'Bug bounty size may not reflect actual security'],
  }),

  /**
   * Developer Delivery
   */
  'qs_dev_delivery_v1': createFSS({
    metric_id: 'qs_dev_delivery_v1',
    name: 'Developer Delivery',
    definition: 'Measures development activity through release cadence, commit quality, active maintainers, and issue throughput.',
    investor_relevance: 'Active development suggests ongoing improvement and adaptation.',
    score_category: 'QS',
    direction: 'higher_is_better',
    expected_unit: 'SCORE_0_100',
    base_weight: 0.15,
    
    allowed_sectors: ['L1', 'L2', 'DeFi', 'Infrastructure', 'Gaming', 'Privacy'],
    forbidden_sectors: ['Payment', 'Exchange', 'Memecoin', 'Stablecoin'],
    
    time_window: '30d',
    primary_source: 'github_api',
    fallback_sources: ['santiment', 'messari'],
    
    sanity_bounds: {
      hard_min: 0,
      hard_max: 100,
      warn_min: 5, // Very low activity is suspicious for active projects
      warn_max: null,
      rationale: 'Normalized score. Very low scores may indicate abandoned projects.',
    },
    
    fmea: [
      {
        failure_mode: 'semantic_mismatch',
        description: 'Dev activity applied to assets without public development (e.g., Payment tokens, CEX tokens)',
        severity: 'critical',
        occurrence_probability: 0.1,
        detection_difficulty: 4,
        rpn: 28,
        compensation: ['exclude_metric'],
        mitigation_steps: [
          'Check if asset has public GitHub/development repos',
          'Exclude metric if no repos or if sector does not expect public dev',
        ],
        example: 'BNB (Exchange token) development is internal to Binance. Public dev metrics are not meaningful.',
      },
    ],
    
    when_missing: 'exclude_from_score',
    limitations: ['Commit count ≠ quality', 'Private repos not captured'],
  }),

  /**
   * Adoption
   */
  'qs_adoption_v1': createFSS({
    metric_id: 'qs_adoption_v1',
    name: 'Adoption',
    definition: 'Measures real usage through active addresses, transaction count, and fee revenue.',
    investor_relevance: 'Adoption indicates product-market fit and sustainable demand.',
    score_category: 'QS',
    direction: 'higher_is_better',
    expected_unit: 'SCORE_0_100',
    base_weight: 0.20,
    
    // Adoption is universal - meaningful for all asset types
    allowed_sectors: ['L1', 'L2', 'DeFi', 'Payment', 'Exchange', 'Memecoin', 'Stablecoin', 'Gaming', 'Infrastructure', 'Privacy', 'NFT', 'AI', 'RWA', 'Unknown'],
    forbidden_sectors: [],
    
    time_window: '30d',
    primary_source: 'on_chain_aggregation',
    fallback_sources: ['glassnode', 'santiment', 'dune'],
    
    normalization: {
      method: 'percentile',
      winsorize_lower: 5,
      winsorize_upper: 95,
      output_min: 0,
      output_max: 100,
      comparable_universe: 'sector', // Compare within sector for fairness
    },
    
    when_missing: 'reduce_confidence',
    confidence_when_missing: 0.7,
  }),

  /**
   * Ecosystem Depth
   */
  'qs_ecosystem_depth_v1': createFSS({
    metric_id: 'qs_ecosystem_depth_v1',
    name: 'Ecosystem Depth',
    definition: 'Breadth of ecosystem: number of integrations, dApps built on top, partnerships.',
    investor_relevance: 'Deep ecosystems have network effects and switching costs.',
    score_category: 'QS',
    direction: 'higher_is_better',
    expected_unit: 'SCORE_0_100',
    base_weight: 0.15,
    
    allowed_sectors: ['L1', 'L2', 'DeFi', 'Infrastructure'],
    forbidden_sectors: ['Payment', 'Memecoin', 'Stablecoin', 'Privacy'],
    
    time_window: 'spot',
    primary_source: 'defillama_ecosystem',
    
    fmea: [
      {
        failure_mode: 'semantic_mismatch',
        description: 'Ecosystem depth applied to standalone tokens without ecosystem',
        severity: 'critical',
        occurrence_probability: 0.15,
        detection_difficulty: 3,
        rpn: 31,
        compensation: ['exclude_metric'],
        mitigation_steps: ['Verify asset is a platform/protocol, not a utility token'],
        example: 'Solana ecosystem depth is a key metric. For a simple utility token, it is not relevant.',
      },
    ],
    
    when_missing: 'exclude_from_score',
  }),

  /**
   * Sustainability
   */
  'qs_sustainability_v1': createFSS({
    metric_id: 'qs_sustainability_v1',
    name: 'Sustainability',
    definition: 'Protocol revenue vs token emissions. Measures economic viability.',
    investor_relevance: 'Sustainable protocols don\'t rely on continuous token inflation.',
    score_category: 'QS',
    direction: 'higher_is_better',
    expected_unit: 'RATIO',
    base_weight: 0.10,
    
    allowed_sectors: ['L1', 'L2', 'DeFi'],
    forbidden_sectors: ['Payment', 'Memecoin', 'Stablecoin', 'Exchange'],
    
    time_window: '30d',
    primary_source: 'tokenterminal',
    fallback_sources: ['defillama_fees', 'manual'],
    
    sanity_bounds: {
      hard_min: 0,
      hard_max: null, // Can be >1 (revenue > emissions)
      warn_min: null,
      warn_max: 10, // Revenue 10x emissions is unusual
      rationale: 'Ratio of revenue to emissions. Higher is better.',
    },
    
    when_missing: 'exclude_from_score',
  }),

  /**
   * Decentralization
   */
  'qs_decentralization_v1': createFSS({
    metric_id: 'qs_decentralization_v1',
    name: 'Decentralization',
    definition: 'Measures validator distribution, governance participation, and geographic spread.',
    investor_relevance: 'Decentralization reduces single points of failure and censorship risk.',
    score_category: 'QS',
    direction: 'higher_is_better',
    expected_unit: 'SCORE_0_100',
    base_weight: 0.05,
    
    // Only meaningful for blockchains with consensus
    allowed_sectors: ['L1', 'Privacy'],
    forbidden_sectors: ['L2', 'DeFi', 'Payment', 'Exchange', 'Memecoin', 'Stablecoin', 'Gaming', 'Infrastructure'],
    
    time_window: 'spot',
    primary_source: 'chain_analysis',
    
    fmea: [
      {
        failure_mode: 'semantic_mismatch',
        description: 'Decentralization applied to L2 (inherits from L1) or tokens without own consensus',
        severity: 'critical',
        occurrence_probability: 0.2,
        detection_difficulty: 3,
        rpn: 42,
        compensation: ['exclude_metric'],
        mitigation_steps: ['Only apply to L1 chains with own validator sets'],
        example: 'Arbitrum decentralization depends on Ethereum. Measuring ARB decentralization separately is misleading.',
      },
    ],
    
    when_missing: 'exclude_from_score',
    limitations: ['L2s inherit decentralization from L1', 'Nakamoto coefficient is imperfect'],
  }),
};

// ═══════════════════════════════════════════════════════════════════════════════
// OPPORTUNITY SCORE (OS) METRICS
// ═══════════════════════════════════════════════════════════════════════════════

const OS_SPECIFICATIONS: Record<string, FeatureSpecificationSheet> = {
  /**
   * Liquidity Depth
   */
  'os_liquidity_depth_v1': createFSS({
    metric_id: 'os_liquidity_depth_v1',
    name: 'Liquidity Depth',
    definition: 'Aggregated order book depth across major venues. Measures ability to enter/exit positions.',
    investor_relevance: 'Deep liquidity means lower slippage and better execution.',
    score_category: 'OS',
    direction: 'higher_is_better',
    expected_unit: 'USD',
    base_weight: 0.20,
    
    allowed_sectors: ['L1', 'L2', 'DeFi', 'Payment', 'Exchange', 'Memecoin', 'Stablecoin', 'Gaming', 'Infrastructure', 'Privacy', 'NFT', 'AI', 'RWA', 'Unknown'],
    forbidden_sectors: [],
    
    time_window: 'spot',
    primary_source: 'kaiko',
    fallback_sources: ['coingecko_liquidity', 'cex_apis'],
    
    normalization: {
      method: 'log_transform',
      output_min: 0,
      output_max: 100,
      comparable_universe: 'top_200',
    },
    
    when_missing: 'gate_category', // OS requires liquidity data
    confidence_when_missing: 0.5,
  }),

  /**
   * Volume Quality
   */
  'os_volume_quality_v1': createFSS({
    metric_id: 'os_volume_quality_v1',
    name: 'Volume Quality',
    definition: 'Real volume score accounting for wash trading signals, venue diversity, and organic flow.',
    investor_relevance: 'Distinguishes real market interest from fake activity.',
    score_category: 'OS',
    direction: 'higher_is_better',
    expected_unit: 'SCORE_0_100',
    base_weight: 0.15,
    
    allowed_sectors: ['L1', 'L2', 'DeFi', 'Payment', 'Exchange', 'Memecoin', 'Stablecoin', 'Gaming', 'Infrastructure', 'Privacy', 'NFT', 'AI', 'RWA', 'Unknown'],
    forbidden_sectors: [],
    
    time_window: '24h',
    primary_source: 'messari_real_volume',
    fallback_sources: ['nomics', 'kaiko'],
    
    fmea: [
      {
        failure_mode: 'manipulation_signal',
        description: 'Wash trading detected but not filtered',
        severity: 'critical',
        occurrence_probability: 0.1,
        detection_difficulty: 7,
        rpn: 49,
        compensation: ['reduce_confidence', 'flag_for_review'],
        mitigation_steps: ['Cross-reference multiple real volume estimators'],
      },
    ],
    
    when_missing: 'exclude_from_score',
  }),

  /**
   * Momentum
   */
  'os_momentum_v1': createFSS({
    metric_id: 'os_momentum_v1',
    name: 'Price Momentum',
    definition: 'Multi-timeframe price momentum (7d, 30d, 90d returns) normalized.',
    investor_relevance: 'Momentum signals trend strength and potential continuation.',
    score_category: 'OS',
    direction: 'neutral', // Can be positive or negative
    expected_unit: 'SCORE_0_100',
    base_weight: 0.25,
    
    allowed_sectors: ['L1', 'L2', 'DeFi', 'Payment', 'Exchange', 'Memecoin', 'Gaming', 'Infrastructure', 'Privacy', 'NFT', 'AI', 'RWA', 'Unknown'],
    forbidden_sectors: ['Stablecoin'], // Stablecoins shouldn't have momentum
    
    time_window: '90d',
    primary_source: 'coingecko_historical',
    
    fmea: [
      {
        failure_mode: 'semantic_mismatch',
        description: 'Momentum applied to stablecoin',
        severity: 'marginal',
        occurrence_probability: 0.05,
        detection_difficulty: 2,
        rpn: 7,
        compensation: ['exclude_metric'],
        mitigation_steps: ['Filter out stablecoins from momentum calculation'],
        example: 'USDC momentum is meaningless. Exclude from OS.',
      },
    ],
    
    when_missing: 'exclude_from_score',
  }),

  /**
   * Volatility Regime
   */
  'os_volatility_regime_v1': createFSS({
    metric_id: 'os_volatility_regime_v1',
    name: 'Volatility Regime',
    definition: 'Current volatility relative to historical average. High = opportunity, extreme = risk.',
    investor_relevance: 'Volatility indicates potential for gains (and losses).',
    score_category: 'OS',
    direction: 'neutral', // Context-dependent
    expected_unit: 'SCORE_0_100',
    base_weight: 0.20,
    
    allowed_sectors: ['L1', 'L2', 'DeFi', 'Payment', 'Exchange', 'Memecoin', 'Gaming', 'Infrastructure', 'Privacy', 'NFT', 'AI', 'RWA', 'Unknown'],
    forbidden_sectors: ['Stablecoin'],
    
    time_window: '30d',
    primary_source: 'coingecko_historical',
    
    when_missing: 'exclude_from_score',
  }),

  /**
   * Flow Signals
   */
  'os_flow_signals_v1': createFSS({
    metric_id: 'os_flow_signals_v1',
    name: 'Flow Signals',
    definition: 'Net exchange flows, whale movements, and accumulation/distribution signals.',
    investor_relevance: 'Flow signals can indicate upcoming supply/demand shifts.',
    score_category: 'OS',
    direction: 'higher_is_better',
    expected_unit: 'SCORE_0_100',
    base_weight: 0.20,
    
    allowed_sectors: ['L1', 'L2', 'DeFi', 'Payment', 'Exchange', 'Memecoin', 'Gaming', 'Infrastructure', 'Privacy', 'NFT', 'AI', 'RWA', 'Unknown'],
    forbidden_sectors: ['Stablecoin'],
    
    time_window: '7d',
    primary_source: 'glassnode',
    fallback_sources: ['santiment', 'cryptoquant'],
    
    when_missing: 'exclude_from_score',
    confidence_when_missing: 0.7,
  }),
};

// ═══════════════════════════════════════════════════════════════════════════════
// RISK SCORE METRICS
// ═══════════════════════════════════════════════════════════════════════════════

const RISK_SPECIFICATIONS: Record<string, FeatureSpecificationSheet> = {
  /**
   * Liquidity Fragility
   */
  'risk_liquidity_fragility_v1': createFSS({
    metric_id: 'risk_liquidity_fragility_v1',
    name: 'Liquidity Fragility',
    definition: 'Risk of liquidity evaporating: thin order books, high slippage, concentrated venues.',
    investor_relevance: 'Fragile liquidity can trap positions during volatility.',
    score_category: 'RISK',
    direction: 'higher_is_worse',
    expected_unit: 'SCORE_0_100',
    base_weight: 0.20,
    
    allowed_sectors: ['L1', 'L2', 'DeFi', 'Payment', 'Exchange', 'Memecoin', 'Gaming', 'Infrastructure', 'Privacy', 'NFT', 'AI', 'RWA', 'Unknown'],
    forbidden_sectors: ['Stablecoin'],
    
    time_window: 'spot',
    primary_source: 'kaiko',
    
    when_missing: 'reduce_confidence',
  }),

  /**
   * Concentration Risk
   */
  'risk_concentration_v1': createFSS({
    metric_id: 'risk_concentration_v1',
    name: 'Concentration Risk',
    definition: 'Supply concentration among top holders. High concentration = whale manipulation risk.',
    investor_relevance: 'Concentrated supply can lead to price manipulation and dumps.',
    score_category: 'RISK',
    direction: 'higher_is_worse',
    expected_unit: 'PERCENT',
    base_weight: 0.20,
    
    allowed_sectors: ['L1', 'L2', 'DeFi', 'Payment', 'Exchange', 'Memecoin', 'Gaming', 'Infrastructure', 'Privacy', 'NFT', 'AI', 'RWA', 'Unknown'],
    forbidden_sectors: ['Stablecoin'], // Stablecoin concentration is different
    
    time_window: 'spot',
    primary_source: 'on_chain_analysis',
    
    sanity_bounds: {
      hard_min: 0,
      hard_max: 100,
      warn_min: null,
      warn_max: 80, // Top holders >80% is extreme
      rationale: 'Percentage must be 0-100',
    },
    
    when_missing: 'reduce_confidence',
  }),

  /**
   * Unlock Risk
   */
  'risk_unlock_v1': createFSS({
    metric_id: 'risk_unlock_v1',
    name: 'Unlock Risk',
    definition: 'Token unlocks in next 30/90 days as % of circulating supply.',
    investor_relevance: 'Large unlocks can create significant sell pressure.',
    score_category: 'RISK',
    direction: 'higher_is_worse',
    expected_unit: 'PERCENT',
    base_weight: 0.15,
    
    allowed_sectors: ['L1', 'L2', 'DeFi', 'Gaming', 'Infrastructure', 'AI', 'RWA'],
    forbidden_sectors: ['Payment', 'Exchange', 'Memecoin', 'Stablecoin', 'Privacy'],
    
    time_window: '90d_forward',
    primary_source: 'tokenunlocks',
    fallback_sources: ['messari', 'manual'],
    
    fmea: [
      {
        failure_mode: 'semantic_mismatch',
        description: 'Unlock risk applied to fully circulating token (no vesting)',
        severity: 'marginal',
        occurrence_probability: 0.1,
        detection_difficulty: 4,
        rpn: 16,
        compensation: ['exclude_metric'],
        mitigation_steps: ['Check if token has vesting schedule', 'Exclude if fully circulating'],
        example: 'Bitcoin has no unlocks. Unlock risk should be excluded, not set to 0.',
      },
    ],
    
    when_missing: 'exclude_from_score',
  }),

  /**
   * Admin Privilege Risk
   */
  'risk_admin_privilege_v1': createFSS({
    metric_id: 'risk_admin_privilege_v1',
    name: 'Admin Privilege Risk',
    definition: 'Risk from admin keys, upgrade capabilities, pause functions, mint functions.',
    investor_relevance: 'Admin privileges can be used to rug or censor users.',
    score_category: 'RISK',
    direction: 'higher_is_worse',
    expected_unit: 'SCORE_0_100',
    base_weight: 0.15,
    
    allowed_sectors: ['DeFi', 'L2', 'Gaming', 'NFT'],
    forbidden_sectors: ['L1', 'Payment', 'Exchange', 'Stablecoin', 'Privacy'],
    
    time_window: 'spot',
    primary_source: 'contract_analysis',
    
    fmea: [
      {
        failure_mode: 'semantic_mismatch',
        description: 'Admin risk applied to L1 without smart contracts',
        severity: 'critical',
        occurrence_probability: 0.1,
        detection_difficulty: 3,
        rpn: 21,
        compensation: ['exclude_metric'],
        mitigation_steps: ['Only apply to smart contract platforms'],
        example: 'Bitcoin has no unlocks. Admin risk should be excluded.',
      },
    ],
    
    when_missing: 'exclude_from_score',
  }),

  /**
   * Incident Risk
   */
  'risk_incident_v1': createFSS({
    metric_id: 'risk_incident_v1',
    name: 'Incident Risk',
    definition: 'Recent exploits, hacks, outages, or security incidents.',
    investor_relevance: 'Recent incidents indicate ongoing security issues.',
    score_category: 'RISK',
    direction: 'higher_is_worse',
    expected_unit: 'SCORE_0_100',
    base_weight: 0.15,
    
    allowed_sectors: ['L1', 'L2', 'DeFi', 'Exchange', 'Gaming', 'Infrastructure', 'NFT'],
    forbidden_sectors: ['Payment', 'Memecoin', 'Stablecoin', 'Privacy'],
    
    time_window: '180d',
    primary_source: 'rekt_news',
    fallback_sources: ['defillama_hacks', 'manual'],
    
    when_missing: 'exclude_from_score',
    confidence_when_present: 1.0,
    confidence_when_missing: 0.95, // Missing = likely no incidents
  }),

  /**
   * Data Integrity Risk
   */
  'risk_dat-integrity_v1': createFSS({
    metric_id: 'risk_dat-integrity_v1',
    name: 'Data Integrity Risk',
    definition: 'Meta-risk: how reliable is the data we have on this asset?',
    investor_relevance: 'Low data integrity means scores are less reliable.',
    score_category: 'RISK',
    direction: 'higher_is_worse',
    expected_unit: 'SCORE_0_100',
    base_weight: 0.15,
    
    allowed_sectors: ['L1', 'L2', 'DeFi', 'Payment', 'Exchange', 'Memecoin', 'Stablecoin', 'Gaming', 'Infrastructure', 'Privacy', 'NFT', 'AI', 'RWA', 'Unknown'],
    forbidden_sectors: [],
    
    time_window: 'spot',
    primary_source: 'internal_quality_check',
    
    // This metric is ALWAYS applicable and ALWAYS required
    when_missing: 'gate_final_score',
    confidence_when_missing: 0,
  }),
};

// ═══════════════════════════════════════════════════════════════════════════════
// BUILD REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

const allSpecs = {
  ...QS_SPECIFICATIONS,
  ...OS_SPECIFICATIONS,
  ...RISK_SPECIFICATIONS,
};

export const FSS_REGISTRY: FSSRegistry = {
  version: FSS_REGISTRY_VERSION,
  last_updated: now,
  specifications: allSpecs,
  metadata: {
    total_metrics: Object.keys(allSpecs).length,
    qs_metrics: Object.keys(QS_SPECIFICATIONS).length,
    os_metrics: Object.keys(OS_SPECIFICATIONS).length,
    risk_metrics: Object.keys(RISK_SPECIFICATIONS).length,
    meta_metrics: 0,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// REGISTRY ACCESSORS
// ═══════════════════════════════════════════════════════════════════════════════

import { FSS_REGISTRY_VERSION } from './fss-types';

/**
 * Get FSS for a metric
 */
export function getFSS(metricId: string): FeatureSpecificationSheet | null {
  return FSS_REGISTRY.specifications[metricId] ?? null;
}

/**
 * Check if metric is applicable to sector
 */
export function isMetricApplicableToSector(metricId: string, sector: Sector): boolean {
  const fss = getFSS(metricId);
  if (!fss) return false;
  
  // Check forbidden first (explicit exclusion)
  if (fss.forbidden_sectors.includes(sector)) {
    return false;
  }
  
  // Check allowed (explicit inclusion)
  return fss.allowed_sectors.includes(sector);
}

/**
 * Get all metrics applicable to a sector
 */
export function getMetricsForSector(sector: Sector): FeatureSpecificationSheet[] {
  return Object.values(FSS_REGISTRY.specifications).filter(
    fss => isMetricApplicableToSector(fss.metric_id, sector)
  );
}

/**
 * Get all metrics for a score category
 */
export function getMetricsForCategory(category: 'QS' | 'OS' | 'RISK' | 'META'): FeatureSpecificationSheet[] {
  return Object.values(FSS_REGISTRY.specifications).filter(
    fss => fss.score_category === category
  );
}

/**
 * Validate metric application (returns error if semantic mismatch)
 */
export function validateMetricApplication(
  metricId: string,
  sector: Sector,
): { valid: true } | { valid: false; error: string; compensation: string[] } {
  const fss = getFSS(metricId);
  
  if (!fss) {
    return {
      valid: false,
      error: `Unknown metric_id: ${metricId}. Not found in FSS registry.`,
      compensation: ['hard_reject'],
    };
  }
  
  if (fss.forbidden_sectors.includes(sector)) {
    const fmea = fss.fmea.find(f => f.failure_mode === 'semantic_mismatch');
    return {
      valid: false,
      error: `SEMANTIC ERROR: ${metricId} is FORBIDDEN for sector ${sector}. ${fmea?.example ?? ''}`,
      compensation: fmea?.compensation.map(c => c) ?? ['exclude_metric'],
    };
  }
  
  if (!fss.allowed_sectors.includes(sector)) {
    const fmea = fss.fmea.find(f => f.failure_mode === 'semantic_mismatch');
    return {
      valid: false,
      error: `SEMANTIC ERROR: ${metricId} is not applicable to sector ${sector}. Allowed: ${fss.allowed_sectors.join(', ')}`,
      compensation: fmea?.compensation.map(c => c) ?? ['exclude_metric'],
    };
  }
  
  return { valid: true };
}
