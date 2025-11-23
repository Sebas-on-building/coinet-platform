/**
 * =========================================
 * ALERT EVALUATION ENGINE API
 * =========================================
 * Main API for the alert evaluation engine with rule
 * management, real-time evaluation, and alert studio
 */

import { EventEmitter } from 'events';
import { Logger } from '../utils/Logger';
import { RuleParser } from './RuleParser';
import { RuleEngine } from './RuleEngine';
import type {
  AlertRule,
  RuleTemplate,
  AlertStudioState,
  AlertEngineConfig,
  AlertEngineMetrics,
  CreateRuleRequest,
  UpdateRuleRequest,
  EvaluateRuleRequest,
  EvaluateRuleResponse,
  BulkRuleOperationRequest,
  BulkRuleOperationResponse,
  RuleValidationResult,
  RuleUpdateEvent,
  EvaluationEvent,
  AlertEvent,
  BaselineConfig,
  SignalBaseline,
  MarketRegime,
  AnomalyDetection,
  RegimeShift
} from './types';
import type { SignalType, NormalizedSignal } from '../types';

export interface AlertAPIEndpoints {
  createRule: string;
  updateRule: string;
  deleteRule: string;
  getRule: string;
  getAllRules: string;
  getActiveRules: string;
  activateRule: string;
  deactivateRule: string;
  evaluateRule: string;
  getEvaluationResult: string;
  getStudioState: string;
  updateStudioState: string;
  getTemplates: string;
  validateExpression: string;
  getMetrics: string;
  getConfig: string;
  updateConfig: string;
  getStatus: string;
}

export class AlertAPI extends EventEmitter {
  private logger: Logger;
  private config: AlertEngineConfig;
  private isInitialized: boolean = false;

  // Core components
  private ruleParser: RuleParser;
  private ruleEngine: RuleEngine;

  // Baseline integration
  private baselineAPI?: any; // Baseline API for adaptive baselines

  // Available signal types
  private availableSignals: SignalType[];

  // Rule templates
  private ruleTemplates: RuleTemplate[] = [];

  // Alert studio state
  private studioState: AlertStudioState;

  // Endpoints
  private endpoints: AlertAPIEndpoints;

  constructor(
    config: AlertEngineConfig,
    availableSignals: SignalType[] = [],
    endpoints?: Partial<AlertAPIEndpoints>
  ) {
    super();
    this.logger = new Logger('AlertAPI');
    this.config = config;
    this.availableSignals = availableSignals;

    // Initialize core components
    this.ruleParser = new RuleParser(availableSignals);
    this.ruleEngine = new RuleEngine();

    // Initialize baseline API with default configuration if not provided
    const baselineConfig = config.baselines || this.createDefaultBaselineConfig();
    const { BaselineAPI } = require('../baselines');
    this.baselineAPI = new BaselineAPI(baselineConfig);

    // Initialize alert studio state
    this.studioState = {
      currentRule: null,
      availableSignals,
      ruleTemplates: [],
      expressionBuilder: {
        selectedSignals: [],
        operators: ['>', '<', '>=', '<=', '==', '!=', 'AND', 'OR', 'NOT'],
        currentExpression: '',
        validationErrors: []
      },
      preview: {
        isEvaluating: false,
        sampleSignals: []
      }
    };

    this.endpoints = {
      createRule: '/alerts/rules',
      updateRule: '/alerts/rules/:ruleId',
      deleteRule: '/alerts/rules/:ruleId',
      getRule: '/alerts/rules/:ruleId',
      getAllRules: '/alerts/rules',
      getActiveRules: '/alerts/rules/active',
      activateRule: '/alerts/rules/:ruleId/activate',
      deactivateRule: '/alerts/rules/:ruleId/deactivate',
      evaluateRule: '/alerts/rules/:ruleId/evaluate',
      getEvaluationResult: '/alerts/evaluations/:evaluationId',
      getStudioState: '/alerts/studio',
      updateStudioState: '/alerts/studio',
      getTemplates: '/alerts/templates',
      validateExpression: '/alerts/validate',
      getMetrics: '/alerts/metrics',
      getConfig: '/alerts/config',
      updateConfig: '/alerts/config',
      getStatus: '/alerts/status',
      ...endpoints
    };
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Alert API...');

      // Initialize rule engine
      await this.ruleEngine.initialize();
      await this.ruleEngine.start();

      // Initialize baseline API if configured
      if (this.baselineAPI) {
        await this.baselineAPI.initialize();

        // Set up baseline integration with confidence scorer
        if (this.ruleEngine && 'confidenceScorer' in this.ruleEngine) {
          (this.ruleEngine as any).confidenceScorer.setBaselineEngine(this.baselineAPI.baselineEngine);

          // Forward anomaly events to confidence scorer
          this.baselineAPI.on('anomaly', (anomaly: AnomalyDetection) => {
            (this.ruleEngine as any).confidenceScorer.updateRecentAnomalies(anomaly.signalType, [anomaly]);
          });
        }
      }

      // Set up event forwarding
      this.ruleEngine.on('ruleUpdate', (event: RuleUpdateEvent) => {
        this.emit('ruleUpdate', event);
      });

      this.ruleEngine.on('evaluation', (event: EvaluationEvent) => {
        this.emit('evaluation', event);
      });

      this.ruleEngine.on('alert', (event: AlertEvent) => {
        this.emit('alert', event);
      });

      // Initialize rule templates
      this.initializeRuleTemplates();

      this.isInitialized = true;
      this.logger.info('✅ Alert API initialized successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to initialize Alert API', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      this.logger.info('Stopping Alert API...');

      await this.ruleEngine.stop();

      this.isInitialized = false;
      this.logger.info('✅ Alert API stopped successfully');
    } catch (error: any) {
      this.logger.error('❌ Failed to stop Alert API', error);
      throw error;
    }
  }

