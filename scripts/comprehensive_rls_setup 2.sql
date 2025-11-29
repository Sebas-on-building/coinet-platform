-- =============================================================================
-- COMPREHENSIVE ROW-LEVEL SECURITY (RLS) IMPLEMENTATION
-- =============================================================================
-- This script implements enterprise-grade row-level security across all tables
-- for complete tenant isolation in the Coinet platform.
--
-- Requirements addressed:
-- - Enable RLS on all tables with tenant_id fields
-- - Create policies using app.current_tenant GUC variable
-- - Ensure application roles don't have BYPASSRLS privilege
-- - Enforce correct tenant IDs on insert operations
-- - Prevent data leakage between tenants

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

-- Create GUC variable for tenant context if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_settings WHERE name = 'app.current_tenant') THEN
        PERFORM set_config('app.current_tenant', 'default', false);
    END IF;
END $$;

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current tenant context
CREATE OR REPLACE FUNCTION get_current_tenant()
RETURNS TEXT AS $$
BEGIN
    RETURN COALESCE(
        NULLIF(current_setting('app.current_tenant', true), ''),
        'default'
    );
END;
$$ LANGUAGE plpgsql;

-- Function to detect tenant from request (for automatic tenant detection)
CREATE OR REPLACE FUNCTION detect_tenant_from_request()
RETURNS TRIGGER AS $$
DECLARE
    detected_tenant TEXT := 'default';
BEGIN
    -- Try to detect tenant from various sources:

    -- 1. From subdomain (e.g., tenant1.yourapp.com)
    IF current_setting('request.headers', true) LIKE '%host: %.yourapp.com%' THEN
        detected_tenant := SPLIT_PART(current_setting('request.headers', true), '.', 1);
    END IF;

    -- 2. From explicit tenant header
    IF current_setting('request.headers', true) LIKE '%x-tenant: %' THEN
        detected_tenant := SUBSTRING(current_setting('request.headers', true) FROM 'x-tenant: ([^[:space:]]+)');
    END IF;

    -- 3. From JWT token claims (if available)
    -- This would be implemented based on your authentication system

    -- Set the tenant context if valid
    IF detected_tenant != 'default' THEN
        PERFORM set_tenant_context(detected_tenant);
    END IF;

    RETURN NEW;
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
-- 4. ENABLE RLS ON ALL TABLES
-- =============================================================================

-- Core user management tables
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "refresh_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "password_reset_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "api_keys" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "oauth_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "trusted_devices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "backup_codes" ENABLE ROW LEVEL SECURITY;

-- RBAC tables
ALTER TABLE "user_roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "permissions" ENABLE ROW LEVEL SECURITY;

-- Plugin ecosystem tables
ALTER TABLE "plugins" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plugin_registry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reviews" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plugin_analytics" ENABLE ROW LEVEL SECURITY;

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

-- Signal & alert system tables
ALTER TABLE "signal_sources" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "signals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "alert_triggers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "signal_correlations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "alert_performance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_feedback" ENABLE ROW LEVEL SECURITY;

-- AI insights system tables
ALTER TABLE "ai_insights" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ai_recommendations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ai_recommendation_implementations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ai_dashboard_views" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ai_models" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ai_model_predictions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ai_insights_cache" ENABLE ROW LEVEL SECURITY;

-- Notification logs tables
ALTER TABLE "notification_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notification_campaigns" ENABLE ROW LEVEL SECURITY;

-- Encryption & security tables
ALTER TABLE "encrypted_user_data" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_encryption_keys" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "encryption_audit_log" ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 5. DROP EXISTING POLICIES (CLEAN SLATE)
-- =============================================================================

