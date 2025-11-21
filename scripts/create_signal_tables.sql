-- =============================================================================
-- SIGNAL AND ALERT SYSTEM TABLES - SIMPLIFIED VERSION
-- =============================================================================
-- This script creates the signal and alert enhancement tables without conflicts

-- =============================================================================
-- SIGNAL SOURCES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS "signal_sources" (
    "id" VARCHAR(36) NOT NULL,
    "tenantId" VARCHAR(36) NOT NULL DEFAULT 'default',
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "sourceType" VARCHAR(100) NOT NULL,
    "sourceUrl" VARCHAR(500),
    "network" VARCHAR(100),
    "dataTypes" TEXT[], -- Simplified for now
    "reliability" TEXT NOT NULL DEFAULT 'MEDIUM',
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
-- SIGNALS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS "signals" (
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
-- SIGNAL CORRELATIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS "signal_correlations" (
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
-- ALERT TRIGGERS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS "alert_triggers" (
    "id" VARCHAR(36) NOT NULL,
    "alertId" VARCHAR(36) NOT NULL,
    "tenantId" VARCHAR(36) NOT NULL DEFAULT 'default',
    "userId" VARCHAR(36) NOT NULL,
    "triggerConditions" JSONB NOT NULL,
    "evaluationLogic" VARCHAR(100) NOT NULL,
    "result" TEXT NOT NULL,
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
-- ALERT PERFORMANCE TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS "alert_performance" (
    "id" VARCHAR(36) NOT NULL,
    "alertId" VARCHAR(36) NOT NULL,
    "tenantId" VARCHAR(36) NOT NULL DEFAULT 'default',
    "userId" VARCHAR(36) NOT NULL,
    "alertTriggerId" VARCHAR(36),
    "outcome" TEXT NOT NULL,
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
-- USER FEEDBACK TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS "user_feedback" (
    "id" VARCHAR(36) NOT NULL,
    "alertId" VARCHAR(36) NOT NULL,
    "tenantId" VARCHAR(36) NOT NULL DEFAULT 'default',
    "userId" VARCHAR(36) NOT NULL,
    "satisfactionScore" SMALLINT NOT NULL,
    "category" TEXT NOT NULL,
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
-- GRANT PERMISSIONS
-- =============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON "signal_sources" TO coinet_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON "signals" TO coinet_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON "signal_correlations" TO coinet_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON "alert_triggers" TO coinet_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON "alert_performance" TO coinet_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON "user_feedback" TO coinet_user;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE "signal_sources" IS 'Signal source configuration and metadata';
COMMENT ON TABLE "signals" IS 'Raw signal data storage';
COMMENT ON TABLE "signal_correlations" IS 'Correlations between signals';
COMMENT ON TABLE "alert_triggers" IS 'Alert evaluation logging';
COMMENT ON TABLE "alert_performance" IS 'Alert outcome tracking';
COMMENT ON TABLE "user_feedback" IS 'User feedback collection';
