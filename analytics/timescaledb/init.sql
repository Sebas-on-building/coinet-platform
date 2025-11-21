-- =============================================================================
-- COINET PLATFORM - TIMESCALEDB INITIALIZATION
-- =============================================================================
-- Time-series database setup for real-time analytics and monitoring
-- =============================================================================

-- Create TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- =============================================================================
-- USER ACTIVITY TIME SERIES
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_activity_ts (
    time TIMESTAMPTZ NOT NULL,
    user_id TEXT,
    event_type TEXT,
    session_id TEXT,
    ip_address INET,
    user_agent TEXT,
    request_id TEXT,
    response_time_ms INTEGER,
    metadata JSONB
);

-- Convert to hypertable
SELECT create_hypertable('user_activity_ts', 'time', if_not_exists => TRUE);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity_ts (user_id, time DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_event_type ON user_activity_ts (event_type, time DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_session ON user_activity_ts (session_id, time DESC);

-- =============================================================================
-- AUTHENTICATION METRICS TIME SERIES
-- =============================================================================
CREATE TABLE IF NOT EXISTS auth_metrics_ts (
    time TIMESTAMPTZ NOT NULL,
    event_type TEXT,
    success BOOLEAN,
    method TEXT,
    ip_address INET,
    email_domain TEXT,
    user_tier TEXT,
    response_time_ms INTEGER,
    attempts INTEGER DEFAULT 1,
    metadata JSONB
);

SELECT create_hypertable('auth_metrics_ts', 'time', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS idx_auth_metrics_success ON auth_metrics_ts (success, time DESC);
CREATE INDEX IF NOT EXISTS idx_auth_metrics_method ON auth_metrics_ts (method, time DESC);
CREATE INDEX IF NOT EXISTS idx_auth_metrics_domain ON auth_metrics_ts (email_domain, time DESC);

-- =============================================================================
-- SECURITY EVENTS TIME SERIES
-- =============================================================================
CREATE TABLE IF NOT EXISTS security_events_ts (
    time TIMESTAMPTZ NOT NULL,
    event_type TEXT,
    severity TEXT,
    user_id TEXT,
    action TEXT,
    resource TEXT,
    ip_address INET,
    details JSONB,
    metadata JSONB
);

SELECT create_hypertable('security_events_ts', 'time', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events_ts (severity, time DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_user ON security_events_ts (user_id, time DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_action ON security_events_ts (action, time DESC);

-- =============================================================================
-- PERFORMANCE METRICS TIME SERIES
-- =============================================================================
CREATE TABLE IF NOT EXISTS performance_metrics_ts (
    time TIMESTAMPTZ NOT NULL,
    service TEXT,
    endpoint TEXT,
    method TEXT,
    status_code INTEGER,
    response_time_ms INTEGER,
    request_size_bytes INTEGER,
    response_size_bytes INTEGER,
    user_id TEXT,
    metadata JSONB
);

SELECT create_hypertable('performance_metrics_ts', 'time', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS idx_performance_service ON performance_metrics_ts (service, time DESC);
CREATE INDEX IF NOT EXISTS idx_performance_endpoint ON performance_metrics_ts (endpoint, time DESC);
CREATE INDEX IF NOT EXISTS idx_performance_status ON performance_metrics_ts (status_code, time DESC);

-- =============================================================================
-- BUSINESS METRICS TIME SERIES
-- =============================================================================
CREATE TABLE IF NOT EXISTS business_metrics_ts (
    time TIMESTAMPTZ NOT NULL,
    metric_name TEXT,
    metric_value DOUBLE PRECISION,
    dimension_1 TEXT,
    dimension_2 TEXT,
    dimension_3 TEXT,
    metadata JSONB
);

SELECT create_hypertable('business_metrics_ts', 'time', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS idx_business_metrics_name ON business_metrics_ts (metric_name, time DESC);
CREATE INDEX IF NOT EXISTS idx_business_metrics_dims ON business_metrics_ts (dimension_1, dimension_2, time DESC);

-- =============================================================================
-- CONTINUOUS AGGREGATES FOR REAL-TIME ANALYTICS
-- =============================================================================

-- Hourly user activity aggregates
CREATE MATERIALIZED VIEW IF NOT EXISTS user_activity_hourly
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 hour', time) AS bucket,
    event_type,
    COUNT(*) as event_count,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT session_id) as unique_sessions,
    AVG(response_time_ms) as avg_response_time
FROM user_activity_ts
GROUP BY bucket, event_type;

-- Daily authentication metrics
CREATE MATERIALIZED VIEW IF NOT EXISTS auth_metrics_daily
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 day', time) AS bucket,
    method,
    user_tier,
    COUNT(*) as total_attempts,
    COUNT(*) FILTER (WHERE success = true) as successful_attempts,
    COUNT(*) FILTER (WHERE success = false) as failed_attempts,
    COUNT(DISTINCT CASE WHEN success = true THEN ip_address END) as unique_successful_ips,
    AVG(response_time_ms) as avg_response_time
FROM auth_metrics_ts
GROUP BY bucket, method, user_tier;

-- Security events by severity (hourly)
CREATE MATERIALIZED VIEW IF NOT EXISTS security_events_hourly
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 hour', time) AS bucket,
    severity,
    action,
    COUNT(*) as event_count,
    COUNT(DISTINCT user_id) as affected_users,
    COUNT(DISTINCT ip_address) as unique_ips
FROM security_events_ts
GROUP BY bucket, severity, action;

-- Performance metrics (5-minute intervals)
CREATE MATERIALIZED VIEW IF NOT EXISTS performance_metrics_5min
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('5 minutes', time) AS bucket,
    service,
    endpoint,
    method,
    COUNT(*) as request_count,
    AVG(response_time_ms) as avg_response_time,
    percentile_cont(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95_response_time,
    percentile_cont(0.99) WITHIN GROUP (ORDER BY response_time_ms) as p99_response_time,
    COUNT(*) FILTER (WHERE status_code >= 400) as error_count,
    AVG(request_size_bytes) as avg_request_size,
    AVG(response_size_bytes) as avg_response_size
FROM performance_metrics_ts
GROUP BY bucket, service, endpoint, method;

-- =============================================================================
-- DATA RETENTION POLICIES
-- =============================================================================

-- Raw data retention (30 days for high-frequency data)
SELECT add_retention_policy('user_activity_ts', INTERVAL '30 days');
SELECT add_retention_policy('performance_metrics_ts', INTERVAL '30 days');

-- Authentication and security data (1 year)
SELECT add_retention_policy('auth_metrics_ts', INTERVAL '1 year');
SELECT add_retention_policy('security_events_ts', INTERVAL '2 years');

-- Business metrics (5 years)
SELECT add_retention_policy('business_metrics_ts', INTERVAL '5 years');

-- =============================================================================
-- ANALYTICS FUNCTIONS
-- =============================================================================

-- Function to get user activity summary
CREATE OR REPLACE FUNCTION get_user_activity_summary(
    p_user_id TEXT,
    p_start_time TIMESTAMPTZ DEFAULT NOW() - INTERVAL '24 hours',
    p_end_time TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
    event_type TEXT,
    event_count BIGINT,
    first_event TIMESTAMPTZ,
    last_event TIMESTAMPTZ,
    avg_response_time DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ua.event_type,
        COUNT(*) as event_count,
        MIN(ua.time) as first_event,
        MAX(ua.time) as last_event,
        AVG(ua.response_time_ms) as avg_response_time
    FROM user_activity_ts ua
    WHERE ua.user_id = p_user_id
      AND ua.time >= p_start_time
      AND ua.time <= p_end_time
    GROUP BY ua.event_type
    ORDER BY event_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to detect suspicious activity
CREATE OR REPLACE FUNCTION detect_suspicious_activity(
    p_lookback_minutes INTEGER DEFAULT 60
)
RETURNS TABLE (
    ip_address INET,
    failed_attempts BIGINT,
    unique_emails BIGINT,
    first_attempt TIMESTAMPTZ,
    last_attempt TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        am.ip_address,
        COUNT(*) as failed_attempts,
        COUNT(DISTINCT SPLIT_PART(am.metadata->>'email', '@', 1)) as unique_emails,
        MIN(am.time) as first_attempt,
        MAX(am.time) as last_attempt
    FROM auth_metrics_ts am
    WHERE am.success = false
      AND am.time >= NOW() - (p_lookback_minutes || ' minutes')::INTERVAL
      AND am.ip_address IS NOT NULL
    GROUP BY am.ip_address
    HAVING COUNT(*) >= 5  -- 5+ failed attempts
    ORDER BY failed_attempts DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO coinet_timeseries;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO coinet_timeseries;
