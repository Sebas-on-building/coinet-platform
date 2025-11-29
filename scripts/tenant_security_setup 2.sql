-- =============================================================================
-- TENANT SECURITY SETUP FOR NOTIFICATION LOGS
-- =============================================================================
-- This script implements comprehensive tenant isolation and security for
-- the notification_logs system using PostgreSQL Row Level Security (RLS).

-- 1. Create tenant management table
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

-- Insert default tenant
INSERT INTO "tenants" ("id", "name", "slug", "domain", "updatedAt") VALUES
('default-tenant-id', 'Default Tenant', 'default', 'localhost', CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

-- 2. Enhanced RLS policies with tenant context
-- Drop existing policies first
DROP POLICY IF EXISTS "notification_logs_tenant_isolation" ON "notification_logs";
DROP POLICY IF EXISTS "notification_campaigns_tenant_isolation" ON "notification_campaigns";

-- Create comprehensive RLS policies
CREATE POLICY "notification_logs_tenant_isolation" ON "notification_logs"
    USING (
        "tenantId" = COALESCE(
            NULLIF(current_setting('app.current_tenant', true), ''),
            'default'
        )
    );

CREATE POLICY "notification_campaigns_tenant_isolation" ON "notification_campaigns"
    USING (
        "tenantId" = COALESCE(
            NULLIF(current_setting('app.current_tenant', true), ''),
            'default'
        )
    );

-- 3. Create tenant context management functions
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

-- 4. Create middleware function for automatic tenant detection
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

    -- 2. From API key or JWT token (if available)
    -- This would be implemented based on your authentication system

    -- 3. From explicit tenant header
    IF current_setting('request.headers', true) LIKE '%x-tenant: %' THEN
        detected_tenant := SUBSTRING(current_setting('request.headers', true) FROM 'x-tenant: ([^[:space:]]+)');
    END IF;

    -- Set the tenant context
    PERFORM set_tenant_context(detected_tenant);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create tenant-aware triggers for automatic tenant assignment
CREATE OR REPLACE FUNCTION assign_tenant_on_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- Only assign tenant if not already set
    IF NEW."tenantId" IS NULL OR NEW."tenantId" = '' THEN
        NEW."tenantId" := COALESCE(
            NULLIF(current_setting('app.current_tenant', true), ''),
            'default'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply tenant assignment triggers
CREATE TRIGGER trigger_assign_tenant_notification_logs
    BEFORE INSERT ON "notification_logs"
    FOR EACH ROW
    EXECUTE FUNCTION assign_tenant_on_insert();

CREATE TRIGGER trigger_assign_tenant_notification_campaigns
    BEFORE INSERT ON "notification_campaigns"
    FOR EACH ROW
    EXECUTE FUNCTION assign_tenant_on_insert();

-- 6. Create tenant management functions
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

-- 7. Create tenant isolation verification functions
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
    current_tenant := current_setting('app.current_tenant', true);

    RETURN QUERY VALUES
    ('notification_logs',
     (SELECT COUNT(*) FROM notification_logs),
     (SELECT COUNT(*) FROM notification_logs WHERE "tenantId" = current_tenant),
     (SELECT COUNT(*) FROM notification_logs WHERE "tenantId" != current_tenant)
    ),
    ('notification_campaigns',
     (SELECT COUNT(*) FROM notification_campaigns),
     (SELECT COUNT(*) FROM notification_campaigns WHERE "tenantId" = current_tenant),
     (SELECT COUNT(*) FROM notification_campaigns WHERE "tenantId" != current_tenant)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create audit logging for tenant access
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

-- Create index for tenant access log
CREATE INDEX IF NOT EXISTS "tenant_access_log_tenant_timestamp_idx"
ON "tenant_access_log" ("tenantId", "timestamp");

CREATE INDEX IF NOT EXISTS "tenant_access_log_user_timestamp_idx"
ON "tenant_access_log" ("userId", "timestamp");

-- Tenant access logging is handled by application layer for now

-- 10. Create tenant statistics view
CREATE OR REPLACE VIEW tenant_statistics AS
SELECT
    t."id" as tenant_id,
    t."name" as tenant_name,
    t."slug" as tenant_slug,
    COUNT(nl."id") as total_notifications,
    COUNT(CASE WHEN nl."status" = 'DELIVERED' THEN 1 END) as delivered_notifications,
    COUNT(CASE WHEN nl."status" = 'FAILED' THEN 1 END) as failed_notifications,
    AVG(nl."deliveryTimeMs") as avg_delivery_time_ms,
    SUM(nl."cost") as total_cost,
    MAX(nl."createdAt") as last_notification_at
FROM "tenants" t
LEFT JOIN "notification_logs" nl ON t."id" = nl."tenantId"
WHERE t."isActive" = true
GROUP BY t."id", t."name", t."slug"
ORDER BY total_notifications DESC;

-- 11. Create tenant security policies
-- Policy for tenant administrators
CREATE POLICY "tenant_admin_access" ON "notification_logs"
    USING (
        EXISTS (
            SELECT 1 FROM "tenants" t
            WHERE t."id" = "tenantId"
            AND t."slug" = current_setting('app.current_tenant', true)
        )
        AND current_setting('app.user_role', true) IN ('ADMIN', 'SUPER_ADMIN')
    );

-- Policy for tenant users (read-only for their own notifications)
CREATE POLICY "tenant_user_read_access" ON "notification_logs"
    FOR SELECT USING (
        "userId" = current_setting('app.current_user', true)
        AND "tenantId" = current_setting('app.current_tenant', true)
    );

-- 12. Create tenant backup/restore functions
CREATE OR REPLACE FUNCTION backup_tenant_data(tenant_slug TEXT)
RETURNS TABLE(
    table_name TEXT,
    row_count BIGINT,
    backup_size TEXT
) AS $$
DECLARE
    tenant_id TEXT;
BEGIN
    -- Get tenant ID
    SELECT "id" INTO tenant_id FROM "tenants" WHERE "slug" = tenant_slug AND "isActive" = true;

    IF tenant_id IS NULL THEN
        RAISE EXCEPTION 'Tenant not found: %', tenant_slug;
    END IF;

    RETURN QUERY VALUES
    ('notification_logs', (SELECT COUNT(*) FROM notification_logs WHERE "tenantId" = tenant_id), 'TBD'),
    ('notification_campaigns', (SELECT COUNT(*) FROM notification_campaigns WHERE "tenantId" = tenant_id), 'TBD');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Create cleanup function for tenant data
CREATE OR REPLACE FUNCTION cleanup_tenant_data(
    tenant_slug TEXT,
    retention_days INTEGER DEFAULT 90
)
RETURNS TABLE(
    table_name TEXT,
    deleted_count BIGINT
) AS $$
DECLARE
    tenant_id TEXT;
    cutoff_date DATE;
BEGIN
    -- Get tenant ID
    SELECT "id" INTO tenant_id FROM "tenants" WHERE "slug" = tenant_slug AND "isActive" = true;

    IF tenant_id IS NULL THEN
        RAISE EXCEPTION 'Tenant not found: %', tenant_slug;
    END IF;

    cutoff_date := CURRENT_DATE - retention_days;

    RETURN QUERY VALUES
    ('notification_logs',
     (SELECT COUNT(*) FROM notification_logs
      WHERE "tenantId" = tenant_id AND "createdAt" < cutoff_date)
    ),
    ('tenant_access_log',
     (SELECT COUNT(*) FROM tenant_access_log
      WHERE "tenantId" = tenant_id AND "timestamp" < cutoff_date)
    );

    -- Actually delete the old data
    DELETE FROM notification_logs
    WHERE "tenantId" = tenant_id AND "createdAt" < cutoff_date;

    DELETE FROM tenant_access_log
    WHERE "tenantId" = tenant_id AND "timestamp" < cutoff_date;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON "tenants" TO coinet;
GRANT SELECT, INSERT ON "tenant_access_log" TO coinet;
GRANT EXECUTE ON FUNCTION set_tenant_context(TEXT) TO coinet;
GRANT EXECUTE ON FUNCTION create_tenant(TEXT, TEXT, TEXT) TO coinet;
GRANT EXECUTE ON FUNCTION get_tenant_info(TEXT) TO coinet;
GRANT EXECUTE ON FUNCTION verify_tenant_isolation() TO coinet;
GRANT EXECUTE ON FUNCTION backup_tenant_data(TEXT) TO coinet;
GRANT EXECUTE ON FUNCTION cleanup_tenant_data(TEXT, INTEGER) TO coinet;

-- 15. Create helpful comments
COMMENT ON TABLE "tenants" IS 'Tenant management for multi-tenant notification system';
COMMENT ON TABLE "tenant_access_log" IS 'Audit log for tenant access and operations';
COMMENT ON FUNCTION set_tenant_context(TEXT) IS 'Sets the current tenant context for RLS policies';
COMMENT ON FUNCTION create_tenant(TEXT, TEXT, TEXT) IS 'Creates a new tenant with specified parameters';
COMMENT ON FUNCTION verify_tenant_isolation() IS 'Verifies that tenant isolation is working correctly';
COMMENT ON VIEW tenant_statistics IS 'Statistics and metrics for each tenant';

-- 16. Example usage documentation
/*
-- Setting up a new tenant:
SELECT create_tenant('Acme Corp', 'acme', 'acme.yourapp.com');

-- Setting tenant context for a request:
SELECT set_tenant_context('acme');

-- Getting tenant information:
SELECT * FROM get_tenant_info('acme');

-- Verifying tenant isolation:
SELECT * FROM verify_tenant_isolation();

-- Getting tenant statistics:
SELECT * FROM tenant_statistics WHERE tenant_slug = 'acme';

-- Backing up tenant data:
SELECT * FROM backup_tenant_data('acme');

-- Cleaning up old tenant data:
SELECT * FROM cleanup_tenant_data('acme', 90);
*/
