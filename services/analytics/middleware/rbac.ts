/**
 * RBAC Middleware for Coinet
 * Atomic, extensible, and testable role, permission, and policy checks.
 * Inspired by Apple, Canva, TradingView, and Solana: composable, beautiful, and robust.
 *
 * Usage:
 *   app.get('/admin', requireRole('admin'), handler)
 *   app.get('/pro', requireAnyRole(['pro', 'admin']), handler)
 *   app.get('/edit', requirePermission('edit_chart'), handler)
 *   app.get('/custom', requirePolicy((user, req) => ...), handler)
 */
import { Request, Response, NextFunction } from 'express';

export type Role = 'free' | 'pro' | 'analyst' | 'admin';
export type Permission = string;
export type Policy = (user: { id: string; role: Role; permissions?: Permission[] }, req: Request) => boolean;

/**
 * Require a single role
 * @param role Role required
 */
export function requireRole(role: Role) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.user && req.user.role === role) return next();
    res.status(403).json({ error: 'Forbidden: role required' });
  };
}

/**
 * Require any of multiple roles
 * @param roles Array of allowed roles
 */
export function requireAnyRole(roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.user && roles.includes(req.user.role as Role)) return next();
    res.status(403).json({ error: 'Forbidden: role required' });
  };
}

/**
 * Require a specific permission (user.permissions must be set)
 * @param permission Permission string
 */
export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.user && req.user.permissions && req.user.permissions.includes(permission)) return next();
    res.status(403).json({ error: 'Forbidden: permission required' });
  };
}

/**
 * Require a custom policy (function)
 * @param policyFn Function (user, req) => boolean
 */
export function requirePolicy(policyFn: Policy) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.user && policyFn(req.user, req)) return next();
    res.status(403).json({ error: 'Forbidden: policy check failed' });
  };
}

/**
 * Create a custom RBAC middleware with dynamic config.
 * @param config { roles?: Role[], permissions?: Permission[], policy?: Policy }
 */
export function createRBACMiddleware(config: {
  roles?: Role[];
  permissions?: Permission[];
  policy?: Policy;
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    if (config.roles && !config.roles.includes(user.role as Role))
      return res.status(403).json({ error: 'Forbidden: role required' });

    if (config.permissions && (!user.permissions || !config.permissions.every(p => user.permissions!.includes(p))))
      return res.status(403).json({ error: 'Forbidden: permission required' });

    if (config.policy && !config.policy(user, req))
      return res.status(403).json({ error: 'Forbidden: policy check failed' });

    next();
  };
}

/**
 * Example usage:
 *   app.get('/admin', requireRole('admin'), handler)
 *   app.get('/pro', requireAnyRole(['pro', 'admin']), handler)
 *   app.get('/edit', requirePermission('edit_chart'), handler)
 *   app.get('/custom', requirePolicy((user, req) => user.id === req.params.id), handler)
 */ 