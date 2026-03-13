/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🏆 GOLDEN CASES                                                           ║
 * ║                                                                               ║
 * ║   8.3 Golden Cases - Locked behavior for BTC/ETH/SOL                         ║
 * ║                                                                               ║
 * ║   Rules:                                                                      ║
 * ║   - If inputs unchanged → output unchanged                                   ║
 * ║   - Any change requires methodology version bump                             ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { METHODOLOGY_ID } from '../constants';
import type {
  GoldenCase,
  GoldenCaseInput,
  GoldenCaseExpected,
  GoldenCaseResult,
} from './types';
import { CALIBRATION_THRESHOLDS } from './types';

export type { GoldenCaseInput };

// ═══════════════════════════════════════════════════════════════════════════════
// GOLDEN CASE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Bitcoin Golden Case
 * 
 * BTC should always score as elite tier with high quality
 */
export const BITCOIN_GOLDEN_CASE: GoldenCase = {
  name: 'BTC-Elite',
  description: 'Bitcoin under normal market conditions - Elite tier expected',
  input: {
    assetId: 'bitcoin',
    methodologyId: METHODOLOGY_ID,
    identityConfidence: 100,
    dataPoints: {
      // Market data
      price_usd: 50000,
      volume_24h: 30_000_000_000,
      market_cap: 1_000_000_000_000,
      liquidity_score: 95,
      bid_ask_spread_percent: 0.01,
      slippage_100k_usd: 0.02,
      depth_2_percent: 500_000_000,
      num_liquid_markets: 50,
      
      // Momentum
      price_change_24h: 2.0,
      price_change_7d: 5.0,
      price_change_30d: 10.0,
      price_change_90d: 25.0,
      
      // Volatility
      volatility_7d: 3.5,
      volatility_30d: 4.0,
      volatility_90d: 4.5,
      
      // Quality
      audit_count: 0, // N/A for BTC
      incident_count_12m: 0,
      contract_verified: 1, // N/A, but counted
      
      // Development (N/A for BTC but we measure Bitcoin Core)
      releases_90d: 2,
      active_contributors_30d: 50,
      github_stars: 75000,
      
      // Network
      active_addresses_30d: 1_000_000,
      tx_count_30d: 10_000_000,
      
      // Decentralization
      validator_count: 15000, // Mining pools/nodes
      nakamoto_coefficient: 4,
      
      // Risk factors
      top10_holders_percent: 5,
      has_mint_function: 0,
      is_upgradeable: 0,
      is_renounced: 1, // Fully decentralized
    },
    quality: {
      totalRequested: 30,
      totalFetched: 28,
      staleness: 0.5,
      sourceCount: 5,
    },
  },
  expected: {
    // BTC: QS ~95, OS ~85, Risk ~12
    // POS = 0.60*95 + 0.25*85 + 0.15*(100-12) = 57 + 21.25 + 13.2 = 91.45 → Elite
    qs: { value: 95, tolerance: 4 },
    os: { value: 85, tolerance: 8 },
    risk: { value: 12, tolerance: 6 },
    posFinal: { value: 91, tolerance: 4 },
    legitimacy: 'LEGIT',
    tier: 'Elite',
    flag: 'Clean',
  },
  createdAt: new Date('2024-01-01'),
};

/**
 * Ethereum Golden Case
 * 
 * ETH should score as Elite tier - it's the #2 crypto asset
 * with exceptional ecosystem depth, developer activity, and decentralization
 */
