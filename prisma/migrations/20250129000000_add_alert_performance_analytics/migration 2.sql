-- Alert Performance Analytics Tables
-- Migration for comprehensive alert performance tracking and analytics

-- Alert outcomes table for recording actual results of alerts
CREATE TABLE IF NOT EXISTS alert_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id VARCHAR(255) NOT NULL,
  rule_id VARCHAR(255) NOT NULL,
  instrument VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  outcome VARCHAR(20) NOT NULL CHECK (outcome IN ('SUCCESS', 'FAILURE', 'NEUTRAL', 'UNKNOWN')),
  profit_loss DECIMAL(20,8),
  entry_price DECIMAL(20,8),
  exit_price DECIMAL(20,8),
  duration INTEGER, -- Duration of trade/action in seconds
  confidence DECIMAL(5,4) NOT NULL,
  market_regime VARCHAR(20),
  user_id VARCHAR(255) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for alert outcomes
CREATE INDEX IF NOT EXISTS idx_alert_outcomes_alert_id ON alert_outcomes(alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_outcomes_rule_id ON alert_outcomes(rule_id);
CREATE INDEX IF NOT EXISTS idx_alert_outcomes_instrument ON alert_outcomes(instrument);
CREATE INDEX IF NOT EXISTS idx_alert_outcomes_timestamp ON alert_outcomes(timestamp);
CREATE INDEX IF NOT EXISTS idx_alert_outcomes_outcome ON alert_outcomes(outcome);
CREATE INDEX IF NOT EXISTS idx_alert_outcomes_user_id ON alert_outcomes(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_outcomes_confidence ON alert_outcomes(confidence);

-- Aggregated performance metrics table for cached calculations
CREATE TABLE IF NOT EXISTS alert_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id VARCHAR(255) NOT NULL,
  rule_id VARCHAR(255) NOT NULL,
  instrument VARCHAR(50) NOT NULL,
  time_window_start TIMESTAMP WITH TIME ZONE NOT NULL,
  time_window_end TIMESTAMP WITH TIME ZONE NOT NULL,
  metrics JSONB NOT NULL,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance metrics
CREATE INDEX IF NOT EXISTS idx_performance_alert_id ON alert_performance_metrics(alert_id);
CREATE INDEX IF NOT EXISTS idx_performance_rule_id ON alert_performance_metrics(rule_id);
CREATE INDEX IF NOT EXISTS idx_performance_time_window ON alert_performance_metrics(time_window_start, time_window_end);
CREATE INDEX IF NOT EXISTS idx_performance_calculated_at ON alert_performance_metrics(calculated_at);

-- Market regime detection table (for future enhancement)
CREATE TABLE IF NOT EXISTS market_regimes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instrument VARCHAR(50) NOT NULL,
  regime VARCHAR(20) NOT NULL CHECK (regime IN ('bull', 'bear', 'sideways', 'volatile', 'stable')),
  confidence DECIMAL(5,4) NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  characteristics JSONB, -- Volatility, trend, volume, liquidity metrics
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for market regimes
CREATE INDEX IF NOT EXISTS idx_market_regimes_instrument ON market_regimes(instrument);
CREATE INDEX IF NOT EXISTS idx_market_regimes_regime ON market_regimes(regime);
CREATE INDEX IF NOT EXISTS idx_market_regimes_time_period ON market_regimes(start_time, end_time);

-- Adaptive threshold history (for tracking threshold changes)
CREATE TABLE IF NOT EXISTS adaptive_threshold_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id VARCHAR(255) NOT NULL,
  original_threshold DECIMAL(20,8) NOT NULL,
  adapted_threshold DECIMAL(20,8) NOT NULL,
  adaptation_reason TEXT NOT NULL,
  confidence DECIMAL(5,4) NOT NULL,
  factors JSONB, -- What factors influenced the adaptation
  algorithm VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for threshold history
CREATE INDEX IF NOT EXISTS idx_threshold_history_rule_id ON adaptive_threshold_history(rule_id);
CREATE INDEX IF NOT EXISTS idx_threshold_history_timestamp ON adaptive_threshold_history(timestamp);

-- Create hypertable for time-series data (if using TimescaleDB)
-- Note: These would be created in TimescaleDB, not standard PostgreSQL

-- Enable Row Level Security (RLS) for multi-tenant isolation
ALTER TABLE alert_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_regimes ENABLE ROW LEVEL SECURITY;
ALTER TABLE adaptive_threshold_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies (basic tenant isolation - customize based on your tenant model)
-- CREATE POLICY "Users can only access their own alert outcomes" ON alert_outcomes
--   FOR ALL USING (tenant_id = current_setting('app.current_tenant', true));

-- Performance optimization: Partition large tables by month
-- (This would be done in PostgreSQL with declarative partitioning)

-- Add comments for documentation
COMMENT ON TABLE alert_outcomes IS 'Records actual outcomes of alert triggers for performance analysis';
COMMENT ON TABLE alert_performance_metrics IS 'Cached aggregated performance metrics for quick dashboard loading';
COMMENT ON TABLE market_regimes IS 'Detected market regimes for context-aware analytics';
COMMENT ON TABLE adaptive_threshold_history IS 'Historical record of threshold adaptations for audit and learning';

-- Grant appropriate permissions (adjust based on your user model)
-- GRANT SELECT, INSERT ON alert_outcomes TO alert_analytics_user;
-- GRANT SELECT, INSERT, UPDATE ON alert_performance_metrics TO alert_analytics_user;
-- GRANT SELECT ON market_regimes TO alert_analytics_user;
-- GRANT SELECT, INSERT ON adaptive_threshold_history TO alert_analytics_user;
