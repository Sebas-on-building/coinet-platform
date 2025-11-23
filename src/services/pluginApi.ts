import axios, { AxiosError } from 'axios';
import { errorManager, ServiceError } from '../lib/errors/ErrorManager';

const PLUGIN_API_URL = process.env.PLUGIN_API_URL || 'https://api.coinet.com/plugins';

export interface Plugin {
  key: string;
  name: string;
  version: string;
  description: string;
  author: string;
  category: string;
  tags: string[];
  installed: boolean;
  enabled: boolean;
  permissions: string[];
  dependencies: string[];
  size: number;
  lastUpdated: string;
  rating: number;
  downloads: number;
  verified: boolean;
}

export interface PluginDetails extends Plugin {
  documentation: string;
  changelog: string;
  screenshots: string[];
  supportUrl: string;
  repository: string;
  license: string;
  configuration: Record<string, any>;
}

export interface PluginInstallResult {
  success: boolean;
  plugin: Plugin;
  message: string;
  warnings?: string[];
}

export interface PluginOperation {
  pluginKey: string;
  operation: 'install' | 'uninstall' | 'enable' | 'disable' | 'update';
  timestamp: string;
  userId?: string;
  success: boolean;
  error?: string;
}

class PluginApiService {
  private static instance: PluginApiService;
  private auditLog: PluginOperation[] = [];
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private constructor() { }

  static getInstance(): PluginApiService {
    if (!PluginApiService.instance) {
      PluginApiService.instance = new PluginApiService();
    }
    return PluginApiService.instance;
  }

