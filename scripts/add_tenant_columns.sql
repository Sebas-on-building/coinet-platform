-- =============================================================================
-- ADD TENANT ID COLUMNS TO EXISTING TABLES
-- =============================================================================
-- This script adds tenantId columns to existing tables that need them for RLS

-- Add tenantId column to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "tenantId" VARCHAR(36) DEFAULT 'default-tenant-id';

-- Add tenantId column to sessions table
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "tenantId" VARCHAR(36) DEFAULT 'default-tenant-id';

-- Add tenantId column to refresh_tokens table
ALTER TABLE "refresh_tokens" ADD COLUMN IF NOT EXISTS "tenantId" VARCHAR(36) DEFAULT 'default-tenant-id';

-- Add tenantId column to password_reset_tokens table
ALTER TABLE "password_reset_tokens" ADD COLUMN IF NOT EXISTS "tenantId" VARCHAR(36) DEFAULT 'default-tenant-id';

-- Add tenantId column to api_keys table
ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "tenantId" VARCHAR(36) DEFAULT 'default-tenant-id';

-- Add tenantId column to oauth_accounts table
ALTER TABLE "oauth_accounts" ADD COLUMN IF NOT EXISTS "tenantId" VARCHAR(36) DEFAULT 'default-tenant-id';

-- Add tenantId column to trusted_devices table
ALTER TABLE "trusted_devices" ADD COLUMN IF NOT EXISTS "tenantId" VARCHAR(36) DEFAULT 'default-tenant-id';

-- Add tenantId column to backup_codes table
ALTER TABLE "backup_codes" ADD COLUMN IF NOT EXISTS "tenantId" VARCHAR(36) DEFAULT 'default-tenant-id';

-- Add tenantId column to user_roles table
ALTER TABLE "user_roles" ADD COLUMN IF NOT EXISTS "tenantId" VARCHAR(36) DEFAULT 'default-tenant-id';

-- Add tenantId column to portfolios table
ALTER TABLE "portfolios" ADD COLUMN IF NOT EXISTS "tenantId" VARCHAR(36) DEFAULT 'default-tenant-id';

-- Add tenantId column to portfolio_holdings table
ALTER TABLE "portfolio_holdings" ADD COLUMN IF NOT EXISTS "tenantId" VARCHAR(36) DEFAULT 'default-tenant-id';

-- Add tenantId column to transactions table
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "tenantId" VARCHAR(36) DEFAULT 'default-tenant-id';

-- Add tenantId column to alerts table
ALTER TABLE "alerts" ADD COLUMN IF NOT EXISTS "tenantId" VARCHAR(36) DEFAULT 'default-tenant-id';

-- Add tenantId column to strategies table
ALTER TABLE "strategies" ADD COLUMN IF NOT EXISTS "tenantId" VARCHAR(36) DEFAULT 'default-tenant-id';

-- Add tenantId column to notification_preferences table
ALTER TABLE "notification_preferences" ADD COLUMN IF NOT EXISTS "tenantId" VARCHAR(36) DEFAULT 'default-tenant-id';

-- Add tenantId column to notification_events table
ALTER TABLE "notification_events" ADD COLUMN IF NOT EXISTS "tenantId" VARCHAR(36) DEFAULT 'default-tenant-id';

-- Add tenantId column to analytics_events table
ALTER TABLE "analytics_events" ADD COLUMN IF NOT EXISTS "tenantId" VARCHAR(36) DEFAULT 'default-tenant-id';

-- Add tenantId column to audit_logs table
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "tenantId" VARCHAR(36) DEFAULT 'default-tenant-id';

-- Add tenantId column to onboarding_steps table
ALTER TABLE "onboarding_steps" ADD COLUMN IF NOT EXISTS "tenantId" VARCHAR(36) DEFAULT 'default-tenant-id';

-- Add tenantId column to onboarding_analytics table
ALTER TABLE "onboarding_analytics" ADD COLUMN IF NOT EXISTS "tenantId" VARCHAR(36) DEFAULT 'default-tenant-id';

-- Add tenantId column to badges table
ALTER TABLE "badges" ADD COLUMN IF NOT EXISTS "tenantId" VARCHAR(36) DEFAULT 'default-tenant-id';

