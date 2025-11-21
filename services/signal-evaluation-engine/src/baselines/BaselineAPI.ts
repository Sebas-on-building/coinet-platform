/**
 * =========================================
 * ADAPTIVE BASELINE API
 * =========================================
 * RESTful API interface for the adaptive baseline system
 */

import { EventEmitter } from 'events';
import { Logger } from '../utils/Logger';
import { AdaptiveBaselineEngine } from './AdaptiveBaselineEngine';
import type {
  BaselineConfig,
  SignalBaseline,
  MarketRegime,
  AnomalyDetection,
  RegimeShift,
  BaselineStats
} from '../alerts/types';
import type { NormalizedSignal } from '../types';

export interface BaselineAPIEndpoints {
  getBaseline: string;
  getBaselines: string;
  updateBaseline: string;
  getRegime: string;
  getRegimes: string;
  getAnomalies: string;
  getRegimeShifts: string;
  getConfig: string;
  updateConfig: string;
  getStatus: string;
  getStatistics: string;
}

export class BaselineAPI extends EventEmitter {
  private logger: Logger;
  private baselineEngine: AdaptiveBaselineEngine;
  private endpoints: BaselineAPIEndpoints;
  private isInitialized: boolean = false;

  constructor(config: BaselineConfig, endpoints?: Partial<BaselineAPIEndpoints>) {
    super();
    this.logger = new Logger('BaselineAPI');
    this.baselineEngine = new AdaptiveBaselineEngine(config);

    this.endpoints = {
      getBaseline: '/baselines/:signalType',
      getBaselines: '/baselines',
      updateBaseline: '/baselines/:signalType',
      getRegime: '/baselines/:signalType/regime',
      getRegimes: '/baselines/regimes',
      getAnomalies: '/baselines/anomalies',
      getRegimeShifts: '/baselines/regime-shifts',
      getConfig: '/baselines/config',
      updateConfig: '/baselines/config',
      getStatus: '/baselines/status',
      getStatistics: '/baselines/statistics',
      ...endpoints
    };
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Baseline API...');

      await this.baselineEngine.initialize();

      // Set up event forwarding
      this.baselineEngine.on('anomaly', (anomaly: AnomalyDetection) => {
        this.emit('anomaly', anomaly);
      });

      this.baselineEngine.on('regimeShift', (shift: RegimeShift) => {
        this.emit('regimeShift', shift);
      });

      this.isInitialized = true;
      this.logger.info('✅ Baseline API initialized successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to initialize Baseline API', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      this.logger.info('Stopping Baseline API...');

      await this.baselineEngine.stop();

      this.isInitialized = false;
      this.logger.info('✅ Baseline API stopped successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to stop Baseline API', error);
      throw error;
    }
  }

  /**
   * Process a signal through the baseline engine
   */
  processSignal(signal: NormalizedSignal): void {
    if (!this.isInitialized) {
      throw new Error('Baseline API is not initialized');
    }

    this.baselineEngine.processSignal(signal);
  }

  /**
   * Get baseline for a specific signal type and asset class
   */
  getBaseline(signalType: string, assetClass?: string): SignalBaseline | null {
    if (!this.isInitialized) {
      throw new Error('Baseline API is not initialized');
    }

    return this.baselineEngine.getBaseline(signalType, assetClass);
  }

  /**
   * Get all baselines
   */
  getAllBaselines(): SignalBaseline[] {
    if (!this.isInitialized) {
      throw new Error('Baseline API is not initialized');
    }

    return Array.from(this.baselineEngine['signalBaselines'].values());
  }

  /**
   * Update baseline configuration
   */
  updateBaseline(signalType: string, updates: Partial<SignalBaseline>): SignalBaseline | null {
    if (!this.isInitialized) {
      throw new Error('Baseline API is not initialized');
    }

    // Get existing baseline
    const existing = this.baselineEngine.getBaseline(signalType);
    if (!existing) {
      return null;
    }

    // Apply updates
    const updated = { ...existing, ...updates };

    // Store updated baseline (simplified - would update in storage)
    this.baselineEngine['signalBaselines'].set(
      `${signalType}:${updates.assetClass || 'default'}:global`,
      updated
    );

    this.logger.info('Baseline updated', { signalType, assetClass: updates.assetClass });
    return updated;
  }

  /**
   * Get current market regime for a signal type
   */
  getCurrentRegime(signalType: string): MarketRegime | null {
    if (!this.isInitialized) {
      throw new Error('Baseline API is not initialized');
    }

    return (this.baselineEngine as any).getCurrentRegime(signalType);
  }

  /**
   * Get all current market regimes
   */
  getAllCurrentRegimes(): MarketRegime[] {
    if (!this.isInitialized) {
      throw new Error('Baseline API is not initialized');
    }

    return Array.from(this.baselineEngine['currentRegimes'].values());
  }