-- Drop all existing RLS policies to start fresh
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
DROP POLICY IF EXISTS "plugins_tenant_isolation" ON "plugins";
DROP POLICY IF EXISTS "plugin_registry_tenant_isolation" ON "plugin_registry";
DROP POLICY IF EXISTS "reviews_tenant_isolation" ON "reviews";
DROP POLICY IF EXISTS "plugin_analytics_tenant_isolation" ON "plugin_analytics";
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
DROP POLICY IF EXISTS "signal_sources_tenant_isolation" ON "signal_sources";
DROP POLICY IF EXISTS "signals_tenant_isolation" ON "signals";
DROP POLICY IF EXISTS "alert_triggers_tenant_isolation" ON "alert_triggers";
DROP POLICY IF EXISTS "signal_correlations_tenant_isolation" ON "signal_correlations";
DROP POLICY IF EXISTS "alert_performance_tenant_isolation" ON "alert_performance";
DROP POLICY IF EXISTS "user_feedback_tenant_isolation" ON "user_feedback";
DROP POLICY IF EXISTS "ai_insights_tenant_isolation" ON "ai_insights";
DROP POLICY IF EXISTS "ai_recommendations_tenant_isolation" ON "ai_recommendations";
DROP POLICY IF EXISTS "ai_recommendation_implementations_tenant_isolation" ON "ai_recommendation_implementations";
DROP POLICY IF EXISTS "ai_dashboard_views_tenant_isolation" ON "ai_dashboard_views";
DROP POLICY IF EXISTS "ai_models_tenant_isolation" ON "ai_models";
DROP POLICY IF EXISTS "ai_model_predictions_tenant_isolation" ON "ai_model_predictions";
DROP POLICY IF EXISTS "ai_insights_cache_tenant_isolation" ON "ai_insights_cache";
DROP POLICY IF EXISTS "notification_logs_tenant_isolation" ON "notification_logs";
DROP POLICY IF EXISTS "notification_campaigns_tenant_isolation" ON "notification_campaigns";
DROP POLICY IF EXISTS "encrypted_user_data_tenant_isolation" ON "encrypted_user_data";
DROP POLICY IF EXISTS "user_encryption_keys_tenant_isolation" ON "user_encryption_keys";
DROP POLICY IF EXISTS "encryption_audit_log_tenant_isolation" ON "encryption_audit_log";

-- =============================================================================
-- 6. CREATE COMPREHENSIVE RLS POLICIES FOR ALL TABLES
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

-- Roles table (system-wide, but filtered by tenant context)
CREATE POLICY "roles_tenant_isolation" ON "roles"
    USING (true); -- Roles are typically system-wide

-- Permissions table (system-wide)
CREATE POLICY "permissions_tenant_isolation" ON "permissions"
    USING (true); -- Permissions are typically system-wide

-- Plugins table
CREATE POLICY "plugins_tenant_isolation" ON "plugins"
    USING ("tenantId" = get_current_tenant());

-- Plugin registry table
CREATE POLICY "plugin_registry_tenant_isolation" ON "plugin_registry"
    USING (
        "pluginId" IN (
            SELECT p."id" FROM "plugins" p WHERE p."tenantId" = get_current_tenant()
        )
    );

-- Reviews table
CREATE POLICY "reviews_tenant_isolation" ON "reviews"
    USING (
        "pluginId" IN (
            SELECT p."id" FROM "plugins" p WHERE p."tenantId" = get_current_tenant()
        )
    );