  private async makeRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any,
    options: { skipCache?: boolean; timeout?: number } = {}
  ): Promise<T> {
    const cacheKey = `${method}:${endpoint}:${JSON.stringify(data)}`;

    // Check cache for GET requests
    if (method === 'GET' && !options.skipCache) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.data;
      }
    }

    try {
      const response = await axios({
        method,
        url: `${PLUGIN_API_URL}${endpoint}`,
        data,
        timeout: options.timeout || 10000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Coinet-Plugin-Client/1.0',
        },
      });

      // Cache successful GET responses
      if (method === 'GET') {
        this.cache.set(cacheKey, {
          data: response.data,
          timestamp: Date.now(),
        });
      }

      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;

      errorManager.handleError(axiosError, {
        operation: `plugin_api_${method.toLowerCase()}`,
        component: 'plugin_api_service',
        metadata: { endpoint, data, status: axiosError.response?.status }
      });

      if (axiosError.response?.status === 404) {
        throw new ServiceError('PLUGIN_NOT_FOUND', `Plugin not found: ${endpoint}`, axiosError);
      }

      if (axiosError.response?.status === 403) {
        throw new ServiceError('PLUGIN_PERMISSION_DENIED', 'Insufficient permissions for plugin operation', axiosError);
      }

      if (axiosError.response?.status === 409) {
        throw new ServiceError('PLUGIN_CONFLICT', 'Plugin operation conflict', axiosError);
      }

      throw new ServiceError('PLUGIN_API_ERROR', `Plugin API request failed: ${axiosError.message}`, axiosError);
    }
  }

  private logOperation(operation: PluginOperation): void {
    this.auditLog.push(operation);

    // Keep only last 1000 operations
    if (this.auditLog.length > 1000) {
      this.auditLog.shift();
    }

    // Log to central error management system
    errorManager.handleError(
      new Error(`Plugin operation: ${operation.operation} for ${operation.pluginKey}`),
      {
        operation: 'plugin_audit_log',
        component: 'plugin_api_service',
        metadata: operation
      }
    );
  }

  async fetchPlugins(options: {
    category?: string;
    search?: string;
    limit?: number;
    offset?: number;
    sortBy?: 'name' | 'rating' | 'downloads' | 'updated';
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<Plugin[]> {
    try {
      const queryParams = new URLSearchParams();

      if (options.category) queryParams.append('category', options.category);
      if (options.search) queryParams.append('search', options.search);
      if (options.limit) queryParams.append('limit', options.limit.toString());
      if (options.offset) queryParams.append('offset', options.offset.toString());
      if (options.sortBy) queryParams.append('sortBy', options.sortBy);
      if (options.sortOrder) queryParams.append('sortOrder', options.sortOrder);

      const endpoint = `/list${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await this.makeRequest<{ plugins: Plugin[] }>('GET', endpoint);

      return response.plugins;
    } catch (error) {
      errorManager.handleError(error as Error, {
        operation: 'fetchPlugins',
        component: 'plugin_api_service',
        metadata: { options }
      });
      throw error;
    }
  }

  async installPlugin(pluginKey: string, userId?: string): Promise<PluginInstallResult> {
    const operation: PluginOperation = {
      pluginKey,
      operation: 'install',
      timestamp: new Date().toISOString(),
      userId,
      success: false,
    };

    try {
      // Check if plugin already installed
      const existingPlugin = await this.getPluginDetails(pluginKey);
      if (existingPlugin.installed) {
        throw new ServiceError('PLUGIN_ALREADY_INSTALLED', `Plugin ${pluginKey} is already installed`);
      }

      const response = await this.makeRequest<PluginInstallResult>('POST', '/install', { pluginKey });

      operation.success = response.success;
      this.logOperation(operation);

      // Clear cache after successful installation
      this.clearCache();

      return response;
    } catch (error) {
      operation.error = (error as Error).message;
      this.logOperation(operation);
      throw error;
    }
  }

  async uninstallPlugin(pluginKey: string, userId?: string): Promise<PluginInstallResult> {
    const operation: PluginOperation = {
      pluginKey,
      operation: 'uninstall',
      timestamp: new Date().toISOString(),
      userId,
      success: false,
    };

    try {
      const response = await this.makeRequest<PluginInstallResult>('POST', '/uninstall', { pluginKey });

      operation.success = response.success;
      this.logOperation(operation);

      // Clear cache after successful uninstallation
      this.clearCache();

      return response;
    } catch (error) {
      operation.error = (error as Error).message;
      this.logOperation(operation);
      throw error;
    }
  }

  async enablePlugin(pluginKey: string, userId?: string): Promise<PluginInstallResult> {
    const operation: PluginOperation = {
      pluginKey,
      operation: 'enable',
      timestamp: new Date().toISOString(),
      userId,
      success: false,
    };

    try {
      const response = await this.makeRequest<PluginInstallResult>('POST', '/enable', { pluginKey });

      operation.success = response.success;
      this.logOperation(operation);

      return response;
    } catch (error) {
      operation.error = (error as Error).message;
      this.logOperation(operation);
      throw error;
    }
  }

  async disablePlugin(pluginKey: string, userId?: string): Promise<PluginInstallResult> {
    const operation: PluginOperation = {
      pluginKey,
      operation: 'disable',
      timestamp: new Date().toISOString(),
      userId,
      success: false,
    };

    try {
      const response = await this.makeRequest<PluginInstallResult>('POST', '/disable', { pluginKey });

      operation.success = response.success;
      this.logOperation(operation);

      return response;
    } catch (error) {
      operation.error = (error as Error).message;
      this.logOperation(operation);
      throw error;
    }
  }

  async updatePlugin(pluginKey: string, userId?: string): Promise<PluginInstallResult> {
    const operation: PluginOperation = {
      pluginKey,
      operation: 'update',
      timestamp: new Date().toISOString(),
      userId,
      success: false,
    };

    try {
      const response = await this.makeRequest<PluginInstallResult>('POST', '/update', { pluginKey });

      operation.success = response.success;
      this.logOperation(operation);

      // Clear cache after successful update
      this.clearCache();

      return response;
    } catch (error) {
      operation.error = (error as Error).message;
      this.logOperation(operation);
      throw error;
    }
  }

  async getPluginDetails(pluginKey: string, skipCache: boolean = false): Promise<PluginDetails> {
    try {
      const response = await this.makeRequest<PluginDetails>('GET', `/details/${pluginKey}`, undefined, { skipCache });
      return response;
    } catch (error) {
      errorManager.handleError(error as Error, {
        operation: 'getPluginDetails',
        component: 'plugin_api_service',
        metadata: { pluginKey }
      });
      throw error;
    }
  }

  async getInstalledPlugins(): Promise<Plugin[]> {
    try {
      const response = await this.makeRequest<{ plugins: Plugin[] }>('GET', '/installed');
      return response.plugins;
    } catch (error) {
      errorManager.handleError(error as Error, {
        operation: 'getInstalledPlugins',
        component: 'plugin_api_service'
      });
      throw error;
    }
  }

  async searchPlugins(query: string, filters: {
    category?: string;
    minRating?: number;
    verified?: boolean;
  } = {}): Promise<Plugin[]> {
    try {
      const searchParams = { query, ...filters };
      const response = await this.makeRequest<{ plugins: Plugin[] }>('POST', '/search', searchParams);
      return response.plugins;
    } catch (error) {
      errorManager.handleError(error as Error, {
        operation: 'searchPlugins',
        component: 'plugin_api_service',
        metadata: { query, filters }
      });
      throw error;
    }
  }

  // Audit and monitoring methods
  getAuditLog(): PluginOperation[] {
    return [...this.auditLog];
  }

  getPluginStats(): {
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    operationsByType: Record<string, number>;
  } {
    const totalOperations = this.auditLog.length;
    const successfulOperations = this.auditLog.filter(op => op.success).length;
    const failedOperations = totalOperations - successfulOperations;

    const operationsByType = this.auditLog.reduce((acc, op) => {
      acc[op.operation] = (acc[op.operation] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalOperations,
      successfulOperations,
      failedOperations,
      operationsByType,
    };
  }

  clearCache(): void {
    this.cache.clear();
  }

  // Health check
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; latency: number }> {
    const startTime = Date.now();

    try {
      await this.makeRequest<any>('GET', '/health', undefined, { timeout: 5000 });
      return {
        status: 'healthy',
        latency: Date.now() - startTime,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        latency: Date.now() - startTime,
      };
    }
  }
}

// Export singleton instance and legacy functions for backward compatibility
const pluginApiService = PluginApiService.getInstance();

export { pluginApiService };

// Legacy exports for backward compatibility
export const fetchPlugins = (options?: Parameters<typeof pluginApiService.fetchPlugins>[0]) =>
  pluginApiService.fetchPlugins(options);

export const installPlugin = (pluginKey: string, userId?: string) =>
  pluginApiService.installPlugin(pluginKey, userId);

export const uninstallPlugin = (pluginKey: string, userId?: string) =>
  pluginApiService.uninstallPlugin(pluginKey, userId);

export const getPluginDetails = (pluginKey: string, skipCache?: boolean) =>
  pluginApiService.getPluginDetails(pluginKey, skipCache); 