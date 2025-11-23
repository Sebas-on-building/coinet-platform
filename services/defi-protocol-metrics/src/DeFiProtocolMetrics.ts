/**
 * =========================================
 * DEFI PROTOCOL METRICS
 * =========================================
 * Main orchestration service for DeFi protocol metrics monitoring
 * across multiple protocols with real-time anomaly detection
 */

import { EventEmitter } from 'events';
import { TVLMetricsCollector } from './protocols/tvl/TVLMetricsCollector';
import { YieldMetricsCollector } from './protocols/yields/YieldMetricsCollector';
import { LendingMetricsCollector } from './protocols/lending/LendingMetricsCollector';
import { LiquidityMetricsCollector } from './protocols/liquidity/LiquidityMetricsCollector';
import { GovernanceMetricsCollector } from './protocols/governance/GovernanceMetricsCollector';
import { TokenUnlockMetricsCollector } from './protocols/token-unlocks/TokenUnlockMetricsCollector';
import { AnomalyDetector } from './anomaly-detection/AnomalyDetector';
import { SignalGenerator } from './signals/SignalGenerator';
import { HealthMonitor } from './monitoring/HealthMonitor';
import { MetricsCollector } from './monitoring/MetricsCollector';
import { CacheManager } from './caching/CacheManager';
import { Logger } from './utils/Logger';

import type {
  ProtocolInfo,
  TVLMetrics,
  YieldMetrics,
  LendingMetrics,
  LiquidityMetrics,
  GovernanceMetrics,
  TokenUnlockMetrics,
  AnomalyDetection,
  DeFiSignal,
  MetricsConfig,
  HealthStatus,
  StreamingEvent,
  ProcessingError,
  BackfillRequest,
  BackfillResult
} from './types';

export interface DeFiProtocolMetricsConfig {
  enabledProtocols: ProtocolInfo[];
  dataProviders: any[]; // DataProvider[]
  metricsConfig: MetricsConfig;
  signalThresholds: {
    tvlChange: number;     // percentage
    yieldChange: number;   // percentage
    lendingChange: number; // percentage
    liquidityChange: number; // percentage
    anomalyThreshold: number; // standard deviations
  };
}

export class DeFiProtocolMetrics extends EventEmitter {
  private tvlCollector: TVLMetricsCollector;
  private yieldCollector: YieldMetricsCollector;
  private lendingCollector: LendingMetricsCollector;
  private liquidityCollector: LiquidityMetricsCollector;
  private governanceCollector: GovernanceMetricsCollector;
  private tokenUnlockCollector: TokenUnlockMetricsCollector;
  private anomalyDetector: AnomalyDetector;
  private signalGenerator: SignalGenerator;
  private healthMonitor: HealthMonitor;
  private metricsCollector: MetricsCollector;
  private cacheManager: CacheManager;

  private logger: Logger;
  private config: DeFiProtocolMetricsConfig;
  private isRunning: boolean = false;
  private activeProtocols: Map<string, ProtocolInfo> = new Map();

  // Performance tracking
  private metricsProcessed: number = 0;
  private startTime: number = Date.now();
  private processingLatencies: number[] = [];

  constructor(config?: Partial<DeFiProtocolMetricsConfig>) {
    super();
    this.logger = new Logger('DeFiProtocolMetrics');

    // Default configuration
    this.config = {
      enabledProtocols: [], // Will be populated with major DeFi protocols
      dataProviders: [], // Will be configured with API providers
      metricsConfig: {
        updateInterval: 60000, // 1 minute
        anomalyThreshold: 2.0, // 2 standard deviations
        minDataPoints: 24,     // 24 data points for baseline
        cacheTtl: 300,         // 5 minutes
        rateLimit: {
          requestsPerMinute: 60,
          requestsPerHour: 1000
        },
        backfillDays: 30
      },
      signalThresholds: {
        tvlChange: 5.0,        // 5% TVL change triggers signal
        yieldChange: 2.0,      // 2% yield change triggers signal
        lendingChange: 1.0,    // 1% lending rate change triggers signal
        liquidityChange: 10.0, // 10% liquidity change triggers signal
        anomalyThreshold: 3.0  // 3σ anomaly threshold
      },
      ...config
    };

    // Initialize collectors
    this.tvlCollector = new TVLMetricsCollector(this.config.enabledProtocols);
    this.yieldCollector = new YieldMetricsCollector(this.config.enabledProtocols);
    this.lendingCollector = new LendingMetricsCollector(this.config.enabledProtocols);
    this.liquidityCollector = new LiquidityMetricsCollector(this.config.enabledProtocols);
    this.governanceCollector = new GovernanceMetricsCollector(this.config.enabledProtocols);
    this.tokenUnlockCollector = new TokenUnlockMetricsCollector(this.config.enabledProtocols);
    this.anomalyDetector = new AnomalyDetector(this.config.metricsConfig);
    this.signalGenerator = new SignalGenerator(this.config.signalThresholds);
    this.healthMonitor = new HealthMonitor();
    this.metricsCollector = new MetricsCollector();
    this.cacheManager = new CacheManager(this.config.metricsConfig.cacheTtl);

    this.setupEventHandlers();
  }

