import { SecureQueryBuilder } from '../database/SecureQueryBuilder';
import { Logger } from '../logging/Logger';
import { MetricsCollector } from '../metrics/MetricsCollector';
import { ErrorManager } from '../errors/ErrorManager';
import { SecretManager } from '../security/SecretManager';

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description: string;
  createdAt: Date;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  level: number; // Higher number = more permissions
  permissions: string[]; // Permission IDs
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRole {
  id: string;
  userId: string;
  roleId: string;
  assignedBy: string;
  assignedAt: Date;
  expiresAt?: Date;
  isActive: boolean;
}

export interface AccessContext {
  userId: string;
  resource: string;
  action: string;
  data?: any;
  ip?: string;
  userAgent?: string;
}

export interface AccessResult {
  granted: boolean;
  reason?: string;
  requiresElevation?: boolean;
  permissions: string[];
  roles: string[];
}

export class RBACService {
  private static instance: RBACService;
  private db!: SecureQueryBuilder; // Definite assignment assertion - initialized in constructor
  private logger: Logger;
  private metrics: MetricsCollector;
  private errorManager: ErrorManager;
  private secretManager: SecretManager;

  // Built-in system roles
  private readonly SYSTEM_ROLES = {
    SUPER_ADMIN: {
      name: 'super_admin',
      level: 1000,
      description: 'Full system access'
    },
    ADMIN: {
      name: 'admin',
      level: 800,
      description: 'Administrative access'
    },
    PREMIUM: {
      name: 'premium',
      level: 600,
      description: 'Premium user features'
    },
    USER: {
      name: 'user',
      level: 400,
      description: 'Standard user access'
    },
    GUEST: {
      name: 'guest',
      level: 100,
      description: 'Limited guest access'
    }
  };

  // Built-in permissions
  private readonly SYSTEM_PERMISSIONS = [
    // User Management
    { resource: 'users', action: 'create', description: 'Create new users' },
    { resource: 'users', action: 'read', description: 'View user information' },
    { resource: 'users', action: 'update', description: 'Update user information' },
    { resource: 'users', action: 'delete', description: 'Delete users' },
    { resource: 'users', action: 'list', description: 'List all users' },

    // Portfolio Management
    { resource: 'portfolio', action: 'create', description: 'Create portfolio' },
    { resource: 'portfolio', action: 'read', description: 'View portfolio' },
    { resource: 'portfolio', action: 'update', description: 'Update portfolio' },
    { resource: 'portfolio', action: 'delete', description: 'Delete portfolio' },
    { resource: 'portfolio', action: 'share', description: 'Share portfolio' },

    // Trading
    { resource: 'trading', action: 'execute', description: 'Execute trades' },
    { resource: 'trading', action: 'view_history', description: 'View trading history' },
    { resource: 'trading', action: 'paper_trade', description: 'Paper trading' },
    { resource: 'trading', action: 'advanced_orders', description: 'Advanced order types' },

    // Analytics
    { resource: 'analytics', action: 'basic', description: 'Basic analytics' },
    { resource: 'analytics', action: 'advanced', description: 'Advanced analytics' },
    { resource: 'analytics', action: 'export', description: 'Export data' },
    { resource: 'analytics', action: 'ai_insights', description: 'AI-powered insights' },

    // Admin Functions
    { resource: 'admin', action: 'dashboard', description: 'Access admin dashboard' },
    { resource: 'admin', action: 'logs', description: 'View system logs' },
    { resource: 'admin', action: 'metrics', description: 'View system metrics' },
    { resource: 'admin', action: 'config', description: 'Modify system configuration' },

    // API Access
    { resource: 'api', action: 'read', description: 'Read API access' },
    { resource: 'api', action: 'write', description: 'Write API access' },
    { resource: 'api', action: 'admin', description: 'Admin API access' },

    // Data Access
    { resource: 'data', action: 'real_time', description: 'Real-time data access' },
    { resource: 'data', action: 'historical', description: 'Historical data access' },
    { resource: 'data', action: 'premium', description: 'Premium data feeds' }
  ];

  private constructor() {
    this.logger = Logger.getInstance();
    this.metrics = MetricsCollector.getInstance();
    this.errorManager = ErrorManager.getInstance();
    this.secretManager = SecretManager.getInstance();

    this.initializeDatabase();
  }

  static getInstance(): RBACService {
    if (!RBACService.instance) {
      RBACService.instance = new RBACService();
    }
    return RBACService.instance;
  }

