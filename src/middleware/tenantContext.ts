import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

// Extend Express Request interface to include tenant context
declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      tenantSlug?: string;
    }
  }
}

interface TenantContextOptions {
  prisma: PrismaClient;
  defaultTenant?: string;
  enableAutoDetection?: boolean;
}

/**
 * Tenant Context Middleware
 * Automatically sets tenant context for incoming requests based on various detection methods
 */
export function tenantContextMiddleware(options: TenantContextOptions) {
  const { prisma, defaultTenant = 'default', enableAutoDetection = true } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Extract tenant slug using multiple detection methods
      const tenantSlug = extractTenantSlug(req, defaultTenant);

      // Set tenant context in database
      await setTenantContext(prisma, tenantSlug);

      // Store tenant info in request for later use
      req.tenantSlug = tenantSlug;
      req.tenantId = await getTenantId(prisma, tenantSlug);

      // Log tenant context for debugging (in development)
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Tenant Context] Set to: ${tenantSlug} (${req.tenantId})`);
      }

      next();
    } catch (error) {
      console.error('[Tenant Context] Error setting tenant context:', error);

      // If tenant context fails, use default tenant
      try {
        await setTenantContext(prisma, defaultTenant);
        req.tenantSlug = defaultTenant;
        req.tenantId = await getTenantId(prisma, defaultTenant);
        next();
      } catch (fallbackError) {
        console.error('[Tenant Context] Fallback to default tenant failed:', fallbackError);
        res.status(500).json({
          error: 'Internal server error',
          message: 'Failed to establish tenant context'
        });
      }
    }
  };
}

/**
 * Manual tenant context setter for specific use cases
 */
export async function setTenantContextForRequest(
  prisma: PrismaClient,
  tenantSlug: string,
  req: Request
): Promise<void> {
  await setTenantContext(prisma, tenantSlug);
  req.tenantSlug = tenantSlug;
  req.tenantId = await getTenantId(prisma, tenantSlug);
}

/**
 * Extract tenant slug from request using multiple detection methods
 */
function extractTenantSlug(req: Request, defaultTenant: string): string {
  // Method 1: Explicit tenant header (highest priority)
  const tenantHeader = req.get('x-tenant') || req.get('X-Tenant');
  if (tenantHeader && tenantHeader.trim()) {
    return tenantHeader.trim().toLowerCase();
  }

  // Method 2: Subdomain detection (e.g., tenant1.yourapp.com)
  const host = req.get('host') || '';
  const subdomain = extractSubdomain(host);
  if (subdomain && subdomain !== 'www' && subdomain !== 'app') {
    return subdomain.toLowerCase();
  }

  // Method 3: JWT token claims (if available)
  const authHeader = req.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    try {
      // This would need to be implemented based on your JWT structure
      // const token = authHeader.substring(7);
      // const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // if (decoded.tenantSlug) return decoded.tenantSlug;
    } catch (error) {
      console.warn('[Tenant Context] JWT parsing failed:', error);
    }
  }

  // Method 4: Query parameter (for API requests)
  const queryTenant = req.query.tenant as string;
  if (queryTenant) {
    return queryTenant.toLowerCase();
  }

  // Method 5: Session/cookie (for web requests)
  // This would be implemented based on your session management

  // Fallback to default tenant
  return defaultTenant;
}

/**
 * Extract subdomain from host header
 */
function extractSubdomain(host: string): string | null {
  if (!host) return null;

  // Handle localhost and IP addresses
  if (host.includes('localhost') || /^\d+\.\d+\.\d+\.\d+/.test(host)) {
    return null;
  }

  // Split by dots and get first part
  const parts = host.split('.');
  if (parts.length >= 3) {
    return parts[0];
  }

  return null;
}

/**
 * Set tenant context in database
 */
async function setTenantContext(prisma: PrismaClient, tenantSlug: string): Promise<void> {
  try {
    await prisma.$executeRaw`SELECT set_tenant_context(${tenantSlug})`;
  } catch (error) {
    console.error(`[Tenant Context] Failed to set tenant context for: ${tenantSlug}`, error);
    throw error;
  }
}

/**
 * Get tenant ID from slug
 */
async function getTenantId(prisma: PrismaClient, tenantSlug: string): Promise<string | null> {
  try {
    const result = await prisma.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "tenants" WHERE "slug" = ${tenantSlug} AND "isActive" = true
    `;
    return result[0]?.id || null;
  } catch (error) {
    console.error(`[Tenant Context] Failed to get tenant ID for: ${tenantSlug}`, error);
    return null;
  }
}

/**
 * Get current tenant context (for debugging/verification)
 */
export async function getCurrentTenantContext(prisma: PrismaClient): Promise<string> {
  try {
    const result = await prisma.$queryRaw<{ get_current_tenant: string }[]>`
      SELECT get_current_tenant() as get_current_tenant
    `;
    return result[0]?.get_current_tenant || 'default-tenant-id';
  } catch (error) {
    console.error('[Tenant Context] Failed to get current tenant context:', error);
    return 'default-tenant-id';
  }
}

/**
 * Create a new tenant
 */
export async function createTenant(
  prisma: PrismaClient,
  name: string,
  slug: string,
  domain?: string
): Promise<string> {
  try {
    const result = await prisma.$queryRaw<{ create_tenant: string }[]>`
      SELECT create_tenant(${name}, ${slug}, ${domain || null}) as create_tenant
    `;
    return result[0]?.create_tenant;
  } catch (error) {
    console.error('[Tenant Context] Failed to create tenant:', error);
    throw error;
  }
}

/**
 * Get tenant information
 */
export async function getTenantInfo(prisma: PrismaClient, tenantSlug?: string) {
  try {
    const result = await prisma.$queryRaw`
      SELECT * FROM get_tenant_info(${tenantSlug || null})
    `;
    return result;
  } catch (error) {
    console.error('[Tenant Context] Failed to get tenant info:', error);
    throw error;
  }
}

/**
 * Verify tenant isolation is working correctly
 */
export async function verifyTenantIsolation(prisma: PrismaClient) {
  try {
    const result = await prisma.$queryRaw`
      SELECT * FROM verify_tenant_isolation()
    `;
    return result;
  } catch (error) {
    console.error('[Tenant Context] Failed to verify tenant isolation:', error);
    throw error;
  }
}

/**
 * Middleware for API routes that need explicit tenant context
 * Useful for admin routes or when automatic detection isn't sufficient
 */
export function requireTenantContext(requiredSlug?: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.tenantSlug) {
      return res.status(400).json({
        error: 'Tenant context required',
        message: 'No tenant context detected in request'
      });
    }

    if (requiredSlug && req.tenantSlug !== requiredSlug) {
      return res.status(403).json({
        error: 'Tenant access denied',
        message: `This endpoint requires tenant: ${requiredSlug}`
      });
    }

    next();
  };
}
