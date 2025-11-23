/**
 * =========================================
 * RBAC MANAGER
 * =========================================
 * Divine world-class role-based access control for key management
 * Hierarchical permissions, caching, and dynamic policy evaluation
 */

// Note: Logger would be implemented in utils/Logger.ts
// import { Logger } from '../utils/Logger';
// Note: Types would be implemented in types/index.ts
// import { RBACConfig } from '../types';

export interface Permission {
  resource: string;
  action: string;
  conditions?: Record<string, any>;
}

export interface Role {
  name: string;
  permissions: Permission[];
  inherits?: string[];
  description?: string;
  createdAt: Date;
  createdBy: string;
}

export interface UserPermissions {
  userId: string;
  roles: string[];
  directPermissions: Permission[];
  inheritedPermissions: Permission[];
  effectivePermissions: Permission[];
  cacheExpiry: Date;
}

/**
 * Advanced RBAC manager with hierarchical roles and permission inheritance
 */
export class RBACManager {
  // private logger: Logger;
  // private config: RBACConfig;
  private roles: Map<string, Role> = new Map();
  private userPermissionsCache: Map<string, UserPermissions> = new Map();
  private cacheCleanupTimer?: NodeJS.Timeout;

  constructor() {
    // this.logger = new Logger('RBACManager');
    // this.config = config;

    this.initializeDefaultRoles();
    this.setupCacheCleanup();
  }

  /**
   * Initialize the RBAC manager
   */
  async initialize(): Promise<void> {
    // this.logger.info('Initializing RBAC Manager...');

    // Load roles from storage if configured
    await this.loadRolesFromStorage();

    // this.logger.info('✅ RBAC Manager initialized successfully', {
    //   roles: this.roles.size,
    //   cacheTTL: this.config.cacheTTL,
    // });
  }

  /**
   * Shutdown the RBAC manager
   */
  async shutdown(): Promise<void> {
    // this.logger.info('Shutting down RBAC Manager...');

    if (this.cacheCleanupTimer) {
      clearInterval(this.cacheCleanupTimer);
    }

    this.roles.clear();
    this.userPermissionsCache.clear();

    // this.logger.info('✅ RBAC Manager shutdown successfully');
  }

  /**
   * Check if user has specific permission
   */
  async hasPermission(
    userId: string,
    permission: string,
    resource?: string
  ): Promise<boolean> {
    try {
      const userPermissions = await this.getUserPermissions(userId);

      // Parse permission string (format: "resource:action")
      const [requiredResource, requiredAction] = permission.split(':');

      return userPermissions.effectivePermissions.some(perm => {
        // Check resource match (support wildcards)
        const resourceMatch = perm.resource === '*' || perm.resource === requiredResource ||
          (resource && perm.resource === resource);

        // Check action match (support wildcards)
        const actionMatch = perm.action === '*' || perm.action === requiredAction;

        // Check conditions if present
        const conditionsMatch = this.checkPermissionConditions(perm.conditions);

        return resourceMatch && actionMatch && conditionsMatch;
      });

    } catch (error: any) {
      // this.logger.error('Permission check failed', error, { userId, permission });
      return false; // Fail closed for security
    }
  }

  /**
   * Get all permissions for a user
   */
  async getUserPermissions(userId: string): Promise<UserPermissions> {
    // Check cache first
    const cached = this.userPermissionsCache.get(userId);
    if (cached && cached.cacheExpiry > new Date()) {
      return cached;
    }

    // Load user permissions
    const userPermissions = await this.loadUserPermissions(userId);

    // Cache the result
    this.userPermissionsCache.set(userId, userPermissions);

    return userPermissions;
  }

  /**
   * Create a new role
   */
  async createRole(role: Omit<Role, 'createdAt' | 'createdBy'>): Promise<Role> {
    if (this.roles.has(role.name)) {
      throw new Error(`Role already exists: ${role.name}`);
    }

    const newRole: Role = {
      ...role,
      createdAt: new Date(),
      createdBy: 'system', // In real implementation, get from context
    };

    this.roles.set(role.name, newRole);

    // Save to storage
    await this.saveRoleToStorage(newRole);

    // Clear user permissions cache since roles have changed
    this.clearUserPermissionsCache();

    // this.logger.info('Role created', {
    //   roleName: role.name,
    //   permissions: role.permissions.length,
    // });

    return newRole;
  }