-- Plugin analytics table
CREATE POLICY "plugin_analytics_tenant_isolation" ON "plugin_analytics"
    USING (
        "pluginId" IN (
            SELECT p."id" FROM "plugins" p WHERE p."tenantId" = get_current_tenant()
        )
    );

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
            WHEN "pluginId" IS NOT NULL THEN
                "pluginId" IN (
                    SELECT p."id" FROM "plugins" p WHERE p."tenantId" = get_current_tenant()
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

-- Signal sources table
CREATE POLICY "signal_sources_tenant_isolation" ON "signal_sources"
    USING ("tenantId" = get_current_tenant());

-- Signals table
CREATE POLICY "signals_tenant_isolation" ON "signals"
    USING ("tenantId" = get_current_tenant());

-- Alert triggers table
CREATE POLICY "alert_triggers_tenant_isolation" ON "alert_triggers"
    USING ("tenantId" = get_current_tenant());

-- Signal correlations table
CREATE POLICY "signal_correlations_tenant_isolation" ON "signal_correlations"
    USING ("tenantId" = get_current_tenant());

-- Alert performance table
CREATE POLICY "alert_performance_tenant_isolation" ON "alert_performance"
    USING ("tenantId" = get_current_tenant());

-- User feedback table
CREATE POLICY "user_feedback_tenant_isolation" ON "user_feedback"
    USING ("tenantId" = get_current_tenant());

-- AI insights table
CREATE POLICY "ai_insights_tenant_isolation" ON "ai_insights"
    USING ("tenantId" = get_current_tenant());

-- AI recommendations table
CREATE POLICY "ai_recommendations_tenant_isolation" ON "ai_recommendations"
    USING ("tenantId" = get_current_tenant());

-- AI recommendation implementations table
CREATE POLICY "ai_recommendation_implementations_tenant_isolation" ON "ai_recommendation_implementations"
    USING ("tenantId" = get_current_tenant());

-- AI dashboard views table
CREATE POLICY "ai_dashboard_views_tenant_isolation" ON "ai_dashboard_views"
    USING ("tenantId" = get_current_tenant());

-- AI models table
CREATE POLICY "ai_models_tenant_isolation" ON "ai_models"
    USING ("tenantId" = get_current_tenant());

-- AI model predictions table
CREATE POLICY "ai_model_predictions_tenant_isolation" ON "ai_model_predictions"
    USING ("tenantId" = get_current_tenant());

-- AI insights cache table
CREATE POLICY "ai_insights_cache_tenant_isolation" ON "ai_insights_cache"
    USING ("tenantId" = get_current_tenant());

-- Notification logs table
CREATE POLICY "notification_logs_tenant_isolation" ON "notification_logs"
    USING ("tenantId" = get_current_tenant());

-- Notification campaigns table
CREATE POLICY "notification_campaigns_tenant_isolation" ON "notification_campaigns"
    USING ("tenantId" = get_current_tenant());

-- Encrypted user data table
CREATE POLICY "encrypted_user_data_tenant_isolation" ON "encrypted_user_data"
    USING ("tenantId" = get_current_tenant());

-- User encryption keys table
CREATE POLICY "user_encryption_keys_tenant_isolation" ON "user_encryption_keys"
    USING ("tenantId" = get_current_tenant());

-- Encryption audit log table
CREATE POLICY "encryption_audit_log_tenant_isolation" ON "encryption_audit_log"
    USING ("tenantId" = get_current_tenant());

-- =============================================================================
-- 7. CREATE TENANT ASSIGNMENT TRIGGERS
-- =============================================================================

-- Apply tenant assignment triggers to all tables
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

CREATE TRIGGER trigger_assign_tenant_plugins
    BEFORE INSERT ON "plugins"
    FOR EACH ROW
    EXECUTE FUNCTION assign_tenant_on_insert();

CREATE TRIGGER trigger_assign_tenant_plugin_registry
    BEFORE INSERT ON "plugin_registry"
    FOR EACH ROW
    EXECUTE FUNCTION assign_tenant_on_insert();

CREATE TRIGGER trigger_assign_tenant_reviews
    BEFORE INSERT ON "reviews"
    FOR EACH ROW
    EXECUTE FUNCTION assign_tenant_on_insert();

CREATE TRIGGER trigger_assign_tenant_plugin_analytics
    BEFORE INSERT ON "plugin_analytics"
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

CREATE TRIGGER trigger_assign_tenant_signal_sources
    BEFORE INSERT ON "signal_sources"
    FOR EACH ROW
    EXECUTE FUNCTION assign_tenant_on_insert();

CREATE TRIGGER trigger_assign_tenant_signals
    BEFORE INSERT ON "signals"
    FOR EACH ROW
    EXECUTE FUNCTION assign_tenant_on_insert();

CREATE TRIGGER trigger_assign_tenant_alert_triggers
    BEFORE INSERT ON "alert_triggers"
    FOR EACH ROW
    EXECUTE FUNCTION assign_tenant_on_insert();

CREATE TRIGGER trigger_assign_tenant_signal_correlations
    BEFORE INSERT ON "signal_correlations"
    FOR EACH ROW
    EXECUTE FUNCTION assign_tenant_on_insert();

CREATE TRIGGER trigger_assign_tenant_alert_performance
    BEFORE INSERT ON "alert_performance"
    FOR EACH ROW
    EXECUTE FUNCTION assign_tenant_on_insert();

CREATE TRIGGER trigger_assign_tenant_user_feedback
    BEFORE INSERT ON "user_feedback"
    FOR EACH ROW
    EXECUTE FUNCTION assign_tenant_on_insert();

CREATE TRIGGER trigger_assign_tenant_ai_insights
    BEFORE INSERT ON "ai_insights"
    FOR EACH ROW
    EXECUTE FUNCTION assign_tenant_on_insert();

CREATE TRIGGER trigger_assign_tenant_ai_recommendations
    BEFORE INSERT ON "ai_recommendations"
    FOR EACH ROW
    EXECUTE FUNCTION assign_tenant_on_insert();

CREATE TRIGGER trigger_assign_tenant_ai_recommendation_implementations
    BEFORE INSERT ON "ai_recommendation_implementations"
    FOR EACH ROW
    EXECUTE FUNCTION assign_tenant_on_insert();

CREATE TRIGGER trigger_assign_tenant_ai_dashboard_views
    BEFORE INSERT ON "ai_dashboard_views"
    FOR EACH ROW
    EXECUTE FUNCTION assign_tenant_on_insert();

CREATE TRIGGER trigger_assign_tenant_ai_models
    BEFORE INSERT ON "ai_models"
    FOR EACH ROW
    EXECUTE FUNCTION assign_tenant_on_insert();

CREATE TRIGGER trigger_assign_tenant_ai_model_predictions
    BEFORE INSERT ON "ai_model_predictions"
    FOR EACH ROW
    EXECUTE FUNCTION assign_tenant_on_insert();

CREATE TRIGGER trigger_assign_tenant_ai_insights_cache
    BEFORE INSERT ON "ai_insights_cache"
    FOR EACH ROW
    EXECUTE FUNCTION assign_tenant_on_insert();

CREATE TRIGGER trigger_assign_tenant_notification_logs
    BEFORE INSERT ON "notification_logs"
    FOR EACH ROW
    EXECUTE FUNCTION assign_tenant_on_insert();

CREATE TRIGGER trigger_assign_tenant_notification_campaigns
    BEFORE INSERT ON "notification_campaigns"
    FOR EACH ROW
    EXECUTE FUNCTION assign_tenant_on_insert();

CREATE TRIGGER trigger_assign_tenant_encrypted_user_data
    BEFORE INSERT ON "encrypted_user_data"
    FOR EACH ROW
    EXECUTE FUNCTION assign_tenant_on_insert();

CREATE TRIGGER trigger_assign_tenant_user_encryption_keys
    BEFORE INSERT ON "user_encryption_keys"
    FOR EACH ROW
    EXECUTE FUNCTION assign_tenant_on_insert();

CREATE TRIGGER trigger_assign_tenant_encryption_audit_log
    BEFORE INSERT ON "encryption_audit_log"
    FOR EACH ROW
    EXECUTE FUNCTION assign_tenant_on_insert();

-- =============================================================================
-- 8. CONFIGURE APPLICATION ROLES WITHOUT BYPASSRLS PRIVILEGE
-- =============================================================================

-- Create application role if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'coinet') THEN
        CREATE ROLE coinet LOGIN;
    END IF;
