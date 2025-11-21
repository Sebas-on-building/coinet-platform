/**
 * =========================================
 * CONDITION EVALUATOR
 * =========================================
 * Ad-hoc evaluation of signal conditions for alert builder
 */

import { Logger } from '../utils/Logger';
import type {
  SignalCondition,
  EvaluationResult,
  EvaluationConfig,
  NormalizedSignal,
  ProcessingStatus
} from '../types';

export class ConditionEvaluator {
  private logger: Logger;
  private conditions: Map<string, SignalCondition>;
  private config: EvaluationConfig;
  private isInitialized: boolean = false;

  // Evaluation cache
  private evaluationCache: Map<string, {
    result: EvaluationResult;
    timestamp: Date;
    ttl: number;
  }> = new Map();

  constructor(conditions: SignalCondition[], config: EvaluationConfig) {
    this.logger = new Logger('ConditionEvaluator');
    this.conditions = new Map(conditions.map(c => [c.id, c]));
    this.config = config;
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Condition Evaluator...');

      // Validate conditions
      for (const condition of this.conditions.values()) {
        if (!this.validateCondition(condition)) {
          this.logger.warn(`Invalid condition: ${condition.id} - ${condition.name}`);
        }
      }

      this.isInitialized = true;
      this.logger.info(`✅ Condition Evaluator initialized with ${this.conditions.size} conditions`);

    } catch (error: any) {
      this.logger.error('❌ Failed to initialize Condition Evaluator', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      this.evaluationCache.clear();
      this.isInitialized = false;
      this.logger.info('✅ Condition Evaluator stopped successfully');
    } catch (error: any) {
      this.logger.error('❌ Failed to stop Condition Evaluator', error);
      throw error;
    }
  }

  async evaluateConditions(
    conditionId: string,
    signalIds: string[],
    timestamp?: Date
  ): Promise<EvaluationResult[]> {
    const startTime = Date.now();
    const results: EvaluationResult[] = [];

    try {
      const condition = this.conditions.get(conditionId);
      if (!condition) {
        throw new Error(`Condition ${conditionId} not found`);
      }

      if (!condition.enabled) {
        throw new Error(`Condition ${conditionId} is disabled`);
      }

      this.logger.info('Evaluating condition', {
        condition_id: conditionId,
        condition_name: condition.name,
        signal_count: signalIds.length
      });

      // Evaluate each signal
      for (const signalId of signalIds) {
        try {
          const result = await this.evaluateSingleCondition(condition, signalId, timestamp);
          results.push(result);
        } catch (error: any) {
          const result: EvaluationResult = {
            conditionId,
            signalId,
            timestamp: new Date(),
            status: 'failed',
            result: false,
            confidence: 0,
            details: {
              actualValue: 0,
              expectedValue: 0,
              deviation: 0,
              explanation: error.message
            },
            executionTime: Date.now() - startTime
          };
          results.push(result);
        }
      }

      const totalTime = Date.now() - startTime;
      this.logger.processing('condition_evaluation_batch', totalTime, {
        condition_id: conditionId,
        signal_count: signalIds.length,
        success_count: results.filter(r => r.status === 'completed').length
      });

      return results;

    } catch (error: any) {
      this.logger.error('Failed to evaluate conditions', {
        condition_id: conditionId,
        error: error.message
      });
      throw error;
    }
  }

  async evaluateSignal(normalizedSignal: NormalizedSignal): Promise<EvaluationResult[]> {
    const results: EvaluationResult[] = [];
    const startTime = Date.now();

    try {
      // Find conditions that apply to this signal type
      const applicableConditions = Array.from(this.conditions.values())
        .filter(c => c.enabled);

      for (const condition of applicableConditions) {
        try {
          const result = await this.evaluateSingleCondition(condition, normalizedSignal.id, normalizedSignal.timestamp);
          results.push(result);
        } catch (error: any) {
          this.logger.error(`Failed to evaluate condition ${condition.id}`, error);
        }
      }

      const totalTime = Date.now() - startTime;
      this.logger.processing('signal_condition_evaluation', totalTime, {
        signal_id: normalizedSignal.id,
        conditions_evaluated: results.length
      });

      return results;

    } catch (error: any) {
      this.logger.error('Failed to evaluate signal conditions', {
        signal_id: normalizedSignal.id,
        error: error.message
      });
      return [];
    }
  }

  private async evaluateSingleCondition(
    condition: SignalCondition,
    signalId: string,
    timestamp?: Date
  ): Promise<EvaluationResult> {
    const startTime = Date.now();

    try {
      // Check cache first
      const cacheKey = `${condition.id}_${signalId}_${timestamp?.getTime() || 0}`;
      const cached = this.evaluationCache.get(cacheKey);

      if (cached && (Date.now() - cached.timestamp.getTime()) < this.config.cacheTtl * 1000) {
        return cached.result;
      }

      // Get signal data (this would be fetched from storage)
      const signalData = await this.getSignalData(signalId);
      if (!signalData) {
        throw new Error(`Signal ${signalId} not found`);
      }

      // Evaluate condition
      const result = await this.evaluateConditionLogic(condition, signalData);

      const evaluationResult: EvaluationResult = {
        conditionId: condition.id,
        signalId,
        timestamp: new Date(),
        status: 'completed',
        result: result.met,
        confidence: result.confidence,
        details: {
          actualValue: result.actualValue,
          expectedValue: result.expectedValue,
          deviation: result.deviation,
          explanation: result.explanation
        },
        executionTime: Date.now() - startTime
      };

      // Cache result
      this.evaluationCache.set(cacheKey, {
        result: evaluationResult,
        timestamp: new Date(),
        ttl: this.config.cacheTtl * 1000
      });

      return evaluationResult;

    } catch (error: any) {
      const evaluationResult: EvaluationResult = {
        conditionId: condition.id,
        signalId,
        timestamp: new Date(),
        status: 'failed',
        result: false,
        confidence: 0,
        details: {
          actualValue: 0,
          expectedValue: 0,
          deviation: 0,
          explanation: error.message
        },
        executionTime: Date.now() - startTime
      };

      return evaluationResult;
    }
  }

