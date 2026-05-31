/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     📋 OMNISCORE v3.0 SEGMENT REQUIREMENTS                                     ║
 * ║                                                                               ║
 * ║   Defines required/optional data keys per segment for coverage calculation.   ║
 * ║   Used by confidence gate and segment calculators.                            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type { QSSegment, OSSegment, RiskSegment, Segment } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface SegmentRequirement {
  /** Keys that MUST be present for segment to be considered covered */
  required: string[];
  /** Keys that improve coverage but are not mandatory */
  optional: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// QS REQUIREMENTS (TEAM, TECH, SEC, GOV, ECO)
// ═══════════════════════════════════════════════════════════════════════════════

export const QS_REQUIREMENTS: Record<QSSegment, SegmentRequirement> = {
  TEAM: {
    required: ['team_experience_years', 'team_transparency_score'],
    optional: ['team_size', 'advisor_count'],
  },
  TECH: {
    required: ['github_commits_30d', 'github_contributors'],
    optional: ['github_stars', 'github_forks', 'documentation_score'],
  },
  SEC: {
    required: ['audit_count', 'incident_count'],
    optional: ['auditor_tier', 'bug_bounty_size', 'security_posture'],
  },
  GOV: {
    required: ['decentralization_score'],
    optional: ['voter_turnout', 'proposal_count_90d', 'governance_active'],
  },
  ECO: {
    required: ['tvl_usd'],
    optional: ['integration_count', 'ecosystem_projects', 'ecosystem_depth'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// OS REQUIREMENTS (MARKET, TOKEN, VAL, ADOPT, COMM)
// ═══════════════════════════════════════════════════════════════════════════════

export const OS_REQUIREMENTS: Record<OSSegment, SegmentRequirement> = {
  MARKET: {
    required: ['price_usd', 'volume_24h'],
    optional: ['market_cap', 'liquidity_depth', 'bid_ask_spread', 'exchange_count_tier1'],
  },
  TOKEN: {
    required: ['circulating_supply_ratio'],
    optional: ['holder_concentration', 'unlock_pressure_12m', 'inflation_rate', 'utility_count'],
  },
  VAL: {
    required: ['price_vs_ath'],
    optional: ['mcap_rank', 'mcap_tvl_ratio'],
  },
  ADOPT: {
    required: ['active_addresses_30d'],
    optional: ['transaction_count_30d', 'tvl_usd', 'revenue_30d', 'user_retention_30d'],
  },
  COMM: {
    required: ['twitter_followers'],
    optional: ['twitter_engagement_rate', 'discord_members', 'telegram_members', 'github_stars'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// RISK REQUIREMENTS (8 segments)
// ═══════════════════════════════════════════════════════════════════════════════

export const RISK_REQUIREMENTS: Record<RiskSegment, SegmentRequirement> = {
  LEGAL: {
    required: [],
    optional: ['regulatory_risk_score', 'jurisdiction_exposure'],
  },
  MACRO: {
    required: [],
    optional: ['btc_correlation', 'macro_sensitivity'],
  },
  CENTRAL: {
    required: [],
    optional: ['validator_concentration', 'governance_centralization'],
  },
  STABILITY: {
    required: [],
    optional: ['outage_count_90d', 'congestion_events'],
  },
  CONC: {
    required: [],
    optional: ['top_10_holders_pct', 'whale_concentration', 'concentration'],
  },
  UNLOCK: {
    required: [],
    optional: ['unlock_pressure_12m', 'vesting_schedule_rigidity'],
  },
  LIQUIDITY: {
    required: [],
    optional: ['liquidity_depth', 'slippage_1pct', 'liquidity_fragility'],
  },
  CONTRACT: {
    required: [],
    optional: ['audit_count', 'complexity_score', 'admin_privilege'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// ALL REQUIREMENTS
// ═══════════════════════════════════════════════════════════════════════════════

export const ALL_REQUIREMENTS: Record<Segment, SegmentRequirement> = {
  ...QS_REQUIREMENTS,
  ...OS_REQUIREMENTS,
  ...RISK_REQUIREMENTS,
};

// ═══════════════════════════════════════════════════════════════════════════════
// COVERAGE CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate segment coverage (0-1) based on present keys
 * Required keys are weighted 2x optional keys
 */
export function calculateSegmentCoverage(
  segment: Segment,
  presentKeys: string[]
): number {
  const req = ALL_REQUIREMENTS[segment];
  if (!req) return 0;

  const requiredPresent = req.required.filter(k => presentKeys.includes(k));
  const optionalPresent = req.optional.filter(k => presentKeys.includes(k));

  const totalRequired = req.required.length;
  const totalOptional = req.optional.length;

  if (totalRequired === 0 && totalOptional === 0) return 1;
  const requiredScore = totalRequired > 0
    ? (requiredPresent.length / totalRequired) * 0.7
    : 0;
  const optionalScore = totalOptional > 0
    ? (optionalPresent.length / totalOptional) * 0.3
    : 0.3; // Full optional bonus if no required

  return Math.min(1, requiredScore + optionalScore);
}

/**
 * Check if segment has required data
 */
export function checkRequiredData(
  segment: Segment,
  presentKeys: string[]
): { passed: boolean; missing: string[] } {
  const req = ALL_REQUIREMENTS[segment];
  if (!req) return { passed: true, missing: [] };

  const missing = req.required.filter(k => !presentKeys.includes(k));
  return {
    passed: missing.length === 0,
    missing,
  };
}

/**
 * Check if overall coverage meets minimum threshold
 */
export function meetsMinimumCoverage(
  segmentCoverages: Record<Segment, number>,
  minCoverage: number
): boolean {
  const values = Object.values(segmentCoverages);
  if (values.length === 0) return false;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return avg >= minCoverage;
}