END $$;

-- Ensure the application role does NOT have BYPASSRLS privilege
ALTER ROLE coinet NOBYPASSRLS;

-- Grant necessary permissions for RLS to work
GRANT USAGE ON SCHEMA public TO coinet;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO coinet;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO coinet;

-- =============================================================================
-- 9. TENANT MANAGEMENT FUNCTIONS
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
    ('plugins', (SELECT COUNT(*) FROM plugins), (SELECT COUNT(*) FROM plugins WHERE "tenantId" = current_tenant), (SELECT COUNT(*) FROM plugins WHERE "tenantId" != current_tenant)),
    ('portfolios', (SELECT COUNT(*) FROM portfolios), (SELECT COUNT(*) FROM portfolios p JOIN users u ON p."userId" = u."id" WHERE u."tenantId" = current_tenant), (SELECT COUNT(*) FROM portfolios p JOIN users u ON p."userId" = u."id" WHERE u."tenantId" != current_tenant)),
    ('alerts', (SELECT COUNT(*) FROM alerts), (SELECT COUNT(*) FROM alerts a JOIN users u ON a."userId" = u."id" WHERE u."tenantId" = current_tenant), (SELECT COUNT(*) FROM alerts a JOIN users u ON a."userId" = u."id" WHERE u."tenantId" != current_tenant)),
    ('notification_logs', (SELECT COUNT(*) FROM notification_logs), (SELECT COUNT(*) FROM notification_logs WHERE "tenantId" = current_tenant), (SELECT COUNT(*) FROM notification_logs WHERE "tenantId" != current_tenant));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 10. AUDIT LOGGING FOR TENANT ACCESS