  private async evaluateConditionLogic(
    condition: SignalCondition,
    signalData: any
  ): Promise<{
    met: boolean;
    confidence: number;
    actualValue: number;
    expectedValue: number;
    deviation: number;
    explanation: string;
  }> {
    try {
      // Handle composite conditions
      if (condition.logic) {
        return await this.evaluateCompositeCondition(condition, signalData);
      }

      // Handle simple conditions
      return await this.evaluateSimpleCondition(condition, signalData);

    } catch (error: any) {
      throw new Error(`Condition evaluation failed: ${error.message}`);
    }
  }

  private async evaluateSimpleCondition(
    condition: SignalCondition,
    signalData: any
  ): Promise<{
    met: boolean;
    confidence: number;
    actualValue: number;
    expectedValue: number;
    deviation: number;
    explanation: string;
  }> {
    // Extract metric value from signal data
    const actualValue = this.extractMetricValue(condition.parameters.metric, signalData);

    // Apply window aggregation if specified
    const windowedValue = await this.applyWindowAggregation(
      condition.parameters.metric,
      actualValue,
      condition.parameters.window,
      condition.parameters.aggregation
    );

    // Evaluate against threshold
    const expectedValue = condition.parameters.threshold;
    let met = false;

    switch (condition.parameters.operator) {
      case '>':
        met = windowedValue > expectedValue;
        break;
      case '<':
        met = windowedValue < expectedValue;
        break;
      case '>=':
        met = windowedValue >= expectedValue;
        break;
      case '<=':
        met = windowedValue <= expectedValue;
        break;
      case '==':
        met = Math.abs(windowedValue - expectedValue) < 0.001;
        break;
      case '!=':
        met = Math.abs(windowedValue - expectedValue) >= 0.001;
        break;
    }

    const deviation = Math.abs(windowedValue - expectedValue) / Math.max(expectedValue, 0.001);
    const confidence = Math.min(1, 1 - deviation); // Higher confidence for smaller deviations

    const explanation = `Metric ${condition.parameters.metric} ${condition.parameters.operator} ${expectedValue}: ${windowedValue} ${met ? '✓' : '✗'}`;

    return {
      met,
      confidence,
      actualValue: windowedValue,
      expectedValue,
      deviation,
      explanation
    };
  }

  private async evaluateCompositeCondition(
    condition: SignalCondition,
    signalData: any
  ): Promise<{
    met: boolean;
    confidence: number;
    actualValue: number;
    expectedValue: number;
    deviation: number;
    explanation: string;
  }> {
    if (!condition.logic) {
      throw new Error('Composite condition missing logic');
    }

    const results: boolean[] = [];
    const confidences: number[] = [];

    // Evaluate each sub-condition
    for (const subConditionId of condition.logic.conditions) {
      const subCondition = this.conditions.get(subConditionId);
      if (!subCondition) {
        throw new Error(`Sub-condition ${subConditionId} not found`);
      }

      const subResult = await this.evaluateConditionLogic(subCondition, signalData);
      results.push(subResult.met);
      confidences.push(subResult.confidence);
    }

    // Apply logical operator
    let met = false;
    const avgConfidence = confidences.reduce((sum, c) => sum + c, 0) / confidences.length;

    switch (condition.logic.operator) {
      case 'AND':
        met = results.every(r => r);
        break;
      case 'OR':
        met = results.some(r => r);
        break;
      case 'NOT':
        met = !results[0]; // NOT only works with single condition
        break;
    }

    const explanation = `${condition.logic.operator} logic: ${results.join(' ')} = ${met ? '✓' : '✗'}`;

    return {
      met,
      confidence: avgConfidence,
      actualValue: met ? 1 : 0,
      expectedValue: 1,
      deviation: met ? 0 : 1,
      explanation
    };
  }

  private extractMetricValue(metric: string, signalData: any): number {
    // Extract metric value from signal data
    // This is a simplified implementation - would be more sophisticated
    const path = metric.split('.');
    let value: any = signalData;

    for (const segment of path) {
      value = value?.[segment];
      if (value === undefined) break;
    }

    return typeof value === 'number' ? value : 0;
  }

  private async applyWindowAggregation(
    metric: string,
    value: number,
    windowSeconds: number,
    aggregation: string
  ): Promise<number> {
    // This would implement window-based aggregation
    // For now, return the current value
    return value;
  }

  private async getSignalData(signalId: string): Promise<any> {
    // This would fetch signal data from storage
    // For now, return mock data
    return {
      id: signalId,
      timestamp: new Date(),
      type: 'test',
      data: { value: Math.random() * 100 }
    };
  }

  private validateCondition(condition: SignalCondition): boolean {
    // Validate condition structure
    if (!condition.id || !condition.name) return false;
    if (!condition.parameters.metric || !condition.parameters.operator) return false;
    if (typeof condition.parameters.threshold !== 'number') return false;

    return true;
  }

  getStatus(): string {
    return this.isInitialized ? `Active (${this.conditions.size} conditions)` : 'Not Initialized';
  }
}
