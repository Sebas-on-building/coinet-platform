/**
 * =========================================
 * SEQUENTIAL PATTERN ENGINE TEST SUITE
 * =========================================
 * Comprehensive testing of sequential pattern detection:
 * - State machine functionality
 * - Time windows and gaps
 * - Order sensitivity
 * - Memory management
 * - Performance under load
 */

import { SequentialPatternEngine } from '../SequentialPatternEngine';
import { RuleParser } from '../RuleParser';
import type {
  SequenceNode,
  NormalizedSignal,
  PatternMatchResult,
  SignalType
} from '../types';

describe('SequentialPatternEngine', () => {
  let patternEngine: SequentialPatternEngine;
  let ruleParser: RuleParser;
  let mockSignals: NormalizedSignal[];

  beforeEach(async () => {
    patternEngine = new SequentialPatternEngine();
    ruleParser = new RuleParser();

    await patternEngine.initialize();

    // Mock sequential signals for pattern testing
    mockSignals = [
      {
        id: 'signal_1',
        type: 'price' as SignalType,
        timestamp: new Date(Date.now() - 10000), // 10 seconds ago
        normalizedValues: { value: 50000 },
        metadata: {
          confidence: 0.9,
          source: 'binance',
          asset: 'BTC',
          timestamp: new Date(Date.now() - 10000)
        }
      },
      {
        id: 'signal_2',
        type: 'volume' as SignalType,
        timestamp: new Date(Date.now() - 5000), // 5 seconds ago
        normalizedValues: { value: 2000000 },
        metadata: {
          confidence: 0.85,
          source: 'binance',
          asset: 'BTC',
          timestamp: new Date(Date.now() - 5000)
        }
      },
      {
        id: 'signal_3',
        type: 'sentiment' as SignalType,
        timestamp: new Date(), // Now
        normalizedValues: { value: 0.8 },
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
    await patternEngine.stop();
  });

  describe('Pattern Engine Initialization', () => {
    it('should initialize successfully', async () => {
      expect(patternEngine.getStatus().initialized).toBe(true);
      expect(patternEngine.getStatus().running).toBe(false);
    });

    it('should start and stop properly', async () => {
      await patternEngine.start();
      expect(patternEngine.getStatus().running).toBe(true);

      await patternEngine.stop();
      expect(patternEngine.getStatus().running).toBe(false);
    });
  });

  describe('Sequential Pattern Detection', () => {
    it('should detect simple two-step sequences', async () => {
      const sequenceNode: SequenceNode = {
        type: 'sequence',
        id: 'test_sequence',
        steps: [
          { type: 'signal_condition', signalType: 'price', operator: '>', threshold: 45000, field: 'value' },
          { type: 'signal_condition', signalType: 'volume', operator: '>', threshold: 1000000, field: 'value' }
        ],
        maxGap: 60, // 60 seconds
        orderSensitive: true,
        timeWeighted: false,
        minMatches: 1
      };

      const patternId = patternEngine.registerSequencePattern('test_rule', sequenceNode);

      // Process signals in sequence
      patternEngine.processSignal(mockSignals[0]); // Price signal
      patternEngine.processSignal(mockSignals[1]); // Volume signal

      // Should detect pattern match
      const matches = patternEngine.getPatternMatches('test_rule');
      expect(matches.length).toBeGreaterThan(0);
    });

    it('should respect time windows and gaps', async () => {
      const sequenceNode: SequenceNode = {
        type: 'sequence',
        id: 'test_sequence',
        steps: [
          { type: 'signal_condition', signalType: 'price', operator: '>', threshold: 45000, field: 'value' },
          { type: 'signal_condition', signalType: 'volume', operator: '>', threshold: 1000000, field: 'value' }
        ],
        maxGap: 1, // Very short gap - should fail
        orderSensitive: true,
        timeWeighted: false,
        minMatches: 1
      };

      const patternId = patternEngine.registerSequencePattern('test_rule', sequenceNode);

      // Process signals with large time gap
      patternEngine.processSignal(mockSignals[0]); // 10 seconds ago
      patternEngine.processSignal(mockSignals[2]); // Now - too much gap

      const matches = patternEngine.getPatternMatches('test_rule');
      expect(matches.length).toBe(0);
    });

    it('should handle order-sensitive vs order-insensitive patterns', async () => {
      const sequenceNode: SequenceNode = {
        type: 'sequence',
        id: 'test_sequence',
        steps: [
          { type: 'signal_condition', signalType: 'price', operator: '>', threshold: 45000, field: 'value' },
          { type: 'signal_condition', signalType: 'volume', operator: '>', threshold: 1000000, field: 'value' }
        ],
        maxGap: 60,
        orderSensitive: false, // Order insensitive
        timeWeighted: false,
        minMatches: 1
      };

      const patternId = patternEngine.registerSequencePattern('test_rule', sequenceNode);

      // Process signals in reverse order
      patternEngine.processSignal(mockSignals[1]); // Volume first
      patternEngine.processSignal(mockSignals[0]); // Price second

      const matches = patternEngine.getPatternMatches('test_rule');
      expect(matches.length).toBeGreaterThan(0);
    });

    it('should track partial matches and reset on timeout', async () => {
      const sequenceNode: SequenceNode = {
        type: 'sequence',
        id: 'test_sequence',
        steps: [
          { type: 'signal_condition', signalType: 'price', operator: '>', threshold: 45000, field: 'value' },
          { type: 'signal_condition', signalType: 'volume', operator: '>', threshold: 1000000, field: 'value' }
        ],
        maxGap: 5, // 5 seconds
        orderSensitive: true,
        timeWeighted: false,
        minMatches: 1
      };

      const patternId = patternEngine.registerSequencePattern('test_rule', sequenceNode);

      // Start sequence
      patternEngine.processSignal(mockSignals[0]); // Price signal

      // Wait for timeout (simulated)
      await new Promise(resolve => setTimeout(resolve, 6000));

      // Process volume signal after timeout
      patternEngine.processSignal(mockSignals[1]);

      // Should not match due to timeout
      const matches = patternEngine.getPatternMatches('test_rule');
      expect(matches.length).toBe(0);
    });
  });

  describe('Pattern State Management', () => {
    it('should maintain state machines for multiple patterns', async () => {
      const sequence1: SequenceNode = {
        type: 'sequence',
        id: 'pattern_1',
        steps: [
          { type: 'signal_condition', signalType: 'price', operator: '>', threshold: 45000, field: 'value' }
        ],
        maxGap: 60,
        orderSensitive: true,
        timeWeighted: false,
        minMatches: 1
      };

      const sequence2: SequenceNode = {
        type: 'sequence',
        id: 'pattern_2',
        steps: [
          { type: 'signal_condition', signalType: 'volume', operator: '>', threshold: 1000000, field: 'value' }
        ],
        maxGap: 60,
        orderSensitive: true,
        timeWeighted: false,
        minMatches: 1
      };

      const patternId1 = patternEngine.registerSequencePattern('rule_1', sequence1);
      const patternId2 = patternEngine.registerSequencePattern('rule_2', sequence2);

      expect(patternId1).toBeDefined();
      expect(patternId2).toBeDefined();
      expect(patternId1).not.toBe(patternId2);

      const stats = patternEngine.getPatternStatistics();
      expect(stats.activePatterns).toBeGreaterThan(0);
    });

    it('should handle pattern cleanup and memory management', async () => {
      const sequenceNode: SequenceNode = {
        type: 'sequence',
        id: 'test_sequence',
        steps: [
          { type: 'signal_condition', signalType: 'price', operator: '>', threshold: 45000, field: 'value' }
        ],
        maxGap: 60,
        orderSensitive: true,
        timeWeighted: false,
        minMatches: 1
      };

      const patternId = patternEngine.registerSequencePattern('test_rule', sequenceNode);

      // Process signal
      patternEngine.processSignal(mockSignals[0]);

      let stats = patternEngine.getPatternStatistics();
      expect(stats.activePatterns).toBeGreaterThan(0);

      // Stop engine and restart
      await patternEngine.stop();
      await patternEngine.initialize();

      stats = patternEngine.getPatternStatistics();
      expect(stats.activePatterns).toBe(0);
    });
  });

  describe('Performance Requirements', () => {
    it('should handle high-frequency pattern evaluation', async () => {
      const sequenceNode: SequenceNode = {
        type: 'sequence',
        id: 'test_sequence',
        steps: [
          { type: 'signal_condition', signalType: 'price', operator: '>', threshold: 45000, field: 'value' }
        ],
        maxGap: 60,
        orderSensitive: true,
        timeWeighted: false,
        minMatches: 1
      };

      patternEngine.registerSequencePattern('test_rule', sequenceNode);

      // Process many signals rapidly
      const iterations = 1000;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        const signal = {
          ...mockSignals[0],
          id: `signal_${i}`,
          timestamp: new Date(Date.now() - Math.random() * 60000)
        };
        patternEngine.processSignal(signal);
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const avgLatency = totalTime / iterations;

      expect(avgLatency).toBeLessThan(10); // Should be very fast
    });

    it('should handle concurrent pattern evaluations', async () => {
      // Create multiple patterns
      const patterns = [];
      for (let i = 0; i < 100; i++) {
        const sequenceNode: SequenceNode = {
          type: 'sequence',
          id: `pattern_${i}`,
          steps: [
            { type: 'signal_condition', signalType: 'price', operator: '>', threshold: 45000, field: 'value' }
          ],
          maxGap: 60,
          orderSensitive: true,
          timeWeighted: false,
          minMatches: 1
        };
        patterns.push(sequenceNode);
      }

      // Register all patterns
      const patternIds = patterns.map(seq => patternEngine.registerSequencePattern(`rule_${seq.id}`, seq));

      // Process signals for all patterns
      const startTime = Date.now();

      for (let i = 0; i < 100; i++) {
        patternEngine.processSignal(mockSignals[0]);
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(1000); // Should handle concurrent patterns efficiently
    });
  });

  describe('Complex Pattern Features', () => {
    it('should handle time-weighted scoring', async () => {
      const sequenceNode: SequenceNode = {
        type: 'sequence',
        id: 'test_sequence',
        steps: [
          { type: 'signal_condition', signalType: 'price', operator: '>', threshold: 45000, field: 'value' },
          { type: 'signal_condition', signalType: 'volume', operator: '>', threshold: 1000000, field: 'value' }
        ],
        maxGap: 60,
        orderSensitive: true,
        timeWeighted: true, // Enable time weighting
        minMatches: 1
      };

      const patternId = patternEngine.registerSequencePattern('test_rule', sequenceNode);

      patternEngine.processSignal(mockSignals[0]);
      patternEngine.processSignal(mockSignals[1]);

      const matches = patternEngine.getPatternMatches('test_rule');
      if (matches.length > 0) {
        expect(matches[0].timeWeightedScore).toBeDefined();
      }
    });

    it('should handle partial matches and fuzzy matching', async () => {
      const sequenceNode: SequenceNode = {
        type: 'sequence',
        id: 'test_sequence',
        steps: [
          { type: 'signal_condition', signalType: 'price', operator: '>', threshold: 45000, field: 'value' },
          { type: 'signal_condition', signalType: 'volume', operator: '>', threshold: 1000000, field: 'value' },
          { type: 'signal_condition', signalType: 'sentiment', operator: '>', threshold: 0.6, field: 'value' }
        ],
        maxGap: 60,
        orderSensitive: true,
        timeWeighted: false,
        minMatches: 2 // Require only 2 out of 3 matches
      };

      const patternId = patternEngine.registerSequencePattern('test_rule', sequenceNode);

      // Process only 2 signals (should still match)
      patternEngine.processSignal(mockSignals[0]);
      patternEngine.processSignal(mockSignals[1]);

      const matches = patternEngine.getPatternMatches('test_rule');
      expect(matches.length).toBeGreaterThan(0);
    });
  });

  describe('Event Handling', () => {
    it('should emit pattern match events', async () => {
      const sequenceNode: SequenceNode = {
        type: 'sequence',
        id: 'test_sequence',
        steps: [
          { type: 'signal_condition', signalType: 'price', operator: '>', threshold: 45000, field: 'value' }
        ],
        maxGap: 60,
        orderSensitive: true,
        timeWeighted: false,
        minMatches: 1
      };

      const patternId = patternEngine.registerSequencePattern('test_rule', sequenceNode);

      const events: any[] = [];
      patternEngine.on('patternMatch', (match) => events.push(match));

      patternEngine.processSignal(mockSignals[0]);

      expect(events.length).toBeGreaterThan(0);
      expect(events[0].patternId).toBe(patternId);
    });
  });

  describe('Memory Management', () => {
    it('should clean up expired patterns', async () => {
      const sequenceNode: SequenceNode = {
        type: 'sequence',
        id: 'test_sequence',
        steps: [
          { type: 'signal_condition', signalType: 'price', operator: '>', threshold: 45000, field: 'value' }
        ],
        maxGap: 1, // Very short gap
        orderSensitive: true,
        timeWeighted: false,
        minMatches: 1
      };

      patternEngine.registerSequencePattern('test_rule', sequenceNode);

      // Process signal
      patternEngine.processSignal(mockSignals[0]);

      let stats = patternEngine.getPatternStatistics();
      expect(stats.activePatterns).toBeGreaterThan(0);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Process cleanup (simulated)
      patternEngine.cleanupExpiredPatterns();

      stats = patternEngine.getPatternStatistics();
      expect(stats.activePatterns).toBe(0);
    });

    it('should handle memory pressure gracefully', async () => {
      // Create many patterns to test memory management
      for (let i = 0; i < 1000; i++) {
        const sequenceNode: SequenceNode = {
          type: 'sequence',
          id: `pattern_${i}`,
          steps: [
            { type: 'signal_condition', signalType: 'price', operator: '>', threshold: 45000, field: 'value' }
          ],
          maxGap: 60,
          orderSensitive: true,
          timeWeighted: false,
          minMatches: 1
        };
        patternEngine.registerSequencePattern(`rule_${i}`, sequenceNode);
      }

      const stats = patternEngine.getPatternStatistics();
      expect(stats.activePatterns).toBe(1000);

      // Memory should still be manageable
      expect(stats.memoryUsage).toBeLessThan(50 * 1024 * 1024); // Less than 50MB
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid sequence configurations', async () => {
      const invalidSequence: SequenceNode = {
        type: 'sequence',
        id: 'invalid',
        steps: [], // Empty steps
        maxGap: 60,
        orderSensitive: true,
        timeWeighted: false,
        minMatches: 1
      };

      expect(() => patternEngine.registerSequencePattern('test_rule', invalidSequence)).toThrow();
    });

    it('should handle malformed signals gracefully', async () => {
      const sequenceNode: SequenceNode = {
        type: 'sequence',
        id: 'test_sequence',
        steps: [
          { type: 'signal_condition', signalType: 'price', operator: '>', threshold: 45000, field: 'value' }
        ],
        maxGap: 60,
        orderSensitive: true,
        timeWeighted: false,
        minMatches: 1
      };

      patternEngine.registerSequencePattern('test_rule', sequenceNode);

      // Process malformed signal
      const malformedSignal = {
        id: 'malformed',
        type: 'unknown' as SignalType,
        timestamp: new Date(),
        normalizedValues: {},
        metadata: {
          confidence: 0,
          source: 'unknown',
          asset: 'unknown',
          timestamp: new Date()
        }
      };

      expect(() => patternEngine.processSignal(malformedSignal)).not.toThrow();
    });
  });
});
