/**
 * Messari API Type Definitions
 * Enterprise-grade types for token unlock and vesting data
 */

export interface MessariAsset {
  id: string;
  symbol: string;
  name: string;
  slug: string;
  contract_addresses?: Array<{
    platform: string;
    contract_address: string;
  }>;
  _internal_temp_agora_id?: string;
}

export interface MessariAllocation {
  id: string;
  asset_id: string;
  category: string;
  label: string;
  amount: number;
  amount_usd?: number;
  percentage?: number;
  vesting_schedule?: {
    cliff_months?: number;
    vesting_months?: number;
    start_date?: string;
    end_date?: string;
  };
  unlock_schedule?: Array<{
    date: string;
    amount: number;
    amount_usd?: number;
    percentage?: number;
  }>;
}

export interface MessariUnlockEvent {
  id: string;
  asset_id: string;
  asset_symbol: string;
  asset_name: string;
  date: string; // ISO 8601 date
  unlock_amount: number;
  unlock_amount_usd?: number;
  unlock_percentage?: number;
  category: string; // team, investor, treasury, public, etc.
  label?: string;
  description?: string;
  circulating_supply_before?: number;
  circulating_supply_after?: number;
  market_cap_before_usd?: number;
  market_cap_after_usd?: number;
  price_at_unlock_usd?: number;
}

export interface MessariVestingSchedule {
  id: string;
  asset_id: string;
  asset_symbol: string;
  asset_name: string;
  category: string;
  label: string;
  total_amount: number;
  total_amount_usd?: number;
  total_percentage?: number;
  cliff_months?: number;
  vesting_months?: number;
  start_date?: string;
  end_date?: string;
  is_active: boolean;
  unlocked_amount?: number;
  remaining_amount?: number;
  next_unlock_date?: string;
  next_unlock_amount?: number;
}

export interface MessariAssetMetrics {
  id: string;
  asset_id: string;
  asset_symbol: string;
  market_data: {
    price_usd?: number;
    price_btc?: number;
    volume_last_24_hours?: number;
    real_volume_last_24_hours?: number;
    volume_last_24_hours_overstatement_multiple?: number;
    percent_change_usd_last_1_hour?: number;
    percent_change_btc_last_1_hour?: number;
    percent_change_usd_last_24_hours?: number;
    percent_change_btc_last_24_hours?: number;
    ohlcv_last_1_hour?: {
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    };
    ohlcv_last_24_hour?: {
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    };
    last_trade_at?: string;
  };
  marketcap: {
    current_marketcap_usd?: number;
    y_2050_marketcap_usd?: number;
    y_plus10_marketcap_usd?: number;
    liquid_marketcap_usd?: number;
    volume_turnover_last_24_hours_percent?: number;
    realized_marketcap_usd?: number;
    outstanding_marketcap_usd?: number;
  };
  supply: {
    y_2050?: number;
    y_plus10?: number;
    liquid?: number;
    circulating?: number;
    y_2050_issued_percent?: number;
    annual_inflation_percent?: number;
    stock_to_flow?: number;
    y_plus10_issued_percent?: number;
  };
  blockchain_stats_24_hours?: {
    count_of_active_addresses?: number;
    count_of_tx?: number;
    count_of_payments?: number;
    transfer_volume_usd?: number;
    adjusted_transfer_volume_usd?: number;
    adjusted_nvt?: number;
  };
  all_time_high?: {
    price?: number;
    at?: string;
    days_since?: number;
    percent_down?: number;
    breakeven_multiple?: number;
  };
  cycle_low?: {
    price?: number;
    at?: string;
    percent_up?: number;
  };
  token_sale_stats?: {
    sale_proceeds_usd?: number;
    sale_start_date?: string;
    sale_end_date?: string;
    roi_since_sale_usd_percent?: number;
    roi_since_sale_btc_percent?: number;
    roi_since_sale_eth_percent?: number;
  };
  staking_stats?: {
    staking_yield_percent?: number;
    staking_type?: string;
    staking_minimum?: number;
    tokens_staked?: number;
    tokens_staked_percent?: number;
    real_staking_yield_percent?: number;
  };
  mining_stats?: {
    mining_algo?: string;
    network_hash_rate?: string;
    available_on_nicehash_percent?: number;
    one_hour_attack_cost?: number;
    twenty_four_hours_attack_cost?: number;
    attack_appeal?: number;
    hash_rate?: number;
    hash_rate_30d_average?: number;
    mining_revenue_native?: number;
    mining_revenue_usd?: number;
    mining_revenue_total?: number;
    average_difficulty?: number;
  };
  developer_activity?: {
    stars?: number;
    watchers?: number;
    commits_last_3_months?: number;
    commits_last_1_year?: number;
    lines_added_last_3_months?: number;
    lines_added_last_1_year?: number;
    lines_deleted_last_3_months?: number;
    lines_deleted_last_1_year?: number;
  };
  roi_data?: {
    percent_change_last_1_week?: number;
    percent_change_last_1_month?: number;
    percent_change_last_3_months?: number;
    percent_change_last_1_year?: number;
  };
  roi_by_year?: Record<string, {
    usd_returns?: number;
    btc_returns?: number;
    eth_returns?: number;
  }>;
  misc_data?: {
    vladimir_club_cost?: number;
    btc_current_normalized_supply_price_usd?: number;
    btc_y2050_normalized_supply_price_usd?: number;
    asset_created_at?: string;
    asset_age_days?: number;
    categories?: string[];
    sectors?: string[];
  };
  reddit?: {
    active_user_count?: number;
    subscribers?: number;
  };
  on_chain_data?: {
    addresses_count?: number;
    addresses_balance_greater_0_001_native_units_count?: number;
    addresses_balance_greater_0_01_native_units_count?: number;
    addresses_balance_greater_0_1_native_units_count?: number;
    addresses_balance_greater_1_usd_count?: number;
    addresses_balance_greater_10_usd_count?: number;
    addresses_balance_greater_100_usd_count?: number;
    addresses_balance_greater_100k_usd_count?: number;
    addresses_balance_greater_1k_usd_count?: number;
    addresses_balance_greater_1m_usd_count?: number;
    addresses_balance_greater_10k_usd_count?: number;
    addresses_balance_greater_10m_usd_count?: number;
  };
  exchange_flows?: {
    flow_in_exchange_native_units?: number;
    flow_in_exchange_usd?: number;
    flow_in_exchange_native_units_inclusive?: number;
    flow_in_exchange_usd_inclusive?: number;
    flow_out_exchange_native_units?: number;
    flow_out_exchange_usd?: number;
    flow_out_exchange_native_units_inclusive?: number;
    flow_out_exchange_usd_inclusive?: number;
    flow_net_exchange_native_units?: number;
    flow_net_exchange_usd?: number;
    supply_exchange_native_units?: number;
    supply_exchange_usd?: number;
  };
  alert_messages?: string[];
  last_updated: string;
}