export const ETHEREUM_GOLDEN_CASE: GoldenCase = {
  name: 'ETH-Elite',
  description: 'Ethereum under normal market conditions - Elite tier expected',
  input: {
    assetId: 'ethereum',
    methodologyId: METHODOLOGY_ID,
    identityConfidence: 100,
    dataPoints: {
      // Market data - excellent liquidity
      price_usd: 3000,
      volume_24h: 15_000_000_000,
      market_cap: 360_000_000_000,
      liquidity_score: 92,
      bid_ask_spread_percent: 0.02,
      slippage_100k_usd: 0.03,
      depth_2_percent: 300_000_000,
      num_liquid_markets: 45,
      
      // Momentum - moderate positive
      price_change_24h: 2.0,
      price_change_7d: 5.0,
      price_change_30d: 12.0,
      price_change_90d: 25.0,
      
      // Volatility - moderate
      volatility_7d: 4.0,
      volatility_30d: 5.0,
      volatility_90d: 5.5,
      
      // Quality - excellent
      audit_count: 25,
      incident_count_12m: 0,
      has_bug_bounty: 1,
      contract_verified: 1,
      
      // Development - exceptional
      releases_90d: 8,
      active_contributors_30d: 300,
      issue_closure_rate: 0.85,
      github_stars: 47000,
      
      // Network - massive adoption
      active_addresses_30d: 800_000,
      tx_count_30d: 35_000_000,
      fees_usd_30d: 600_000_000,
      dau_to_mau_ratio: 0.35,
      retention_30d: 0.45,
      
      // Ecosystem - deepest in crypto
      tvl_usd: 55_000_000_000,
      protocol_count: 600,
      integration_count: 1200,
      tvl_to_mcap_ratio: 0.15,
      
      // Decentralization - excellent
      validator_count: 950000,
      nakamoto_coefficient: 3,
      unique_governance_voters: 60000,
      multisig_required: 5,
      
      // Sustainability
      fee_to_incentive_ratio: 0.6,
      inflation_rate_annual: 0.5,
      treasury_runway_months: 999, // N/A
      
      // Risk factors - very low
      top10_holders_percent: 18,
      team_holdings_percent: 0,
      has_mint_function: 0,
      is_upgradeable: 0,
      is_renounced: 1,
    },
    quality: {
      totalRequested: 40,
      totalFetched: 38,
      staleness: 0.5,
      sourceCount: 6,
    },
  },
  expected: {
    // ETH: QS ~94, OS ~80, Risk ~18
    // POS = 0.60*94 + 0.25*80 + 0.15*(100-18) = 56.4 + 20 + 12.3 = 88.7 → Elite
    qs: { value: 94, tolerance: 4 },
    os: { value: 80, tolerance: 8 },
    risk: { value: 18, tolerance: 6 },
    posFinal: { value: 88, tolerance: 4 },
    legitimacy: 'LEGIT',
    tier: 'Elite',
    flag: 'Clean',
  },
  createdAt: new Date('2024-01-01'),
};

/**
 * Solana Golden Case
 * 
 * SOL should score as Strong tier - it's a top 5 L1 with
 * high performance, strong ecosystem growth, and solid fundamentals
 */
export const SOLANA_GOLDEN_CASE: GoldenCase = {
  name: 'SOL-Strong',
  description: 'Solana under normal market conditions - Strong tier expected',
  input: {
    assetId: 'solana',
    methodologyId: METHODOLOGY_ID,
    identityConfidence: 100,
    dataPoints: {
      // Market data - good liquidity
      price_usd: 150,
      volume_24h: 4_000_000_000,
      market_cap: 65_000_000_000,
      liquidity_score: 88,
      bid_ask_spread_percent: 0.04,
      slippage_100k_usd: 0.06,
      depth_2_percent: 120_000_000,
      num_liquid_markets: 40,
      
      // Momentum - strong
      price_change_24h: 3.0,
      price_change_7d: 8.0,
      price_change_30d: 20.0,
      price_change_90d: 60.0,
      
      // Volatility - higher than BTC/ETH but manageable
      volatility_7d: 5.5,
      volatility_30d: 7.0,
      volatility_90d: 9.0,
      
      // Quality - good with some history
      audit_count: 18,
      incident_count_12m: 1, // One minor outage, improved stability
      has_bug_bounty: 1,
      contract_verified: 1,
      
      // Development - very active
      releases_90d: 12,
      active_contributors_30d: 180,
      issue_closure_rate: 0.75,
      github_stars: 14000,
      
      // Network - exceptional throughput and adoption
      active_addresses_30d: 3_000_000,
      tx_count_30d: 150_000_000,
      fees_usd_30d: 25_000_000,
      dau_to_mau_ratio: 0.30,
      retention_30d: 0.35,
      
      // Ecosystem - growing fast
      tvl_usd: 8_000_000_000,
      protocol_count: 350,
      integration_count: 450,
      tvl_to_mcap_ratio: 0.12,
      
      // Decentralization - improving
      validator_count: 2500,
      nakamoto_coefficient: 22,
      unique_governance_voters: 15000,
      
      // Sustainability
      fee_to_incentive_ratio: 0.15,
      inflation_rate_annual: 5.5,
      
      // Risk factors - moderate
      top10_holders_percent: 30,
      team_holdings_percent: 12,
      has_mint_function: 0,
      is_upgradeable: 1,
      unlock_30d_percent: 1.5,
      unlock_90d_percent: 4.0,
    },
    quality: {
      totalRequested: 40,
      totalFetched: 35,
      staleness: 0.8,
      sourceCount: 5,
    },
  },
  expected: {
    // SOL: QS ~80, OS ~75, Risk ~32
    // POS = 0.60*80 + 0.25*75 + 0.15*(100-32) = 48 + 18.75 + 10.2 = 76.95 → Strong tier (70-85)
    qs: { value: 80, tolerance: 6 },
    os: { value: 75, tolerance: 10 },
    risk: { value: 32, tolerance: 8 },
    posFinal: { value: 77, tolerance: 5 },
    legitimacy: 'LEGIT',
    tier: 'Strong',
    flag: 'Clean',
  },
  createdAt: new Date('2024-01-01'),
};

