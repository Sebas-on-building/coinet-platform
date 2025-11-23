-- User Behavior Analytics Tables
-- Migration for comprehensive user behavior tracking and analytics

-- User interactions table for tracking all user engagements with alerts
CREATE TABLE IF NOT EXISTS user_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id_hash VARCHAR(255) NOT NULL, -- SHA-256 hash of user ID for privacy
  session_id VARCHAR(255) NOT NULL,
  alert_id VARCHAR(255),
  rule_id VARCHAR(255),
  interaction_type VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  metadata JSONB,
  context JSONB,
  privacy_metadata JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_user_interactions_user_id_hash ON user_interactions(user_id_hash);
CREATE INDEX IF NOT EXISTS idx_user_interactions_session_id ON user_interactions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_alert_id ON user_interactions(alert_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_timestamp ON user_interactions(timestamp);
CREATE INDEX IF NOT EXISTS idx_user_interactions_type ON user_interactions(interaction_type);

-- User behavior profiles table for storing analyzed user behavior patterns
CREATE TABLE IF NOT EXISTS user_behavior_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id_hash VARCHAR(255) NOT NULL,
  segment VARCHAR(50) NOT NULL,
  interaction_score DECIMAL(5,2) NOT NULL,
  behavioral_traits JSONB NOT NULL,
  recommendations JSONB NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  privacy_level VARCHAR(20) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_behavior_profiles_user_id_hash ON user_behavior_profiles(user_id_hash);
CREATE INDEX IF NOT EXISTS idx_behavior_profiles_segment ON user_behavior_profiles(segment);
CREATE INDEX IF NOT EXISTS idx_behavior_profiles_interaction_score ON user_behavior_profiles(interaction_score);

-- User behavior clusters table for storing clustering results
CREATE TABLE IF NOT EXISTS user_behavior_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id INTEGER NOT NULL,
  user_id_hash VARCHAR(255) NOT NULL,
  feature_vector JSONB NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  algorithm VARCHAR(50) NOT NULL,
  cluster_characteristics JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_clusters_cluster_id ON user_behavior_clusters(cluster_id);
CREATE INDEX IF NOT EXISTS idx_clusters_user_id ON user_behavior_clusters(user_id_hash);
CREATE INDEX IF NOT EXISTS idx_clusters_algorithm ON user_behavior_clusters(algorithm);

-- User sequence patterns table for storing detected behavioral sequences
CREATE TABLE IF NOT EXISTS user_sequence_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_id VARCHAR(255) NOT NULL,
  sequence TEXT[] NOT NULL,
  frequency INTEGER NOT NULL,
  support DECIMAL(5,4) NOT NULL,
  confidence DECIMAL(5,4) NOT NULL,
  user_ids TEXT[] NOT NULL,
  metadata JSONB NOT NULL,
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patterns_support ON user_sequence_patterns(support);
CREATE INDEX IF NOT EXISTS idx_patterns_confidence ON user_sequence_patterns(confidence);
CREATE INDEX IF NOT EXISTS idx_patterns_detected_at ON user_sequence_patterns(detected_at);

-- Detected patterns table for storing individual pattern detections
CREATE TABLE IF NOT EXISTS detected_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_id VARCHAR(255) NOT NULL,
  pattern_type VARCHAR(100) NOT NULL,
  user_id_hash VARCHAR(255) NOT NULL,
  confidence DECIMAL(5,4) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  description TEXT NOT NULL,
  evidence JSONB NOT NULL,
  recommendations JSONB NOT NULL,
  expiration_date TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) NOT NULL DEFAULT 'active'
);

CREATE INDEX IF NOT EXISTS idx_detected_patterns_user_id ON detected_patterns(user_id_hash);
CREATE INDEX IF NOT EXISTS idx_detected_patterns_type ON detected_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_detected_patterns_severity ON detected_patterns(severity);
CREATE INDEX IF NOT EXISTS idx_detected_patterns_status ON detected_patterns(status);
CREATE INDEX IF NOT EXISTS idx_detected_patterns_detected_at ON detected_patterns(detected_at);

-- User feature vectors cache table
CREATE TABLE IF NOT EXISTS user_feature_vectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id_hash VARCHAR(255) NOT NULL,
  feature_vector JSONB NOT NULL,
  computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_points INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_feature_vectors_user_id ON user_feature_vectors(user_id_hash);
CREATE INDEX IF NOT EXISTS idx_feature_vectors_computed_at ON user_feature_vectors(computed_at);

-- User behavior insights cache table
CREATE TABLE IF NOT EXISTS user_behavior_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id_hash VARCHAR(255) NOT NULL,
  profile_data JSONB,
  cluster_data JSONB,
  patterns_data JSONB,
  recommendations_data JSONB,
  computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_insights_user_id ON user_behavior_insights(user_id_hash);
CREATE INDEX IF NOT EXISTS idx_insights_computed_at ON user_behavior_insights(computed_at);
CREATE INDEX IF NOT EXISTS idx_insights_expires_at ON user_behavior_insights(expires_at);