export interface MessariTokenomicsData {
  asset_id: string;
  asset_symbol: string;
  asset_name: string;
  total_supply?: number;
  max_supply?: number;
  circulating_supply?: number;
  liquid_supply?: number;
  supply_distribution?: Array<{
    category: string;
    label: string;
    amount: number;
    percentage: number;
    is_locked: boolean;
    unlock_date?: string;
  }>;
  vesting_schedules?: MessariVestingSchedule[];
  upcoming_unlocks?: MessariUnlockEvent[];
  historical_unlocks?: MessariUnlockEvent[];
  inflation_rate_annual?: number;
  emission_schedule?: Array<{
    date: string;
    emission_amount: number;
    circulating_supply_after: number;
  }>;
}

// Response types
export interface MessariResponse<T> {
  status: {
    elapsed: number;
    timestamp: string;
  };
  data: T;
}

export interface MessariPaginatedResponse<T> {
  status: {
    elapsed: number;
    timestamp: string;
  };
  data: T[];
  meta?: {
    page: number;
    per_page: number;
    total_pages: number;
    total_count: number;
  };
}

export interface MessariErrorResponse {
  status: {
    elapsed: number;
    timestamp: string;
    error_code: string;
    error_message: string;
  };
}

// Query parameters
export interface MessariUnlocksQueryParams {
  start_date?: string; // ISO 8601 date
  end_date?: string; // ISO 8601 date
  category?: string | string[]; // Filter by category
  min_amount_usd?: number; // Minimum unlock amount in USD
  page?: number;
  limit?: number;
}

export interface MessariAssetQueryParams {
  fields?: string[]; // Specific fields to return
  with_profiles?: boolean;
  with_metrics?: boolean;
}

export interface MessariTimeseriesQueryParams {
  start?: string; // ISO 8601 date
  end?: string; // ISO 8601 date
  interval?: '1d' | '1w' | '1m' | '3m' | '6m' | '1y';
  format?: 'json' | 'csv';
  columns?: string[];
  timestamp_format?: 'rfc3339' | 'unix';
}

// Normalized unlock data for Coinet
export interface NormalizedTokenUnlock {
  id: string;
  source: 'messari' | 'thetie';
  assetId: string;
  symbol: string;
  name: string;
  unlockDate: Date;
  unlockAmount: number;
  unlockAmountUsd: number;
  unlockPercentage: number;
  category: string;
  label?: string;
  description?: string;
  circulatingSupplyBefore?: number;
  circulatingSupplyAfter?: number;
  marketCapBeforeUsd?: number;
  marketCapAfterUsd?: number;
  priceAtUnlockUsd?: number;
  impactScore?: number; // Custom calculated impact score
  severity?: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Date;
  updatedAt: Date;
}

export interface TokenUnlockAlert {
  unlockId: string;
  assetSymbol: string;
  daysUntilUnlock: number;
  unlockAmountUsd: number;
  percentOfMarketCap: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  recommendedAction?: string;
}