  /**
   * Get recent anomalies (would typically query from storage)
   */
  getRecentAnomalies(limit: number = 100): AnomalyDetection[] {
    if (!this.isInitialized) {
      throw new Error('Baseline API is not initialized');
    }

    // Placeholder - would query from storage
    return [];
  }

  /**
   * Get regime shift history
   */
  getRegimeShiftHistory(limit: number = 50): RegimeShift[] {
    if (!this.isInitialized) {
      throw new Error('Baseline API is not initialized');
    }

    return this.baselineEngine['regimeHistory'].slice(-limit);
  }

  /**
   * Get current configuration
   */
  getConfig(): BaselineConfig {
    return this.baselineEngine['config'];
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<BaselineConfig>): void {
    this.baselineEngine['config'] = { ...this.baselineEngine['config'], ...newConfig };

    this.logger.info('Baseline configuration updated', newConfig);
  }

  /**
   * Get API status
   */
  getStatus(): {
    initialized: boolean;
    endpoints: BaselineAPIEndpoints;
    engineStatus: string;
  } {
    return {
      initialized: this.isInitialized,
      endpoints: this.endpoints,
      engineStatus: this.baselineEngine.getDetailedStatus().isInitialized ? 'Running' : 'Stopped'
    };
  }

  /**
   * Get engine statistics
   */
  getStatistics(): ReturnType<AdaptiveBaselineEngine['getStatistics']> {
    if (!this.isInitialized) {
      throw new Error('Baseline API is not initialized');
    }

    return this.baselineEngine.getStatistics();
  }

  /**
   * Get detailed status
   */
  getDetailedStatus(): ReturnType<AdaptiveBaselineEngine['getDetailedStatus']> {
    if (!this.isInitialized) {
      throw new Error('Baseline API is not initialized');
    }

    return this.baselineEngine.getDetailedStatus();
  }

  /**
   * Handle HTTP-style requests
   */
  async handleRequest(method: string, path: string, body?: any): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('Baseline API is not initialized');
    }

    const route = this.matchRoute(path);

    switch (method.toUpperCase()) {
      case 'GET':
        return await this.handleGet(route, body);

      case 'PUT':
        return await this.handlePut(route, body);

      case 'POST':
        return await this.handlePost(route, body);

      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }
  }

  private matchRoute(path: string): string {
    if (path === this.endpoints.getBaselines) return 'getBaselines';
    if (path === this.endpoints.getRegimes) return 'getRegimes';
    if (path === this.endpoints.getAnomalies) return 'getAnomalies';
    if (path === this.endpoints.getRegimeShifts) return 'getRegimeShifts';
    if (path === this.endpoints.getConfig) return 'getConfig';
    if (path === this.endpoints.getStatus) return 'getStatus';
    if (path === this.endpoints.getStatistics) return 'getStatistics';

    // Parameterized routes
    if (path.startsWith('/baselines/') && path.endsWith('/regime')) return 'getRegime';

    if (path.startsWith('/baselines/')) {
      const signalType = path.split('/')[2];
      if (signalType) {
        return 'getBaseline'; // Simplified for now
      }
    }

    throw new Error(`Unknown route: ${path}`);
  }

  private async handleGet(route: string, body: any): Promise<any> {
    switch (route) {
      case 'getBaseline':
        const signalType = body?.signalType || '';
        const assetClass = body?.assetClass;
        return this.getBaseline(signalType, assetClass);

      case 'getBaselines':
        return this.getAllBaselines();

      case 'getRegime':
        const regimeSignalType = body?.signalType || '';
        return this.getCurrentRegime(regimeSignalType);

      case 'getRegimes':
        return this.getAllCurrentRegimes();

      case 'getAnomalies':
        const limit = body?.limit || 100;
        return this.getRecentAnomalies(limit);

      case 'getRegimeShifts':
        const shiftLimit = body?.limit || 50;
        return this.getRegimeShiftHistory(shiftLimit);

      case 'getConfig':
        return this.getConfig();

      case 'getStatus':
        return this.getStatus();

      case 'getStatistics':
        return this.getStatistics();

      default:
        throw new Error(`Unsupported GET route: ${route}`);
    }
  }

  private async handlePut(route: string, body: any): Promise<any> {
    switch (route) {
      case 'updateBaseline':
        const updateSignalType = body?.signalType || '';
        return this.updateBaseline(updateSignalType, body.updates);

      case 'updateConfig':
        this.updateConfig(body);
        return { success: true };

      default:
        throw new Error(`Unsupported PUT route: ${route}`);
    }
  }

  private async handlePost(route: string, body: any): Promise<any> {
    switch (route) {
      case 'updateConfig':
        this.updateConfig(body);
        return { success: true };

      default:
        throw new Error(`Unsupported POST route: ${route}`);
    }
  }

  /**
   * Get API endpoints
   */
  getEndpoints(): BaselineAPIEndpoints {
    return { ...this.endpoints };
  }
}