-- =============================================================================

-- Tenant access log table (for tracking tenant operations)
CREATE TABLE IF NOT EXISTS "tenant_access_log" (
    "id" VARCHAR(36) NOT NULL,
    "tenantId" VARCHAR(36) NOT NULL,
    "userId" VARCHAR(36),
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" VARCHAR(36),
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "timestamp" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_access_log_pkey" PRIMARY KEY ("id")
);

-- Index for tenant access log
CREATE INDEX IF NOT EXISTS "tenant_access_log_tenant_timestamp_idx"
ON "tenant_access_log" ("tenantId", "timestamp");

CREATE INDEX IF NOT EXISTS "tenant_access_log_user_timestamp_idx"
ON "tenant_access_log" ("userId", "timestamp");

-- =============================================================================
-- 11. GRANT APPROPRIATE PERMISSIONS
-- =============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON "tenants" TO coinet;
GRANT SELECT, INSERT ON "tenant_access_log" TO coinet;
GRANT EXECUTE ON FUNCTION set_tenant_context(TEXT) TO coinet;
GRANT EXECUTE ON FUNCTION get_current_tenant() TO coinet;
GRANT EXECUTE ON FUNCTION create_tenant(TEXT, TEXT, TEXT) TO coinet;
GRANT EXECUTE ON FUNCTION get_tenant_info(TEXT) TO coinet;
GRANT EXECUTE ON FUNCTION verify_tenant_isolation() TO coinet;

-- =============================================================================
-- 12. CREATE HELPFUL COMMENTS AND DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE "tenants" IS 'Tenant management for multi-tenant platform isolation';
COMMENT ON TABLE "tenant_access_log" IS 'Audit log for tenant access and operations';
COMMENT ON FUNCTION set_tenant_context(TEXT) IS 'Sets the current tenant context for RLS policies';
COMMENT ON FUNCTION get_current_tenant() IS 'Gets the current tenant context';
COMMENT ON FUNCTION create_tenant(TEXT, TEXT, TEXT) IS 'Creates a new tenant with specified parameters';
COMMENT ON FUNCTION verify_tenant_isolation() IS 'Verifies that tenant isolation is working correctly';

-- =============================================================================
-- 13. USAGE EXAMPLES AND TESTING
-- =============================================================================

/*
-- Setting up a new tenant:
SELECT create_tenant('Acme Corp', 'acme', 'acme.yourapp.com');

-- Setting tenant context for a request:
SELECT set_tenant_context('acme');

-- Getting current tenant:
SELECT get_current_tenant();

-- Getting tenant information:
SELECT * FROM get_tenant_info('acme');

-- Verifying tenant isolation:
SELECT * FROM verify_tenant_isolation();

-- Creating a user (will automatically get tenant context):
-- INSERT INTO users (email, name, "passwordHash") VALUES ('user@acme.com', 'John Doe', 'hashed_password');

-- Testing isolation - this should only return users from current tenant:
-- SELECT * FROM users;

-- Switching to another tenant:
-- SELECT set_tenant_context('default');

-- This should now only return users from default tenant:
-- SELECT * FROM users;
*/

-- =============================================================================
-- 14. FINAL VERIFICATION AND TESTING
-- =============================================================================

-- Verify RLS is enabled on all tables
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
    'users', 'sessions', 'refresh_tokens', 'password_reset_tokens',
    'api_keys', 'oauth_accounts', 'trusted_devices', 'backup_codes',
    'user_roles', 'roles', 'permissions', 'plugins', 'plugin_registry',
    'reviews', 'plugin_analytics', 'portfolios', 'portfolio_holdings',
    'transactions', 'alerts', 'strategies', 'notification_preferences',
    'notification_events', 'analytics_events', 'audit_logs',
    'onboarding_steps', 'onboarding_analytics', 'badges', 'ab_tests',
    'referrals', 'signal_sources', 'signals', 'alert_triggers',
    'signal_correlations', 'alert_performance', 'user_feedback',
    'ai_insights', 'ai_recommendations', 'ai_recommendation_implementations',
    'ai_dashboard_views', 'ai_models', 'ai_model_predictions',
    'ai_insights_cache', 'notification_logs', 'notification_campaigns',
    'encrypted_user_data', 'user_encryption_keys', 'encryption_audit_log'
)
ORDER BY tablename;
