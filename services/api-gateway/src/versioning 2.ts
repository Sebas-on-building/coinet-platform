/**
 * API Versioning System
 * Provides backward compatibility, version routing,
 * and smooth API evolution for the Coinet platform
 */

import { Request, Response, NextFunction } from 'express';

interface VersionConfig {
  version: string;
  deprecated?: boolean;
  deprecationDate?: Date;
  sunsetDate?: Date;
  changeLog?: string[];
  breaking?: boolean;
}

interface VersionRoute {
  path: string;
  method: string;
  versions: Record<string, {
    handler?: any;
    redirect?: string;
    transform?: (req: Request, res: Response) => void;
  }>;
}

export class APIVersionManager {
  private versions: Map<string, VersionConfig> = new Map();
  private routes: VersionRoute[] = [];
  private defaultVersion: string = 'v1';
  private supportedVersions: Set<string> = new Set();

  constructor(defaultVersion: string = 'v1') {
    this.defaultVersion = defaultVersion;
    this.setupDefaultVersions();
  }

  private setupDefaultVersions(): void {
    // Register default versions
    this.registerVersion('v1', {
      version: 'v1',
      deprecated: false,
      changeLog: ['Initial API version']
    });

    this.registerVersion('v2', {
      version: 'v2',
      deprecated: false,
      changeLog: ['Enhanced performance', 'New caching system', 'Improved error handling']
    });
  }

  /**
   * Register a new API version
   */
  registerVersion(version: string, config: VersionConfig): void {
    this.versions.set(version, config);
    this.supportedVersions.add(version);
    
    console.info(`Registered API version: ${version}`, {
      deprecated: config.deprecated,
      breaking: config.breaking
    });
  }

  /**
   * Extract version from request
   */
  private extractVersion(req: Request): string {
    // Try header first
    let version = req.headers['api-version'] as string;
    
    // Try URL path (/v1/api/...)
    if (!version) {
      const pathMatch = req.path.match(/^\/v(\d+)/);
      if (pathMatch) {
        version = `v${pathMatch[1]}`;
      }
    }

    // Try query parameter
    if (!version) {
      version = req.query.version as string;
    }

    // Try Accept header (application/vnd.coinet.v1+json)
    if (!version) {
      const acceptHeader = req.headers.accept;
      if (acceptHeader) {
        const versionMatch = acceptHeader.match(/vnd\.coinet\.v(\d+)/);
        if (versionMatch) {
          version = `v${versionMatch[1]}`;
        }
      }
    }

    return version || this.defaultVersion;
  }

  /**
   * Validate version
   */
  private validateVersion(version: string): { valid: boolean; message?: string } {
    if (!this.supportedVersions.has(version)) {
      return {
        valid: false,
        message: `Unsupported API version: ${version}. Supported versions: ${Array.from(this.supportedVersions).join(', ')}`
      };
    }

    const config = this.versions.get(version);
    if (!config) {
      return { valid: false, message: `Version configuration not found: ${version}` };
    }

    // Check if version is deprecated
    if (config.deprecated) {
      const now = new Date();
      
      // Check if sunset date has passed
      if (config.sunsetDate && now > config.sunsetDate) {
        return {
          valid: false,
          message: `API version ${version} has been sunset as of ${config.sunsetDate.toISOString()}`
        };
      }
    }

    return { valid: true };
  }

  /**
   * Transform request based on version
   */
  private transformRequest(req: Request, version: string): void {
    const config = this.versions.get(version);
    if (!config) return;

    // Add version info to request
    (req as any).apiVersion = version;
    (req as any).versionConfig = config;

    // Version-specific transformations
    switch (version) {
      case 'v1':
        // Legacy support - no transformation needed
        break;

      case 'v2':
        // Enhanced request format
        if (req.body && typeof req.body === 'object') {
          req.body.apiVersion = version;
          req.body.requestId = (req as any).id;
        }
        break;
    }
  }

  /**
   * Transform response based on version
   */
  private transformResponse(res: Response, version: string, data: any): any {
    const config = this.versions.get(version);
    if (!config) return data;

    switch (version) {
      case 'v1':
        // Legacy format - simple response
        return data;

      case 'v2':
        // Enhanced format with metadata
        return {
          data,
          meta: {
            version,
            timestamp: new Date().toISOString(),
            requestId: res.getHeader('X-Request-ID'),
            deprecated: config.deprecated || false
          }
        };

      default:
        return data;
    }
  }

  /**
   * Set version headers
   */
  private setVersionHeaders(res: Response, version: string): void {
    const config = this.versions.get(version);
    if (!config) return;

    res.setHeader('API-Version', version);
    res.setHeader('API-Supported-Versions', Array.from(this.supportedVersions).join(', '));

    if (config.deprecated) {
      res.setHeader('API-Deprecated', 'true');
      
      if (config.deprecationDate) {
        res.setHeader('API-Deprecation-Date', config.deprecationDate.toISOString());
      }
      
      if (config.sunsetDate) {
        res.setHeader('API-Sunset-Date', config.sunsetDate.toISOString());
      }
      
      res.setHeader('Warning', `299 - "API version ${version} is deprecated"`);
    }
  }

  /**
   * Version middleware
   */
  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        const version = this.extractVersion(req);
        const validation = this.validateVersion(version);

        if (!validation.valid) {
          return res.status(400).json({
            error: 'Invalid API Version',
            message: validation.message,
            supportedVersions: Array.from(this.supportedVersions),
            requestId: (req as any).id
          });
        }

        // Transform request
        this.transformRequest(req, version);

        // Set version headers
        this.setVersionHeaders(res, version);

        // Intercept JSON response to transform it
        const originalJson = res.json;
        res.json = (data: any) => {
          const transformedData = this.transformResponse(res, version, data);
          return originalJson.call(res, transformedData);
        };

        next();
      } catch (error) {
        console.error('Version middleware error:', error);
        next(error);
      }
    };
  }

  /**
   * Get version information
   */
  getVersionInfo(): Record<string, any> {
    const versionInfo: Record<string, any> = {};

    for (const [version, config] of this.versions.entries()) {
      versionInfo[version] = {
        version: config.version,
        deprecated: config.deprecated || false,
        deprecationDate: config.deprecationDate?.toISOString(),
        sunsetDate: config.sunsetDate?.toISOString(),
        breaking: config.breaking || false,
        changeLog: config.changeLog || []
      };
    }

    return {
      defaultVersion: this.defaultVersion,
      supportedVersions: Array.from(this.supportedVersions),
      versions: versionInfo
    };
  }

  /**
   * Deprecate a version
   */
  deprecateVersion(version: string, deprecationDate?: Date, sunsetDate?: Date): void {
    const config = this.versions.get(version);
    if (config) {
      config.deprecated = true;
      config.deprecationDate = deprecationDate || new Date();
      config.sunsetDate = sunsetDate;
      
      console.warn(`API version ${version} marked as deprecated`, {
        deprecationDate: config.deprecationDate.toISOString(),
        sunsetDate: config.sunsetDate?.toISOString()
      });
    }
  }

  /**
   * Get usage statistics by version
   */
  getUsageStats(): Record<string, { requests: number; percentage: number }> {
    // This would typically be populated by request tracking
    // For now, return empty stats
    return {};
  }
}

export default APIVersionManager;