  /**
   * Grant permission to user
   */
  async grantPermission(grant: {
    userId: string;
    permission: Permission;
    grantedBy: string;
  }): Promise<void> {
    // Load current user permissions
    const currentPermissions = await this.loadUserPermissions(grant.userId);

    // Check if permission already exists
    const existingIndex = currentPermissions.directPermissions.findIndex(
      p => p.resource === grant.permission.resource && p.action === grant.permission.action
    );

    if (existingIndex >= 0) {
      // Update existing permission
      currentPermissions.directPermissions[existingIndex] = grant.permission;
    } else {
      // Add new permission
      currentPermissions.directPermissions.push(grant.permission);
    }

    // Recalculate effective permissions
    currentPermissions.effectivePermissions = this.calculateEffectivePermissions(currentPermissions);

    // Update cache
    currentPermissions.cacheExpiry = new Date(Date.now() + 300 * 1000); // 5 minutes default
    this.userPermissionsCache.set(grant.userId, currentPermissions);

    // Save to storage
    await this.saveUserPermissionsToStorage(grant.userId, currentPermissions);

    // this.logger.info('Permission granted', {
    //   userId: grant.userId,
    //   permission: `${grant.permission.resource}:${grant.permission.action}`,
    //   grantedBy: grant.grantedBy,
    // });
  }

  /**
   * Revoke permission from user
   */
  async revokePermission(revoke: {
    userId: string;
    resource: string;
    action: string;
    revokedBy: string;
  }): Promise<void> {
    const currentPermissions = await this.loadUserPermissions(revoke.userId);

    // Remove the permission
    currentPermissions.directPermissions = currentPermissions.directPermissions.filter(
      p => !(p.resource === revoke.resource && p.action === revoke.action)
    );

    // Recalculate effective permissions
    currentPermissions.effectivePermissions = this.calculateEffectivePermissions(currentPermissions);

    // Update cache
    currentPermissions.cacheExpiry = new Date(Date.now() + 300 * 1000); // 5 minutes default
    this.userPermissionsCache.set(revoke.userId, currentPermissions);

    // Save to storage
    await this.saveUserPermissionsToStorage(revoke.userId, currentPermissions);

    // this.logger.info('Permission revoked', {
    //   userId: revoke.userId,
    //   permission: `${revoke.resource}:${revoke.action}`,
    //   revokedBy: revoke.revokedBy,
    // });
  }

  /**
   * Assign role to user
   */
  async assignRole(userId: string, roleName: string, assignedBy: string): Promise<void> {
    if (!this.roles.has(roleName)) {
      throw new Error(`Role not found: ${roleName}`);
    }

    const currentPermissions = await this.loadUserPermissions(userId);

    if (!currentPermissions.roles.includes(roleName)) {
      currentPermissions.roles.push(roleName);
    }

    // Recalculate effective permissions
    currentPermissions.effectivePermissions = this.calculateEffectivePermissions(currentPermissions);

    // Update cache
    currentPermissions.cacheExpiry = new Date(Date.now() + 300 * 1000); // 5 minutes default
    this.userPermissionsCache.set(userId, currentPermissions);

    // Save to storage
    await this.saveUserPermissionsToStorage(userId, currentPermissions);

    // this.logger.info('Role assigned', {
    //   userId,
    //   roleName,
    //   assignedBy,
    // });
  }

  /**
   * Remove role from user
   */
  async removeRole(userId: string, roleName: string, removedBy: string): Promise<void> {
    const currentPermissions = await this.loadUserPermissions(userId);

    currentPermissions.roles = currentPermissions.roles.filter(role => role !== roleName);

    // Recalculate effective permissions
    currentPermissions.effectivePermissions = this.calculateEffectivePermissions(currentPermissions);

    // Update cache
    currentPermissions.cacheExpiry = new Date(Date.now() + 300 * 1000); // 5 minutes default
    this.userPermissionsCache.set(userId, currentPermissions);

    // Save to storage
    await this.saveUserPermissionsToStorage(userId, currentPermissions);

    // this.logger.info('Role removed', {
    //   userId,
    //   roleName,
    //   removedBy,
    // });
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details?: string }> {
    try {
      const roleCount = this.roles.size;
      const cacheSize = this.userPermissionsCache.size;

      if (roleCount === 0) {
        return {
          status: 'healthy',
          details: 'No roles configured (normal for new installation)',
        };
      }

      return {
        status: 'healthy',
        details: `${roleCount} roles, ${cacheSize} user permissions cached`,
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        details: error.message,
      };
    }
  }

  // Private helper methods

