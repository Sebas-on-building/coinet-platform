// ====== ADVANCED ALERT SYSTEM TYPES ======

export interface AdvancedAlert {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  version: number;
  status: 'active' | 'paused' | 'expired' | 'triggered';
  priority: 'low' | 'medium' | 'high' | 'critical';
  
  // Multi-signal configuration
  signals: AlertSignal[];
  sequence_config?: SequenceConfig;
  filters: AlertFilters;
  
  // Routing and delivery
  routing: AlertRouting;
  cooldown_minutes: number;
  
  // AI and learning features
  ai_context?: {
    insight_type: 'bullish_thesis' | 'bearish_thesis' | 'risk_flag' | 'catalyst' | 'sentiment_shift' | 'pattern_recognition';
    confidence: number; // 0-1
    reasoning: string;
    related_briefs?: string[];
    root_cause_analysis?: string;
    recommended_action?: string;
    historical_context?: string;
  };
  confidence_threshold: number;
  learning_enabled: boolean;
  adaptive_baselines: boolean;
  
  // Analytics and feedback
  trigger_count: number;
  success_rate: number;
  false_positive_count: number;
  user_feedback_score?: number;
  
  // Metadata
  created_at: string;
  updated_at: string;
  last_triggered_at?: string;
  expires_at?: string;
  tags: string[];
}

export interface AlertSignal {
  id: string;
  type: SignalType;
  source_name: string;
  asset_symbol?: string;
  
  // Condition definition
  operator: SignalOperator;
  value: number;
  timeframe?: string;
  
  // Advanced features
  z_score_threshold?: number;
  rate_of_change?: boolean;
  correlation_break?: boolean;
  
  // Confidence and weighting
  weight: number; // 0-1, how much this signal contributes to final score
  min_confidence: number; // 0-1, minimum data quality required
}

export type SignalType = 
  // Market microstructure
  | 'spread_shock' | 'depth_imbalance' | 'funding_flip' | 'oi_spike' 
  | 'liquidation_cluster' | 'cross_venue_divergence' | 'basis_dislocation'
  
  // On-chain intelligence
  | 'whale_accumulation' | 'smart_money_flow' | 'exchange_inflow' 
  | 'exchange_outflow' | 'liquidity_pull' | 'bridge_flow'
  
  // Tokenomics & risk
  | 'unlock_proximity' | 'emissions_change' | 'governance_activity'
  | 'oracle_deviation' | 'depeg_risk' | 'exploit_risk'
  
  // Social & sentiment
  | 'mention_velocity' | 'sentiment_inflection' | 'dev_activity'
  | 'news_catalyst' | 'rumor_clustering';

export type SignalOperator = 
  | 'gt' | 'lt' | 'gte' | 'lte' | 'eq'
  | 'crosses_above' | 'crosses_below' | 'divergence'
  | 'z_score_gt' | 'z_score_lt' | 'rate_change_gt';

export interface SequenceConfig {
  type: 'sequential' | 'parallel' | 'if_then';
  window_minutes: number;
  required_signals: string[]; // Signal IDs that must trigger
  optional_signals: string[]; // Signal IDs that add confidence
  logical_operator: 'AND' | 'OR';
}

export interface AlertFilters {
  assets?: string[];
  exchanges?: string[];
  market_cap_min?: number;
  market_cap_max?: number;
  volume_min?: number;
  time_of_day?: { start: string; end: string };
  volatility_regime?: 'low' | 'medium' | 'high';
}

export interface AlertRouting {
  tier: 'informational' | 'important' | 'critical';
  channels: NotificationChannel[];
  escalation?: {
    delay_minutes: number;
    escalate_to: NotificationChannel[];
  };
}

export type NotificationChannel = 
  | 'in_app' | 'push' | 'email' | 'sms' 
  | 'telegram' | 'discord' | 'slack' | 'webhook';

// ====== AI CONTEXT TYPES ======

export interface AIAlertContext {
  insight_type: 'bullish_thesis' | 'bearish_thesis' | 'risk_flag' | 'catalyst' | 'sentiment_shift' | 'pattern_recognition';
  confidence: number; // 0-1
  reasoning: string;
  related_briefs?: string[];
  root_cause_analysis?: string;
  recommended_action?: string;
  historical_context?: string;
}

// ====== SIGNAL PROCESSING TYPES ======

export interface SignalSource {
  id: string;
  source_type: 'market' | 'onchain' | 'social' | 'tokenomics' | 'risk';
  source_name: string;
  asset_symbol?: string;
  
  // Current state
  current_value?: number;
  previous_value?: number;
  change_rate?: number;
  z_score?: number;
  
  // Metadata
  last_updated: string;
  confidence: number; // 0-1
  data_quality: 'excellent' | 'good' | 'fair' | 'poor';
  raw_data?: Record<string, any>;
}

export interface MarketContext {
  id: string;
  asset_symbol: string;
  timestamp: string;
  
  // Core market data
  price: number;
  volume_24h?: number;
  market_cap?: number;
  
  // Microstructure
  bid_ask_spread?: number;
  depth_imbalance?: number;
  funding_rate?: number;
  open_interest?: number;
  
  // Sentiment and social
  social_sentiment?: number;
  fear_greed_index?: number;
  news_sentiment?: number;
  