/**
 * Low quality asset (gated)
 */
export const GATED_ASSET_GOLDEN_CASE: GoldenCase = {
  name: 'LOW-QUAL-GATED',
  description: 'Asset with insufficient data - should be gated',
  input: {
    assetId: 'unknown-token',
    methodologyId: METHODOLOGY_ID,
    identityConfidence: 40, // Below threshold
    dataPoints: {
      price_usd: 0.001,
      volume_24h: 10000,
      market_cap: 1_000_000,
    },
    quality: {
      totalRequested: 30,
      totalFetched: 3,
      staleness: 24,
      sourceCount: 1,
    },
  },
  expected: {
    qs: { value: 20, tolerance: 20 },
    os: null, // Should be gated
    risk: { value: 70, tolerance: 20 },
    posFinal: null, // Should be gated
    legitimacy: 'INSUFFICIENT_DATA',
    tier: 'Neutral',
    flag: 'Gated',
  },
  createdAt: new Date('2024-01-01'),
};

/**
 * Suspicious asset
 */
export const SUSPICIOUS_ASSET_GOLDEN_CASE: GoldenCase = {
  name: 'SUSPICIOUS-WASH',
  description: 'Asset with wash trading signals - should be flagged suspicious',
  input: {
    assetId: 'suspicious-token',
    methodologyId: METHODOLOGY_ID,
    identityConfidence: 70,
    dataPoints: {
      price_usd: 1.5,
      volume_24h: 500_000_000, // Suspiciously high
      market_cap: 50_000_000,  // Low cap
      wash_trading_score: 85,  // High wash signal
      liquidity_score: 30,
      bid_ask_spread_percent: 2.0,
      volume_to_mcap_ratio: 10, // Impossibly high
    },
    quality: {
      totalRequested: 30,
      totalFetched: 15,
      staleness: 2,
      sourceCount: 2,
    },
  },
  expected: {
    qs: { value: 35, tolerance: 15 },
    os: { value: 40, tolerance: 20 },
    risk: { value: 75, tolerance: 15 },
    posFinal: { value: 35, tolerance: 15 },
    legitimacy: 'SUSPICIOUS',
    tier: 'Weak',
    flag: 'Suspicious',
  },
  createdAt: new Date('2024-01-01'),
};

// ═══════════════════════════════════════════════════════════════════════════════
// ALL GOLDEN CASES
// ═══════════════════════════════════════════════════════════════════════════════

export const ALL_GOLDEN_CASES: GoldenCase[] = [
  BITCOIN_GOLDEN_CASE,
  ETHEREUM_GOLDEN_CASE,
  SOLANA_GOLDEN_CASE,
  GATED_ASSET_GOLDEN_CASE,
  SUSPICIOUS_ASSET_GOLDEN_CASE,
];

/**
 * Get golden case by name
 */
export function getGoldenCase(name: string): GoldenCase | undefined {
  return ALL_GOLDEN_CASES.find(c => c.name === name);
}

/**
 * Get golden cases for majors only
 */
export function getMajorGoldenCases(): GoldenCase[] {
  return [
    BITCOIN_GOLDEN_CASE,
    ETHEREUM_GOLDEN_CASE,
    SOLANA_GOLDEN_CASE,
  ];
}

// ═══════════════════════════════════════════════════════════════════════════════
// GOLDEN CASE VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate a golden case result
 */
