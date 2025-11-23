-- =========================================
-- ROI TRACKING TABLES
-- =========================================
-- Tables for tracking trade executions, PnL, and ROI metrics

-- Main trade executions table
CREATE TABLE IF NOT EXISTS trade_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trade_id VARCHAR(255) NOT NULL UNIQUE,
    alert_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    instrument VARCHAR(50) NOT NULL,
    side VARCHAR(10) NOT NULL,
    entry_price DECIMAL(20,8) NOT NULL,
    exit_price DECIMAL(20,8),
    quantity DECIMAL(20,8) NOT NULL,
    entry_time TIMESTAMP WITH TIME ZONE NOT NULL,
    exit_time TIMESTAMP WITH TIME ZONE,
    slippage DECIMAL(10,6) NOT NULL,
    fees DECIMAL(20,8) NOT NULL,
    gross_pnl DECIMAL(20,8) NOT NULL,
    net_pnl DECIMAL(20,8) NOT NULL,
    status VARCHAR(20) NOT NULL,
    alert_confidence DECIMAL(5,4) NOT NULL,
    market_regime VARCHAR(20) NOT NULL,
    position_size DECIMAL(5,4) NOT NULL,
    stop_loss DECIMAL(20,8),
    take_profit DECIMAL(20,8),
    max_risk DECIMAL(20,8),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for trade executions
CREATE INDEX IF NOT EXISTS idx_trade_executions_alert_id ON trade_executions(alert_id);
CREATE INDEX IF NOT EXISTS idx_trade_executions_user_id ON trade_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_executions_instrument ON trade_executions(instrument);
CREATE INDEX IF NOT EXISTS idx_trade_executions_entry_time ON trade_executions(entry_time);
CREATE INDEX IF NOT EXISTS idx_trade_executions_status ON trade_executions(status);
CREATE INDEX IF NOT EXISTS idx_trade_executions_user_instrument ON trade_executions(user_id, instrument);

-- ROI metrics cache table
CREATE TABLE IF NOT EXISTS roi_metrics_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255),
    instrument VARCHAR(50),
    time_window_start TIMESTAMP WITH TIME ZONE NOT NULL,
    time_window_end TIMESTAMP WITH TIME ZONE NOT NULL,
    metrics JSONB NOT NULL,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Indexes for ROI metrics cache
CREATE INDEX IF NOT EXISTS idx_roi_metrics_user_instrument ON roi_metrics_cache(user_id, instrument);
CREATE INDEX IF NOT EXISTS idx_roi_metrics_time_window ON roi_metrics_cache(time_window_start, time_window_end);
CREATE INDEX IF NOT EXISTS idx_roi_metrics_expires ON roi_metrics_cache(expires_at);

-- Benchmark data for alpha calculation
CREATE TABLE IF NOT EXISTS benchmark_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    price DECIMAL(20,8) NOT NULL,
    volume DECIMAL(20,8),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for benchmark data
CREATE INDEX IF NOT EXISTS idx_benchmark_symbol_timestamp ON benchmark_data(symbol, timestamp);

-- Performance attribution table for alpha analysis
CREATE TABLE IF NOT EXISTS performance_attribution (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    instrument VARCHAR(50) NOT NULL,
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    total_return DECIMAL(10,6) NOT NULL,
    benchmark_return DECIMAL(10,6) NOT NULL,
    alpha DECIMAL(10,6) NOT NULL,
    beta DECIMAL(10,6) NOT NULL,
    information_ratio DECIMAL(10,6) NOT NULL,
    tracking_error DECIMAL(10,6) NOT NULL,
    sharpe_ratio DECIMAL(10,6) NOT NULL,
    sortino_ratio DECIMAL(10,6) NOT NULL,
    max_drawdown DECIMAL(10,6) NOT NULL,
    calmar_ratio DECIMAL(10,6) NOT NULL,
    win_rate DECIMAL(5,4) NOT NULL,
    profit_factor DECIMAL(10,4) NOT NULL,
    average_win DECIMAL(10,6) NOT NULL,
    average_loss DECIMAL(10,6) NOT NULL,
    total_trades INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance attribution
CREATE INDEX IF NOT EXISTS idx_performance_attribution_user_period ON performance_attribution(user_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_performance_attribution_instrument_period ON performance_attribution(instrument, period_start, period_end);

-- Risk metrics time series
CREATE TABLE IF NOT EXISTS risk_metrics_timeseries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    instrument VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    cumulative_return DECIMAL(10,6) NOT NULL,
    high_water_mark DECIMAL(10,6) NOT NULL,
    drawdown DECIMAL(10,6) NOT NULL,
    volatility DECIMAL(10,6) NOT NULL,
    downside_deviation DECIMAL(10,6) NOT NULL,
    value_at_risk DECIMAL(10,6) NOT NULL,
    expected_shortfall DECIMAL(10,6) NOT NULL,
    tail_risk DECIMAL(10,6) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for risk metrics time series
CREATE INDEX IF NOT EXISTS idx_risk_metrics_user_timestamp ON risk_metrics_timeseries(user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_risk_metrics_instrument_timestamp ON risk_metrics_timeseries(instrument, timestamp);

-- Comments for documentation
COMMENT ON TABLE trade_executions IS 'Records of individual trade executions following alerts';
COMMENT ON TABLE roi_metrics_cache IS 'Cached ROI metrics calculations for performance';
COMMENT ON TABLE benchmark_data IS 'Historical benchmark data for alpha calculations';
COMMENT ON TABLE performance_attribution IS 'Performance attribution analysis results';
COMMENT ON TABLE risk_metrics_timeseries IS 'Time series of risk metrics for portfolio analysis';
