-- =========================================
-- SIGNAL ACCURACY TRACKING TABLES
-- =========================================
-- Tables for tracking signal performance, drift detection, and alerting

-- Signal outcomes table
CREATE TABLE IF NOT EXISTS signal_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    signal_id VARCHAR(255) NOT NULL,
    signal_type VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    outcome VARCHAR(10) NOT NULL, -- 'TP', 'FP', 'TN', 'FN'
    confidence DECIMAL(5,4) NOT NULL,
    alert_triggered BOOLEAN NOT NULL,
    alert_id VARCHAR(255),
    user_id VARCHAR(255),
    instrument VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for signal outcomes
CREATE INDEX IF NOT EXISTS idx_signal_outcomes_signal_id ON signal_outcomes(signal_id);
CREATE INDEX IF NOT EXISTS idx_signal_outcomes_signal_type ON signal_outcomes(signal_type);
CREATE INDEX IF NOT EXISTS idx_signal_outcomes_timestamp ON signal_outcomes(timestamp);
CREATE INDEX IF NOT EXISTS idx_signal_outcomes_outcome ON signal_outcomes(outcome);

-- Signal performance metrics table
CREATE TABLE IF NOT EXISTS signal_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    signal_type VARCHAR(50) NOT NULL,
    time_window_start TIMESTAMP WITH TIME ZONE NOT NULL,
    time_window_end TIMESTAMP WITH TIME ZONE NOT NULL,
    metrics JSONB NOT NULL,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for signal performance metrics
CREATE INDEX IF NOT EXISTS idx_signal_performance_signal_type ON signal_performance_metrics(signal_type);
CREATE INDEX IF NOT EXISTS idx_signal_performance_time_window ON signal_performance_metrics(time_window_start, time_window_end);

-- Signal drift detections table
CREATE TABLE IF NOT EXISTS signal_drift_detections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    signal_type VARCHAR(50) NOT NULL,
    drift_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    confidence DECIMAL(5,4) NOT NULL,
    description TEXT NOT NULL,
    detected_at TIMESTAMP WITH TIME ZONE NOT NULL,
    baseline_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    baseline_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    metrics JSONB NOT NULL,
    recommendations JSONB NOT NULL,
    action_required BOOLEAN NOT NULL,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for signal drift detections
CREATE INDEX IF NOT EXISTS idx_signal_drift_signal_type ON signal_drift_detections(signal_type);
CREATE INDEX IF NOT EXISTS idx_signal_drift_detected_at ON signal_drift_detections(detected_at);
CREATE INDEX IF NOT EXISTS idx_signal_drift_severity ON signal_drift_detections(severity);
CREATE INDEX IF NOT EXISTS idx_signal_drift_resolved ON signal_drift_detections(resolved);

-- Signal alerts table
CREATE TABLE IF NOT EXISTS signal_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    signal_type VARCHAR(50) NOT NULL,
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    metrics JSONB NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    acknowledged_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for signal alerts
CREATE INDEX IF NOT EXISTS idx_signal_alerts_signal_type ON signal_alerts(signal_type);
CREATE INDEX IF NOT EXISTS idx_signal_alerts_sent_at ON signal_alerts(sent_at);
CREATE INDEX IF NOT EXISTS idx_signal_alerts_acknowledged ON signal_alerts(acknowledged);

-- Signal quality thresholds table
CREATE TABLE IF NOT EXISTS signal_quality_thresholds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    signal_type VARCHAR(50) NOT NULL,
    threshold_type VARCHAR(50) NOT NULL, -- 'precision', 'recall', 'f1_score', etc.
    threshold_value DECIMAL(5,4) NOT NULL,
    alert_frequency VARCHAR(20) NOT NULL, -- 'immediate', 'daily', 'weekly', 'monthly'
    notification_channels JSONB NOT NULL,
    escalation_level VARCHAR(20) NOT NULL,
    auto_retraining_threshold DECIMAL(5,4),
    drift_detection_window INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for signal quality thresholds
CREATE INDEX IF NOT EXISTS idx_signal_thresholds_signal_type ON signal_quality_thresholds(signal_type);
CREATE INDEX IF NOT EXISTS idx_signal_thresholds_type ON signal_quality_thresholds(threshold_type);

-- Signal retraining history table
CREATE TABLE IF NOT EXISTS signal_retraining_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    signal_type VARCHAR(50) NOT NULL,
    retraining_type VARCHAR(50) NOT NULL,
    trigger_reason VARCHAR(100) NOT NULL,
    old_model_version VARCHAR(50),
    new_model_version VARCHAR(50),
    performance_improvement DECIMAL(5,4),
    retraining_started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    retraining_completed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for signal retraining history
CREATE INDEX IF NOT EXISTS idx_signal_retraining_signal_type ON signal_retraining_history(signal_type);
CREATE INDEX IF NOT EXISTS idx_signal_retraining_started_at ON signal_retraining_history(retraining_started_at);
CREATE INDEX IF NOT EXISTS idx_signal_retraining_status ON signal_retraining_history(status);

-- Comments for documentation
COMMENT ON TABLE signal_outcomes IS 'Records of signal evaluation outcomes for accuracy tracking';
COMMENT ON TABLE signal_performance_metrics IS 'Cached signal performance metrics calculations';
COMMENT ON TABLE signal_drift_detections IS 'Detected signal performance drifts and degradation';
COMMENT ON TABLE signal_alerts IS 'Alerts generated for signal performance issues';
COMMENT ON TABLE signal_quality_thresholds IS 'Configurable thresholds for signal quality monitoring';
COMMENT ON TABLE signal_retraining_history IS 'History of signal model retraining events';