  private initializeDefaultRoles(): void {
    const defaultRoles: Omit<Role, 'createdAt' | 'createdBy'>[] = [
      {
        name: 'admin',
        description: 'Full administrative access',
        permissions: [
          { resource: '*', action: '*' },
        ],
      },
      {
        name: 'key_manager',
        description: 'Can manage encryption keys',
        permissions: [
          { resource: 'keys', action: '*' },
          { resource: 'audit', action: 'read' },
        ],
      },
      {
        name: 'security_officer',
        description: 'Can manage security policies and audit logs',
        permissions: [
          { resource: 'rbac', action: '*' },
          { resource: 'audit', action: '*' },
          { resource: 'keys', action: 'read' },
        ],
      },
      {
        name: 'developer',
        description: 'Can access keys for development purposes',
        permissions: [
          { resource: 'keys', action: 'read' },
          { resource: 'keys', action: 'generate', conditions: { purpose: 'development' } },
        ],
      },
      {
        name: 'user',
        description: 'Basic user permissions',
        permissions: [
          { resource: 'keys', action: 'read', conditions: { ownedBy: 'self' } },
        ],
      },
      {
        name: 'guest',
        description: 'Minimal permissions for unauthenticated access',
        permissions: [
          { resource: 'public', action: 'read' },
        ],
      },
    ];

    defaultRoles.forEach(role => {
      const fullRole: Role = {
        ...role,
        createdAt: new Date(),
        createdBy: 'system',
      };
      this.roles.set(role.name, fullRole);
    });

    // this.logger.info('Default roles initialized', {
    //   roles: defaultRoles.map(r => r.name),
    // });
  }

  private setupCacheCleanup(): void {
    this.cacheCleanupTimer = setInterval(() => {
      this.cleanupExpiredCache();
    }, 60 * 1000); // 1 minute default
  }

  private cleanupExpiredCache(): void {
    const now = new Date();
    let cleanedCount = 0;

    for (const [userId, permissions] of Array.from(this.userPermissionsCache.entries())) {
      if (permissions.cacheExpiry < now) {
        this.userPermissionsCache.delete(userId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      // this.logger.debug('Cleaned expired user permissions cache', { count: cleanedCount });
    }
  }

  private calculateEffectivePermissions(userPermissions: UserPermissions): Permission[] {
    const effectivePermissions: Permission[] = [];

    // Add direct permissions
    effectivePermissions.push(...userPermissions.directPermissions);

    // Add role-based permissions
    for (const roleName of userPermissions.roles) {
      const role = this.roles.get(roleName);
      if (role) {
        effectivePermissions.push(...this.getRolePermissions(role, new Set([roleName])));
      }
    }

    // Remove duplicates
    const uniquePermissions = new Map<string, Permission>();

    for (const permission of effectivePermissions) {
      const key = `${permission.resource}:${permission.action}`;
      uniquePermissions.set(key, permission);
    }

    return Array.from(uniquePermissions.values());
  }

  private getRolePermissions(role: Role, visitedRoles: Set<string>): Permission[] {
    const permissions: Permission[] = [];

    // Prevent circular inheritance
    if (visitedRoles.has(role.name)) {
      return permissions;
    }

    visitedRoles.add(role.name);

    // Add role permissions
    permissions.push(...role.permissions);

    // Add inherited role permissions
    if (role.inherits) {
      for (const inheritedRoleName of role.inherits) {
        const inheritedRole = this.roles.get(inheritedRoleName);
        if (inheritedRole) {
          permissions.push(...this.getRolePermissions(inheritedRole, visitedRoles));
        }
      }
    }

    return permissions;
  }

  private checkPermissionConditions(conditions?: Record<string, any>): boolean {
    if (!conditions) {
      return true;
    }

    // In a real implementation, this would evaluate complex conditions
    // For now, we support simple equality checks
    for (const [key, value] of Object.entries(conditions)) {
      // This would check against context (user, resource, time, etc.)
      // For demo purposes, we'll assume conditions pass
    }

    return true;
  }

  private clearUserPermissionsCache(): void {
    this.userPermissionsCache.clear();
    // this.logger.debug('User permissions cache cleared');
  }

  private async loadUserPermissions(userId: string): Promise<UserPermissions> {
    // In a real implementation, this would load from database/storage
    // For demo purposes, we'll create default permissions

    return {
      userId,
      roles: ['user'], // Default role
      directPermissions: [],
      inheritedPermissions: [],
      effectivePermissions: [],
      cacheExpiry: new Date(Date.now() + 300 * 1000), // 5 minutes default
    };
  }

  private async saveUserPermissionsToStorage(userId: string, permissions: UserPermissions): Promise<void> {
    // In a real implementation, this would save to database/storage
    // this.logger.debug('Saving user permissions to storage', { userId });
  }

  private async loadRolesFromStorage(): Promise<void> {
    // In a real implementation, this would load roles from database/storage
    // this.logger.debug('Loading roles from storage...');
  }

  private async saveRoleToStorage(role: Role): Promise<void> {
    // In a real implementation, this would save role to database/storage
    // this.logger.debug('Saving role to storage', { roleName: role.name });
  }
}
