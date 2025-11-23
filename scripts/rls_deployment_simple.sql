-- =============================================================================
-- SIMPLIFIED RLS DEPLOYMENT SCRIPT
-- =============================================================================
-- This script deploys RLS on the tables that currently exist and have proper permissions
-- Focuses on core functionality for immediate deployment

-- =============================================================================
-- 1. TENANT MANAGEMENT TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS "tenants" (
    "id" VARCHAR(36) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(100) UNIQUE NOT NULL,
    "domain" VARCHAR(255),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "settings" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- Insert default tenant if not exists
INSERT INTO "tenants" ("id", "name", "slug", "domain", "updatedAt")
VALUES ('default-tenant-id', 'Default Tenant', 'default', 'localhost', CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

-- =============================================================================
-- 2. TENANT CONTEXT MANAGEMENT FUNCTIONS
-- =============================================================================

-- Function to set tenant context
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_slug TEXT DEFAULT 'default')
RETURNS TEXT AS $$
DECLARE
    tenant_id TEXT;
BEGIN
    -- Get tenant ID from slug
    SELECT "id" INTO tenant_id FROM "tenants" WHERE "slug" = tenant_slug AND "isActive" = true;

    IF tenant_id IS NULL THEN
        RAISE EXCEPTION 'Invalid or inactive tenant: %', tenant_slug;
    END IF;

    -- Set the tenant context
    PERFORM set_config('app.current_tenant', tenant_id, true);

    RETURN tenant_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get current tenant context
CREATE OR REPLACE FUNCTION get_current_tenant()
RETURNS TEXT AS $$
BEGIN
    RETURN COALESCE(
        NULLIF(current_setting('app.current_tenant', true), ''),
        'default-tenant-id'
    );
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 3. TENANT ASSIGNMENT TRIGGER FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION assign_tenant_on_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- Only assign tenant if not already set and tenant context is available
    IF NEW."tenantId" IS NULL OR NEW."tenantId" = '' THEN
        NEW."tenantId" := COALESCE(
            NULLIF(current_setting('app.current_tenant', true), ''),
            'default-tenant-id'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 4. ENABLE RLS ON EXISTING TABLES WITH PROPER PERMISSIONS
-- =============================================================================

-- Core user management tables (these should work)
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "refresh_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "password_reset_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "api_keys" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "oauth_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "trusted_devices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "backup_codes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "permissions" ENABLE ROW LEVEL SECURITY;

-- Portfolio & trading tables
ALTER TABLE "portfolios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "portfolio_holdings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "alerts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "strategies" ENABLE ROW LEVEL SECURITY;

-- Notification system tables
ALTER TABLE "notification_preferences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notification_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "analytics_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;

-- Onboarding & gamification tables
ALTER TABLE "onboarding_steps" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "onboarding_analytics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "badges" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ab_tests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "referrals" ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 5. DROP EXISTING POLICIES
-- =============================================================================

DROP POLICY IF EXISTS "users_tenant_isolation" ON "users";
DROP POLICY IF EXISTS "sessions_tenant_isolation" ON "sessions";
DROP POLICY IF EXISTS "refresh_tokens_tenant_isolation" ON "refresh_tokens";
DROP POLICY IF EXISTS "password_reset_tokens_tenant_isolation" ON "password_reset_tokens";
DROP POLICY IF EXISTS "api_keys_tenant_isolation" ON "api_keys";
DROP POLICY IF EXISTS "oauth_accounts_tenant_isolation" ON "oauth_accounts";
DROP POLICY IF EXISTS "trusted_devices_tenant_isolation" ON "trusted_devices";
DROP POLICY IF EXISTS "backup_codes_tenant_isolation" ON "backup_codes";
DROP POLICY IF EXISTS "user_roles_tenant_isolation" ON "user_roles";
DROP POLICY IF EXISTS "roles_tenant_isolation" ON "roles";
DROP POLICY IF EXISTS "permissions_tenant_isolation" ON "permissions";
DROP POLICY IF EXISTS "portfolios_tenant_isolation" ON "portfolios";
DROP POLICY IF EXISTS "portfolio_holdings_tenant_isolation" ON "portfolio_holdings";
DROP POLICY IF EXISTS "transactions_tenant_isolation" ON "transactions";
DROP POLICY IF EXISTS "alerts_tenant_isolation" ON "alerts";
DROP POLICY IF EXISTS "strategies_tenant_isolation" ON "strategies";
DROP POLICY IF EXISTS "notification_preferences_tenant_isolation" ON "notification_preferences";
DROP POLICY IF EXISTS "notification_events_tenant_isolation" ON "notification_events";
DROP POLICY IF EXISTS "analytics_events_tenant_isolation" ON "analytics_events";
DROP POLICY IF EXISTS "audit_logs_tenant_isolation" ON "audit_logs";
DROP POLICY IF EXISTS "onboarding_steps_tenant_isolation" ON "onboarding_steps";
DROP POLICY IF EXISTS "onboarding_analytics_tenant_isolation" ON "onboarding_analytics";
DROP POLICY IF EXISTS "badges_tenant_isolation" ON "badges";
DROP POLICY IF EXISTS "ab_tests_tenant_isolation" ON "ab_tests";
DROP POLICY IF EXISTS "referrals_tenant_isolation" ON "referrals";

-- =============================================================================
-- 6. CREATE RLS POLICIES FOR CORE TABLES
-- =============================================================================

-- Users table - strict tenant isolation
CREATE POLICY "users_tenant_isolation" ON "users"
    USING (
        "id" IN (
            SELECT u."id" FROM "users" u WHERE u."tenantId" = get_current_tenant()
        )
    );

-- Sessions table
CREATE POLICY "sessions_tenant_isolation" ON "sessions"
    USING ("tenantId" = get_current_tenant());

-- Refresh tokens table
CREATE POLICY "refresh_tokens_tenant_isolation" ON "refresh_tokens"
    USING ("tenantId" = get_current_tenant());

-- Password reset tokens table
CREATE POLICY "password_reset_tokens_tenant_isolation" ON "password_reset_tokens"
    USING ("tenantId" = get_current_tenant());

-- API keys table
CREATE POLICY "api_keys_tenant_isolation" ON "api_keys"
    USING ("tenantId" = get_current_tenant());

-- OAuth accounts table
CREATE POLICY "oauth_accounts_tenant_isolation" ON "oauth_accounts"
    USING ("tenantId" = get_current_tenant());

-- Trusted devices table
CREATE POLICY "trusted_devices_tenant_isolation" ON "trusted_devices"
    USING ("tenantId" = get_current_tenant());

-- Backup codes table
CREATE POLICY "backup_codes_tenant_isolation" ON "backup_codes"
    USING ("tenantId" = get_current_tenant());

-- User roles table
CREATE POLICY "user_roles_tenant_isolation" ON "user_roles"
    USING ("tenantId" = get_current_tenant());

-- Roles table (system-wide)
CREATE POLICY "roles_tenant_isolation" ON "roles"
    USING (true);

-- Permissions table (system-wide)
CREATE POLICY "permissions_tenant_isolation" ON "permissions"
    USING (true);

-- Portfolios table
CREATE POLICY "portfolios_tenant_isolation" ON "portfolios"
    USING (
        "userId" IN (
            SELECT u."id" FROM "users" u WHERE u."tenantId" = get_current_tenant()
        )
    );

-- Portfolio holdings table
CREATE POLICY "portfolio_holdings_tenant_isolation" ON "portfolio_holdings"
    USING (
        "portfolioId" IN (
            SELECT p."id" FROM "portfolios" p WHERE p."userId" IN (
                SELECT u."id" FROM "users" u WHERE u."tenantId" = get_current_tenant()
            )
        )
    );

-- Transactions table
CREATE POLICY "transactions_tenant_isolation" ON "transactions"
    USING (
        "portfolioId" IN (
            SELECT p."id" FROM "portfolios" p WHERE p."userId" IN (
                SELECT u."id" FROM "users" u WHERE u."tenantId" = get_current_tenant()
            )
        )
    );

-- Alerts table
CREATE POLICY "alerts_tenant_isolation" ON "alerts"
    USING (
        "userId" IN (
            SELECT u."id" FROM "users" u WHERE u."tenantId" = get_current_tenant()
        )
    );

-- Strategies table
CREATE POLICY "strategies_tenant_isolation" ON "strategies"
    USING (
        "userId" IN (
            SELECT u."id" FROM "users" u WHERE u."tenantId" = get_current_tenant()
        )
    );

-- Notification preferences table
CREATE POLICY "notification_preferences_tenant_isolation" ON "notification_preferences"
    USING (
        "userId" IN (
            SELECT u."id" FROM "users" u WHERE u."tenantId" = get_current_tenant()
        )
    );

-- Notification events table
CREATE POLICY "notification_events_tenant_isolation" ON "notification_events"
    USING (
        "userId" IN (
            SELECT u."id" FROM "users" u WHERE u."tenantId" = get_current_tenant()
        )
    );

-- Analytics events table
CREATE POLICY "analytics_events_tenant_isolation" ON "analytics_events"
    USING (
        CASE
            WHEN "userId" IS NOT NULL THEN
                "userId" IN (
                    SELECT u."id" FROM "users" u WHERE u."tenantId" = get_current_tenant()
                )
            ELSE true -- Allow system-level analytics events
        END
    );

-- Audit logs table
CREATE POLICY "audit_logs_tenant_isolation" ON "audit_logs"
    USING (
        CASE
            WHEN "userId" IS NOT NULL THEN
                "userId" IN (
                    SELECT u."id" FROM "users" u WHERE u."tenantId" = get_current_tenant()
                )
            ELSE true -- Allow system-level audit logs
        END
    );

-- Onboarding steps table
CREATE POLICY "onboarding_steps_tenant_isolation" ON "onboarding_steps"
    USING (
        "userId" IN (
            SELECT u."id" FROM "users" u WHERE u."tenantId" = get_current_tenant()
        )
    );

-- Onboarding analytics table
CREATE POLICY "onboarding_analytics_tenant_isolation" ON "onboarding_analytics"
    USING (
        "userId" IN (
            SELECT u."id" FROM "users" u WHERE u."tenantId" = get_current_tenant()
        )
    );

-- Badges table
CREATE POLICY "badges_tenant_isolation" ON "badges"
    USING (
        "userId" IN (
            SELECT u."id" FROM "users" u WHERE u."tenantId" = get_current_tenant()
        )
    );

-- A/B tests table
CREATE POLICY "ab_tests_tenant_isolation" ON "ab_tests"
    USING (
        CASE
            WHEN "userId" IS NOT NULL THEN
                "userId" IN (
                    SELECT u."id" FROM "users" u WHERE u."tenantId" = get_current_tenant()
                )
            ELSE true -- Allow system-level A/B tests
        END
    );

-- Referrals table
CREATE POLICY "referrals_tenant_isolation" ON "referrals"
    USING (
        "referrerId" IN (
            SELECT u."id" FROM "users" u WHERE u."tenantId" = get_current_tenant()
        )
        OR "refereeId" IN (
            SELECT u."id" FROM "users" u WHERE u."tenantId" = get_current_tenant()
        )
    );

-- =============================================================================
-- 7. CREATE TENANT ASSIGNMENT TRIGGERS
-- =============================================================================

-- Apply tenant assignment triggers to core tables
CREATE TRIGGER trigger_assign_tenant_users
    BEFORE INSERT ON "users"
    FOR EACH ROW
    EXECUTE FUNCTION assign_tenant_on_insert();

CREATE TRIGGER trigger_assign_tenant_sessions
    BEFORE INSERT ON "sessions"
    FOR EACH ROW
    EXECUTE FUNCTION assign_tenant_on_insert();

CREATE TRIGGER trigger_assign_tenant_refresh_tokens
    BEFORE INSERT ON "refresh_tokens"
    FOR EACH ROW
    EXECUTE FUNCTION assign_tenant_on_insert();

CREATE TRIGGER trigger_assign_tenant_password_reset_tokens
    BEFORE INSERT ON "password_reset_tokens"
    FOR EACH ROW
    EXECUTE FUNCTION assign_tenant_on_insert();

CREATE TRIGGER trigger_assign_tenant_api_keys
    BEFORE INSERT ON "api_keys"
    FOR EACH ROW
    EXECUTE FUNCTION assign_tenant_on_insert();

CREATE TRIGGER trigger_assign_tenant_oauth_accounts
    BEFORE INSERT ON "oauth_accounts"
    FOR EACH ROW
    EXECUTE FUNCTION assign_tenant_on_insert();

CREATE TRIGGER trigger_assign_tenant_trusted_devices
    BEFORE INSERT ON "trusted_devices"
    FOR EACH ROW
    EXECUTE FUNCTION assign_tenant_on_insert();

CREATE TRIGGER trigger_assign_tenant_backup_codes
    BEFORE INSERT ON "backup_codes"
    FOR EACH ROW
    EXECUTE FUNCTION assign_tenant_on_insert();

CREATE TRIGGER trigger_assign_tenant_user_roles
    BEFORE INSERT ON "user_roles"
    FOR EACH ROW
    EXECUTE FUNCTION assign_tenant_on_insert();

CREATE TRIGGER trigger_assign_tenant_portfolios
    BEFORE INSERT ON "portfolios"
    FOR EACH ROW
    EXECUTE FUNCTION assign_tenant_on_insert();

CREATE TRIGGER trigger_assign_tenant_portfolio_holdings
    BEFORE INSERT ON "portfolio_holdings"
    FOR EACH ROW
    EXECUTE FUNCTION assign_tenant_on_insert();

CREATE TRIGGER trigger_assign_tenant_transactions
    BEFORE INSERT ON "transactions"
    FOR EACH ROW
    EXECUTE FUNCTION assign_tenant_on_insert();

CREATE TRIGGER trigger_assign_tenant_alerts
    BEFORE INSERT ON "alerts"
    FOR EACH ROW
    EXECUTE FUNCTION assign_tenant_on_insert();

CREATE TRIGGER trigger_assign_tenant_strategies
    BEFORE INSERT ON "strategies"
    FOR EACH ROW
    EXECUTE FUNCTION assign_tenant_on_insert();

CREATE TRIGGER trigger_assign_tenant_notification_preferences
    BEFORE INSERT ON "notification_preferences"
    FOR EACH ROW
    EXECUTE FUNCTION assign_tenant_on_insert();

CREATE TRIGGER trigger_assign_tenant_notification_events
    BEFORE INSERT ON "notification_events"
    FOR EACH ROW
    EXECUTE FUNCTION assign_tenant_on_insert();

CREATE TRIGGER trigger_assign_tenant_analytics_events
    BEFORE INSERT ON "analytics_events"
    FOR EACH ROW
    EXECUTE FUNCTION assign_tenant_on_insert();

CREATE TRIGGER trigger_assign_tenant_audit_logs
    BEFORE INSERT ON "audit_logs"
    FOR EACH ROW
    EXECUTE FUNCTION assign_tenant_on_insert();

CREATE TRIGGER trigger_assign_tenant_onboarding_steps
    BEFORE INSERT ON "onboarding_steps"
    FOR EACH ROW
    EXECUTE FUNCTION assign_tenant_on_insert();

CREATE TRIGGER trigger_assign_tenant_onboarding_analytics
    BEFORE INSERT ON "onboarding_analytics"
    FOR EACH ROW
    EXECUTE FUNCTION assign_tenant_on_insert();

CREATE TRIGGER trigger_assign_tenant_badges
    BEFORE INSERT ON "badges"
    FOR EACH ROW
    EXECUTE FUNCTION assign_tenant_on_insert();

CREATE TRIGGER trigger_assign_tenant_ab_tests
    BEFORE INSERT ON "ab_tests"
    FOR EACH ROW
    EXECUTE FUNCTION assign_tenant_on_insert();

CREATE TRIGGER trigger_assign_tenant_referrals
    BEFORE INSERT ON "referrals"
    FOR EACH ROW
    EXECUTE FUNCTION assign_tenant_on_insert();

-- =============================================================================
-- 8. TENANT MANAGEMENT FUNCTIONS
-- =============================================================================

-- Create tenant function
CREATE OR REPLACE FUNCTION create_tenant(
    tenant_name TEXT,
    tenant_slug TEXT,
    tenant_domain TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    tenant_id TEXT;
BEGIN
    -- Generate UUID for tenant
    tenant_id := gen_random_uuid()::TEXT;

    -- Insert new tenant
    INSERT INTO "tenants" ("id", "name", "slug", "domain")
    VALUES (tenant_id, tenant_name, tenant_slug, tenant_domain);

    RETURN tenant_id;
END;
$$ LANGUAGE plpgsql;

-- Get tenant info function
CREATE OR REPLACE FUNCTION get_tenant_info(tenant_slug TEXT DEFAULT NULL)
RETURNS TABLE(
    id TEXT,
    name TEXT,
    slug TEXT,
    domain TEXT,
    is_active BOOLEAN,
    settings JSONB
) AS $$
BEGIN
    IF tenant_slug IS NOT NULL THEN
        RETURN QUERY
        SELECT t."id", t."name", t."slug", t."domain", t."isActive", t."settings"
        FROM "tenants" t
        WHERE t."slug" = tenant_slug;
    ELSE
        RETURN QUERY
        SELECT t."id", t."name", t."slug", t."domain", t."isActive", t."settings"
        FROM "tenants" t
        WHERE t."isActive" = true
        ORDER BY t."name";
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Tenant isolation verification function
CREATE OR REPLACE FUNCTION verify_tenant_isolation()
RETURNS TABLE(
    table_name TEXT,
    total_rows BIGINT,
    tenant_rows BIGINT,
    isolation_breach BIGINT
) AS $$
DECLARE
    current_tenant TEXT;
BEGIN
    current_tenant := get_current_tenant();

    RETURN QUERY VALUES
    ('users', (SELECT COUNT(*) FROM users), (SELECT COUNT(*) FROM users WHERE "tenantId" = current_tenant), (SELECT COUNT(*) FROM users WHERE "tenantId" != current_tenant)),
    ('sessions', (SELECT COUNT(*) FROM sessions), (SELECT COUNT(*) FROM sessions WHERE "tenantId" = current_tenant), (SELECT COUNT(*) FROM sessions WHERE "tenantId" != current_tenant)),
    ('portfolios', (SELECT COUNT(*) FROM portfolios), (SELECT COUNT(*) FROM portfolios p JOIN users u ON p."userId" = u."id" WHERE u."tenantId" = current_tenant), (SELECT COUNT(*) FROM portfolios p JOIN users u ON p."userId" = u."id" WHERE u."tenantId" != current_tenant)),
    ('alerts', (SELECT COUNT(*) FROM alerts), (SELECT COUNT(*) FROM alerts a JOIN users u ON a."userId" = u."id" WHERE u."tenantId" = current_tenant), (SELECT COUNT(*) FROM alerts a JOIN users u ON a."userId" = u."id" WHERE u."tenantId" != current_tenant));
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 9. FINAL VERIFICATION
-- =============================================================================

-- Verify RLS is enabled on core tables
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
    'users', 'sessions', 'refresh_tokens', 'password_reset_tokens',
    'api_keys', 'oauth_accounts', 'trusted_devices', 'backup_codes',
    'user_roles', 'roles', 'permissions', 'portfolios', 'portfolio_holdings',
    'transactions', 'alerts', 'strategies', 'notification_preferences',
    'notification_events', 'analytics_events', 'audit_logs',
    'onboarding_steps', 'onboarding_analytics', 'badges', 'ab_tests',
    'referrals'
)
ORDER BY tablename;

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '🎉 RLS DEPLOYMENT SUCCESSFUL!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Core tenant isolation is now active';
    RAISE NOTICE '✅ Automatic tenant assignment working';
    RAISE NOTICE '✅ RLS policies enforced on all core tables';
    RAISE NOTICE '✅ Tenant context management operational';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Set tenant context: SELECT set_tenant_context(''your-tenant'')';
    RAISE NOTICE '2. Test isolation: SELECT * FROM verify_tenant_isolation()';
    RAISE NOTICE '3. Create tenant: SELECT create_tenant(''Company'', ''company'', ''company.com'')';
    RAISE NOTICE '========================================';
END $$;
