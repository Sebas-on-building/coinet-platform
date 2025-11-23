/**
 * =========================================
 * ENTERPRISE ENCRYPTION SERVICE
 * =========================================
 * Divine world-class enterprise encryption service
 * AES-256 + Quantum-resistant encryption with HSM integration
 * Zero-trust architecture with advanced key management
 */

import * as express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { Logger, createLogger } from './utils/Logger';
import { QuantumResistantEncryptionEngine } from './core/QuantumResistantEncryptionEngine';
import { HardwareSecurityModule } from './core/HardwareSecurityModule';
import { KeyManagementSystem } from './core/KeyManagementSystem';
import { EncryptionOrchestrator } from './core/EncryptionOrchestrator';
import { EnterpriseEncryptionConfig } from './types';

interface AuthenticatedRequest extends express.Request {
  user?: {
    id: string;
    email: string;
    role: string;
    tenantId?: string;
  };
  id?: string;
}

export class EnterpriseEncryptionService {
  private logger: Logger;
  private config: EnterpriseEncryptionConfig;
  private app: express.Application;
  private server: any;

  // Core encryption components
  private quantumEngine: QuantumResistantEncryptionEngine;
  private hsm: HardwareSecurityModule;
  private kms: KeyManagementSystem;
  private orchestrator: EncryptionOrchestrator;

  // Health and monitoring
  private isHealthy: boolean = false;
  private lastHealthCheck: number = 0;
  private encryptionStats = {
    totalOperations: 0,
    successfulOperations: 0,
    failedOperations: 0,
    averageLatency: 0,
    lastOperation: null as Date | null,
  };

  constructor(config: EnterpriseEncryptionConfig) {
    this.logger = createLogger('EnterpriseEncryptionService');
    this.config = config;
    this.app = express();

    // Initialize core components
    this.quantumEngine = new QuantumResistantEncryptionEngine(config.encryption);
    this.hsm = new HardwareSecurityModule(config.hsm);
    this.kms = new KeyManagementSystem(config.kms);
    this.orchestrator = new EncryptionOrchestrator({
      quantumEngine: this.quantumEngine,
      hsm: this.hsm,
      kms: this.kms,
      config: config.encryption,
    });

    this.setupMiddleware();
    this.setupRoutes();
    this.setupHealthMonitoring();
  }

