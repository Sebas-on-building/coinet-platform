-- =============================================================================
-- SIGNAL AND ALERT SYSTEM ENHANCEMENTS
-- =============================================================================
-- This migration adds comprehensive signal tracking, alert evaluation logging,
-- performance monitoring, and user feedback collection for world-class analytics.

-- =============================================================================
-- SIGNAL SOURCES - SIGNAL ORIGIN TRACKING SYSTEM
-- =============================================================================

-- Create custom enums for signal data types and reliability (skip if already exist)
DO $$ BEGIN
    CREATE TYPE "SignalDataType" AS ENUM (
      'MARKET', 'ON_CHAIN', 'SOCIAL', 'NEWS', 'DEFI',
      'WEATHER', 'SENTIMENT', 'CUSTOM'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "SignalReliability" AS ENUM (
      'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create signal_sources table
CREATE TABLE "signal_sources" (
    "id" VARCHAR(36) NOT NULL,
    "tenantId" VARCHAR(36) NOT NULL DEFAULT 'default',
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "sourceType" VARCHAR(100) NOT NULL,
    "sourceUrl" VARCHAR(500),
    "network" VARCHAR(100),
    "dataTypes" "SignalDataType"[],
    "reliability" "SignalReliability" NOT NULL DEFAULT 'MEDIUM',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "requiresAuth" BOOLEAN NOT NULL DEFAULT false,
    "apiKey" VARCHAR(500),
    "accessToken" VARCHAR(500),
    "secretKey" VARCHAR(500),
    "rateLimit" INTEGER NOT NULL DEFAULT 1000,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsed" TIMESTAMP(6),
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "lastHealthCheck" TIMESTAMP(6),
    "metadata" JSONB,

    CONSTRAINT "signal_sources_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "signal_sources_name_key" UNIQUE ("name"),
    CONSTRAINT "signal_sources_slug_key" UNIQUE ("slug")
);

-- =============================================================================
-- SIGNAL RECORDS - RAW SIGNAL DATA STORAGE
-- =============================================================================

CREATE TABLE "signals" (
    "id" VARCHAR(36) NOT NULL,
    "sourceId" VARCHAR(36) NOT NULL,
    "tenantId" VARCHAR(36) NOT NULL DEFAULT 'default',
    "signalType" VARCHAR(100) NOT NULL,
    "symbol" VARCHAR(20),
    "chain" VARCHAR(50),
    "contractAddress" VARCHAR(42),
    "rawData" JSONB NOT NULL,
    "processedData" JSONB,
    "confidence" REAL,
    "timestamp" TIMESTAMP(6) NOT NULL,
    "ingestedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(6),
    "isValid" BOOLEAN NOT NULL DEFAULT true,
    "qualityScore" REAL,
    "errorMessage" TEXT,
    "metadata" JSONB,

    CONSTRAINT "signals_pkey" PRIMARY KEY ("id")
);

-- =============================================================================
-- SIGNAL CORRELATIONS - CORRELATED SIGNAL DATA
-- =============================================================================

CREATE TABLE "signal_correlations" (
    "id" VARCHAR(36) NOT NULL,
    "primarySignalId" VARCHAR(36) NOT NULL,
    "secondarySignalId" VARCHAR(36) NOT NULL,
    "tenantId" VARCHAR(36) NOT NULL DEFAULT 'default',
    "correlationType" VARCHAR(100) NOT NULL,
    "strength" REAL NOT NULL,
    "confidence" REAL NOT NULL,
    "lag" INTEGER,
    "detectedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(6),
    "metadata" JSONB,

    CONSTRAINT "signal_correlations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "signal_correlations_unique_correlation" UNIQUE ("primarySignalId", "secondarySignalId", "correlationType")
);

-- =============================================================================
-- ALERT TRIGGERS - ALERT EVALUATION LOGGING
-- =============================================================================

DO $$ BEGIN
    CREATE TYPE "TriggerResult" AS ENUM ('TRUE', 'FALSE', 'ERROR', 'TIMEOUT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE "alert_triggers" (
    "id" VARCHAR(36) NOT NULL,
    "alertId" VARCHAR(36) NOT NULL,
    "tenantId" VARCHAR(36) NOT NULL DEFAULT 'default',
    "userId" VARCHAR(36) NOT NULL,
    "triggerConditions" JSONB NOT NULL,
    "evaluationLogic" VARCHAR(100) NOT NULL,
    "result" "TriggerResult" NOT NULL,
    "confidence" REAL,
    "signalData" JSONB,
    "signalIds" TEXT[],
    "evaluationTime" INTEGER,
    "memoryUsed" INTEGER,
    "cpuUsed" REAL,
    "evaluatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "triggeredAt" TIMESTAMP(6),
    "errorMessage" TEXT,
    "errorCode" VARCHAR(50),
    "metadata" JSONB,

    CONSTRAINT "alert_triggers_pkey" PRIMARY KEY ("id")
);

-- =============================================================================
-- ALERT PERFORMANCE - ALERT OUTCOME TRACKING
-- =============================================================================

DO $$ BEGIN
    CREATE TYPE "AlertOutcome" AS ENUM ('SUCCESS', 'FAILURE', 'NEUTRAL', 'UNKNOWN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE "alert_performance" (
    "id" VARCHAR(36) NOT NULL,
    "alertId" VARCHAR(36) NOT NULL,
    "tenantId" VARCHAR(36) NOT NULL DEFAULT 'default',
    "userId" VARCHAR(36) NOT NULL,
    "alertTriggerId" VARCHAR(36),
    "outcome" "AlertOutcome" NOT NULL,
    "kpiValue" REAL,
    "kpiType" VARCHAR(50) NOT NULL,
    "profitLoss" DECIMAL(20,8),
    "duration" INTEGER,
    "entryPrice" DECIMAL(20,8),
    "exitPrice" DECIMAL(20,8),
    "signalLatency" INTEGER,
    "signalAccuracy" REAL,
    "marketVolatility" REAL,
    "portfolioValue" DECIMAL(20,8),
    "riskTolerance" VARCHAR(20),
    "alertTime" TIMESTAMP(6) NOT NULL,
    "marketTime" TIMESTAMP(6) NOT NULL,
    "recordedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "algorithmVersion" VARCHAR(50),
    "metadata" JSONB,

    CONSTRAINT "alert_performance_pkey" PRIMARY KEY ("id")
);

-- =============================================================================
-- USER FEEDBACK - ALERT FEEDBACK COLLECTION
-- =============================================================================

DO $$ BEGIN
    CREATE TYPE "FeedbackCategory" AS ENUM ('HELPFUL', 'TOO_LATE', 'TOO_EARLY', 'INACCURATE', 'SPAM', 'TECHNICAL', 'SUGGESTION', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE "user_feedback" (
    "id" VARCHAR(36) NOT NULL,
    "alertId" VARCHAR(36) NOT NULL,
    "tenantId" VARCHAR(36) NOT NULL DEFAULT 'default',
    "userId" VARCHAR(36) NOT NULL,
    "satisfactionScore" SMALLINT NOT NULL,
    "category" "FeedbackCategory" NOT NULL,
    "comment" TEXT,
    "alertTriggerId" VARCHAR(36),
    "portfolioValue" DECIMAL(20,8),
    "riskTolerance" VARCHAR(20),
    "tradingFrequency" VARCHAR(20),
    "algorithmVersion" VARCHAR(50),
    "modelConfidence" REAL,
    "feedbackTime" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "alertTime" TIMESTAMP(6) NOT NULL,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "gdprConsent" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,

    CONSTRAINT "user_feedback_pkey" PRIMARY KEY ("id")
);

-- =============================================================================
-- FOREIGN KEY CONSTRAINTS
-- =============================================================================

-- Note: Tenant foreign key constraint will be added after tenant security setup

ALTER TABLE "signals" ADD CONSTRAINT "signals_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "signal_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "signal_correlations" ADD CONSTRAINT "signal_correlations_primarySignalId_fkey" FOREIGN KEY ("primarySignalId") REFERENCES "signals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "signal_correlations" ADD CONSTRAINT "signal_correlations_secondarySignalId_fkey" FOREIGN KEY ("secondarySignalId") REFERENCES "signals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "alert_triggers" ADD CONSTRAINT "alert_triggers_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "alerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "alert_triggers" ADD CONSTRAINT "alert_triggers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "alert_performance" ADD CONSTRAINT "alert_performance_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "alerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "alert_performance" ADD CONSTRAINT "alert_performance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "alert_performance" ADD CONSTRAINT "alert_performance_alertTriggerId_fkey" FOREIGN KEY ("alertTriggerId") REFERENCES "alert_triggers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "user_feedback" ADD CONSTRAINT "user_feedback_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "alerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_feedback" ADD CONSTRAINT "user_feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_feedback" ADD CONSTRAINT "user_feedback_alertTriggerId_fkey" FOREIGN KEY ("alertTriggerId") REFERENCES "alert_triggers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- =============================================================================
-- PERFORMANCE INDEXES
-- =============================================================================

-- Signal sources indexes
CREATE INDEX "signal_sources_tenant_active_idx" ON "signal_sources"("tenantId", "isActive");
CREATE INDEX "signal_sources_type_reliability_idx" ON "signal_sources"("sourceType", "reliability");
CREATE INDEX "signal_sources_data_types_idx" ON "signal_sources" USING GIN ("dataTypes");
CREATE INDEX "signal_sources_last_used_idx" ON "signal_sources"("lastUsed");
CREATE INDEX "signal_sources_public_idx" ON "signal_sources"("isPublic");

-- Signals indexes
CREATE INDEX "signals_source_timestamp_idx" ON "signals"("sourceId", "timestamp");
CREATE INDEX "signals_tenant_symbol_timestamp_idx" ON "signals"("tenantId", "symbol", "timestamp");
CREATE INDEX "signals_type_timestamp_idx" ON "signals"("signalType", "timestamp");
CREATE INDEX "signals_valid_quality_idx" ON "signals"("isValid", "qualityScore");
CREATE INDEX "signals_ingested_at_idx" ON "signals"("ingestedAt");

-- Signal correlations indexes
CREATE INDEX "signal_correlations_tenant_strength_idx" ON "signal_correlations"("tenantId", "strength");
CREATE INDEX "signal_correlations_type_detected_idx" ON "signal_correlations"("correlationType", "detectedAt");
CREATE INDEX "signal_correlations_primary_idx" ON "signal_correlations"("primarySignalId");
CREATE INDEX "signal_correlations_secondary_idx" ON "signal_correlations"("secondarySignalId");

-- Alert triggers indexes
CREATE INDEX "alert_triggers_alert_time_idx" ON "alert_triggers"("alertId", "evaluatedAt");
CREATE INDEX "alert_triggers_tenant_user_time_idx" ON "alert_triggers"("tenantId", "userId", "evaluatedAt");
CREATE INDEX "alert_triggers_result_time_idx" ON "alert_triggers"("result", "evaluatedAt");
CREATE INDEX "alert_triggers_logic_result_idx" ON "alert_triggers"("evaluationLogic", "result");
CREATE INDEX "alert_triggers_triggered_at_idx" ON "alert_triggers"("triggeredAt");

-- Alert performance indexes
CREATE INDEX "alert_performance_alert_time_idx" ON "alert_performance"("alertId", "alertTime");
CREATE INDEX "alert_performance_tenant_user_outcome_idx" ON "alert_performance"("tenantId", "userId", "outcome");
CREATE INDEX "alert_performance_outcome_time_idx" ON "alert_performance"("outcome", "alertTime");
CREATE INDEX "alert_performance_kpi_idx" ON "alert_performance"("kpiType", "kpiValue");
CREATE INDEX "alert_performance_algorithm_outcome_idx" ON "alert_performance"("algorithmVersion", "outcome");

-- User feedback indexes
CREATE INDEX "user_feedback_alert_time_idx" ON "user_feedback"("alertId", "feedbackTime");
CREATE INDEX "user_feedback_tenant_user_score_idx" ON "user_feedback"("tenantId", "userId", "satisfactionScore");
CREATE INDEX "user_feedback_category_score_idx" ON "user_feedback"("category", "satisfactionScore");
CREATE INDEX "user_feedback_algorithm_score_idx" ON "user_feedback"("algorithmVersion", "satisfactionScore");
CREATE INDEX "user_feedback_anonymous_gdpr_idx" ON "user_feedback"("isAnonymous", "gdprConsent");

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

ALTER TABLE "signal_sources" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "signals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "signal_correlations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "alert_triggers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "alert_performance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_feedback" ENABLE ROW LEVEL SECURITY;

-- Signal sources RLS
CREATE POLICY "signal_sources_tenant_isolation" ON "signal_sources"
    USING ("tenantId" = current_setting('app.current_tenant', true));

-- Signals RLS
CREATE POLICY "signals_tenant_isolation" ON "signals"
    USING ("tenantId" = current_setting('app.current_tenant', true));

-- Signal correlations RLS
CREATE POLICY "signal_correlations_tenant_isolation" ON "signal_correlations"
    USING ("tenantId" = current_setting('app.current_tenant', true));

-- Alert triggers RLS
CREATE POLICY "alert_triggers_tenant_isolation" ON "alert_triggers"
    USING ("tenantId" = current_setting('app.current_tenant', true));

-- Alert performance RLS
CREATE POLICY "alert_performance_tenant_isolation" ON "alert_performance"
    USING ("tenantId" = current_setting('app.current_tenant', true));

-- User feedback RLS
CREATE POLICY "user_feedback_tenant_isolation" ON "user_feedback"
    USING ("tenantId" = current_setting('app.current_tenant', true));

-- =============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_signal_sources_updated_at
    BEFORE UPDATE ON "signal_sources"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ENCRYPTION SETUP FOR SENSITIVE DATA
-- =============================================================================

-- Enable pgcrypto extension for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create encryption keys table (if not exists)
CREATE TABLE IF NOT EXISTS "encryption_keys" (
    "id" VARCHAR(36) NOT NULL,
    "keyName" VARCHAR(100) NOT NULL,
    "algorithm" VARCHAR(50) NOT NULL DEFAULT 'aes-256-gcm',
    "keyData" BYTEA NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(6),
    "rotatedAt" TIMESTAMP(6),
    "rotationCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "encryption_keys_pkey" PRIMARY KEY ("id")
);

-- Insert default encryption key
INSERT INTO "encryption_keys" ("id", "keyName", "keyData", "expiresAt")
VALUES (
    gen_random_uuid()::TEXT,
    'signal-source-encryption-key',
    pgcrypto.digest(gen_random_bytes(32), 'sha256'),
    CURRENT_TIMESTAMP + INTERVAL '1 year'
) ON CONFLICT ("keyName") DO NOTHING;

-- Encryption functions (reuse from previous migration)
CREATE OR REPLACE FUNCTION encrypt_signal_data(
    plaintext TEXT,
    key_name TEXT DEFAULT 'signal-source-encryption-key'
)
RETURNS TEXT AS $$
DECLARE
    master_key BYTEA;
    encrypted_data TEXT;
    iv BYTEA;
    encrypted_bytes BYTEA;
BEGIN
    -- Get the active master key
    SELECT "keyData" INTO master_key
    FROM "encryption_keys"
    WHERE "keyName" = key_name AND "isActive" = true AND ("expiresAt" IS NULL OR "expiresAt" > CURRENT_TIMESTAMP)
    ORDER BY "createdAt" DESC
    LIMIT 1;

    IF master_key IS NULL THEN
        RAISE EXCEPTION 'No valid encryption key found for: %', key_name;
    END IF;

    -- Generate a random IV
    iv := gen_random_bytes(16);

    -- Encrypt the data using AES-256-GCM
    encrypted_bytes := pgcrypto.encrypt_iv(
        convert_to(plaintext, 'utf8'),
        master_key,
        iv,
        'aes-256-gcm'
    );

    -- Return base64 encoded result with IV prepended
    encrypted_data := encode(iv || encrypted_bytes, 'base64');

    RETURN encrypted_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrypt_signal_data(
    encrypted_data TEXT,
    key_name TEXT DEFAULT 'signal-source-encryption-key'
)
RETURNS TEXT AS $$
DECLARE
    master_key BYTEA;
    decoded_data BYTEA;
    iv BYTEA;
    encrypted_bytes BYTEA;
    decrypted_bytes BYTEA;
    decrypted_text TEXT;
BEGIN
    -- Get the active master key
    SELECT "keyData" INTO master_key
    FROM "encryption_keys"
    WHERE "keyName" = key_name AND "isActive" = true AND ("expiresAt" IS NULL OR "expiresAt" > CURRENT_TIMESTAMP)
    ORDER BY "createdAt" DESC
    LIMIT 1;

    IF master_key IS NULL THEN
        RAISE EXCEPTION 'No valid decryption key found for: %', key_name;
    END IF;

    -- Decode from base64
    decoded_data := decode(encrypted_data, 'base64');

    -- Extract IV (first 16 bytes) and encrypted data
    iv := substring(decoded_data FROM 1 FOR 16);
    encrypted_bytes := substring(decoded_data FROM 17);

    -- Decrypt the data
    decrypted_bytes := pgcrypto.decrypt_iv(
        encrypted_bytes,
        master_key,
        iv,
        'aes-256-gcm'
    );

    -- Convert back to text
    decrypted_text := convert_from(decrypted_bytes, 'utf8');

    RETURN decrypted_text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- AUDIT LOGGING FOR SIGNAL SOURCES
-- =============================================================================

-- Extend audit log to include signal sources
ALTER TABLE "audit_logs" ADD COLUMN "signalSourceId" VARCHAR(36);

ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_signalSourceId_fkey" FOREIGN KEY ("signalSourceId") REFERENCES "signal_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON "signal_sources" TO coinet_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON "signals" TO coinet_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON "signal_correlations" TO coinet_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON "alert_triggers" TO coinet_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON "alert_performance" TO coinet_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON "user_feedback" TO coinet_user;
GRANT SELECT, INSERT, UPDATE ON "encryption_keys" TO coinet_user;

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE "signal_sources" IS 'Signal source configuration and metadata for multi-tenant signal ingestion';
COMMENT ON TABLE "signals" IS 'Raw signal data storage with quality assessment and correlation tracking';
COMMENT ON TABLE "signal_correlations" IS 'Correlations between signals for pattern recognition and ML';
COMMENT ON TABLE "alert_triggers" IS 'Alert evaluation logging for performance analytics and ML training';
COMMENT ON TABLE "alert_performance" IS 'Alert outcome tracking against market reality for ML training';
COMMENT ON TABLE "user_feedback" IS 'User feedback collection for UX improvements and ML training';

-- =============================================================================
-- SIGNAL SOURCE HEALTH MONITORING
-- =============================================================================

CREATE OR REPLACE FUNCTION check_signal_source_health()
RETURNS TABLE(
    source_id TEXT,
    source_name TEXT,
    status TEXT,
    last_used TIMESTAMP,
    error_count INTEGER,
    health_score INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ss."id",
        ss."name",
        CASE
            WHEN ss."isActive" AND ss."errorCount" = 0 THEN 'HEALTHY'
            WHEN ss."isActive" AND ss."errorCount" < 10 THEN 'WARNING'
            WHEN ss."isActive" AND ss."errorCount" >= 10 THEN 'CRITICAL'
            ELSE 'INACTIVE'
        END as status,
        ss."lastUsed",
        ss."errorCount",
        CASE
            WHEN ss."isActive" AND ss."errorCount" = 0 THEN 100
            WHEN ss."isActive" AND ss."errorCount" < 5 THEN 80
            WHEN ss."isActive" AND ss."errorCount" < 10 THEN 50
            WHEN ss."isActive" THEN 20
            ELSE 0
        END as health_score
    FROM "signal_sources" ss
    WHERE ss."tenantId" = current_setting('app.current_tenant', true)
    ORDER BY health_score DESC, "lastUsed" DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- SIGNAL ANALYTICS VIEWS
-- =============================================================================

CREATE OR REPLACE VIEW signal_analytics AS
SELECT
    s."signalType",
    s."sourceId",
    s."tenantId",
    s."symbol",
    s."chain",
    COUNT(*) as signal_count,
    AVG(s."confidence") as avg_confidence,
    AVG(s."qualityScore") as avg_quality,
    MIN(s."timestamp") as first_signal,
    MAX(s."timestamp") as last_signal,
    MAX(s."ingestedAt") as last_ingested
FROM "signals" s
WHERE s."tenantId" = current_setting('app.current_tenant', true)
  AND s."isValid" = true
GROUP BY s."signalType", s."sourceId", s."tenantId", s."symbol", s."chain"
ORDER BY signal_count DESC;

-- =============================================================================
-- ALERT PERFORMANCE ANALYTICS
-- =============================================================================

CREATE OR REPLACE VIEW alert_performance_summary AS
SELECT
    ap."alertId",
    ap."tenantId",
    ap."userId",
    ap."outcome",
    COUNT(*) as performance_count,
    AVG(ap."signalAccuracy") as avg_accuracy,
    AVG(ap."signalLatency") as avg_latency,
    SUM(ap."profitLoss") as total_profit_loss,
    AVG(ap."duration") as avg_duration
FROM "alert_performance" ap
WHERE ap."tenantId" = current_setting('app.current_tenant', true)
GROUP BY ap."alertId", ap."tenantId", ap."userId", ap."outcome"
ORDER BY performance_count DESC;

-- =============================================================================
-- USER FEEDBACK ANALYTICS
-- =============================================================================

CREATE OR REPLACE VIEW user_feedback_summary AS
SELECT
    uf."alertId",
    uf."tenantId",
    uf."userId",
    uf."category",
    COUNT(*) as feedback_count,
    AVG(uf."satisfactionScore") as avg_satisfaction,
    AVG(uf."modelConfidence") as avg_confidence,
    MAX(uf."feedbackTime") as latest_feedback
FROM "user_feedback" uf
WHERE uf."tenantId" = current_setting('app.current_tenant', true)
GROUP BY uf."alertId", uf."tenantId", uf."userId", uf."category"
ORDER BY feedback_count DESC;

-- =============================================================================
-- SIGNAL QUALITY ASSESSMENT
-- =============================================================================

CREATE OR REPLACE FUNCTION assess_signal_quality()
RETURNS TABLE(
    signal_id TEXT,
    quality_score REAL,
    issues TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        s."id",
        CASE
            WHEN s."confidence" IS NULL THEN 0.3
            WHEN s."confidence" < 0.5 THEN 0.5
            WHEN s."confidence" >= 0.8 THEN 0.9
            ELSE 0.7
        END as quality_score,
        ARRAY(
            SELECT issue
            FROM unnest(ARRAY[
                CASE WHEN s."confidence" IS NULL THEN 'no_confidence_score' END,
                CASE WHEN s."confidence" < 0.3 THEN 'low_confidence' END,
                CASE WHEN s."processedData" IS NULL THEN 'not_processed' END,
                CASE WHEN s."errorMessage" IS NOT NULL THEN 'has_errors' END
            ]) as issue
            WHERE issue IS NOT NULL
        ) as issues
    FROM "signals" s
    WHERE s."tenantId" = current_setting('app.current_tenant', true)
      AND s."isValid" = true
      AND s."ingestedAt" > CURRENT_TIMESTAMP - INTERVAL '24 hours'
    ORDER BY quality_score DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- SIGNAL SOURCE RECOMMENDATIONS
-- =============================================================================

CREATE OR REPLACE FUNCTION get_signal_source_recommendations()
RETURNS TABLE(
    recommendation TEXT,
    reason TEXT,
    priority TEXT
) AS $$
BEGIN
    RETURN QUERY VALUES
    ('Monitor signal quality', 'Regularly assess signal confidence and quality scores', 'HIGH'),
    ('Optimize data ingestion', 'Review ingestion pipelines for performance bottlenecks', 'MEDIUM'),
    ('Update source metadata', 'Keep source information current for accurate attribution', 'MEDIUM'),
    ('Review correlation patterns', 'Analyze signal correlations for new trading opportunities', 'LOW'),
    ('Archive old signals', 'Implement retention policies for historical signal data', 'LOW');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
