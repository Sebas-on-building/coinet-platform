-- Simple partitioning setup for notification_logs
-- This script sets up basic monthly partitioning for the notification_logs table

-- 1. Create the partitioned table structure
-- First, let's rename the existing table to create partitions from it
ALTER TABLE notification_logs RENAME TO notification_logs_main;

-- Create the partitioned table
CREATE TABLE notification_logs (
    "id" VARCHAR(36) NOT NULL,
    "alertId" VARCHAR(36),
    "userId" VARCHAR(36) NOT NULL,
    "tenantId" VARCHAR(36) NOT NULL DEFAULT 'default',
    "channel" "NotificationChannel" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'QUEUED',
    "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
    "queuedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(6),
    "deliveredAt" TIMESTAMP(6),
    "acknowledgedAt" TIMESTAMP(6),
    "processedAt" TIMESTAMP(6),
    "retryCount" SMALLINT NOT NULL DEFAULT 0,
    "maxRetries" SMALLINT NOT NULL DEFAULT 3,
    "errorCodes" TEXT[],
    "errorMessage" TEXT,
    "provider" VARCHAR(100),
    "providerId" VARCHAR(255),
    "providerResponse" JSONB,
    "messageTitle" TEXT,
    "messageContent" TEXT,
    "messagePayload" JSONB,
    "deliveryTimeMs" INTEGER,
    "cost" DECIMAL(10,6),
    "campaignId" VARCHAR(36),
    "userAgent" TEXT,
    "ipAddress" VARCHAR(45),
    "deviceId" VARCHAR(255),
    "sessionId" VARCHAR(255),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "metadata" JSONB,

    CONSTRAINT notification_logs_pkey PRIMARY KEY ("id")
) PARTITION BY RANGE ("queuedAt");

-- Copy data from the main table to the partitioned table
INSERT INTO notification_logs SELECT * FROM notification_logs_main;

-- Drop the old table
DROP TABLE notification_logs_main;

-- 2. Create monthly partitions for the next 12 months
CREATE TABLE notification_logs_y2025m09 PARTITION OF notification_logs FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');
CREATE TABLE notification_logs_y2025m10 PARTITION OF notification_logs FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');
CREATE TABLE notification_logs_y2025m11 PARTITION OF notification_logs FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
CREATE TABLE notification_logs_y2025m12 PARTITION OF notification_logs FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');
CREATE TABLE notification_logs_y2026m01 PARTITION OF notification_logs FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE notification_logs_y2026m02 PARTITION OF notification_logs FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE notification_logs_y2026m03 PARTITION OF notification_logs FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE notification_logs_y2026m04 PARTITION OF notification_logs FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE notification_logs_y2026m05 PARTITION OF notification_logs FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE notification_logs_y2026m06 PARTITION OF notification_logs FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE notification_logs_y2026m07 PARTITION OF notification_logs FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE notification_logs_y2026m08 PARTITION OF notification_logs FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');

-- 3. Create indexes on the master table (inherited by partitions)
CREATE INDEX notification_logs_userId_channel_queuedAt_idx ON notification_logs("userId", "channel", "queuedAt");
CREATE INDEX notification_logs_tenantId_channel_queuedAt_idx ON notification_logs("tenantId", "channel", "queuedAt");
CREATE INDEX notification_logs_status_queuedAt_idx ON notification_logs("status", "queuedAt");
CREATE INDEX notification_logs_provider_status_idx ON notification_logs("provider", "status");
CREATE INDEX notification_logs_campaignId_status_idx ON notification_logs("campaignId", "status");
CREATE INDEX notification_logs_deliveredAt_idx ON notification_logs("deliveredAt");
CREATE INDEX notification_logs_acknowledgedAt_idx ON notification_logs("acknowledgedAt");

-- 4. Enable Row Level Security
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies
CREATE POLICY "notification_logs_tenant_isolation" ON notification_logs
    USING ("tenantId" = current_setting('app.current_tenant', true));

-- 6. Create tenant context function
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id TEXT)
RETURNS void AS $$
BEGIN
    PERFORM set_config('app.current_tenant', tenant_id, true);
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger to automatically update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_notification_logs_updated_at
    BEFORE UPDATE ON notification_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. Add comments
COMMENT ON TABLE notification_logs IS 'High-throughput notification logging system with monthly partitioning';
