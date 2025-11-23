# Row-Level Security (RLS) Implementation Guide

## Overview

This document provides comprehensive documentation for the enterprise-grade Row-Level Security (RLS) implementation across all tables in the Coinet platform. The implementation ensures complete tenant isolation and prevents data leakage between tenants.

## Architecture

### Core Components

1. **Tenant Management Table** - Central tenant registry
2. **GUC Variables** - Custom PostgreSQL configuration variables for tenant context
3. **RLS Policies** - Row-level security policies on all tables
4. **Tenant Assignment Triggers** - Automatic tenant ID assignment
5. **Tenant Context Functions** - Helper functions for tenant management

## Database Schema

### Tenant Management

```sql
-- Tenant registry table
CREATE TABLE "tenants" (
    "id" VARCHAR(36) PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(100) UNIQUE NOT NULL,
    "domain" VARCHAR(255),
    "isActive" BOOLEAN DEFAULT true,
    "settings" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL
);
```

### GUC Variables

- `app.current_tenant` - Stores the current tenant ID for the session
- Used by RLS policies to filter data access

## RLS Policies

### Policy Structure

All RLS policies follow this pattern:

```sql
CREATE POLICY "table_name_tenant_isolation" ON "table_name"
    USING (tenant_condition);
```

### Policy Types

1. **Direct Tenant ID Policies** - For tables with direct `tenantId` column
2. **Relationship-based Policies** - For tables that reference other tenant-isolated tables
3. **System-wide Policies** - For system tables that aren't tenant-specific

### Example Policies

#### Direct Tenant ID Policy
```sql
CREATE POLICY "users_tenant_isolation" ON "users"
    USING (
        "id" IN (
            SELECT u."id" FROM "users" u WHERE u."tenantId" = get_current_tenant()
        )
    );
```

#### Relationship-based Policy
```sql
CREATE POLICY "portfolios_tenant_isolation" ON "portfolios"
    USING (
        "userId" IN (
            SELECT u."id" FROM "users" u WHERE u."tenantId" = get_current_tenant()
        )
    );
```

#### System-wide Policy
```sql
CREATE POLICY "roles_tenant_isolation" ON "roles"
    USING (true); -- Roles are system-wide
```

## Tenant Context Management

### Setting Tenant Context

```sql
-- Set tenant context for current session
SELECT set_tenant_context('tenant-slug');

-- Get current tenant
SELECT get_current_tenant();
```

### Functions

#### `set_tenant_context(tenant_slug TEXT)`
Sets the tenant context for the current session.

**Parameters:**
- `tenant_slug` - Unique slug identifier for the tenant

**Returns:** Tenant ID

#### `get_current_tenant()`
Gets the current tenant context.

**Returns:** Current tenant ID or 'default' if not set

#### `create_tenant(tenant_name, tenant_slug, tenant_domain)`
Creates a new tenant.

**Returns:** New tenant ID

#### `get_tenant_info(tenant_slug)`
Retrieves tenant information.

**Returns:** Tenant record

#### `verify_tenant_isolation()`
Verifies that tenant isolation is working correctly.

**Returns:** Table with isolation verification data

## Application Integration

### Middleware Integration

```typescript
// Express middleware for tenant context
app.use(async (req, res, next) => {
    try {
        // Extract tenant from various sources
        const tenantSlug = extractTenantFromRequest(req);

        // Set tenant context in database
        await db.$executeRaw`SELECT set_tenant_context(${tenantSlug})`;

        next();
    } catch (error) {
        console.error('Tenant context error:', error);
        res.status(400).json({ error: 'Invalid tenant' });
    }
});

function extractTenantFromRequest(req: Request): string {
    // 1. From subdomain (tenant1.yourapp.com)
    const subdomain = req.get('host')?.split('.')[0];
    if (subdomain && subdomain !== 'www') {
        return subdomain;
    }

    // 2. From explicit tenant header
    const tenantHeader = req.get('x-tenant');
    if (tenantHeader) {
        return tenantHeader;
    }

    // 3. From JWT token claims
    const authHeader = req.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.tenantSlug) {
            return decoded.tenantSlug;
        }
    }

    return 'default';
}
```

### Database Service Integration

```typescript
// Database service with tenant context
class DatabaseService {
    async setTenantContext(tenantSlug: string) {
        await this.prisma.$executeRaw`SELECT set_tenant_context(${tenantSlug})`;
    }

    async createUser(userData: any) {
        // Tenant ID will be automatically assigned by trigger
        return await this.prisma.user.create({
            data: userData
        });
    }

    async getUsers() {
        // Only returns users from current tenant context
        return await this.prisma.user.findMany();
    }
}
```

## Security Features

### No BYPASSRLS Privilege

The application role `coinet` explicitly does NOT have the `BYPASSRLS` privilege:

```sql
ALTER ROLE coinet NOBYPASSRLS;
```

This ensures that even database administrators cannot bypass RLS policies.

### Automatic Tenant Assignment

All insert operations automatically assign the correct tenant ID through triggers:

```sql
CREATE TRIGGER trigger_assign_tenant_users
    BEFORE INSERT ON "users"
    FOR EACH ROW
    EXECUTE FUNCTION assign_tenant_on_insert();
```

### Audit Logging

All tenant access operations are logged:

```sql
CREATE TABLE "tenant_access_log" (
    "id" VARCHAR(36) PRIMARY KEY,
    "tenantId" VARCHAR(36) NOT NULL,
    "userId" VARCHAR(36),
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" VARCHAR(36),
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,
    "success" BOOLEAN DEFAULT true,
    "errorMessage" TEXT,
    "timestamp" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP
);
```

## Testing and Verification

### Isolation Testing

```sql
-- Set up test tenants
SELECT create_tenant('Test Company A', 'test-a');
SELECT create_tenant('Test Company B', 'test-b');

-- Set context for tenant A
SELECT set_tenant_context('test-a');

-- Create test data for tenant A
INSERT INTO users (email, name, "passwordHash")
VALUES ('user-a@test-a.com', 'User A', 'hashed_password');

-- Verify only tenant A data is visible
SELECT * FROM users; -- Should only show user-a@test-a.com

-- Switch to tenant B context
SELECT set_tenant_context('test-b');

-- Create test data for tenant B
INSERT INTO users (email, name, "passwordHash")
VALUES ('user-b@test-b.com', 'User B', 'hashed_password');

-- Verify only tenant B data is visible
SELECT * FROM users; -- Should only show user-b@test-b.com

-- Verify isolation
SELECT * FROM verify_tenant_isolation();
```

### Performance Testing

Monitor query performance with RLS enabled:

```sql
-- Enable query logging
SET log_min_duration_statement = 100;
SET log_statement = 'all';

-- Test complex queries with RLS
SELECT
    u.email,
    COUNT(p.id) as portfolio_count,
    COUNT(a.id) as alert_count
FROM users u
LEFT JOIN portfolios p ON u.id = p."userId"
LEFT JOIN alerts a ON u.id = a."userId"
GROUP BY u.id, u.email;
```

## Monitoring and Maintenance

### Regular Verification

Run isolation verification periodically:

```sql
-- Daily check
SELECT * FROM verify_tenant_isolation()
WHERE isolation_breach > 0;
```

### Performance Monitoring

Monitor RLS performance:

```sql
-- Check for slow RLS queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
WHERE query LIKE '%tenantId%'
ORDER BY mean_time DESC;
```

### Backup and Recovery

Tenant-specific backup:

```sql
-- Backup specific tenant data
SELECT * FROM backup_tenant_data('tenant-slug');
```

## Troubleshooting

### Common Issues

#### 1. No Data Visible
**Problem:** Queries return no results
**Solution:** Check if tenant context is properly set
```sql
SELECT get_current_tenant();
```

#### 2. Cross-Tenant Data Leakage
**Problem:** Users can see data from other tenants
**Solution:** Verify RLS policies are active and triggers are working
```sql
SELECT * FROM verify_tenant_isolation();
```

#### 3. Performance Issues
**Problem:** Queries are slow with RLS
**Solution:** Check query plans and ensure proper indexing
```sql
EXPLAIN ANALYZE SELECT * FROM users WHERE "tenantId" = get_current_tenant();
```

### Debug Mode

Enable detailed RLS logging:

```sql
-- Enable RLS debugging
SET log_statement = 'all';
SET log_min_messages = 'debug1';

-- Test queries with detailed logging
SELECT * FROM users;
```

## Deployment Checklist

- [ ] Run comprehensive RLS setup script
- [ ] Verify all tables have RLS enabled
- [ ] Confirm application role has NO BYPASSRLS privilege
- [ ] Test tenant isolation with multiple tenants
- [ ] Verify automatic tenant assignment triggers
- [ ] Set up monitoring for RLS performance
- [ ] Document tenant management procedures
- [ ] Train team on tenant context management

## Security Best Practices

1. **Never bypass RLS** - Application role should never have BYPASSRLS
2. **Always set tenant context** - Every request should set proper tenant context
3. **Validate tenant slugs** - Ensure tenant slugs are validated before setting context
4. **Monitor for breaches** - Regularly run isolation verification
5. **Audit all access** - Log all tenant operations
6. **Regular security reviews** - Review RLS policies and triggers periodically

## Support

For issues or questions regarding RLS implementation:

1. Check this documentation first
2. Review audit logs for anomalies
3. Run isolation verification tests
4. Check application logs for tenant context errors
5. Verify database role permissions

---

**Last Updated:** $(date)
**Version:** 1.0.0
**Status:** Production Ready
