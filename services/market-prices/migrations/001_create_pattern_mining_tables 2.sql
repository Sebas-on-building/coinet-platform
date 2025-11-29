-- =========================================
-- PATTERN MINING DATABASE SCHEMA
-- =========================================
-- Creates tables for Pattern Collector service
-- Divine perfection in database design

-- Access patterns table - stores all user access records
CREATE TABLE IF NOT EXISTS access_patterns (
  id SERIAL PRIMARY KEY,
  user_id_hash VARCHAR(64) NOT NULL,
  requested_tokens TEXT[] NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  session_id VARCHAR(64) NOT NULL,
  sequence INTEGER NOT NULL,
  time_of_day INTEGER NOT NULL CHECK (time_of_day >= 0 AND time_of_day <= 23),
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  market_condition VARCHAR(20) NOT NULL CHECK (market_condition IN ('bull', 'bear', 'neutral', 'extreme_volatile')),
  request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('single', 'portfolio', 'market_overview')),
  response_time INTEGER NOT NULL CHECK (response_time >= 0),
  cached BOOLEAN NOT NULL DEFAULT FALSE,
  user_agent TEXT,
  region VARCHAR(10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_access_patterns_session 
  ON access_patterns(session_id);

CREATE INDEX IF NOT EXISTS idx_access_patterns_timestamp 
  ON access_patterns(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_access_patterns_user 
  ON access_patterns(user_id_hash);

CREATE INDEX IF NOT EXISTS idx_access_patterns_tokens 
  ON access_patterns USING GIN(requested_tokens);

CREATE INDEX IF NOT EXISTS idx_access_patterns_time_of_day 
  ON access_patterns(time_of_day);

CREATE INDEX IF NOT EXISTS idx_access_patterns_day_of_week 
  ON access_patterns(day_of_week);

CREATE INDEX IF NOT EXISTS idx_access_patterns_market_condition 
  ON access_patterns(market_condition);

-- Composite index for temporal queries
CREATE INDEX IF NOT EXISTS idx_access_patterns_temporal 
  ON access_patterns(time_of_day, day_of_week, timestamp DESC);

-- User sessions table - tracks active sessions
CREATE TABLE IF NOT EXISTS user_sessions (
  session_id VARCHAR(64) PRIMARY KEY,
  user_id_hash VARCHAR(64) NOT NULL,
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  request_count INTEGER DEFAULT 0 CHECK (request_count >= 0),
  market_condition VARCHAR(20) CHECK (market_condition IN ('bull', 'bear', 'neutral', 'extreme_volatile')),
  time_of_day INTEGER CHECK (time_of_day >= 0 AND time_of_day <= 23),
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for sessions
CREATE INDEX IF NOT EXISTS idx_sessions_user 
  ON user_sessions(user_id_hash);

CREATE INDEX IF NOT EXISTS idx_sessions_start_time 
  ON user_sessions(start_time DESC);

CREATE INDEX IF NOT EXISTS idx_sessions_last_activity 
  ON user_sessions(last_activity DESC);

-- Discovered patterns table (optional - for persistence)
CREATE TABLE IF NOT EXISTS discovered_patterns (
  id SERIAL PRIMARY KEY,
  pattern_type VARCHAR(20) NOT NULL CHECK (pattern_type IN ('frequent', 'sequential', 'temporal')),
  tokens TEXT[] NOT NULL,
  support DECIMAL(10, 4) NOT NULL CHECK (support >= 0 AND support <= 1),
  confidence DECIMAL(10, 4) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  lift DECIMAL(10, 4),
  conviction DECIMAL(10, 4),
  occurrences INTEGER NOT NULL CHECK (occurrences > 0),
  avg_time_between INTEGER,  -- For sequential patterns (ms)
  time_of_day INTEGER CHECK (time_of_day >= 0 AND time_of_day <= 23),  -- For temporal patterns
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(pattern_type, tokens)
);

-- Indexes for patterns
CREATE INDEX IF NOT EXISTS idx_patterns_type 
  ON discovered_patterns(pattern_type);

CREATE INDEX IF NOT EXISTS idx_patterns_tokens 
  ON discovered_patterns USING GIN(tokens);

CREATE INDEX IF NOT EXISTS idx_patterns_support 
  ON discovered_patterns(support DESC);

CREATE INDEX IF NOT EXISTS idx_patterns_confidence 
  ON discovered_patterns(confidence DESC);

CREATE INDEX IF NOT EXISTS idx_patterns_last_seen 
  ON discovered_patterns(last_seen DESC);

-- Prediction validations table (tracks accuracy)
CREATE TABLE IF NOT EXISTS prediction_validations (
  id SERIAL PRIMARY KEY,
  prediction_id VARCHAR(64) NOT NULL,
  session_id VARCHAR(64) NOT NULL,
  predicted_tokens TEXT[] NOT NULL,
  actual_tokens TEXT[] NOT NULL,
  correct BOOLEAN NOT NULL,
  confidence DECIMAL(10, 4) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  cache_hit BOOLEAN NOT NULL DEFAULT FALSE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for validations
CREATE INDEX IF NOT EXISTS idx_validations_session 
  ON prediction_validations(session_id);

CREATE INDEX IF NOT EXISTS idx_validations_timestamp 
  ON prediction_validations(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_validations_correct 
  ON prediction_validations(correct);

-- Create a function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at on user_sessions
DROP TRIGGER IF EXISTS update_user_sessions_updated_at ON user_sessions;
CREATE TRIGGER update_user_sessions_updated_at
    BEFORE UPDATE ON user_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create materialized view for pattern statistics (optional - for dashboards)
CREATE MATERIALIZED VIEW IF NOT EXISTS pattern_statistics AS
SELECT 
  COUNT(*) as total_patterns,
  COUNT(DISTINCT session_id) as total_sessions,
  COUNT(DISTINCT user_id_hash) as unique_users,
  COUNT(DISTINCT UNNEST(requested_tokens)) as unique_tokens,
  AVG(CASE WHEN cached THEN 1 ELSE 0 END) as cache_hit_rate,
  AVG(response_time) as avg_response_time,
  DATE_TRUNC('hour', timestamp) as hour
FROM access_patterns
WHERE timestamp >= NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', timestamp)
ORDER BY hour DESC;

-- Index for materialized view
CREATE INDEX IF NOT EXISTS idx_pattern_statistics_hour 
  ON pattern_statistics(hour DESC);

-- Grant permissions (adjust as needed)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO coinet_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO coinet_user;
-- GRANT SELECT ON pattern_statistics TO coinet_user;

-- Comments for documentation
COMMENT ON TABLE access_patterns IS 'Stores all user access patterns for machine learning';
COMMENT ON TABLE user_sessions IS 'Tracks active user sessions and their context';
COMMENT ON TABLE discovered_patterns IS 'Stores mined patterns (frequent, sequential, temporal)';
COMMENT ON TABLE prediction_validations IS 'Tracks prediction accuracy for model validation';
COMMENT ON MATERIALIZED VIEW pattern_statistics IS 'Aggregated statistics for monitoring dashboard';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Pattern Mining tables created successfully!';
    RAISE NOTICE 'Tables: access_patterns, user_sessions, discovered_patterns, prediction_validations';
    RAISE NOTICE 'Materialized View: pattern_statistics';
    RAISE NOTICE 'Ready for intelligent pattern mining!';
END $$;