-- Add tenantId column to ab_tests table
ALTER TABLE "ab_tests" ADD COLUMN IF NOT EXISTS "tenantId" VARCHAR(36) DEFAULT 'default-tenant-id';

-- Add tenantId column to referrals table
ALTER TABLE "referrals" ADD COLUMN IF NOT EXISTS "tenantId" VARCHAR(36) DEFAULT 'default-tenant-id';

-- Update existing records to use default tenant
UPDATE "users" SET "tenantId" = 'default-tenant-id' WHERE "tenantId" IS NULL;
UPDATE "sessions" SET "tenantId" = 'default-tenant-id' WHERE "tenantId" IS NULL;
UPDATE "refresh_tokens" SET "tenantId" = 'default-tenant-id' WHERE "tenantId" IS NULL;
UPDATE "password_reset_tokens" SET "tenantId" = 'default-tenant-id' WHERE "tenantId" IS NULL;
UPDATE "api_keys" SET "tenantId" = 'default-tenant-id' WHERE "tenantId" IS NULL;
UPDATE "oauth_accounts" SET "tenantId" = 'default-tenant-id' WHERE "tenantId" IS NULL;
UPDATE "trusted_devices" SET "tenantId" = 'default-tenant-id' WHERE "tenantId" IS NULL;
UPDATE "backup_codes" SET "tenantId" = 'default-tenant-id' WHERE "tenantId" IS NULL;
UPDATE "user_roles" SET "tenantId" = 'default-tenant-id' WHERE "tenantId" IS NULL;
UPDATE "portfolios" SET "tenantId" = 'default-tenant-id' WHERE "tenantId" IS NULL;
UPDATE "portfolio_holdings" SET "tenantId" = 'default-tenant-id' WHERE "tenantId" IS NULL;
UPDATE "transactions" SET "tenantId" = 'default-tenant-id' WHERE "tenantId" IS NULL;
UPDATE "alerts" SET "tenantId" = 'default-tenant-id' WHERE "tenantId" IS NULL;
UPDATE "strategies" SET "tenantId" = 'default-tenant-id' WHERE "tenantId" IS NULL;
UPDATE "notification_preferences" SET "tenantId" = 'default-tenant-id' WHERE "tenantId" IS NULL;
UPDATE "notification_events" SET "tenantId" = 'default-tenant-id' WHERE "tenantId" IS NULL;
UPDATE "analytics_events" SET "tenantId" = 'default-tenant-id' WHERE "tenantId" IS NULL;
UPDATE "audit_logs" SET "tenantId" = 'default-tenant-id' WHERE "tenantId" IS NULL;
UPDATE "onboarding_steps" SET "tenantId" = 'default-tenant-id' WHERE "tenantId" IS NULL;
UPDATE "onboarding_analytics" SET "tenantId" = 'default-tenant-id' WHERE "tenantId" IS NULL;
UPDATE "badges" SET "tenantId" = 'default-tenant-id' WHERE "tenantId" IS NULL;
UPDATE "ab_tests" SET "tenantId" = 'default-tenant-id' WHERE "tenantId" IS NULL;
UPDATE "referrals" SET "tenantId" = 'default-tenant-id' WHERE "tenantId" IS NULL;

-- Make tenantId NOT NULL for critical tables
ALTER TABLE "users" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "sessions" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "refresh_tokens" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "password_reset_tokens" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "api_keys" ALTER COLUMN "tenantId" SET NOT NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS "users_tenantId_idx" ON "users"("tenantId");
CREATE INDEX IF NOT EXISTS "sessions_tenantId_idx" ON "sessions"("tenantId");
CREATE INDEX IF NOT EXISTS "refresh_tokens_tenantId_idx" ON "refresh_tokens"("tenantId");
CREATE INDEX IF NOT EXISTS "password_reset_tokens_tenantId_idx" ON "password_reset_tokens"("tenantId");
CREATE INDEX IF NOT EXISTS "api_keys_tenantId_idx" ON "api_keys"("tenantId");

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '🎉 TENANT COLUMNS ADDED SUCCESSFULLY!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Added tenantId columns to all tables';
    RAISE NOTICE '✅ Set default tenant for existing data';
    RAISE NOTICE '✅ Added performance indexes';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Next: Run RLS policies and triggers';
    RAISE NOTICE '========================================';
END $$;
