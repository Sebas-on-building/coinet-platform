/**
 * =========================================
 * AUTHORIZATION MIDDLEWARE
 * =========================================
 * Divine world-class authorization system with RBAC and permissions
 */

import { Request, Response, NextFunction } from 'express';
import { Logger } from '../utils/Logger';
import { AuthenticatedUser } from './AuthenticationMiddleware';

export interface AuthorizationConfig {
  rbac: {
    enabled: boolean;
    defaultRole: string;
  };
  permissions: {
    checkInterval: number;
  };
}

export interface Permission {
  resource: string;
  action: string;
  conditions?: Record<string, any>;
}

export interface Role {
  name: string;
  permissions: Permission[];
  inherits?: string[];
}

/**
 * Advanced authorization middleware with RBAC and dynamic permissions
 */
export class AuthorizationMiddleware {
  private logger: Logger;
  private config: AuthorizationConfig;
  private roles: Map<string, Role> = new Map();
  private permissions: Map<string, Permission[]> = new Map();
  private lastUpdate: number = 0;

  constructor(config: AuthorizationConfig) {
    this.logger = new Logger('AuthorizationMiddleware');
    this.config = config;

    if (config.rbac.enabled) {
      this.initializeDefaultRoles();
    }
  }

  /**
   * Express middleware for authorization
   */
  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const user = (req as any).user as AuthenticatedUser;

        if (!user) {
          return res.status(401).json({
            success: false,
            error: 'Authentication required',
          });
        }

        // Skip authorization for health checks and public endpoints
        if (this.isPublicEndpoint(req.path)) {
          return next();
        }

        const authorizationResult = await this.authorizeRequest(req, user);

        if (!authorizationResult.authorized) {
          this.logger.warn('Authorization failed', {
            userId: user.id,
            role: user.role,
            resource: req.path,
            method: req.method,
            reason: authorizationResult.reason,
          });

          return res.status(403).json({
            success: false,
            error: 'Access denied',
            reason: authorizationResult.reason,
          });
        }