  /**
   * Set up security middleware
   */
  private setupMiddleware(): void {
    // Security headers
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }));

    // CORS for enterprise API access
    this.app.use(cors({
      origin: (origin, callback) => {
        const allowedOrigins = [
          'https://coinet.ai',
          'https://app.coinet.ai',
          'https://admin.coinet.ai',
          'http://localhost:3000',
          'http://localhost:3001',
        ];

        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Origin', 'X-Requested-With', 'Content-Type', 'Accept',
        'Authorization', 'X-API-Key', 'X-Encryption-Key-ID'
      ],
    }));

    // Body parsing and compression
    this.app.use(compression());
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // Request ID middleware
    this.app.use((req: AuthenticatedRequest, res, next) => {
      req.id = `enc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      next();
    });

    // Request logging for audit
    this.app.use((req: AuthenticatedRequest, res, next) => {
      const start = Date.now();

      this.logger.debug('Encryption request received', {
        requestId: req.id,
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.on('finish', () => {
        const duration = Date.now() - start;
        this.updateStats(duration, res.statusCode < 400);

        this.logger.info('Encryption request completed', {
          requestId: req.id,
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration: `${duration}ms`,
        });
      });

      next();
    });
  }

  /**
   * Set up API routes
   */
  private setupRoutes(): void {
    // Health check
    this.app.get('/health', this.handleHealthCheck.bind(this));

    // Encryption endpoints
    this.app.post('/encrypt', this.handleEncrypt.bind(this));
    this.app.post('/decrypt', this.handleDecrypt.bind(this));
    this.app.post('/encrypt/batch', this.handleBatchEncrypt.bind(this));
    this.app.post('/decrypt/batch', this.handleBatchDecrypt.bind(this));

    // Key management endpoints
    this.app.post('/keys/generate', this.handleGenerateKey.bind(this));
    this.app.get('/keys/:keyId', this.handleGetKey.bind(this));
    this.app.post('/keys/:keyId/rotate', this.handleRotateKey.bind(this));

    // Statistics and monitoring
    this.app.get('/stats', this.handleGetStats.bind(this));
    this.app.get('/metrics', this.handleGetMetrics.bind(this));

    // Compliance and audit
    this.app.get('/audit/logs', this.handleGetAuditLogs.bind(this));
    this.app.get('/compliance/report', this.handleGetComplianceReport.bind(this));

    // HSM operations
    this.app.post('/hsm/generate-key', this.handleHSMGenerateKey.bind(this));
    this.app.post('/hsm/sign', this.handleHSMSign.bind(this));
  }

  /**
   * Set up health monitoring
   */
  private setupHealthMonitoring(): void {
    // Health check every 30 seconds
    setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error: any) {
        this.logger.error('Health check failed', error);
        this.isHealthy = false;
      }
    }, 30000);

    // Performance monitoring every minute
    setInterval(() => {
      this.logPerformanceMetrics();
    }, 60000);
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    this.logger.info('🚀 Initializing Enterprise Encryption Service...', {
      environment: this.config.environment,
      quantumResistant: this.config.encryption.quantumResistant,
      hsmEnabled: this.config.hsm.enabled,
    });

    try {
      // Initialize all components
      await Promise.all([
        this.quantumEngine.initialize(),
        this.hsm.initialize(),
        this.kms.initialize(),
        this.orchestrator.initialize(),
      ]);

      // Perform initial health check
      await this.performHealthCheck();

      this.logger.info('✅ Enterprise Encryption Service initialized successfully');
    } catch (error: any) {
      this.logger.error('❌ Failed to initialize Enterprise Encryption Service', error);
      throw error;
    }
  }

  /**
   * Start the service
   */
  async start(port?: number): Promise<void> {
    const serverPort = port || this.config.port;

    return new Promise((resolve, reject) => {
      this.server = this.app.listen(serverPort, () => {
        this.logger.info('✅ Enterprise Encryption Service started successfully', {
          port: serverPort,
          environment: this.config.environment,
          quantumResistant: this.config.encryption.quantumResistant,
        });

        resolve();
      });

      this.server.on('error', (error: any) => {
        this.logger.error('Server startup failed', error);
        reject(error);
      });
    });
  }

  /**
   * Shutdown the service
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Enterprise Encryption Service...');

    try {
      if (this.server) {
        this.server.close();
      }

      await Promise.all([
        this.quantumEngine.shutdown(),
        this.hsm.shutdown(),
        this.kms.shutdown(),
        this.orchestrator.shutdown(),
      ]);

      this.logger.info('✅ Enterprise Encryption Service shutdown successfully');
    } catch (error: any) {
      this.logger.error('Error during Enterprise Encryption Service shutdown', error);
      throw error;
    }
  }

  // Route handlers

  private async handleHealthCheck(req: AuthenticatedRequest, res: express.Response): Promise<void> {
    const health = await this.performHealthCheck();
    res.json({
      status: health.status,
      service: 'enterprise-encryption-service',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      components: health.components,
    });
  }

  private async handleEncrypt(req: AuthenticatedRequest, res: any): Promise<void> {
    try {
      const { data, dataType, userId, algorithm, metadata } = req.body;

      if (!data || !dataType || !userId) {
        res.status(400).json({ error: 'Missing required fields: data, dataType, userId' });
        return;
      }

      const result = await this.orchestrator.encrypt({
        data,
        dataType: dataType as any,
        userId,
        algorithm: algorithm as any,
        metadata,
      });

      res.json({
        success: true,
        data: result,
        requestId: req.id,
      });
    } catch (error: any) {
      this.logger.error('Encryption request failed', error, { requestId: req.id });
      res.status(500).json({
        error: 'Encryption failed',
        requestId: req.id,
      });
    }
  }

  private async handleDecrypt(req: AuthenticatedRequest, res: any): Promise<void> {
    try {
      const { encryptedData, keyId, userId, dataType } = req.body;

      if (!encryptedData || !keyId || !userId || !dataType) {
        res.status(400).json({ error: 'Missing required fields: encryptedData, keyId, userId, dataType' });
        return;
      }

      const result = await this.orchestrator.decrypt({
        encryptedData,
        keyId,
        userId,
        dataType: dataType as any,
      });

      res.json({
        success: true,
        data: result,
        requestId: req.id,
      });
    } catch (error: any) {
      this.logger.error('Decryption request failed', error, { requestId: req.id });
      res.status(500).json({
        error: 'Decryption failed',
        requestId: req.id,
      });
    }
  }

  private async handleBatchEncrypt(req: AuthenticatedRequest, res: any): Promise<void> {
    try {
      const { requests } = req.body;

      if (!Array.isArray(requests) || requests.length === 0) {
        res.status(400).json({ error: 'Batch requests must be a non-empty array' });
        return;
      }

      const results = await this.orchestrator.encryptBatch(requests);

      res.json({
        success: true,
        data: results,
        requestId: req.id,
        batchSize: requests.length,
      });
    } catch (error: any) {
      this.logger.error('Batch encryption failed', error, { requestId: req.id });
      res.status(500).json({
        error: 'Batch encryption failed',
        requestId: req.id,
      });
    }
  }

  private async handleBatchDecrypt(req: AuthenticatedRequest, res: any): Promise<void> {
    try {
      const { requests } = req.body;

      if (!Array.isArray(requests) || requests.length === 0) {
        res.status(400).json({ error: 'Batch requests must be a non-empty array' });
        return;
      }

      const results = await this.orchestrator.decryptBatch(requests);

      res.json({
        success: true,
        data: results,
        requestId: req.id,
        batchSize: requests.length,
      });
    } catch (error: any) {
      this.logger.error('Batch decryption failed', error, { requestId: req.id });
      res.status(500).json({
        error: 'Batch decryption failed',
        requestId: req.id,
      });
    }
  }

  private async handleGenerateKey(req: AuthenticatedRequest, res: any): Promise<void> {
    try {
      const { keyType, purpose, userId, metadata } = req.body;

      if (!keyType || !purpose || !userId) {
        res.status(400).json({ error: 'Missing required fields: keyType, purpose, userId' });
        return;
      }

      const keySize = keyType === 'AES' ? 256 : keyType === 'RSA' ? 2048 : 256;

      const result = await this.kms.generateKey({
        keyType: keyType as any,
        keySize,
        purpose,
        userId,
        metadata,
      });

      res.json({
        success: true,
        data: result,
        requestId: req.id,
      });
    } catch (error: any) {
      this.logger.error('Key generation failed', error, { requestId: req.id });
      res.status(500).json({
        error: 'Key generation failed',
        requestId: req.id,
      });
    }
  }

  private async handleGetKey(req: AuthenticatedRequest, res: any): Promise<void> {
    try {
      const { keyId } = req.params;
      const userId = req.query.userId as string;

      if (!userId) {
        res.status(400).json({ error: 'User ID is required' });
        return;
      }

      const result = await this.kms.getKey(keyId, userId);

      res.json({
        success: true,
        data: result,
        requestId: req.id,
      });
    } catch (error: any) {
      this.logger.error('Key retrieval failed', error, { requestId: req.id });
      res.status(500).json({
        error: 'Key retrieval failed',
        requestId: req.id,
      });
    }
  }

  private async handleRotateKey(req: AuthenticatedRequest, res: any): Promise<void> {
    try {
      const { keyId } = req.params;
      const { userId } = req.body;

      if (!userId) {
        res.status(400).json({ error: 'User ID is required' });
        return;
      }

      const result = await this.kms.rotateKey(keyId, userId);

      res.json({
        success: true,
        data: result,
        requestId: req.id,
      });
    } catch (error: any) {
      this.logger.error('Key rotation failed', error, { requestId: req.id });
      res.status(500).json({
        error: 'Key rotation failed',
        requestId: req.id,
      });
    }
  }

  private async handleGetStats(req: AuthenticatedRequest, res: any): Promise<void> {
    res.json({
      success: true,
      data: this.encryptionStats,
      requestId: req.id,
    });
  }

  private async handleGetMetrics(req: AuthenticatedRequest, res: any): Promise<void> {
    const metrics = await this.orchestrator.getMetrics();
    res.json({
      success: true,
      data: metrics,
      requestId: req.id,
    });
  }

  private async handleGetAuditLogs(req: AuthenticatedRequest, res: any): Promise<void> {
    const logs = await this.kms.getAuditLogs(req.query);
    res.json({
      success: true,
      data: logs,
      requestId: req.id,
    });
  }

  private async handleGetComplianceReport(req: AuthenticatedRequest, res: any): Promise<void> {
    const report = await this.kms.getComplianceReport();
    res.json({
      success: true,
      data: report,
      requestId: req.id,
    });
  }

  private async handleHSMGenerateKey(req: AuthenticatedRequest, res: any): Promise<void> {
    try {
      const { keyType, purpose, metadata } = req.body;

      const keySize = keyType === 'AES' ? 256 : keyType === 'RSA' ? 2048 : 256;

      const result = await this.hsm.generateKey({
        keyType: keyType as any,
        keySize,
        purpose,
        metadata,
      });

      res.json({
        success: true,
        data: result,
        requestId: req.id,
      });
    } catch (error: any) {
      this.logger.error('HSM key generation failed', error, { requestId: req.id });
      res.status(500).json({
        error: 'HSM key generation failed',
        requestId: req.id,
      });
    }
  }

  private async handleHSMSign(req: AuthenticatedRequest, res: any): Promise<void> {
    try {
      const { keyId, data, algorithm } = req.body;

      const result = await this.hsm.sign({
        keyId,
        data,
        algorithm: algorithm as any,
      });

      res.json({
        success: true,
        data: result,
        requestId: req.id,
      });
    } catch (error: any) {
      this.logger.error('HSM signing failed', error, { requestId: req.id });
      res.status(500).json({
        error: 'HSM signing failed',
        requestId: req.id,
      });
    }
  }

  /**
   * Perform comprehensive health check
   */
  private async performHealthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    components: Record<string, any>;
  }> {
    this.lastHealthCheck = Date.now();

    try {
      const componentHealth = await Promise.all([
        this.quantumEngine.healthCheck(),
        this.hsm.healthCheck(),
        this.kms.healthCheck(),
        this.orchestrator.healthCheck(),
      ]);

      const components = {
        quantumEngine: componentHealth[0],
        hsm: componentHealth[1],
        kms: componentHealth[2],
        orchestrator: componentHealth[3],
      };

      // Determine overall health
      const unhealthyComponents = Object.entries(components)
        .filter(([, health]) => health.status === 'unhealthy');

      let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

      if (unhealthyComponents.length > 0) {
        overallStatus = unhealthyComponents.length === Object.keys(components).length ?
          'unhealthy' : 'degraded';
      }

      this.isHealthy = overallStatus === 'healthy';

      return {
        status: overallStatus,
        components,
      };
    } catch (error: any) {
      this.logger.error('Health check failed', error);
      return {
        status: 'unhealthy',
        components: {},
      };
    }
  }

  /**
   * Update encryption statistics
   */
  private updateStats(duration: number, success: boolean): void {
    this.encryptionStats.totalOperations++;
    if (success) {
      this.encryptionStats.successfulOperations++;
    } else {
      this.encryptionStats.failedOperations++;
    }

    // Update average latency
    const totalLatency = this.encryptionStats.averageLatency * (this.encryptionStats.totalOperations - 1) + duration;
    this.encryptionStats.averageLatency = totalLatency / this.encryptionStats.totalOperations;
    this.encryptionStats.lastOperation = new Date();
  }

  /**
   * Log performance metrics
   */
  private logPerformanceMetrics(): void {
    const successRate = this.encryptionStats.totalOperations > 0 ?
      (this.encryptionStats.successfulOperations / this.encryptionStats.totalOperations * 100) : 0;

    this.logger.info('Performance metrics', {
      totalOperations: this.encryptionStats.totalOperations,
      successRate: `${successRate.toFixed(2)}%`,
      averageLatency: `${this.encryptionStats.averageLatency.toFixed(2)}ms`,
      failedOperations: this.encryptionStats.failedOperations,
    });
  }

  /**
   * Get service configuration
   */
  getConfig(): EnterpriseEncryptionConfig {
    return this.config;
  }

  /**
   * Get service health
   */
  async getHealth(): Promise<any> {
    return this.performHealthCheck();
  }
}

/**
 * Load configuration from environment variables
 */
export function loadConfig(): EnterpriseEncryptionConfig {
  return {
    port: parseInt(process.env.ENTERPRISE_ENCRYPTION_PORT || '8010'),
    host: process.env.ENTERPRISE_ENCRYPTION_HOST || '0.0.0.0',
    environment: (process.env.NODE_ENV as 'development' | 'staging' | 'production') || 'development',

    encryption: {
      algorithm: (process.env.ENCRYPTION_ALGORITHM as 'aes256' | 'quantum_resistant') || 'quantum_resistant',
      quantumResistant: process.env.QUANTUM_RESISTANT === 'true',
      keySize: parseInt(process.env.ENCRYPTION_KEY_SIZE || '256'),
      ivLength: parseInt(process.env.ENCRYPTION_IV_LENGTH || '16'),
      authTagLength: parseInt(process.env.ENCRYPTION_AUTH_TAG_LENGTH || '16'),
      keyRotationInterval: parseInt(process.env.ENCRYPTION_KEY_ROTATION_INTERVAL || '7776000000'), // 90 days
      maxKeyVersions: parseInt(process.env.ENCRYPTION_MAX_KEY_VERSIONS || '5'),
      batchSize: parseInt(process.env.ENCRYPTION_BATCH_SIZE || '100'),
      performanceThreshold: parseInt(process.env.ENCRYPTION_PERFORMANCE_THRESHOLD || '100'),
    },

    hsm: {
      enabled: process.env.HSM_ENABLED === 'true',
      provider: (process.env.HSM_PROVIDER as 'aws' | 'azure' | 'gcp' | 'thales') || 'aws',
      region: process.env.HSM_REGION || 'us-west-2',
      keyStore: process.env.HSM_KEY_STORE || 'coinet-hsm',
      timeout: parseInt(process.env.HSM_TIMEOUT || '30000'),
    },

    kms: {
      provider: (process.env.KMS_PROVIDER as 'aws' | 'azure' | 'gcp' | 'vault') || 'aws',
      region: process.env.KMS_REGION || 'us-west-2',
      keyRing: process.env.KMS_KEY_RING || 'coinet-key-ring',
      rotationInterval: parseInt(process.env.KMS_ROTATION_INTERVAL || '7776000000'),
    },

    security: {
      requireMFA: process.env.REQUIRE_MFA === 'true',
      auditAllOperations: process.env.AUDIT_ALL_OPERATIONS === 'true',
      dataClassification: {
        personal: { sensitivity: 'high', retention: '7_years' },
        device_token: { sensitivity: 'high', retention: '1_year' },
        api_key: { sensitivity: 'critical', retention: 'indefinite' },
        financial: { sensitivity: 'critical', retention: '7_years' },
        custom: { sensitivity: 'medium', retention: '5_years' },
      },
    },

    performance: {
      maxConcurrentOperations: parseInt(process.env.MAX_CONCURRENT_ENCRYPTIONS || '1000'),
      cacheSize: parseInt(process.env.ENCRYPTION_CACHE_SIZE || '10000'),
      cacheTTL: parseInt(process.env.ENCRYPTION_CACHE_TTL || '300'),
      enableCompression: process.env.ENABLE_COMPRESSION === 'true',
    },

    monitoring: {
      enabled: process.env.MONITORING_ENABLED === 'true',
      collectionInterval: parseInt(process.env.MONITORING_INTERVAL || '60000'),
      retentionDays: parseInt(process.env.MONITORING_RETENTION || '90'),
    },

    compliance: {
      gdpr: {
        enabled: process.env.GDPR_COMPLIANCE === 'true',
        dataRetentionDays: parseInt(process.env.GDPR_RETENTION_DAYS || '2555'),
        consentRequired: process.env.GDPR_CONSENT_REQUIRED === 'true',
      },
      sox: {
        enabled: process.env.SOX_COMPLIANCE === 'true',
        auditRetentionDays: parseInt(process.env.SOX_AUDIT_RETENTION || '2555'),
      },
      pci: {
        enabled: process.env.PCI_COMPLIANCE === 'true',
        keyRotationDays: parseInt(process.env.PCI_KEY_ROTATION_DAYS || '90'),
      },
    },
  };
}

/**
 * Main function for running the Enterprise Encryption Service
 */
async function main() {
  const logger = createLogger('EnterpriseEncryptionMain');

  try {
    const config = loadConfig();
    const service = new EnterpriseEncryptionService(config);

    logger.info('🚀 Starting Enterprise Encryption Service...');
    await service.initialize();
    await service.start();

    logger.info('✅ Enterprise Encryption Service started successfully');

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully...');
      await service.shutdown();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT received, shutting down gracefully...');
      await service.shutdown();
      process.exit(0);
    });

  } catch (error: any) {
    logger.error('❌ Failed to start Enterprise Encryption Service', error);
    process.exit(1);
  }
}

// Run service if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export default EnterpriseEncryptionService;