  /**
   * Start the DeFi protocol metrics service
   */
  async start(): Promise<void> {
    try {
      this.logger.info('Starting DeFi Protocol Metrics Monitor...');

      // Initialize all components
      await this.tvlCollector.initialize();
      await this.yieldCollector.initialize();
      await this.lendingCollector.initialize();
      await this.liquidityCollector.initialize();
      await this.governanceCollector.initialize();
      await this.tokenUnlockCollector.initialize();
      await this.anomalyDetector.initialize();
      await this.signalGenerator.initialize();
      await this.healthMonitor.initialize();
      await this.metricsCollector.initialize();
      await this.cacheManager.initialize();

      // Set up protocol monitoring
      this.setupProtocolMonitoring();

      // Start metric collection cycles
      this.startMetricsCollection();

      this.isRunning = true;
      this.startTime = Date.now();

      this.logger.info('✅ DeFi Protocol Metrics Monitor started successfully');
      this.logger.info(`Monitoring ${this.config.enabledProtocols.length} protocols`);

    } catch (error: any) {
      this.logger.error('❌ Failed to start DeFi Protocol Metrics Monitor', error);
      throw error;
    }
  }

  /**
   * Stop the DeFi protocol metrics service
   */
  async stop(): Promise<void> {
    try {
      this.logger.info('Stopping DeFi Protocol Metrics Monitor...');

      // Stop metric collection cycles
      this.stopMetricsCollection();

      // Stop all collectors
      await this.tvlCollector.stop();
      await this.yieldCollector.stop();
      await this.lendingCollector.stop();
      await this.liquidityCollector.stop();
      await this.governanceCollector.stop();
      await this.tokenUnlockCollector.stop();
      await this.anomalyDetector.stop();
      await this.signalGenerator.stop();
      await this.healthMonitor.stop();
      await this.metricsCollector.stop();
      await this.cacheManager.stop();

      this.isRunning = false;
      this.logger.info('✅ DeFi Protocol Metrics Monitor stopped successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to stop DeFi Protocol Metrics Monitor', error);
      throw error;
    }
  }

  /**
   * Get current TVL metrics for all protocols
   */
  async getTVLMetrics(protocols?: string[]): Promise<TVLMetrics[]> {
    const targetProtocols = protocols
      ? this.config.enabledProtocols.filter(p => protocols.includes(p.id))
      : this.config.enabledProtocols;

    const metrics: TVLMetrics[] = [];

    for (const protocol of targetProtocols) {
      try {
        const tvlMetrics = await this.tvlCollector.getMetrics(protocol.id);
        if (tvlMetrics) {
          metrics.push(tvlMetrics);
        }
      } catch (error: any) {
        this.logger.error(`Failed to get TVL metrics for ${protocol.id}`, error);
      }
    }

    return metrics;
  }

  /**
   * Get current yield metrics for all protocols
   */
  async getYieldMetrics(protocols?: string[]): Promise<YieldMetrics[]> {
    const targetProtocols = protocols
      ? this.config.enabledProtocols.filter(p => protocols.includes(p.id))
      : this.config.enabledProtocols;

    const metrics: YieldMetrics[] = [];

    for (const protocol of targetProtocols) {
      try {
        const yieldMetrics = await this.yieldCollector.getMetrics(protocol.id);
        if (yieldMetrics) {
          metrics.push(...yieldMetrics); // Multiple pools per protocol
        }
      } catch (error: any) {
        this.logger.error(`Failed to get yield metrics for ${protocol.id}`, error);
      }
    }

    return metrics;
  }