        next();
      } catch (error: any) {
        this.logger.error('Authorization middleware error', error);
        res.status(500).json({
          success: false,
          error: 'Authorization service error',
        });
      }
    };
  }

  /**
   * Authorize request based on user permissions and role
   */
  private async authorizeRequest(req: Request, user: AuthenticatedUser): Promise<{
    authorized: boolean;
    reason?: string;
  }> {
    // Extract required permission from request
    const requiredPermission = this.extractRequiredPermission(req);

    if (!requiredPermission) {
      // No specific permission required
      return { authorized: true };
    }

    // Check if user has required permission
    const hasPermission = this.checkPermission(user, requiredPermission);

    if (hasPermission) {
      return { authorized: true };
    }

    return {
      authorized: false,
      reason: `Missing permission: ${requiredPermission.resource}:${requiredPermission.action}`,
    };
  }

  /**
   * Check if user has required permission
   */
  private checkPermission(user: AuthenticatedUser, requiredPermission: Permission): boolean {
    // Check direct permissions
    for (const permission of user.permissions) {
      if (this.permissionMatches(typeof permission === 'string' ? permission : `${(permission as Permission).resource}:${(permission as Permission).action}`, requiredPermission)) {
        return true;
      }
    }

    // Check role-based permissions
    if (this.config.rbac.enabled) {
      const role = this.roles.get(user.role);
      if (role) {
        return this.checkRolePermissions(role, requiredPermission, new Set([user.role]));
      }
    }

    return false;
  }

  /**
   * Check if role has required permission (with inheritance)
   */
  private checkRolePermissions(
    role: Role,
    requiredPermission: Permission,
    visitedRoles: Set<string>
  ): boolean {
    // Prevent circular inheritance
    if (visitedRoles.has(role.name)) {
      return false;
    }

    visitedRoles.add(role.name);

    // Check role permissions
    for (const permission of role.permissions) {
      if (this.permissionMatches(`${permission.resource}:${permission.action}`, requiredPermission)) {
        return true;
      }
    }

    // Check inherited roles
    if (role.inherits) {
      for (const inheritedRoleName of role.inherits) {
        const inheritedRole = this.roles.get(inheritedRoleName);
        if (inheritedRole) {
          if (this.checkRolePermissions(inheritedRole, requiredPermission, visitedRoles)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Check if two permissions match
   */
  private permissionMatches(userPermission: string, requiredPermission: Permission): boolean {
    // Parse user permission string (format: "resource:action" or "*:action" or "resource:*")
    const [userResource, userAction] = userPermission.split(':');

    // Check resource match (support wildcards)
    const resourceMatch = userResource === '*' || userResource === requiredPermission.resource;

    // Check action match (support wildcards)
    const actionMatch = userAction === '*' || userAction === requiredPermission.action;

    return resourceMatch && actionMatch;
  }

  /**
   * Extract required permission from request
   */
  private extractRequiredPermission(req: Request): Permission | null {
    const path = req.path;
    const method = req.method;

    // Define permission mappings for different endpoints
    const permissionMap: Record<string, Record<string, Permission>> = {
      '/api/v1/market-signals/process-signals': {
        POST: { resource: 'market_signals', action: 'write' },
      },
      '/api/v1/alerts/evaluate': {
        POST: { resource: 'alerts', action: 'read' },
      },
      '/api/v1/notifications/send': {
        POST: { resource: 'notifications', action: 'write' },
      },
      '/api/v1/nlp/parse': {
        POST: { resource: 'nlp', action: 'write' },
      },
      '/api/v1/metrics': {
        GET: { resource: 'metrics', action: 'read' },
      },
    };

    const endpointPermissions = permissionMap[path];
    if (endpointPermissions) {
      return endpointPermissions[method];
    }

    // Default permission for API endpoints
    if (path.startsWith('/api/')) {
      return {
        resource: 'api',
        action: method === 'GET' ? 'read' : 'write',
      };
    }

    return null;
  }

  /**
   * Initialize default roles and permissions
   */
  private initializeDefaultRoles(): void {
    // Define default roles
    const defaultRoles: Role[] = [
      {
        name: 'admin',
        permissions: [
          { resource: '*', action: '*' },
        ],
      },
      {
        name: 'moderator',
        permissions: [
          { resource: 'market_signals', action: 'read' },
          { resource: 'alerts', action: 'read' },
          { resource: 'notifications', action: 'read' },
          { resource: 'nlp', action: 'read' },
          { resource: 'users', action: 'read' },
        ],
      },
      {
        name: 'trader',
        permissions: [
          { resource: 'market_signals', action: 'read' },
          { resource: 'alerts', action: 'write' },
          { resource: 'alerts', action: 'read' },
          { resource: 'notifications', action: 'read' },
          { resource: 'portfolio', action: 'read' },
          { resource: 'portfolio', action: 'write' },
        ],
      },
      {
        name: 'analyst',
        permissions: [
          { resource: 'market_signals', action: 'read' },
          { resource: 'alerts', action: 'read' },
          { resource: 'metrics', action: 'read' },
          { resource: 'analytics', action: 'read' },
        ],
      },
      {
        name: 'user',
        permissions: [
          { resource: 'market_signals', action: 'read' },
          { resource: 'alerts', action: 'read' },
          { resource: 'notifications', action: 'read' },
        ],
      },
      {
        name: 'guest',
        permissions: [
          { resource: 'public', action: 'read' },
        ],
      },
    ];

    // Set up role inheritance
    defaultRoles.forEach(role => {
      if (role.name === 'moderator') {
        role.inherits = ['user'];
      } else if (role.name === 'trader') {
        role.inherits = ['user'];
      } else if (role.name === 'analyst') {
        role.inherits = ['user'];
      } else if (role.name === 'user') {
        role.inherits = ['guest'];
      }
    });

    // Store roles
    defaultRoles.forEach(role => {
      this.roles.set(role.name, role);
    });

    this.logger.info('Default roles initialized', {
      roles: defaultRoles.map(r => r.name),
    });
  }

  /**
   * Add a new role
   */
  addRole(role: Role): void {
    this.roles.set(role.name, role);
    this.lastUpdate = Date.now();

    this.logger.info('Role added', { roleName: role.name });
  }

  /**
   * Remove a role
   */
  removeRole(roleName: string): boolean {
    const removed = this.roles.delete(roleName);
    if (removed) {
      this.lastUpdate = Date.now();
      this.logger.info('Role removed', { roleName });
    }
    return removed;
  }

  /**
   * Add permission to a role
   */
  addPermissionToRole(roleName: string, permission: Permission): boolean {
    const role = this.roles.get(roleName);
    if (!role) {
      return false;
    }

    role.permissions.push(permission);
    this.lastUpdate = Date.now();

    this.logger.info('Permission added to role', {
      roleName,
      permission: `${permission.resource}:${permission.action}`,
    });

    return true;
  }

  /**
   * Remove permission from a role
   */
  removePermissionFromRole(roleName: string, resource: string, action: string): boolean {
    const role = this.roles.get(roleName);
    if (!role) {
      return false;
    }

    const initialLength = role.permissions.length;
    role.permissions = role.permissions.filter(
      p => !(p.resource === resource && p.action === action)
    );

    const removed = role.permissions.length < initialLength;
    if (removed) {
      this.lastUpdate = Date.now();
      this.logger.info('Permission removed from role', {
        roleName,
        permission: `${resource}:${action}`,
      });
    }

    return removed;
  }

  /**
   * Check if endpoint is public (doesn't require authorization)
   */
  private isPublicEndpoint(path: string): boolean {
    const publicPaths = [
      '/health',
      '/ready',
      '/metrics',
      '/api-docs',
      '/',
    ];

    return publicPaths.some(publicPath => path.startsWith(publicPath));
  }

  /**
   * Get all roles
   */
  getRoles(): Role[] {
    return Array.from(this.roles.values());
  }

  /**
   * Get role by name
   */
  getRole(roleName: string): Role | undefined {
    return this.roles.get(roleName);
  }

  /**
   * Get user permissions (including inherited)
   */
  getUserPermissions(user: AuthenticatedUser): string[] {
    const permissions = new Set<string>();

    // Add direct permissions
    user.permissions.forEach(permission => {
      permissions.add(permission);
    });

    // Add role-based permissions
    if (this.config.rbac.enabled) {
      const role = this.roles.get(user.role);
      if (role) {
        this.collectRolePermissions(role, permissions, new Set([user.role]));
      }
    }

    return Array.from(permissions);
  }

  /**
   * Collect permissions from role (including inheritance)
   */
  private collectRolePermissions(
    role: Role,
    permissions: Set<string>,
    visitedRoles: Set<string>
  ): void {
    // Prevent circular inheritance
    if (visitedRoles.has(role.name)) {
      return;
    }

    visitedRoles.add(role.name);

    // Add role permissions
    role.permissions.forEach(permission => {
      permissions.add(`${permission.resource}:${permission.action}`);
    });

    // Add inherited role permissions
    if (role.inherits) {
      role.inherits.forEach(inheritedRoleName => {
        const inheritedRole = this.roles.get(inheritedRoleName);
        if (inheritedRole) {
          this.collectRolePermissions(inheritedRole, permissions, visitedRoles);
        }
      });
    }
  }
}