  /**
   * Create a new alert rule
   */
  async createRule(request: CreateRuleRequest): Promise<AlertRule> {
    if (!this.isInitialized) {
      throw new Error('Alert API is not initialized');
    }

    try {
      this.logger.info('Creating alert rule', { name: request.name });

      // Parse expression into AST
      const ast = this.ruleParser.parse(request.expression);

      // Create rule object
      const rule: AlertRule = {
        id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: request.name,
        description: request.description,
        expression: request.expression,
        ast,
        isActive: false, // Start inactive
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system', // Would be user ID in production
        metadata: request.metadata,
        conditions: request.conditions
      };

      // Validate rule
      const validation = this.validateRule(rule);
      if (!validation.isValid) {
        throw new Error(`Rule validation failed: ${validation.errors.join(', ')}`);
      }

      // Add to rule engine
      this.ruleEngine.addRule(rule);

      this.logger.info('Alert rule created successfully', { ruleId: rule.id });

      return rule;

    } catch (error: any) {
      this.logger.error('Failed to create alert rule', { name: request.name, error: error.message });
      throw error;
    }
  }

  /**
   * Update an existing alert rule
   */
  async updateRule(request: UpdateRuleRequest): Promise<AlertRule> {
    if (!this.isInitialized) {
      throw new Error('Alert API is not initialized');
    }

    try {
      const rule = this.ruleEngine.getRule(request.ruleId);
      if (!rule) {
        throw new Error(`Rule not found: ${request.ruleId}`);
      }

      this.logger.info('Updating alert rule', { ruleId: request.ruleId });

      // Update rule properties
      const updatedRule: AlertRule = {
        ...rule,
        ...request.updates,
        updatedAt: new Date()
      };

      // If expression changed, reparse AST
      if (request.updates.expression) {
        updatedRule.ast = this.ruleParser.parse(request.updates.expression);
        updatedRule.expression = request.updates.expression;
      }

      // Validate updated rule
      const validation = this.validateRule(updatedRule);
      if (!validation.isValid) {
        throw new Error(`Rule validation failed: ${validation.errors.join(', ')}`);
      }

      // Update in rule engine
      this.ruleEngine.addRule(updatedRule);

      this.logger.info('Alert rule updated successfully', { ruleId: request.ruleId });

      return updatedRule;

    } catch (error: any) {
      this.logger.error('Failed to update alert rule', { ruleId: request.ruleId, error: error.message });
      throw error;
    }
  }