  // On-chain metrics
  whale_activity_score?: number;
  exchange_inflows?: number;
  exchange_outflows?: number;
  
  // Risk metrics
  volatility?: number;
  liquidation_risk?: number;
  correlation_breaks: number;
}

export interface AlertTrigger {
  id: string;
  alert_id: string;
  user_id: string;
  
  // Trigger details
  triggered_at: string;
  confidence_score: number;
  signal_values: Record<string, number>;
  market_context: MarketContext;
  
  // User interaction
  viewed_at?: string;
  action_taken?: 'viewed' | 'dismissed' | 'acted' | 'modified_alert';
  user_feedback?: {
    useful: boolean;
    rating: number; // 1-5
    reason?: string;
  };
  
  // Outcome tracking
  price_change_1h?: number;
  price_change_24h?: number;
  accuracy_score?: number;
  
  // Context pack
  context_pack: ContextPack;
}

export interface ContextPack {
  summary: string;
  key_metrics: Record<string, number>;
  whale_activity: WhaleActivity[];
  recent_news: NewsItem[];
  technical_levels: TechnicalLevel[];
  risk_factors: string[];
  opportunity_score: number; // 0-1
  edge_decay_minutes: number; // How long this alpha likely lasts
}

// ====== WHALE INTELLIGENCE TYPES ======

export interface WhaleAddress {
  id: string;
  address: string;
  label?: string;
  confidence_score: number; // 0-1
  
  category: 'whale' | 'smart_money' | 'institution' | 'team' | 'exchange';
  risk_level: 'low' | 'medium' | 'high';
  
  // Performance tracking
  last_activity?: string;
  total_volume: number;
  success_rate: number; // 0-1
  
  created_at: string;
  updated_at: string;
  metadata: Record<string, any>;
}

export interface WhaleActivity {
  id: string;
  whale_address_id: string;
  
  // Transaction details
  transaction_hash: string;
  asset_symbol: string;
  action: 'buy' | 'sell' | 'transfer' | 'stake' | 'unstake';
  amount: number;
  price?: number;
  
  // Context
  exchange?: string;
  timestamp: string;
  block_number?: number;
  
  // Analysis
  impact_score?: number; // 0-1
  confidence: number;
  metadata: Record<string, any>;
}

// ====== ALERT TEMPLATES TYPES ======

export interface AlertTemplate {
  id: string;
  name: string;
  description: string;
  category: 'beginner' | 'intermediate' | 'advanced' | 'ai_powered';
  
  template_config: Omit<AdvancedAlert, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'trigger_count' | 'success_rate' | 'false_positive_count'>;
  default_filters: AlertFilters;
  
  // Performance metrics
  popularity_score: number;
  success_rate?: number;
  usage_count: number;
  
  // Creator and permissions
  created_by?: string;
  is_public: boolean;
  is_featured: boolean;
  
  created_at: string;
  updated_at: string;
  tags: string[];
}

// ====== NOTIFICATION PREFERENCES ======

export interface NotificationPreferences {
  user_id: string;
  
  // Channel settings
  channels: {
    in_app: boolean;
    email: boolean;
    push: boolean;
    sms: boolean;
    discord?: string;
    telegram?: string;
    slack?: string;
  };
  
  // Quiet hours
  quiet_hours_enabled: boolean;
  quiet_hours_start?: string; // HH:MM
  quiet_hours_end?: string; // HH:MM
  timezone: string;
  
  // Alert management
  priority_override: boolean; // Allow critical alerts during quiet hours
  max_daily_alerts: number;
  grouping_enabled: boolean;
  
  // Sound settings
  sound_enabled: boolean;
  sound_volume: number; // 0-1
  custom_sounds: Record<string, string>;
  
  // Learning settings
  auto_pause_threshold: number;
  learning_rate: number;
  
  created_at: string;
  updated_at: string;
}

// ====== ANALYTICS TYPES ======

export interface AlertAnalytics {
  user_id: string;
  period: {
    start: string;
    end: string;
  };
  
  // Performance metrics
  total_alerts: number;
  triggered_alerts: number;
  successful_alerts: number;
  false_positives: number;
  average_confidence: number;
  average_response_time_minutes: number;
  
  // Signal performance
  signal_accuracy: Record<SignalType, number>;
  best_performing_signals: SignalType[];
  worst_performing_signals: SignalType[];
  
  // User behavior
  preferred_channels: NotificationChannel[];
  peak_alert_hours: number[];
  dismissal_patterns: Record<string, number>;
  
  // Recommendations
  suggested_improvements: string[];
  recommended_templates: string[];
  optimization_score: number; // 0-1
}

// ====== UTILITY TYPES ======

export interface NewsItem {
  title: string;
  source: string;
  timestamp: string;
  sentiment: number; // -1 to 1
  relevance: number; // 0-1
}

export interface TechnicalLevel {
  type: 'support' | 'resistance' | 'fibonacci' | 'volume_profile';
  price: number;
  strength: number; // 0-1
  distance_percent: number;
}

export interface OpportunityWindow {
  alert_id: string;
  opportunity_type: 'accumulation' | 'breakout' | 'squeeze' | 'divergence';
  confidence: number; // 0-1
  edge_decay_minutes: number;
  expected_move_percent: number;
  risk_reward_ratio: number;
}