  /**
   * Get current lending metrics for all protocols
   */
  async getLendingMetrics(protocols?: string[]): Promise<LendingMetrics[]> {
    const targetProtocols = protocols
      ? this.config.enabledProtocols.filter(p => protocols.includes(p.id))
      : this.config.enabledProtocols;

    const metrics: LendingMetrics[] = [];

    for (const protocol of targetProtocols) {
      try {
        const lendingMetrics = await this.lendingCollector.getMetrics(protocol.id);
        if (lendingMetrics) {
          metrics.push(...lendingMetrics); // Multiple pools per protocol
        }
      } catch (error: any) {
        this.logger.error(`Failed to get lending metrics for ${protocol.id}`, error);
      }
    }

    return metrics;
  }

  /**
   * Get current liquidity metrics for all protocols
   */
  async getLiquidityMetrics(protocols?: string[]): Promise<LiquidityMetrics[]> {
    const targetProtocols = protocols
      ? this.config.enabledProtocols.filter(p => protocols.includes(p.id))
      : this.config.enabledProtocols;

    const metrics: LiquidityMetrics[] = [];

    for (const protocol of targetProtocols) {
      try {
        const liquidityMetrics = await this.liquidityCollector.getMetrics(protocol.id);
        if (liquidityMetrics) {
          metrics.push(...liquidityMetrics); // Multiple pools per protocol
        }
      } catch (error: any) {
        this.logger.error(`Failed to get liquidity metrics for ${protocol.id}`, error);
      }
    }

    return metrics;
  }

  /**
   * Get governance metrics for all protocols
   */
  async getGovernanceMetrics(protocols?: string[]): Promise<GovernanceMetrics[]> {
    const targetProtocols = protocols
      ? this.config.enabledProtocols.filter(p => protocols.includes(p.id))
      : this.config.enabledProtocols;

    const metrics: GovernanceMetrics[] = [];

    for (const protocol of targetProtocols) {
      try {
        const governanceMetrics = await this.governanceCollector.getMetrics(protocol.id);
        if (governanceMetrics) {
          metrics.push(...governanceMetrics);
        }
      } catch (error: any) {
        this.logger.error(`Failed to get governance metrics for ${protocol.id}`, error);
      }
    }

    return metrics;
  }

  /**
   * Get token unlock schedules for all protocols
   */
  async getTokenUnlockMetrics(protocols?: string[]): Promise<TokenUnlockMetrics[]> {
    const targetProtocols = protocols
      ? this.config.enabledProtocols.filter(p => protocols.includes(p.id))
      : this.config.enabledProtocols;

    const metrics: TokenUnlockMetrics[] = [];

    for (const protocol of targetProtocols) {
      try {
        const unlockMetrics = await this.tokenUnlockCollector.getMetrics(protocol.id);
        if (unlockMetrics) {
          metrics.push(...unlockMetrics);
        }
      } catch (error: any) {
        this.logger.error(`Failed to get token unlock metrics for ${protocol.id}`, error);
      }
    }

    return metrics;
  }

  /**
   * Get recent anomalies detected
   */
  async getRecentAnomalies(limit: number = 50): Promise<AnomalyDetection[]> {
    return await this.anomalyDetector.getRecentAnomalies(limit);
  }

  /**
   * Get recent signals generated
   */
  async getRecentSignals(limit: number = 50): Promise<DeFiSignal[]> {
    return await this.signalGenerator.getRecentSignals(limit);
  }

