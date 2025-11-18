/**
 * The Tie API Type Definitions
 * Enterprise-grade types for research-grade token unlock data
 */

export interface TheTieAsset {
  ticker: string;
  name: string;
  id: string;
  slug: string;
  contract_addresses?: Array<{
    network: string;
    address: string;
  }>;
}

export interface TheTieUnlockEvent {
  id: string;
  ticker: string;
  name: string;
  unlock_date: string; // ISO 8601
  tokens_unlocked: number;
  tokens_unlocked_usd?: number;
  percentage_of_supply: number;
  percentage_of_circulating_supply?: number;
  category: string;
  allocation_type: string;
  cliff_period_months?: number;
  vesting_period_months?: number;
  is_estimated: boolean;
  confidence_score?: number; // 0-100, The Tie's confidence in this data
  source_type: 'official' | 'whitepaper' | 'research' | 'community';
  last_verified_date?: string;
  notes?: string;
}

export interface TheTieHistoricalUnlock extends TheTieUnlockEvent {
  price_at_unlock_usd?: number;
  market_cap_at_unlock_usd?: number;
  volume_24h_at_unlock_usd?: number;
  price_change_1d_percent?: number;
  price_change_7d_percent?: number;
  price_change_30d_percent?: number;
  volume_change_1d_percent?: number;
  volatility_30d_before?: number;
  volatility_30d_after?: number;
}

export interface TheTieVestingSchedule {
  ticker: string;
  name: string;
  allocation_category: string;
  total_allocation: number;
  total_allocation_usd?: number;
  percentage_of_total_supply: number;
  initial_circulating_percentage?: number;
  cliff_period_months?: number;
  vesting_period_months?: number;
  vesting_frequency: 'monthly' | 'quarterly' | 'yearly' | 'continuous' | 'custom';
  start_date?: string;
  end_date?: string;
  is_active: boolean;
  unlock_schedule: Array<{
    date: string;
    amount: number;
    percentage_of_allocation: number;
    is_estimate: boolean;
  }>;
}

export interface TheTieTokenDistribution {
  ticker: string;
  name: string;
  total_supply: number;
  max_supply?: number;
  circulating_supply: number;
  distribution: Array<{
    category: string;
    label: string;
    amount: number;
    percentage: number;
    is_locked: boolean;
    unlock_schedule_summary?: {
      next_unlock_date?: string;
      remaining_locked: number;
      total_unlock_events: number;
    };
  }>;
  last_updated: string;
}

export interface TheTieUnlockImpactAnalysis {
  ticker: string;
  unlock_date: string;
  unlock_amount: number;
  unlock_amount_usd: number;
  historical_precedent?: {
    similar_unlocks_count: number;
    average_price_impact_1d: number;
    average_price_impact_7d: number;
    average_price_impact_30d: number;
    average_volume_spike: number;
  };
  market_context: {
    current_price_usd: number;
    market_cap_usd: number;
    volume_24h_usd: number;
    liquidity_score?: number;
    exchange_listings_count?: number;
  };
  risk_assessment: {
    impact_score: number; // 0-100
    risk_level: 'low' | 'medium' | 'high' | 'critical';
    sell_pressure_estimate: number; // Expected % of unlock to be sold
    liquidity_adequacy: number; // Can market absorb the unlock?
    factors: Array<{
      factor: string;
      weight: number;
      contribution: number;
    }>;
  };
}

export interface TheTieUnlockCalendar {
  date: string; // ISO 8601
  unlocks: Array<{
    ticker: string;
    name: string;
    unlock_amount: number;
    unlock_amount_usd?: number;
    percentage_of_supply: number;
    category: string;
    impact_score?: number;
  }>;
  total_unlock_value_usd?: number;
  high_impact_count: number;
}

// Query parameters
export interface TheTieUnlocksQueryParams {
  ticker?: string | string[];
  start_date?: string;
  end_date?: string;
  category?: string | string[];
  min_impact_score?: number;
  include_estimates?: boolean;
  include_historical?: boolean;
  page?: number;
  limit?: number;
  sort_by?: 'date' | 'amount' | 'impact_score';
  sort_order?: 'asc' | 'desc';
}

export interface TheTieAnalyticsQueryParams {
  ticker: string;
  analysis_type?: 'impact' | 'distribution' | 'schedule' | 'all';
  include_historical_data?: boolean;
  lookback_days?: number;
}

// Response types
export interface TheTieResponse<T> {
  success: boolean;
  data: T;
  metadata: {
    timestamp: string;
    request_id: string;
    rate_limit: {
      remaining: number;
      reset_at: string;
    };
  };
}

export interface TheTiePaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    per_page: number;
    total_pages: number;
    total_count: number;
  };
  metadata: {
    timestamp: string;
    request_id: string;
    rate_limit: {
      remaining: number;
      reset_at: string;
    };
  };
}

export interface TheTieErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  metadata: {
    timestamp: string;
    request_id: string;
  };
}

// Normalized types for cross-source compatibility
export interface UnifiedTokenUnlock {
  id: string;
  source: 'messari' | 'thetie';
  ticker: string;
  name: string;
  unlockDate: Date;
  tokensUnlocked: number;
  tokensUnlockedUsd: number;
  percentageOfSupply: number;
  percentageOfCirculating?: number;
  category: string;
  allocationType: string;
  isEstimate: boolean;
  confidenceScore?: number;
  impactScore?: number;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  priceAtUnlock?: number;
  marketCapAtUnlock?: number;
  historicalImpact?: {
    priceChange1d?: number;
    priceChange7d?: number;
    priceChange30d?: number;
  };
  metadata: {
    sourceType?: string;
    lastVerified?: Date;
    notes?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface TokenUnlockComparison {
  ticker: string;
  unlockDate: Date;
  messariData?: NormalizedTokenUnlock;
  theTieData?: UnifiedTokenUnlock;
  discrepancies: Array<{
    field: string;
    messariValue?: any;
    theTieValue?: any;
    differencePercent?: number;
  }>;
  consensusValue: {
    tokensUnlocked: number;
    tokensUnlockedUsd: number;
    percentageOfSupply: number;
    confidence: 'high' | 'medium' | 'low';
  };
}

// Import from messari.types.ts for comparison
import { NormalizedTokenUnlock } from './messari.types';