export function validateGoldenCase(
  goldenCase: GoldenCase,
  actual: {
    qs: number;
    os: number | null;
    risk: number;
    posFinal: number | null;
    legitimacy: string;
    tier: string | null;
    flag: string;
  }
): GoldenCaseResult {
  const { expected } = goldenCase;
  const deviations: GoldenCaseResult['deviations'] = [];
  
  // Check QS
  const qsWithinTolerance = Math.abs(actual.qs - expected.qs.value) <= expected.qs.tolerance;
  deviations.push({
    field: 'qs',
    expected: `${expected.qs.value} ± ${expected.qs.tolerance}`,
    actual: actual.qs.toFixed(1),
    withinTolerance: qsWithinTolerance,
  });
  
  // Check OS
  if (expected.os !== null) {
    if (actual.os === null) {
      deviations.push({
        field: 'os',
        expected: `${expected.os.value} ± ${expected.os.tolerance}`,
        actual: 'null (gated)',
        withinTolerance: false,
      });
    } else {
      const osWithinTolerance = Math.abs(actual.os - expected.os.value) <= expected.os.tolerance;
      deviations.push({
        field: 'os',
        expected: `${expected.os.value} ± ${expected.os.tolerance}`,
        actual: actual.os.toFixed(1),
        withinTolerance: osWithinTolerance,
      });
    }
  } else {
    // Expected gated
    deviations.push({
      field: 'os',
      expected: 'null (gated)',
      actual: actual.os !== null ? actual.os.toFixed(1) : 'null (gated)',
      withinTolerance: actual.os === null,
    });
  }
  
  // Check Risk
  const riskWithinTolerance = Math.abs(actual.risk - expected.risk.value) <= expected.risk.tolerance;
  deviations.push({
    field: 'risk',
    expected: `${expected.risk.value} ± ${expected.risk.tolerance}`,
    actual: actual.risk.toFixed(1),
    withinTolerance: riskWithinTolerance,
  });
  
  // Check POS
  if (expected.posFinal !== null) {
    if (actual.posFinal === null) {
      deviations.push({
        field: 'posFinal',
        expected: `${expected.posFinal.value} ± ${expected.posFinal.tolerance}`,
        actual: 'null (gated)',
        withinTolerance: false,
      });
    } else {
      const posWithinTolerance = Math.abs(actual.posFinal - expected.posFinal.value) <= expected.posFinal.tolerance;
      deviations.push({
        field: 'posFinal',
        expected: `${expected.posFinal.value} ± ${expected.posFinal.tolerance}`,
        actual: actual.posFinal.toFixed(1),
        withinTolerance: posWithinTolerance,
      });
    }
  } else {
    // Expected gated
    deviations.push({
      field: 'posFinal',
      expected: 'null (gated)',
      actual: actual.posFinal !== null ? actual.posFinal.toFixed(1) : 'null (gated)',
      withinTolerance: actual.posFinal === null,
    });
  }
  
  // Check legitimacy
  deviations.push({
    field: 'legitimacy',
    expected: expected.legitimacy,
    actual: actual.legitimacy,
    withinTolerance: actual.legitimacy === expected.legitimacy,
  });
  
  // Check flag
  deviations.push({
    field: 'flag',
    expected: expected.flag,
    actual: actual.flag,
    withinTolerance: actual.flag === expected.flag,
  });
  
  // Determine pass/fail
  const passed = deviations.every(d => d.withinTolerance);
  
  return {
    case: goldenCase,
    passed,
    actual,
    deviations,
  };
}

/**
 * Run all golden cases
 */
export function runAllGoldenCases(
  calculateFn: (input: GoldenCaseInput) => Promise<{
    qs: number;
    os: number | null;
    risk: number;
    posFinal: number | null;
    legitimacy: string;
    tier: string | null;
    flag: string;
  }>
): Promise<GoldenCaseResult[]> {
  return Promise.all(
    ALL_GOLDEN_CASES.map(async (goldenCase) => {
      try {
        const actual = await calculateFn(goldenCase.input);
        return validateGoldenCase(goldenCase, actual);
      } catch (err) {
        // Return failed result on error
        return {
          case: goldenCase,
          passed: false,
          actual: {
            qs: 0,
            os: null,
            risk: 100,
            posFinal: null,
            legitimacy: 'ERROR',
            tier: null,
            flag: 'Error',
          },
          deviations: [{
            field: 'error',
            expected: 'success',
            actual: err instanceof Error ? err.message : String(err),
            withinTolerance: false,
          }],
        };
      }
    })
  );
}