  /**
   * Backfill historical metrics data
   */
  async backfillData(request: BackfillRequest): Promise<BackfillResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    try {
      this.logger.info('Starting DeFi metrics backfill', {
        start_date: request.startDate.toISOString(),
        end_date: request.endDate.toISOString(),
        protocols: request.protocols?.length || 'all',
        metrics: request.metrics?.length || 'all'
      });

      const allMetrics: any[] = [];
      let totalFetched = 0;

      // Backfill each enabled protocol
      const protocolsToProcess = request.protocols
        ? this.config.enabledProtocols.filter(p => request.protocols!.includes(p.id))
        : this.config.enabledProtocols;

      for (const protocol of protocolsToProcess) {
        try {
          const protocolMetrics = await this.backfillProtocolMetrics(protocol, request);
          allMetrics.push(...protocolMetrics);
          totalFetched += protocolMetrics.length;

          // Respect rate limits
          await this.delay(1000);

        } catch (error: any) {
          errors.push(`${protocol.id}: ${error.message}`);
          this.logger.error(`Failed to backfill metrics for ${protocol.id}`, error);
        }
      }

      const result: BackfillResult = {
        request,
        metrics: allMetrics.slice(0, request.maxRecords),
        totalFetched,
        duration: Date.now() - startTime,
        errors
      };

      this.logger.info('Backfill completed', {
        metrics_fetched: result.metrics.length,
        total_found: totalFetched,
        duration_ms: result.duration,
        errors_count: errors.length
      });

      return result;

    } catch (error: any) {
      this.logger.error('Backfill failed', error);
      return {
        request,
        metrics: [],
        totalFetched: 0,
        duration: Date.now() - startTime,
        errors: [error.message]
      };
    }
  }

  /**
   * Get current service status
   */
  getStatus(): string {
    const components = [
      `TVL: ${this.tvlCollector.getStatus()}`,
      `Yield: ${this.yieldCollector.getStatus()}`,
      `Lending: ${this.lendingCollector.getStatus()}`,
      `Liquidity: ${this.liquidityCollector.getStatus()}`,
      `Governance: ${this.governanceCollector.getStatus()}`,
      `TokenUnlocks: ${this.tokenUnlockCollector.getStatus()}`,
      `Anomaly: ${this.anomalyDetector.getStatus()}`,
      `Signals: ${this.signalGenerator.getStatus()}`
    ];

    return this.isRunning ? `Running (${components.join(', ')})` : 'Stopped';
  }

  /**
   * Get detailed health status
   */
  async getHealthStatus(): Promise<HealthStatus> {
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    const avgLatency = this.processingLatencies.length > 0
      ? this.processingLatencies.reduce((a, b) => a + b, 0) / this.processingLatencies.length
      : 0;

    return {
      is_running: this.isRunning,
      uptime_seconds: uptimeSeconds,
      active_protocols: this.activeProtocols.size,
      metrics_processed_total: this.metricsProcessed,
      metrics_per_second: this.metricsProcessed / Math.max(1, uptimeSeconds),
      avg_processing_latency_ms: avgLatency,
      error_rate: await this.metricsCollector.getErrorRate(),
      protocol_health: await this.getProtocolHealth(),
      memory_usage: {
        heap_used_mb: process.memoryUsage().heapUsed / 1024 / 1024,
        heap_total_mb: process.memoryUsage().heapTotal / 1024 / 1024,
        external_mb: process.memoryUsage().external / 1024 / 1024
      }
    };
  }

  // Private helper methods

  private setupEventHandlers(): void {
    // Handle metrics from all collectors
    this.tvlCollector.on('metrics', (metrics: TVLMetrics) => {
      this.handleMetricsUpdate('tvl', metrics);
    });

    this.yieldCollector.on('metrics', (metrics: YieldMetrics) => {
      this.handleMetricsUpdate('yield', metrics);
    });

    this.lendingCollector.on('metrics', (metrics: LendingMetrics) => {
      this.handleMetricsUpdate('lending', metrics);
    });

    this.liquidityCollector.on('metrics', (metrics: LiquidityMetrics) => {
      this.handleMetricsUpdate('liquidity', metrics);
    });

    this.governanceCollector.on('metrics', (metrics: GovernanceMetrics) => {
      this.handleMetricsUpdate('governance', metrics);
    });

    this.tokenUnlockCollector.on('metrics', (metrics: TokenUnlockMetrics) => {
      this.handleMetricsUpdate('token-unlock', metrics);
    });

    // Handle anomalies
    this.anomalyDetector.on('anomaly', (anomaly: AnomalyDetection) => {
      this.handleAnomaly(anomaly);
    });

    // Handle signals
    this.signalGenerator.on('signal', (signal: DeFiSignal) => {
      this.emit('signal', {
        type: 'signal',
        data: signal,
        timestamp: new Date(),
        protocol: signal.protocol.id
      } as StreamingEvent);
    });
  }

  private setupProtocolMonitoring(): void {
    // Set up monitoring for each enabled protocol
    for (const protocol of this.config.enabledProtocols) {
      this.activeProtocols.set(protocol.id, protocol);
      this.logger.info(`Monitoring protocol: ${protocol.name} (${protocol.id})`);
    }
  }

  private startMetricsCollection(): void {
    // Set up periodic metric collection
    const interval = setInterval(async () => {
      await this.collectAllMetrics();
    }, this.config.metricsConfig.updateInterval);

    // Store interval for cleanup
    (this as any).metricsInterval = interval;
  }

  private stopMetricsCollection(): void {
    if ((this as any).metricsInterval) {
      clearInterval((this as any).metricsInterval);
    }
  }

  private async collectAllMetrics(): Promise<void> {
    try {
      const startTime = Date.now();

      // Collect metrics from all protocols in parallel
      const promises = this.config.enabledProtocols.map(async (protocol) => {
        try {
          await Promise.all([
            this.tvlCollector.collectMetrics(protocol.id),
            this.yieldCollector.collectMetrics(protocol.id),
            this.lendingCollector.collectMetrics(protocol.id),
            this.liquidityCollector.collectMetrics(protocol.id),
            this.governanceCollector.collectMetrics(protocol.id),
            this.tokenUnlockCollector.collectMetrics(protocol.id)
          ]);
        } catch (error: any) {
          this.logger.error(`Failed to collect metrics for ${protocol.id}`, error);
        }
      });

      await Promise.all(promises);

      const collectionTime = Date.now() - startTime;
      this.logger.performance('metrics_collection_cycle', collectionTime, {
        protocols: this.config.enabledProtocols.length
      });

    } catch (error: any) {
      this.logger.error('Metrics collection cycle failed', error);
    }
  }

  private async handleMetricsUpdate(type: string, metrics: any): Promise<void> {
    const startTime = Date.now();

    try {
      // Record metrics
      this.metricsProcessed++;

      // Emit metrics event
      this.emit('metrics', {
        type: 'metrics',
        data: { type, metrics },
        timestamp: new Date(),
        protocol: metrics.protocol.id
      } as StreamingEvent);

      // Check for anomalies
      await this.anomalyDetector.detectAnomalies(type, metrics);

      // Generate signals if thresholds are met
      await this.signalGenerator.processMetrics(type, metrics);

      // Record processing latency
      this.processingLatencies.push(Date.now() - startTime);

      // Log metrics
      this.logger.metrics(type, metrics.protocol.id, this.getMetricsValue(metrics), {
        timestamp: metrics.timestamp
      });

    } catch (error: any) {
      this.logger.error(`Failed to handle ${type} metrics update`, error);
    }
  }

  private async handleAnomaly(anomaly: AnomalyDetection): Promise<void> {
    this.logger.anomaly(anomaly.protocol.id, anomaly.metricType, anomaly.deviation, anomaly.severity);

    // Emit anomaly event
    this.emit('anomaly', {
      type: 'anomaly',
      data: anomaly,
      timestamp: new Date(),
      protocol: anomaly.protocol.id
    } as StreamingEvent);

    // Generate emergency signal for critical anomalies
    if (anomaly.severity === 'critical') {
      const signal = await this.signalGenerator.generateAnomalySignal(anomaly);
      if (signal) {
        this.emit('signal', {
          type: 'signal',
          data: signal,
          timestamp: new Date(),
          protocol: anomaly.protocol.id
        } as StreamingEvent);
      }
    }
  }

  private async backfillProtocolMetrics(protocol: ProtocolInfo, request: BackfillRequest): Promise<any[]> {
    // Implementation depends on protocol and data provider
    // This is a placeholder - would be implemented by each collector
    return [];
  }

  private async getProtocolHealth(): Promise<Record<string, any>> {
    const health: Record<string, any> = {};

    for (const protocol of this.config.enabledProtocols) {
      health[protocol.id] = {
        status: 'healthy', // Would be determined by collector health
        last_update: new Date(),
        error_count: 0,
        response_time: 0
      };
    }

    return health;
  }

  private getMetricsValue(metrics: any): number {
    // Extract numeric value from metrics for logging
    if (metrics.totalValueLocked !== undefined) return metrics.totalValueLocked;
    if (metrics.apy !== undefined) return metrics.apy;
    if (metrics.supplyApy !== undefined) return metrics.supplyApy;
    if (metrics.reserve0 !== undefined) return metrics.reserve0;
    return 0;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