  private async initializeDatabase(): Promise<void> {
    try {
      const dbConfig = {
        connectionString: await this.secretManager.getSecret('DATABASE_URL', {
          source: 'env',
          required: true
        })
      };
      this.db = new SecureQueryBuilder(dbConfig);

      await this.ensureSystemTablesExist();
      await this.ensureSystemRolesExist();
      await this.ensureSystemPermissionsExist();

      this.logger.info('RBAC Service initialized successfully');

    } catch (error) {
      this.errorManager.handleError(error as Error, {
        operation: 'initialize_rbac_service',
        component: 'rbac_service'
      });
      throw error;
    }
  }

  private async ensureSystemTablesExist(): Promise<void> {
    try {
      // Create permissions table
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS permissions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) UNIQUE NOT NULL,
          resource VARCHAR(255) NOT NULL,
          action VARCHAR(255) NOT NULL,
          description TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(resource, action)
        )
      `);

      // Create roles table
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS roles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) UNIQUE NOT NULL,
          description TEXT,
          level INTEGER NOT NULL DEFAULT 0,
          permissions TEXT[], -- Array of permission IDs
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Create user_roles table
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS user_roles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          role_id UUID NOT NULL REFERENCES roles(id),
          assigned_by UUID NOT NULL,
          assigned_at TIMESTAMP DEFAULT NOW(),
          expires_at TIMESTAMP,
          is_active BOOLEAN DEFAULT true,
          UNIQUE(user_id, role_id)
        )
      `);

      // Create access_logs table
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS access_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          resource VARCHAR(255) NOT NULL,
          action VARCHAR(255) NOT NULL,
          granted BOOLEAN NOT NULL,
          reason TEXT,
          ip_address INET,
          user_agent TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Create indexes for performance
      await this.db.query(`
        CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
        CREATE INDEX IF NOT EXISTS idx_access_logs_user_id ON access_logs(user_id);
        CREATE INDEX IF NOT EXISTS idx_access_logs_created_at ON access_logs(created_at);
        CREATE INDEX IF NOT EXISTS idx_permissions_resource_action ON permissions(resource, action);
      `);

    } catch (error) {
      this.errorManager.handleError(error as Error, {
        operation: 'ensure_system_tables',
        component: 'rbac_service'
      });
      throw error;
    }
  }

  private async ensureSystemRolesExist(): Promise<void> {
    try {
      for (const [key, roleData] of Object.entries(this.SYSTEM_ROLES)) {
        const existingRole = await this.db.findMany<Role>('roles', { name: roleData.name });

        if (existingRole.length === 0) {
          await this.db.insert<Role>('roles', {
            id: crypto.randomUUID(),
            name: roleData.name,
            description: roleData.description,
            level: roleData.level,
            permissions: [],
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          });

          this.logger.info('Created system role', { role: roleData.name });
        }
      }
    } catch (error) {
      this.errorManager.handleError(error as Error, {
        operation: 'ensure_system_roles',
        component: 'rbac_service'
      });
    }
  }

  private async ensureSystemPermissionsExist(): Promise<void> {
    try {
      for (const permData of this.SYSTEM_PERMISSIONS) {
        const existing = await this.db.findMany<Permission>('permissions', {
          resource: permData.resource,
          action: permData.action
        });

        if (existing.length === 0) {
          await this.db.insert<Permission>('permissions', {
            id: crypto.randomUUID(),
            name: `${permData.resource}:${permData.action}`,
            resource: permData.resource,
            action: permData.action,
            description: permData.description,
            createdAt: new Date()
          });
        }
      }

      this.logger.info('System permissions synchronized');
    } catch (error) {
      this.errorManager.handleError(error as Error, {
        operation: 'ensure_system_permissions',
        component: 'rbac_service'
      });
    }
  }

  // Check if user has access to a resource/action
  async checkAccess(context: AccessContext): Promise<AccessResult> {
    const startTime = Date.now();

    try {
      // Get user's roles and permissions
      const userRoles = await this.getUserRoles(context.userId);
      const userPermissions = await this.getUserPermissions(context.userId);

      // Check for direct permission match
      const hasDirectPermission = userPermissions.some(perm =>
        perm.resource === context.resource && perm.action === context.action
      );

      // Check for wildcard permissions (admin role gets everything)
      const hasAdminAccess = userRoles.some(role =>
        role.name === 'super_admin' || role.name === 'admin'
      );

      const granted = hasDirectPermission || hasAdminAccess;

      // Log access attempt
      await this.logAccess({
        userId: context.userId,
        resource: context.resource,
        action: context.action,
        granted,
        reason: granted ? 'Permission granted' : 'Insufficient permissions',
        ipAddress: context.ip,
        userAgent: context.userAgent
      });

      const duration = Date.now() - startTime;
      this.metrics.recordHistogram('rbac_check_duration', duration);
      this.metrics.incrementCounter('rbac_checks', {
        resource: context.resource,
        action: context.action,
        granted: granted.toString()
      });

      return {
        granted,
        reason: granted ? undefined : 'Insufficient permissions',
        permissions: userPermissions.map(p => `${p.resource}:${p.action}`),
        roles: userRoles.map(r => r.name)
      };

    } catch (error) {
      this.errorManager.handleError(error as Error, {
        operation: 'check_access',
        component: 'rbac_service',
        metadata: context
      });

      return {
        granted: false,
        reason: 'Access check failed due to system error',
        permissions: [],
        roles: []
      };
    }
  }

  // Assign role to user
  async assignRole(params: {
    userId: string;
    roleId: string;
    assignedBy: string;
    expiresAt?: Date;
  }): Promise<boolean> {
    try {
      // Check if assignment already exists
      const existing = await this.db.findMany<UserRole>('user_roles', {
        userId: params.userId,
        roleId: params.roleId,
        isActive: true
      });

      if (existing.length > 0) {
        this.logger.warn('Role assignment already exists', {
          userId: params.userId,
          roleId: params.roleId
        });
        return false;
      }

      await this.db.insert<UserRole>('user_roles', {
        id: crypto.randomUUID(),
        userId: params.userId,
        roleId: params.roleId,
        assignedBy: params.assignedBy,
        assignedAt: new Date(),
        expiresAt: params.expiresAt,
        isActive: true
      });

      this.logger.info('Role assigned to user', {
        userId: params.userId,
        roleId: params.roleId,
        assignedBy: params.assignedBy
      });

      this.metrics.incrementCounter('rbac_role_assignments');

      return true;

    } catch (error) {
      this.errorManager.handleError(error as Error, {
        operation: 'assign_role',
        component: 'rbac_service',
        metadata: params
      });
      return false;
    }
  }

  // Remove role from user
  async removeRole(userId: string, roleId: string): Promise<boolean> {
    try {
      const result = await this.db.update<UserRole>('user_roles',
        { isActive: false },
        { userId, roleId, isActive: true }
      );

      this.logger.info('Role removed from user', {
        userId,
        roleId,
        affectedRows: result.length
      });

      this.metrics.incrementCounter('rbac_role_removals');

      return result.length > 0;

    } catch (error) {
      this.errorManager.handleError(error as Error, {
        operation: 'remove_role',
        component: 'rbac_service',
        metadata: { userId, roleId }
      });
      return false;
    }
  }

  // Get user's active roles
  async getUserRoles(userId: string): Promise<Role[]> {
    try {
      const result = await this.db.query<Role>(`
        SELECT r.* FROM roles r
        JOIN user_roles ur ON r.id = ur.role_id
        WHERE ur.user_id = $1 
          AND ur.is_active = true 
          AND r.is_active = true
          AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
        ORDER BY r.level DESC
      `, [userId]);

      return result.rows;

    } catch (error) {
      this.errorManager.handleError(error as Error, {
        operation: 'get_user_roles',
        component: 'rbac_service',
        metadata: { userId }
      });
      return [];
    }
  }

  // Get user's effective permissions
  async getUserPermissions(userId: string): Promise<Permission[]> {
    try {
      const roles = await this.getUserRoles(userId);
      const allPermissionIds = roles.flatMap(role => role.permissions);

      if (allPermissionIds.length === 0) {
        return [];
      }

      const result = await this.db.query<Permission>(`
        SELECT * FROM permissions 
        WHERE id = ANY($1)
        ORDER BY resource, action
      `, [allPermissionIds]);

      return result.rows;

    } catch (error) {
      this.errorManager.handleError(error as Error, {
        operation: 'get_user_permissions',
        component: 'rbac_service',
        metadata: { userId }
      });
      return [];
    }
  }

  // Create new permission
  async createPermission(params: {
    resource: string;
    action: string;
    description: string;
  }): Promise<Permission | null> {
    try {
      const permission = await this.db.insert<Permission>('permissions', {
        id: crypto.randomUUID(),
        name: `${params.resource}:${params.action}`,
        resource: params.resource,
        action: params.action,
        description: params.description,
        createdAt: new Date()
      });

      this.logger.info('Permission created', {
        permissionId: permission.id,
        resource: params.resource,
        action: params.action
      });

      return permission;

    } catch (error) {
      this.errorManager.handleError(error as Error, {
        operation: 'create_permission',
        component: 'rbac_service',
        metadata: params
      });
      return null;
    }
  }

  // Create new role
  async createRole(params: {
    name: string;
    description: string;
    level: number;
    permissions: string[];
  }): Promise<Role | null> {
    try {
      const role = await this.db.insert<Role>('roles', {
        id: crypto.randomUUID(),
        name: params.name,
        description: params.description,
        level: params.level,
        permissions: params.permissions,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      this.logger.info('Role created', {
        roleId: role.id,
        name: params.name,
        level: params.level
      });

      return role;

    } catch (error) {
      this.errorManager.handleError(error as Error, {
        operation: 'create_role',
        component: 'rbac_service',
        metadata: params
      });
      return null;
    }
  }

  // Add permission to role
  async addPermissionToRole(roleId: string, permissionId: string): Promise<boolean> {
    try {
      const role = await this.db.findById<Role>('roles', roleId);
      if (!role) {
        return false;
      }

      const updatedPermissions = [...role.permissions, permissionId];

      await this.db.update<Role>('roles',
        {
          permissions: updatedPermissions,
          updatedAt: new Date()
        },
        { id: roleId }
      );

      this.logger.info('Permission added to role', {
        roleId,
        permissionId
      });

      return true;

    } catch (error) {
      this.errorManager.handleError(error as Error, {
        operation: 'add_permission_to_role',
        component: 'rbac_service',
        metadata: { roleId, permissionId }
      });
      return false;
    }
  }

  // Log access attempt for audit purposes
  private async logAccess(params: {
    userId: string;
    resource: string;
    action: string;
    granted: boolean;
    reason: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    try {
      await this.db.insert('access_logs', {
        id: crypto.randomUUID(),
        userId: params.userId,
        resource: params.resource,
        action: params.action,
        granted: params.granted,
        reason: params.reason,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        createdAt: new Date()
      });

    } catch (error) {
      // Don't throw here to avoid breaking the main access check
      this.logger.error('Failed to log access attempt', {
        error: error instanceof Error ? error.message : String(error),
        ...params
      });
    }
  }

  // Get access logs for audit (admin function)
  async getAccessLogs(params: {
    userId?: string;
    resource?: string;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    try {
      const whereConditions: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (params.userId) {
        whereConditions.push(`user_id = $${paramIndex++}`);
        values.push(params.userId);
      }

      if (params.resource) {
        whereConditions.push(`resource = $${paramIndex++}`);
        values.push(params.resource);
      }

      const whereClause = whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      const limitClause = params.limit ? `LIMIT $${paramIndex++}` : 'LIMIT 100';
      const offsetClause = params.offset ? `OFFSET $${paramIndex++}` : '';

      if (params.limit) values.push(params.limit);
      if (params.offset) values.push(params.offset);

      const result = await this.db.query(`
        SELECT * FROM access_logs 
        ${whereClause}
        ORDER BY created_at DESC
        ${limitClause} ${offsetClause}
      `, values);

      return result.rows;

    } catch (error) {
      this.errorManager.handleError(error as Error, {
        operation: 'get_access_logs',
        component: 'rbac_service',
        metadata: params
      });
      return [];
    }
  }

  // Get all permissions
  async getAllPermissions(): Promise<Permission[]> {
    try {
      const result = await this.db.findMany<Permission>('permissions', {}, {
        orderBy: 'resource'
      });
      return result;

    } catch (error) {
      this.errorManager.handleError(error as Error, {
        operation: 'get_all_permissions',
        component: 'rbac_service'
      });
      return [];
    }
  }

  // Get all roles
  async getAllRoles(): Promise<Role[]> {
    try {
      const result = await this.db.findMany<Role>('roles', { isActive: true }, {
        orderBy: 'level',
        orderDirection: 'DESC'
      });
      return result;

    } catch (error) {
      this.errorManager.handleError(error as Error, {
        operation: 'get_all_roles',
        component: 'rbac_service'
      });
      return [];
    }
  }

  // Clean up expired role assignments
  async cleanupExpiredRoles(): Promise<number> {
    try {
      const result = await this.db.query(`
        UPDATE user_roles 
        SET is_active = false 
        WHERE expires_at < NOW() AND is_active = true
      `);

      this.logger.info('Expired role assignments cleaned up', {
        affectedRows: result.rowCount
      });

      return result.rowCount;

    } catch (error) {
      this.errorManager.handleError(error as Error, {
        operation: 'cleanup_expired_roles',
        component: 'rbac_service'
      });
      return 0;
    }
  }
}

export default RBACService; 