-- Analytics summary table for aggregated insights
CREATE TABLE IF NOT EXISTS user_behavior_analytics_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  summary_date DATE NOT NULL,
  total_users INTEGER NOT NULL,
  active_users INTEGER NOT NULL,
  segment_distribution JSONB NOT NULL,
  engagement_metrics JSONB NOT NULL,
  pattern_trends JSONB NOT NULL,
  recommendations JSONB NOT NULL,
  computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_summary_date ON user_behavior_analytics_summary(summary_date);
CREATE INDEX IF NOT EXISTS idx_analytics_summary_computed_at ON user_behavior_analytics_summary(computed_at);

-- Pattern detection rules table
CREATE TABLE IF NOT EXISTS pattern_detection_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_type VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  conditions JSONB NOT NULL,
  actions JSONB NOT NULL,
  priority INTEGER NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_detection_rules_type ON pattern_detection_rules(pattern_type);
CREATE INDEX IF NOT EXISTS idx_detection_rules_enabled ON pattern_detection_rules(enabled);

-- Pattern detection logs table
CREATE TABLE IF NOT EXISTS pattern_detection_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_id VARCHAR(255),
  user_id_hash VARCHAR(255) NOT NULL,
  rule_applied VARCHAR(255) NOT NULL,
  result VARCHAR(50) NOT NULL,
  metrics_before JSONB,
  metrics_after JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  execution_time_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_detection_logs_pattern_id ON pattern_detection_logs(pattern_id);
CREATE INDEX IF NOT EXISTS idx_detection_logs_user_id ON pattern_detection_logs(user_id_hash);
CREATE INDEX IF NOT EXISTS idx_detection_logs_timestamp ON pattern_detection_logs(timestamp);

-- Privacy audit log for GDPR compliance
CREATE TABLE IF NOT EXISTS privacy_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation VARCHAR(100) NOT NULL,
  user_id_hash VARCHAR(255),
  data_type VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  details JSONB,
  compliance_check VARCHAR(20) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_privacy_audit_operation ON privacy_audit_log(operation);
CREATE INDEX IF NOT EXISTS idx_privacy_audit_timestamp ON privacy_audit_log(timestamp);

-- Enable Row Level Security (RLS) for privacy compliance
ALTER TABLE user_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_behavior_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_behavior_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sequence_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE detected_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feature_vectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_behavior_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_behavior_analytics_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE pattern_detection_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE pattern_detection_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for privacy compliance
-- These policies ensure users can only access their own data
-- CREATE POLICY "Users can only access their own interactions" ON user_interactions
--   FOR ALL USING (user_id_hash = current_setting('app.current_user_hash', true));

-- CREATE POLICY "Users can only access their own profiles" ON user_behavior_profiles
--   FOR ALL USING (user_id_hash = current_setting('app.current_user_hash', true));

-- Performance optimization: Partition large tables by month
-- This would be done in PostgreSQL with declarative partitioning

-- Add comments for documentation
COMMENT ON TABLE user_interactions IS 'Records all user interactions with alerts for behavioral analysis';
COMMENT ON TABLE user_behavior_profiles IS 'Stores analyzed user behavior profiles and segments';
COMMENT ON TABLE user_behavior_clusters IS 'Stores clustering results for user segmentation';
COMMENT ON TABLE user_sequence_patterns IS 'Stores detected sequential behavior patterns';
COMMENT ON TABLE detected_patterns IS 'Stores individual pattern detections for specific users';
COMMENT ON TABLE user_feature_vectors IS 'Cached feature vectors for efficient clustering';
COMMENT ON TABLE user_behavior_insights IS 'Cached user behavior insights for dashboard performance';
COMMENT ON TABLE user_behavior_analytics_summary IS 'Aggregated behavior insights for trend analysis';
COMMENT ON TABLE pattern_detection_rules IS 'Configurable rules for detecting behavior patterns';
COMMENT ON TABLE pattern_detection_logs IS 'Audit log for pattern detection activities';
COMMENT ON TABLE privacy_audit_log IS 'GDPR compliance audit trail for data operations';

-- Grant appropriate permissions (adjust based on your user model)
-- GRANT SELECT, INSERT ON user_interactions TO behavior_analytics_user;
-- GRANT SELECT, INSERT, UPDATE ON user_behavior_profiles TO behavior_analytics_user;
-- GRANT SELECT, INSERT, UPDATE ON user_behavior_clusters TO behavior_analytics_user;
-- GRANT SELECT, INSERT, UPDATE ON user_sequence_patterns TO behavior_analytics_user;
-- GRANT SELECT, INSERT, UPDATE ON detected_patterns TO behavior_analytics_user;
-- GRANT SELECT, INSERT ON user_feature_vectors TO behavior_analytics_user;
-- GRANT SELECT, INSERT, UPDATE ON user_behavior_insights TO behavior_analytics_user;
-- GRANT SELECT, INSERT, UPDATE ON user_behavior_analytics_summary TO behavior_analytics_user;
-- GRANT SELECT, INSERT, UPDATE ON pattern_detection_rules TO behavior_analytics_user;
-- GRANT SELECT, INSERT ON pattern_detection_logs TO behavior_analytics_user;
-- GRANT SELECT, INSERT ON privacy_audit_log TO behavior_analytics_user;
