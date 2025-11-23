-- Add notification logs system migration
-- This migration adds comprehensive notification logging capabilities for high-throughput scenarios

-- Create custom enums for notification system
CREATE TYPE "NotificationChannel" AS ENUM (
  'PUSH',
  'EMAIL',
  'SMS',
  'WEBHOOK',
  'DISCORD',
  'TELEGRAM',
  'IN_APP'
);

CREATE TYPE "NotificationStatus" AS ENUM (
  'QUEUED',
  'SENDING',
  'SENT',
  'DELIVERED',
  'FAILED',
  'RETRY',
  'CANCELLED'
);

CREATE TYPE "NotificationPriority" AS ENUM (
  'LOW',
  'NORMAL',
  'HIGH',
  'URGENT'
);

-- Create notification_logs table
CREATE TABLE "notification_logs" (
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

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- Create notification_campaigns table
CREATE TABLE "notification_campaigns" (
    "id" VARCHAR(36) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "channels" "NotificationChannel"[],
    "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
    "userSegment" VARCHAR(100),
    "tenantId" VARCHAR(36) NOT NULL DEFAULT 'default',
    "scheduledAt" TIMESTAMP(6),
    "recurring" BOOLEAN NOT NULL DEFAULT false,
    "frequency" VARCHAR(50),
    "abTestEnabled" BOOLEAN NOT NULL DEFAULT false,
    "variants" JSONB,
    "totalSent" INTEGER NOT NULL DEFAULT 0,
    "totalDelivered" INTEGER NOT NULL DEFAULT 0,
    "totalFailed" INTEGER NOT NULL DEFAULT 0,
    "totalCost" DECIMAL(15,6) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "notification_campaigns_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "alerts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "notification_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create indexes for performance optimization
CREATE INDEX "notification_logs_userId_channel_queuedAt_idx" ON "notification_logs"("userId", "channel", "queuedAt");
CREATE INDEX "notification_logs_tenantId_channel_queuedAt_idx" ON "notification_logs"("tenantId", "channel", "queuedAt");
CREATE INDEX "notification_logs_status_queuedAt_idx" ON "notification_logs"("status", "queuedAt");
CREATE INDEX "notification_logs_provider_status_idx" ON "notification_logs"("provider", "status");
CREATE INDEX "notification_logs_campaignId_status_idx" ON "notification_logs"("campaignId", "status");
CREATE INDEX "notification_logs_deliveredAt_idx" ON "notification_logs"("deliveredAt");
CREATE INDEX "notification_logs_acknowledgedAt_idx" ON "notification_logs"("acknowledgedAt");

-- Create indexes for notification_campaigns
CREATE INDEX "notification_campaigns_tenantId_isActive_idx" ON "notification_campaigns"("tenantId", "isActive");
CREATE INDEX "notification_campaigns_scheduledAt_idx" ON "notification_campaigns"("scheduledAt");

-- Create partitioning setup (to be implemented at database level)
-- This is a template for monthly partitioning:
-- CREATE TABLE notification_logs_y2024m01 PARTITION OF notification_logs FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- Enable Row Level Security (RLS) for tenant isolation
ALTER TABLE "notification_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notification_campaigns" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tenant isolation
CREATE POLICY "notification_logs_tenant_isolation" ON "notification_logs"
    USING ("tenantId" = current_setting('app.current_tenant', true));

CREATE POLICY "notification_campaigns_tenant_isolation" ON "notification_campaigns"
    USING ("tenantId" = current_setting('app.current_tenant', true));

-- Create function to set tenant context
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id TEXT)
RETURNS void AS $$
BEGIN
    PERFORM set_config('app.current_tenant', tenant_id, true);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_notification_logs_updated_at
    BEFORE UPDATE ON "notification_logs"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_campaigns_updated_at
    BEFORE UPDATE ON "notification_campaigns"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE "notification_logs" IS 'High-throughput notification logging system for tracking all notification events';
COMMENT ON TABLE "notification_campaigns" IS 'Notification campaigns for A/B testing and bulk notifications';

COMMENT ON COLUMN "notification_logs"."tenantId" IS 'Multi-tenant isolation identifier';
COMMENT ON COLUMN "notification_logs"."messageContent" IS 'Encrypted message content for security';
COMMENT ON COLUMN "notification_logs"."messagePayload" IS 'Encrypted structured data payload';
COMMENT ON COLUMN "notification_logs"."retryCount" IS 'Number of retry attempts for failed notifications';
COMMENT ON COLUMN "notification_logs"."deliveryTimeMs" IS 'Performance metric: time taken for delivery in milliseconds';

-- Create view for analytics queries
CREATE VIEW "notification_analytics" AS
SELECT
    "channel",
    "status",
    "tenantId",
    DATE_TRUNC('hour', "queuedAt") as hour,
    COUNT(*) as count,
    AVG("deliveryTimeMs") as avg_delivery_time,
    SUM("cost") as total_cost
FROM "notification_logs"
GROUP BY "channel", "status", "tenantId", DATE_TRUNC('hour', "queuedAt");

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE ON "notification_logs" TO coinet_user;
GRANT SELECT, INSERT, UPDATE ON "notification_campaigns" TO coinet_user;
GRANT SELECT ON "notification_analytics" TO coinet_user;
