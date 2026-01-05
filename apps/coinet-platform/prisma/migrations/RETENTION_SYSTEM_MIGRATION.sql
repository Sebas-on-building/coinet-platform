-- =============================================================================
-- COINET RETENTION SYSTEM MIGRATION
-- =============================================================================
-- Migration for The Intelligence Ritual retention system
-- 
-- NOTE: This migration should be run after fixing Prisma/Node compatibility
-- Prisma 5.22.0 has compatibility issues with Node.js v22+
-- Either downgrade Node.js to v20 or upgrade Prisma to v6+
-- =============================================================================

-- User Sessions
CREATE TABLE IF NOT EXISTS "UserSession" (
    "id" VARCHAR(36) NOT NULL,
    "userId" VARCHAR(36) NOT NULL,
    "sessionStart" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionEnd" TIMESTAMP(6),
    "entryTrigger" VARCHAR(255),
    "deviceType" VARCHAR(100),
    "platform" VARCHAR(100),
    "queriesCount" INTEGER NOT NULL DEFAULT 0,
    "rewardsViewed" INTEGER NOT NULL DEFAULT 0,
    "actionsCompleted" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "UserSession_userId_idx" ON "UserSession"("userId");
CREATE INDEX IF NOT EXISTS "UserSession_sessionStart_idx" ON "UserSession"("sessionStart");

-- User Queries
CREATE TABLE IF NOT EXISTS "UserQuery" (
    "id" VARCHAR(36) NOT NULL,
    "userId" VARCHAR(36) NOT NULL,
    "sessionId" VARCHAR(36),
    "query" TEXT NOT NULL,
    "symbols" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "intent" VARCHAR(100),
    "responseTimeMs" INTEGER,
    "wasHelpful" BOOLEAN,
    "followUpSentAt" TIMESTAMP(6),
    "followUpType" VARCHAR(50),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserQuery_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "UserQuery_userId_idx" ON "UserQuery"("userId");
CREATE INDEX IF NOT EXISTS "UserQuery_sessionId_idx" ON "UserQuery"("sessionId");
CREATE INDEX IF NOT EXISTS "UserQuery_createdAt_idx" ON "UserQuery"("createdAt");

-- Notification Deliveries
CREATE TABLE IF NOT EXISTS "NotificationDelivery" (
    "id" VARCHAR(36) NOT NULL,
    "userId" VARCHAR(36) NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "channel" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "body" TEXT NOT NULL,
    "symbol" VARCHAR(20),
    "priority" VARCHAR(20) NOT NULL DEFAULT 'medium',
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "scheduledFor" TIMESTAMP(6),
    "sentAt" TIMESTAMP(6),
    "openedAt" TIMESTAMP(6),
    "clickedAt" TIMESTAMP(6),
    "abTestId" VARCHAR(36),
    "variant" VARCHAR(50),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "NotificationDelivery_userId_idx" ON "NotificationDelivery"("userId");
CREATE INDEX IF NOT EXISTS "NotificationDelivery_status_idx" ON "NotificationDelivery"("status");
CREATE INDEX IF NOT EXISTS "NotificationDelivery_createdAt_idx" ON "NotificationDelivery"("createdAt");

-- Retention Rewards
CREATE TABLE IF NOT EXISTS "RetentionReward" (
    "id" VARCHAR(36) NOT NULL,
    "userId" VARCHAR(36) NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "body" TEXT NOT NULL,
    "cta" VARCHAR(255) NOT NULL,
    "symbol" VARCHAR(20),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "signalStrength" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "dataQuality" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "surfaceType" VARCHAR(50) NOT NULL,
    "isViewed" BOOLEAN NOT NULL DEFAULT false,
    "viewedAt" TIMESTAMP(6),
    "isClicked" BOOLEAN NOT NULL DEFAULT false,
    "clickedAt" TIMESTAMP(6),
    "expiresAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RetentionReward_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "RetentionReward_userId_idx" ON "RetentionReward"("userId");
CREATE INDEX IF NOT EXISTS "RetentionReward_category_idx" ON "RetentionReward"("category");
CREATE INDEX IF NOT EXISTS "RetentionReward_isViewed_idx" ON "RetentionReward"("isViewed");

-- User Lifecycle State
CREATE TABLE IF NOT EXISTS "UserLifecycleState" (
    "id" VARCHAR(36) NOT NULL,
    "userId" VARCHAR(36) NOT NULL UNIQUE,
    "segment" VARCHAR(50) NOT NULL,
    "segmentEnteredAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "daysSinceSignup" INTEGER NOT NULL DEFAULT 0,
    "totalSessions" INTEGER NOT NULL DEFAULT 0,
    "sessionsLast7Days" INTEGER NOT NULL DEFAULT 0,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "watchlistSize" INTEGER NOT NULL DEFAULT 0,
    "alertsConfigured" INTEGER NOT NULL DEFAULT 0,
    "portfolioShared" BOOLEAN NOT NULL DEFAULT false,
    "riskToleranceSet" BOOLEAN NOT NULL DEFAULT false,
    "morningDigestEnabled" BOOLEAN NOT NULL DEFAULT false,
    "churnProbability" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "lastSessionDate" TIMESTAMP(6),
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserLifecycleState_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "UserLifecycleState_userId_idx" ON "UserLifecycleState"("userId");
CREATE INDEX IF NOT EXISTS "UserLifecycleState_segment_idx" ON "UserLifecycleState"("segment");

-- User Investment Actions
CREATE TABLE IF NOT EXISTS "UserInvestmentAction" (
    "id" VARCHAR(36) NOT NULL,
    "userId" VARCHAR(36) NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "promptShown" BOOLEAN NOT NULL DEFAULT false,
    "promptAccepted" BOOLEAN,
    "skippedUntil" TIMESTAMP(6),
    "completedAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserInvestmentAction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "UserInvestmentAction_userId_idx" ON "UserInvestmentAction"("userId");
CREATE INDEX IF NOT EXISTS "UserInvestmentAction_action_idx" ON "UserInvestmentAction"("action");

-- Retention Alerts
CREATE TABLE IF NOT EXISTS "RetentionAlert" (
    "id" VARCHAR(36) NOT NULL,
    "userId" VARCHAR(36) NOT NULL,
    "symbol" VARCHAR(20),
    "alertType" VARCHAR(50) NOT NULL,
    "priceAbove" DOUBLE PRECISION,
    "priceBelow" DOUBLE PRECISION,
    "omniscoreDelta" DOUBLE PRECISION,
    "minIntervalHours" INTEGER NOT NULL DEFAULT 24,
    "lastTriggeredAt" TIMESTAMP(6),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RetentionAlert_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "RetentionAlert_userId_idx" ON "RetentionAlert"("userId");
CREATE INDEX IF NOT EXISTS "RetentionAlert_isActive_idx" ON "RetentionAlert"("isActive");

-- Retention A/B Tests
CREATE TABLE IF NOT EXISTS "RetentionABTest" (
    "id" VARCHAR(36) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "hypothesis" TEXT NOT NULL,
    "variants" JSONB NOT NULL DEFAULT '[]',
    "trafficSplit" JSONB NOT NULL DEFAULT '{}',
    "targetSegments" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "minSampleSize" INTEGER NOT NULL DEFAULT 100,
    "primaryMetric" VARCHAR(100) NOT NULL,
    "secondaryMetrics" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "expectedRisk" TEXT NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'draft',
    "startedAt" TIMESTAMP(6),
    "endedAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RetentionABTest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "RetentionABTest_status_idx" ON "RetentionABTest"("status");

-- User A/B Test Assignments
CREATE TABLE IF NOT EXISTS "UserABTestAssignment" (
    "id" VARCHAR(36) NOT NULL,
    "userId" VARCHAR(36) NOT NULL,
    "testId" VARCHAR(36) NOT NULL,
    "variant" VARCHAR(50) NOT NULL,
    "assignedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "convertedAt" TIMESTAMP(6),
    "conversionValue" DOUBLE PRECISION,

    CONSTRAINT "UserABTestAssignment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "UserABTestAssignment_userId_testId_key" UNIQUE ("userId", "testId")
);

CREATE INDEX IF NOT EXISTS "UserABTestAssignment_userId_idx" ON "UserABTestAssignment"("userId");
CREATE INDEX IF NOT EXISTS "UserABTestAssignment_testId_idx" ON "UserABTestAssignment"("testId");

-- Retention Metrics Daily
CREATE TABLE IF NOT EXISTS "RetentionMetricsDaily" (
    "id" VARCHAR(36) NOT NULL,
    "date" DATE NOT NULL,
    "tenantId" VARCHAR(36) NOT NULL DEFAULT 'default',
    "weeklyActiveUsers" INTEGER NOT NULL DEFAULT 0,
    "dailyActiveUsers" INTEGER NOT NULL DEFAULT 0,
    "dailyHabitFormationRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "medianTimeToFirstInsight" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "watchlistReturnRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "omniscoreEngagementDepth" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "alertResponseRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "notificationCtr" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "avgSessionsPerUser" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "churnRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RetentionMetricsDaily_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "RetentionMetricsDaily_tenantId_date_key" UNIQUE ("tenantId", "date")
);

CREATE INDEX IF NOT EXISTS "RetentionMetricsDaily_date_idx" ON "RetentionMetricsDaily"("date");

-- Retention Failure Events
CREATE TABLE IF NOT EXISTS "RetentionFailureEvent" (
    "id" VARCHAR(36) NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "severity" VARCHAR(20) NOT NULL DEFAULT 'warning',
    "userId" VARCHAR(36),
    "description" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(6),
    "resolution" TEXT,
    "detectedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RetentionFailureEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "RetentionFailureEvent_type_idx" ON "RetentionFailureEvent"("type");
CREATE INDEX IF NOT EXISTS "RetentionFailureEvent_isResolved_idx" ON "RetentionFailureEvent"("isResolved");

-- Market Regime State
CREATE TABLE IF NOT EXISTS "MarketRegimeState" (
    "id" VARCHAR(36) NOT NULL,
    "regime" VARCHAR(50) NOT NULL,
    "previousRegime" VARCHAR(50),
    "fearGreedIndex" INTEGER NOT NULL,
    "fearGreedLabel" VARCHAR(50) NOT NULL,
    "isStable" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "changedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketRegimeState_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MarketRegimeState_isActive_idx" ON "MarketRegimeState"("isActive");
CREATE INDEX IF NOT EXISTS "MarketRegimeState_changedAt_idx" ON "MarketRegimeState"("changedAt");

-- Coin State Snapshot
CREATE TABLE IF NOT EXISTS "CoinStateSnapshot" (
    "id" VARCHAR(36) NOT NULL,
    "symbol" VARCHAR(20) NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "change24h" DOUBLE PRECISION NOT NULL,
    "price24hChange" DOUBLE PRECISION,
    "omniscore" DOUBLE PRECISION,
    "pos" DOUBLE PRECISION,
    "qs" DOUBLE PRECISION,
    "os" DOUBLE PRECISION,
    "quadrant" VARCHAR(50),
    "queryCount24h" INTEGER DEFAULT 0,
    "snapshotTime" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoinStateSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CoinStateSnapshot_symbol_idx" ON "CoinStateSnapshot"("symbol");
CREATE INDEX IF NOT EXISTS "CoinStateSnapshot_snapshotTime_idx" ON "CoinStateSnapshot"("snapshotTime");
CREATE INDEX IF NOT EXISTS "CoinStateSnapshot_createdAt_idx" ON "CoinStateSnapshot"("createdAt");

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
-- After running this migration, execute:
-- 1. npx prisma generate (after fixing Node.js/Prisma compatibility)
-- 2. Verify tables were created: SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%Retention%' OR table_name LIKE '%UserSession%' OR table_name LIKE '%MarketRegime%';
-- =============================================================================
