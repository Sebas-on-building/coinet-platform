/**
 * =========================================
 * RULE ENGINE COMPREHENSIVE TEST SUITE
 * =========================================
 * Extensive testing of the RuleEngine including:
 * - Logical operators (AND, OR, NOT)
 * - Signal evaluation
 * - Rule lifecycle management
 * - Performance validation (<100ms)
 * - Error handling
 */

import { RuleEngine } from '../RuleEngine';
import { RuleParser } from '../RuleParser';
import { CooldownManager } from '../CooldownManager';
import { DynamicThresholdEngine } from '../DynamicThresholdEngine';
import { SequentialPatternEngine } from '../SequentialPatternEngine';
import type {
  AlertRule,
  NormalizedSignal,
  RuleEvaluationResult,
  SignalType
} from '../types';

describe('RuleEngine', () => {
  let ruleEngine: RuleEngine;
  let ruleParser: RuleParser;
  let mockSignals: NormalizedSignal[];

  beforeEach(async () => {
    ruleEngine = new RuleEngine();
    ruleParser = new RuleParser();

    // Initialize engines
    await ruleEngine.initialize();

    // Mock signal data
    mockSignals = [
      {
        id: 'signal_1',
        type: 'price' as SignalType,
        timestamp: new Date(),
        normalizedValues: { value: 50000 },
        metadata: {
          confidence: 0.9,
          source: 'binance',
          asset: 'BTC',
          timestamp: new Date()
        }
      },
      {
        id: 'signal_2',
        type: 'volume' as SignalType,
        timestamp: new Date(),
        normalizedValues: { value: 1000000 },
        metadata: {
          confidence: 0.85,
          source: 'binance',
          asset: 'BTC',
          timestamp: new Date()
        }
      },
      {
        id: 'signal_3',
        type: 'sentiment' as SignalType,
        timestamp: new Date(),
        normalizedValues: { value: 0.7 },
        metadata: {
          confidence: 0.8,
          source: 'twitter',
          asset: 'BTC',
          timestamp: new Date()
        }
      }
    ];
  });

  afterEach(async () => {
    await ruleEngine.stop();
  });

  describe('Rule Engine Initialization', () => {
    it('should initialize successfully', async () => {
      expect(ruleEngine.getStatus().initialized).toBe(true);
      expect(ruleEngine.getStatus().running).toBe(false);
    });

    it('should start and stop properly', async () => {
      await ruleEngine.start();
      expect(ruleEngine.getStatus().running).toBe(true);

      await ruleEngine.stop();
      expect(ruleEngine.getStatus().running).toBe(false);
    });
  });

  describe('AND/OR Logical Operators', () => {
    it('should evaluate AND conditions correctly', async () => {
      const rule = await createTestRule(
        'price.value > 45000 AND volume.value > 500000',
        'BTC'
      );

      ruleEngine.addRule(rule);
      ruleEngine.updateSignalData(mockSignals);

      const result = await ruleEngine.evaluateRule(rule.id);
      expect(result.triggered).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should evaluate OR conditions correctly', async () => {
      const rule = await createTestRule(
        'price.value > 100000 OR sentiment.value > 0.8',
        'BTC'
      );

      ruleEngine.addRule(rule);
      ruleEngine.updateSignalData(mockSignals);

      const result = await ruleEngine.evaluateRule(rule.id);
      expect(result.triggered).toBe(true);
    });

    it('should evaluate NOT conditions correctly', async () => {
      const rule = await createTestRule(
        'NOT price.value > 100000',
        'BTC'
      );

      ruleEngine.addRule(rule);
      ruleEngine.updateSignalData(mockSignals);

      const result = await ruleEngine.evaluateRule(rule.id);
      expect(result.triggered).toBe(true);
    });

    it('should handle complex nested conditions', async () => {
      const rule = await createTestRule(
        '(price.value > 45000 AND volume.value > 500000) OR sentiment.value > 0.8',
        'BTC'
      );

      ruleEngine.addRule(rule);
      ruleEngine.updateSignalData(mockSignals);

      const result = await ruleEngine.evaluateRule(rule.id);
      expect(result.triggered).toBe(true);
    });
  });

  describe('Performance Requirements', () => {
    it('should evaluate rules within 100ms', async () => {
      const rule = await createTestRule(
        'price.value > 45000 AND volume.value > 500000 AND sentiment.value > 0.6',
        'BTC'
      );

      ruleEngine.addRule(rule);

      const startTime = Date.now();
      const result = await ruleEngine.evaluateRule(rule.id);
      const endTime = Date.now();

      const latency = endTime - startTime;
      expect(latency).toBeLessThan(100); // 100ms requirement
      expect(result.triggered).toBe(true);
    });

    it('should handle high-frequency signal updates', async () => {
      const rule = await createTestRule('price.value > 45000', 'BTC');
      ruleEngine.addRule(rule);

      // Simulate high-frequency updates
      const iterations = 100;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        ruleEngine.updateSignalData(mockSignals);
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const avgLatency = totalTime / iterations;

      expect(avgLatency).toBeLessThan(50); // Should be much faster than 100ms
    });
  });

  describe('Rule Management', () => {
    it('should add and remove rules correctly', async () => {
      const rule = await createTestRule('price.value > 45000', 'BTC');

      ruleEngine.addRule(rule);
      expect(ruleEngine.getAllRules()).toHaveLength(1);

      ruleEngine.removeRule(rule.id);
      expect(ruleEngine.getAllRules()).toHaveLength(0);
    });

    it('should activate and deactivate rules', async () => {
      const rule = await createTestRule('price.value > 45000', 'BTC');
      ruleEngine.addRule(rule);

      ruleEngine.deactivateRule(rule.id);
      expect(ruleEngine.getActiveRules()).toHaveLength(0);

      ruleEngine.activateRule(rule.id);
      expect(ruleEngine.getActiveRules()).toHaveLength(1);
    });

    it('should validate rules before adding', async () => {
      const invalidRule = {
        id: 'invalid',
        name: 'Invalid Rule',
        description: 'Invalid rule',
        expression: 'invalid syntax (',
        ast: {} as any,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'test',
        metadata: {
          category: 'price' as const,
          severity: 'warning' as const,
          tags: [],
          cooldownPeriod: 300
        },
        conditions: {
          evaluationWindow: 300,
          requiredSignals: 1,
          stalenessThreshold: 3600
        }
      };

      expect(() => ruleEngine.addRule(invalidRule)).toThrow();
    });
  });

  describe('Signal Processing', () => {
    it('should process multiple signal types', async () => {
      const rule = await createTestRule(
        'price.value > 45000 AND volume.value > 500000 AND sentiment.value > 0.5',
        'BTC'
      );

      ruleEngine.addRule(rule);
      ruleEngine.updateSignalData(mockSignals);

      const result = await ruleEngine.evaluateRule(rule.id);
      expect(result.triggered).toBe(true);
      expect(result.matchedSignals.length).toBe(3);
    });

    it('should handle missing signals gracefully', async () => {
      const rule = await createTestRule('nonexistent.value > 100', 'BTC');
      ruleEngine.addRule(rule);

      const result = await ruleEngine.evaluateRule(rule.id);
      expect(result.triggered).toBe(false);
      expect(result.confidence).toBe(0);
    });

    it('should respect staleness thresholds', async () => {
      const rule = await createTestRule('price.value > 45000', 'BTC');
      rule.conditions.stalenessThreshold = 0; // Very strict staleness

      ruleEngine.addRule(rule);

      // Add stale signal
      const staleSignal = {
        ...mockSignals[0],
        timestamp: new Date(Date.now() - 3600000) // 1 hour ago
      };

      ruleEngine.updateSignalData([staleSignal]);

      const result = await ruleEngine.evaluateRule(rule.id);
      expect(result.triggered).toBe(false);
    });
  });

  describe('Cooldown System Integration', () => {
    it('should respect cooldown periods', async () => {
      const rule = await createTestRule('price.value > 45000', 'BTC');
      rule.metadata.cooldownConfig = {
        enabled: true,
        baseCooldownPeriod: 1, // 1 second
        adaptiveCooldown: false,
        criticalAnomalyBypass: false,
        criticalThreshold: 0.9,
        assetVolatilityMultiplier: 1.0,
        userToleranceMultiplier: 1.0,
        groupingEnabled: false,
        groupingWindow: 60,
        maxGroupSize: 5,
        spamSuppressionStats: {
          totalCooldowns: 0,
          totalSuppressedAlerts: 0,
          totalCriticalBypasses: 0,
          averageCooldownPeriod: 0,
          assetCooldownStats: new Map(),
          signalTypeCooldownStats: new Map(),
          effectivenessScore: 0,
          lastUpdated: new Date()
        }
      };

      ruleEngine.addRule(rule);
      ruleEngine.updateSignalData(mockSignals);

      // First evaluation should trigger
      const result1 = await ruleEngine.evaluateRule(rule.id);
      expect(result1.triggered).toBe(true);

      // Second evaluation should be suppressed due to cooldown
      const result2 = await ruleEngine.evaluateRule(rule.id);
      expect(result2.triggered).toBe(false);
    });

    it('should allow critical anomalies to bypass cooldown', async () => {
      const rule = await createTestRule('price.value > 45000', 'BTC');
      rule.metadata.cooldownConfig = {
        enabled: true,
        baseCooldownPeriod: 10,
        adaptiveCooldown: false,
        criticalAnomalyBypass: true,
        criticalThreshold: 0.8,
        assetVolatilityMultiplier: 1.0,
        userToleranceMultiplier: 1.0,
        groupingEnabled: false,
        groupingWindow: 60,
        maxGroupSize: 5,
        spamSuppressionStats: {
          totalCooldowns: 0,
          totalSuppressedAlerts: 0,
          totalCriticalBypasses: 0,
          averageCooldownPeriod: 0,
          assetCooldownStats: new Map(),
          signalTypeCooldownStats: new Map(),
          effectivenessScore: 0,
          lastUpdated: new Date()
        }
      };

      ruleEngine.addRule(rule);
      ruleEngine.updateSignalData(mockSignals);

      // First evaluation
      const result1 = await ruleEngine.evaluateRule(rule.id);
      expect(result1.triggered).toBe(true);

      // Second evaluation with high confidence should bypass
      const highConfidenceSignal = {
        ...mockSignals[0],
        metadata: { ...mockSignals[0].metadata, confidence: 0.95 }
      };
      ruleEngine.updateSignalData([highConfidenceSignal]);

      const result2 = await ruleEngine.evaluateRule(rule.id);
      expect(result2.triggered).toBe(true);
    });
  });

  describe('Dynamic Threshold Integration', () => {
    it('should use dynamic thresholds when configured', async () => {
      const rule = await createTestRule('price.value > 45000', 'BTC');
      rule.conditions.dynamicThresholds = {
        enabled: true,
        adaptationStrategy: 'statistical',
        baseThreshold: 45000,
        adaptationRate: 0.1,
        userRiskTolerance: 'moderate',
        signalStrengthWeight: 0.4,
        historicalPerformanceWeight: 0.3,
        marketRegimeWeight: 0.3,
        manualOverrides: [],
        performanceTracking: {
          enabled: true,
          windowSize: 24,
          metrics: {
            truePositives: 0,
            falsePositives: 0,
            trueNegatives: 0,
            falseNegatives: 0,
            precision: 0,
            recall: 0,
            f1Score: 0,
            averageConfidence: 0
          },
          lastUpdated: new Date()
        }
      };

      ruleEngine.addRule(rule);
      ruleEngine.updateSignalData(mockSignals);

      const result = await ruleEngine.evaluateRule(rule.id);
      expect(result.triggered).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid rule expressions', async () => {
      const rule = await createTestRule('invalid ( syntax', 'BTC');
      ruleEngine.addRule(rule);

      await expect(ruleEngine.evaluateRule(rule.id)).rejects.toThrow();
    });

    it('should handle missing signal types gracefully', async () => {
      const rule = await createTestRule('nonexistent.value > 100', 'BTC');
      ruleEngine.addRule(rule);

      const result = await ruleEngine.evaluateRule(rule.id);
      expect(result.triggered).toBe(false);
      expect(result.confidence).toBe(0);
    });

    it('should handle engine not initialized', () => {
      const uninitializedEngine = new RuleEngine();

      expect(() => uninitializedEngine.addRule({} as any)).toThrow();
      expect(() => uninitializedEngine.evaluateRule('test')).toThrow();
    });
  });

  describe('Real-time Evaluation', () => {
    it('should process queued evaluations', async () => {
      const rule = await createTestRule('price.value > 45000', 'BTC');
      ruleEngine.addRule(rule);

      // Add multiple signal updates
      for (let i = 0; i < 10; i++) {
        ruleEngine.updateSignalData(mockSignals);
      }

      // Should process evaluations in background
      await new Promise(resolve => setTimeout(resolve, 200));
      expect(ruleEngine.getStatus().queuedEvaluations).toBe(0);
    });

    it('should emit events for rule updates and evaluations', async () => {
      const rule = await createTestRule('price.value > 45000', 'BTC');
      ruleEngine.addRule(rule);

      const events: any[] = [];
      ruleEngine.on('ruleUpdate', (event) => events.push(event));
      ruleEngine.on('evaluation', (event) => events.push(event));

      ruleEngine.updateSignalData(mockSignals);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(events.length).toBeGreaterThan(0);
    });
  });

  // Helper function to create test rules
  async function createTestRule(expression: string, asset: string): Promise<AlertRule> {
    const ast = await ruleParser.parse(expression);

    return {
      id: `test_rule_${Date.now()}`,
      name: `Test Rule ${expression}`,
      description: `Test rule for ${expression}`,
      expression,
      ast,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'test_user',
      metadata: {
        category: 'price',
        severity: 'warning',
        tags: ['test'],
        cooldownPeriod: 300
      },
      conditions: {
        evaluationWindow: 300,
        requiredSignals: 1,
        stalenessThreshold: 3600
      }
    };
  }
});