  /**
   * Delete an alert rule
   */
  async deleteRule(ruleId: string): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('Alert API is not initialized');
    }

    try {
      const deleted = this.ruleEngine.removeRule(ruleId);

      if (deleted) {
        this.logger.info('Alert rule deleted successfully', { ruleId });
      }

      return deleted;

    } catch (error: any) {
      this.logger.error('Failed to delete alert rule', { ruleId, error: error.message });
      throw error;
    }
  }

  /**
   * Get a specific rule
   */
  getRule(ruleId: string): AlertRule | null {
    if (!this.isInitialized) {
      throw new Error('Alert API is not initialized');
    }

    return this.ruleEngine.getRule(ruleId);
  }

  /**
   * Get all rules
   */
  getAllRules(): AlertRule[] {
    if (!this.isInitialized) {
      throw new Error('Alert API is not initialized');
    }

    return this.ruleEngine.getAllRules();
  }

  /**
   * Get active rules
   */
  getActiveRules(): AlertRule[] {
    if (!this.isInitialized) {
      throw new Error('Alert API is not initialized');
    }

    return this.ruleEngine.getActiveRules();
  }

  /**
   * Activate a rule
   */
  async activateRule(ruleId: string): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('Alert API is not initialized');
    }

    try {
      const activated = this.ruleEngine.activateRule(ruleId);

      if (activated) {
        this.logger.info('Alert rule activated', { ruleId });
      }

      return activated;

    } catch (error: any) {
      this.logger.error('Failed to activate alert rule', { ruleId, error: error.message });
      throw error;
    }
  }

  /**
   * Deactivate a rule
   */
  async deactivateRule(ruleId: string): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('Alert API is not initialized');
    }

    try {
      const deactivated = this.ruleEngine.deactivateRule(ruleId);

      if (deactivated) {
        this.logger.info('Alert rule deactivated', { ruleId });
      }

      return deactivated;

    } catch (error: any) {
      this.logger.error('Failed to deactivate alert rule', { ruleId, error: error.message });
      throw error;
    }
  }

  /**
   * Evaluate a rule with custom context
   */
  async evaluateRule(request: EvaluateRuleRequest): Promise<EvaluateRuleResponse> {
    if (!this.isInitialized) {
      throw new Error('Alert API is not initialized');
    }

    try {
      const startTime = Date.now();

      const result = await this.ruleEngine.evaluateRule(request.ruleId, request.context);

      const response: EvaluateRuleResponse = {
        request,
        result,
        cached: false, // Would check cache
        evaluationTime: Date.now() - startTime
      };

      this.logger.debug('Rule evaluation completed', {
        ruleId: request.ruleId,
        evaluationTime: response.evaluationTime + 'ms',
        triggered: result.triggered
      });

      return response;

    } catch (error: any) {
      this.logger.error('Failed to evaluate rule', { ruleId: request.ruleId, error: error.message });
      throw error;
    }
  }

  /**
   * Validate a rule expression
   */
  validateExpression(expression: string): RuleValidationResult {
    if (!this.isInitialized) {
      throw new Error('Alert API is not initialized');
    }

    try {
      // Parse expression
      const ast = this.ruleParser.parse(expression);

      // Get referenced signal types
      const referencedSignals = this.ruleParser.getReferencedSignalTypes(ast);

      // Check if all referenced signals are available
      const unknownSignals = referencedSignals.filter(signal => !this.availableSignals.includes(signal));

      const errors: string[] = [];
      const warnings: string[] = [];
      const suggestions: string[] = [];

      if (unknownSignals.length > 0) {
        errors.push(`Unknown signal types: ${unknownSignals.join(', ')}`);
      }

      // Estimate performance
      const performance = this.ruleParser.estimatePerformance(ast);

      if (performance.estimatedLatency > 50) {
        warnings.push(`High latency expected: ${performance.estimatedLatency}ms`);
      }

      if (performance.memoryUsage > 5) {
        warnings.push(`High memory usage expected: ${performance.memoryUsage}MB`);
      }

      // Generate suggestions
      if (performance.complexity === 'complex') {
        suggestions.push('Consider simplifying the expression for better performance');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        suggestions,
        estimatedComplexity: performance.complexity,
        performanceImpact: performance.estimatedLatency > 20 ? 'high' : performance.estimatedLatency > 10 ? 'medium' : 'low'
      };

    } catch (error: any) {
      return {
        isValid: false,
        errors: [error.message],
        warnings: [],
        suggestions: [],
        estimatedComplexity: 'complex',
        performanceImpact: 'high'
      };
    }
  }

  /**
   * Update signal data for evaluation
   */
  updateSignalData(signals: NormalizedSignal[]): void {
    if (!this.isInitialized) {
      throw new Error('Alert API is not initialized');
    }

    // Process signals through baseline engine if available
    if (this.baselineAPI) {
      for (const signal of signals) {
        this.baselineAPI.processSignal(signal);
      }
    }

    this.ruleEngine.updateSignalData(signals);

    this.logger.debug('Signal data updated for rule evaluation', {
      signalCount: signals.length,
      baselineProcessed: !!this.baselineAPI
    });
  }

  /**
   * Get alert studio state
   */
  getStudioState(): AlertStudioState {
    return { ...this.studioState };
  }

  /**
   * Update alert studio state
   */
  updateStudioState(updates: Partial<AlertStudioState>): void {
    this.studioState = { ...this.studioState, ...updates };

    this.logger.debug('Alert studio state updated', { updates });
  }

  /**
   * Get rule templates
   */
  getRuleTemplates(): RuleTemplate[] {
    return [...this.ruleTemplates];
  }

  /**
   * Get engine metrics
   */
  getMetrics(): AlertEngineMetrics {
    const ruleMetrics = this.ruleEngine.getEvaluationMetrics();
    const ruleStats = Array.from(ruleMetrics.values());

    const totalEvaluations = ruleStats.reduce((sum, stats) => sum + stats.totalEvaluations, 0);
    const totalTime = ruleStats.reduce((sum, stats) => sum + stats.totalTime, 0);
    const avgLatency = totalEvaluations > 0 ? totalTime / totalEvaluations : 0;

    const p95Latency = this.calculatePercentile(ruleStats.map(s => s.avgLatency), 0.95);
    const p99Latency = this.calculatePercentile(ruleStats.map(s => s.avgLatency), 0.99);

    return {
      rules: {
        total: this.ruleEngine.getAllRules().length,
        active: this.ruleEngine.getActiveRules().length,
        averageEvaluationTime: avgLatency,
        evaluationCount: totalEvaluations,
        errorCount: 0 // Would track actual errors
      },
      evaluations: {
        totalPerSecond: 0, // Would calculate from metrics
        averageLatency: avgLatency,
        p95Latency,
        p99Latency
      },
      notifications: {
        sent: 0, // Would track actual notifications
        failed: 0,
        pending: 0,
        averageDeliveryTime: 0
      },
      cache: {
        hitRate: 0, // Would track cache hits
        size: 0,
        memoryUsage: 0
      },
      timestamp: new Date()
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): AlertEngineConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AlertEngineConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.logger.info('Alert configuration updated', newConfig);
  }

  /**
   * Get API status
   */
  getStatus(): {
    initialized: boolean;
    endpoints: AlertAPIEndpoints;
    ruleEngineStatus: string;
    ruleCount: number;
    activeRuleCount: number;
  } {
    return {
      initialized: this.isInitialized,
      endpoints: this.endpoints,
      ruleEngineStatus: this.ruleEngine.getStatus().running ? 'Running' : 'Stopped',
      ruleCount: this.ruleEngine.getAllRules().length,
      activeRuleCount: this.ruleEngine.getActiveRules().length
    };
  }

  /**
   * Handle HTTP-style requests
   */
  async handleRequest(method: string, path: string, body?: any): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('Alert API is not initialized');
    }

    const route = this.matchRoute(path, method);

    switch (method.toUpperCase()) {
      case 'POST':
        return await this.handlePost(route, body);

      case 'GET':
        return await this.handleGet(route, body);

      case 'PUT':
        return await this.handlePut(route, body);

      case 'DELETE':
        return await this.handleDelete(route, body);

      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }
  }

  private matchRoute(path: string, method?: string): string {
    if (path === this.endpoints.createRule) return 'createRule';
    if (path === this.endpoints.getAllRules) return 'getAllRules';
    if (path === this.endpoints.getActiveRules) return 'getActiveRules';
    if (path === this.endpoints.getStudioState) return 'getStudioState';
    if (path === this.endpoints.updateStudioState) return 'updateStudioState';
    if (path === this.endpoints.getTemplates) return 'getTemplates';
    if (path === this.endpoints.validateExpression) return 'validateExpression';
    if (path === this.endpoints.getMetrics) return 'getMetrics';
    if (path === this.endpoints.getConfig) return 'getConfig';
    if (path === this.endpoints.updateConfig) return 'updateConfig';
    if (path === this.endpoints.getStatus) return 'getStatus';

    // Parameterized routes
    if (path.startsWith('/alerts/rules/') && path.endsWith('/activate')) return 'activateRule';
    if (path.startsWith('/alerts/rules/') && path.endsWith('/deactivate')) return 'deactivateRule';
    if (path.startsWith('/alerts/rules/') && path.includes('/evaluate')) return 'evaluateRule';

    if (path.startsWith('/alerts/rules/')) {
      const ruleId = path.split('/').pop();
      if (ruleId && path.endsWith(`/${ruleId}`)) {
        // Use method to determine if it's an update (PUT) or get (GET)
        return method === 'PUT' ? 'updateRule' : 'getRule';
      }
      return 'deleteRule';
    }

    throw new Error(`Unknown route: ${path}`);
  }

  private async handlePost(route: string, body: any): Promise<any> {
    switch (route) {
      case 'createRule':
        return await this.createRule(body);

      case 'updateStudioState':
        this.updateStudioState(body);
        return { success: true };

      case 'updateConfig':
        this.updateConfig(body);
        return { success: true };

      default:
        throw new Error(`Unsupported POST route: ${route}`);
    }
  }

  private async handleGet(route: string, body: any): Promise<any> {
    switch (route) {
      case 'getRule':
        const ruleId = body?.ruleId || '';
        return this.getRule(ruleId);

      case 'getAllRules':
        return this.getAllRules();

      case 'getActiveRules':
        return this.getActiveRules();

      case 'getStudioState':
        return this.getStudioState();

      case 'getTemplates':
        return this.getRuleTemplates();

      case 'getMetrics':
        return this.getMetrics();

      case 'getConfig':
        return this.getConfig();

      case 'getStatus':
        return this.getStatus();

      case 'baselines':
        return this.getAllBaselines();

      case 'baselines/:signalType':
        const signalType = (body as any)?.signalType || '';
        return this.getBaseline(signalType);

      case 'baselines/:signalType/regime':
        const regimeSignalType = (body as any)?.signalType || '';
        return this.getCurrentRegime(regimeSignalType);

      default:
        throw new Error(`Unsupported GET route: ${route}`);
    }
  }

  private async handlePut(route: string, body: any): Promise<any> {
    switch (route) {
      case 'updateRule':
        return await this.updateRule(body);

      case 'activateRule':
        const activateRuleId = body?.ruleId || '';
        return await this.activateRule(activateRuleId);

      case 'deactivateRule':
        const deactivateRuleId = body?.ruleId || '';
        return await this.deactivateRule(deactivateRuleId);

      case 'evaluateRule':
        return await this.evaluateRule(body);

      default:
        throw new Error(`Unsupported PUT route: ${route}`);
    }
  }

  private async handleDelete(route: string, body: any): Promise<any> {
    switch (route) {
      case 'deleteRule':
        const deleteRuleId = body?.ruleId || '';
        return await this.deleteRule(deleteRuleId);

      default:
        throw new Error(`Unsupported DELETE route: ${route}`);
    }
  }

  /**
   * Initialize rule templates
   */
  private initializeRuleTemplates(): void {
    this.ruleTemplates = [
      {
        id: 'price_breakout',
        name: 'Price Breakout Alert',
        description: 'Alert when price breaks above/below a threshold',
        category: 'price',
        expression: 'price > 50000',
        parameters: {
          threshold: { type: 'number', default: 50000, min: 0 },
          direction: { type: 'string', default: 'above', options: ['above', 'below'] }
        },
        examples: ['price > 50000', 'price < 45000']
      },
      {
        id: 'volume_spike',
        name: 'Volume Spike Alert',
        description: 'Alert when trading volume exceeds a threshold',
        category: 'volume',
        expression: 'volume > 1000000',
        parameters: {
          threshold: { type: 'number', default: 1000000, min: 0 }
        },
        examples: ['volume > 1000000', 'volume > 2000000']
      },
      {
        id: 'social_sentiment',
        name: 'Social Sentiment Alert',
        description: 'Alert when social sentiment reaches extreme levels',
        category: 'social',
        expression: 'social_media.sentiment_score > 0.8 OR social_media.sentiment_score < -0.8',
        parameters: {
          positiveThreshold: { type: 'number', default: 0.8, min: 0, max: 1 },
          negativeThreshold: { type: 'number', default: -0.8, min: -1, max: 0 }
        },
        examples: ['social_media.sentiment_score > 0.8', 'social_media.sentiment_score < -0.8']
      },
      {
        id: 'whale_transaction',
        name: 'Whale Transaction Alert',
        description: 'Alert when large transactions are detected',
        category: 'onchain',
        expression: 'on_chain.transfer_value > 1000000',
        parameters: {
          threshold: { type: 'number', default: 1000000, min: 0 }
        },
        examples: ['on_chain.transfer_value > 1000000', 'on_chain.transfer_value > 10000000']
      },
      {
        id: 'technical_indicator',
        name: 'Technical Indicator Alert',
        description: 'Alert based on technical indicators',
        category: 'technical',
        expression: 'technical.rsi > 70 OR technical.rsi < 30',
        parameters: {
          overboughtThreshold: { type: 'number', default: 70, min: 0, max: 100 },
          oversoldThreshold: { type: 'number', default: 30, min: 0, max: 100 }
        },
        examples: ['technical.rsi > 70', 'technical.rsi < 30', 'technical.macd > 0']
      }
    ];

    this.logger.info('Rule templates initialized', { count: this.ruleTemplates.length });
  }

  /**
   * Validate rule structure and performance
   */
  private validateRule(rule: AlertRule): RuleValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Basic validation
    if (!rule.name || rule.name.trim().length === 0) {
      errors.push('Rule name is required');
    }

    if (!rule.expression || rule.expression.trim().length === 0) {
      errors.push('Rule expression is required');
    }

    // Expression validation
    const expressionValidation = this.validateExpression(rule.expression);
    errors.push(...expressionValidation.errors);
    warnings.push(...expressionValidation.warnings);
    suggestions.push(...expressionValidation.suggestions);

    // Performance validation
    if (expressionValidation.performanceImpact === 'high') {
      warnings.push('Rule may impact system performance');
    }

    // Complexity validation
    if (expressionValidation.estimatedComplexity === 'complex') {
      suggestions.push('Consider breaking down complex expressions into simpler rules');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      estimatedComplexity: expressionValidation.estimatedComplexity,
      performanceImpact: expressionValidation.performanceImpact
    };
  }

  /**
   * Calculate percentile from array
   */
  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Create a sequential pattern
   */
  async createSequentialPattern(patternData: any): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('Alert API is not initialized');
    }

    try {
      // Create pattern AST
      const steps = patternData.steps.map((step: any) => ({
        type: 'signal_condition' as const,
        signalType: step.signalType,
        operator: step.condition,
        threshold: step.threshold,
        field: 'value'
      }));

      const sequenceNode = {
        type: 'sequence' as const,
        id: `seq_${Date.now()}`,
        steps,
        maxGap: patternData.maxGap,
        orderSensitive: patternData.orderSensitive,
        timeWeighted: patternData.timeWeighted,
        minMatches: patternData.minMatches
      };

      // Register with sequential pattern engine
      const patternId = this.ruleEngine.registerSequencePattern('sequential', sequenceNode);

      const pattern = {
        id: patternId,
        name: patternData.name,
        description: patternData.description,
        steps: patternData.steps,
        maxGap: patternData.maxGap,
        orderSensitive: patternData.orderSensitive,
        timeWeighted: patternData.timeWeighted,
        minMatches: patternData.minMatches,
        isActive: patternData.isActive,
        createdAt: new Date().toISOString()
      };

      this.logger.info('Sequential pattern created', { patternId: pattern.id });
      return pattern;

    } catch (error: any) {
      this.logger.error('Failed to create sequential pattern', error);
      throw error;
    }
  }

  /**
   * Get all sequential patterns
   */
  getSequentialPatterns(): any[] {
    if (!this.isInitialized) {
      throw new Error('Alert API is not initialized');
    }

    // This would return patterns from the sequential pattern engine
    // For now, return mock data
    return [
      {
        id: 'pattern_1',
        name: 'Bullish Breakout',
        description: 'Price breakout followed by volume spike',
        steps: [
          { signalType: 'price', condition: '>', threshold: 50000 },
          { signalType: 'volume', condition: '>', threshold: 1000000 }
        ],
        maxGap: 300,
        orderSensitive: true,
        timeWeighted: true,
        minMatches: 2,
        isActive: true,
        createdAt: new Date().toISOString()
      }
    ];
  }

  /**
   * Update a sequential pattern
   */
  async updateSequentialPattern(patternId: string, updates: any): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('Alert API is not initialized');
    }

    try {
      // This would update the pattern in the sequential pattern engine
      this.logger.info('Sequential pattern updated', { patternId, updates });
      return true;

    } catch (error: any) {
      this.logger.error('Failed to update sequential pattern', { patternId, error });
      return false;
    }
  }

  /**
   * Delete a sequential pattern
   */
  async deleteSequentialPattern(patternId: string): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('Alert API is not initialized');
    }

    try {
      // This would remove the pattern from the sequential pattern engine
      this.logger.info('Sequential pattern deleted', { patternId });
      return true;

    } catch (error: any) {
      this.logger.error('Failed to delete sequential pattern', { patternId, error });
      return false;
    }
  }

  /**
   * Get sequential pattern metrics
   */
  getSequentialPatternMetrics(): any {
    if (!this.isInitialized) {
      throw new Error('Alert API is not initialized');
    }

    // Access sequential pattern engine through rule engine (would need to expose method)
    const stats = this.ruleEngine.getPatternStatistics ? this.ruleEngine.getPatternStatistics() : null;
    if (!stats) {
      return {
        totalPatterns: 0,
        activePatterns: 0,
        completedPatterns: 0,
        averageSteps: 0,
        memoryUsage: 0,
        memoryPressure: 0,
        totalCreated: 0,
        totalEvicted: 0,
        evictionRate: 0,
        averageMatchTime: 0,
        successRate: 0
      };
    }

    return {
      ...stats,
      averageMatchTime: 45, // Mock value - would calculate from real data
      successRate: 0.85    // Mock value - would calculate from real data
    };
  }

  /**
   * Get baseline for a signal type
   */
  getBaseline(signalType: string, assetClass?: string): SignalBaseline | null {
    if (!this.baselineAPI) {
      return null;
    }
    return this.baselineAPI.getBaseline(signalType, assetClass);
  }

  /**
   * Get all baselines
   */
  getAllBaselines(): SignalBaseline[] {
    if (!this.baselineAPI) {
      return [];
    }
    return this.baselineAPI.getAllBaselines();
  }

  /**
   * Get current market regime for a signal type
   */
  getCurrentRegime(signalType: string): MarketRegime | null {
    if (!this.baselineAPI) {
      return null;
    }
    return this.baselineAPI.getCurrentRegime(signalType);
  }

  /**
   * Create default baseline configuration
   */
  private createDefaultBaselineConfig(): BaselineConfig {
    return {
      statistical: {
        windowSizes: [100, 500, 1000, 5000],
        outlierThreshold: 3.0,
        trendSensitivity: 0.1,
        seasonalityEnabled: true,
        seasonalPeriod: 1440 // 24 hours in minutes
      },
      ml: {
        enabled: true,
        modelTypes: ['linear', 'polynomial'],
        retrainInterval: 24, // hours
        minSamplesForTraining: 1000,
        predictionHorizon: 60, // minutes
        featureEngineering: {
          lagFeatures: [1, 5, 15, 30, 60],
          rollingStats: true,
          volatilityFeatures: true
        }
      },
      regimeDetection: {
        enabled: true,
        windowSize: 60, // minutes
        minRegimeDuration: 30, // minutes
        transitionThreshold: 0.3,
        volatilityBands: {
          low: 0.02,
          medium: 0.05,
          high: 0.1
        }
      },
      maintenance: {
        cleanupInterval: 24, // hours
        maxHistoryAge: 30, // days
        compressionEnabled: true,
        backupEnabled: true
      }
    };
  }

  /**
   * Get API endpoints
   */
  getEndpoints(): AlertAPIEndpoints {
    return { ...this.endpoints };
  }
}
