/**
 * =========================================
 * SEQUENTIAL PATTERN ENGINE
 * =========================================
 * State machine-based detection of ordered signal sequences
 * with time window management and optimization for millions
 * of concurrent pattern evaluations
 */

import { EventEmitter } from 'events';
import { Logger } from '../utils/Logger';
import type { NormalizedSignal, SignalType } from '../types';
import type {
  ASTNode,
  SequenceNode,
  PatternState,
  PatternMatchResult,
  RuleEvaluationContext,
  PatternMatcher,
  FuzzyPatternMatcher,
  PatternEvaluationOptions,
  AdvancedPatternState,
  StateTransition,
  PartialStateBuffer,
  StateMachineConfig,
  ScoringStrategy,
  ScoringContext,
  ScoringConfig,
  TimeWindow,
  WindowStrategy,
  TemporalConstraints
} from './types';

export class SequentialPatternEngine extends EventEmitter {
  private logger: Logger;
  private isInitialized: boolean = false;

  // Pattern state tracking
  private activePatterns: Map<string, PatternState> = new Map<string, PatternState>(); // patternId -> state
  private patternStates: Map<string, Map<string, PatternState>> = new Map<string, Map<string, PatternState>>(); // ruleId -> patternId -> state

  // Advanced pattern matching configurations
  private patternMatchers: Map<string, PatternMatcher> = new Map<string, PatternMatcher>(); // patternId -> matcher
  private fuzzyMatchers: Map<string, FuzzyPatternMatcher> = new Map(); // patternId -> fuzzy matcher

  // Evaluation options
  private evaluationOptions: PatternEvaluationOptions = {
    enableFuzzyMatching: true,
    enablePartialMatching: true,
    enableGapAnalysis: true,
    maxConcurrentEvaluations: 10000,
    evaluationTimeout: 5000,
    memoryLimit: 1024, // 1GB
    patternComplexityLimit: 100,
    stateMachine: {
      enableTransitionTracking: true,
      enablePartialBuffering: true,
      maxTransitionsPerPattern: 1000,
      transitionHistorySize: 100,
      stateValidationInterval: 60000, // 1 minute
      autoRecoveryEnabled: true,
      corruptionThreshold: 0.1 // 10%
    },
    scoring: {
      defaultStrategy: {
        type: 'gap_aware',
        weights: {
          timeWeight: 0.3,
          confidenceWeight: 0.4,
          completenessWeight: 0.2,
          gapWeight: 0.1
        }
      },
      enableGapAnalysis: true,
      enableTimeDecay: true,
      timeDecayFactor: 0.95,
      minScoreThreshold: 0.6,
      maxScoreCap: 1.0,
      adaptiveThresholds: true
    }
  };

  // Scoring system state
  private scoringStrategies: Map<string, ScoringStrategy> = new Map(); // patternId -> strategy
  private scoringHistory: Map<string, number[]> = new Map(); // patternId -> recent scores

  // Performance optimization
  private patternCache: Map<string, {
    pattern: SequenceNode;
    lastUsed: Date;
    accessCount: number;
  }> = new Map();

  // Enhanced state machine management
  private stateTransitions: Map<string, StateTransition[]> = new Map(); // patternId -> transitions
  private partialStateBuffer: Map<string, PartialStateBuffer> = new Map(); // patternId -> buffer
  private stateMachineMetrics: {
    totalTransitions: number;
    averageTransitionTime: number;
    stateCorruptionCount: number;
    recoveryCount: number;
  } = {
    totalTransitions: 0,
    averageTransitionTime: 0,
    stateCorruptionCount: 0,
    recoveryCount: 0
  };

  // Time window management
  private activeWindows: Map<string, TimeWindow[]> = new Map(); // patternId -> windows
  private windowStrategies: Map<string, WindowStrategy> = new Map(); // patternId -> strategy
  private temporalConstraints: Map<string, TemporalConstraints> = new Map(); // patternId -> constraints
  private windowMetrics: {
    totalWindowsCreated: number;
    totalWindowsExpired: number;
    averageWindowDuration: number;
    windowUtilizationRate: number;
  } = {
    totalWindowsCreated: 0,
    totalWindowsExpired: 0,
    averageWindowDuration: 0,
    windowUtilizationRate: 0
  };

  // Memory management
  private cleanupInterval: NodeJS.Timeout | null = null;
  private maxActivePatterns: number = 100000; // Prevent memory exhaustion
  private memoryPressureThreshold: number = 0.8; // 80% memory usage threshold
  private patternEvictionBatchSize: number = 1000; // Patterns to evict per cleanup cycle
  private memoryStats: {
    lastCleanup: Date;
    totalPatternsCreated: number;
    totalPatternsEvicted: number;
    currentMemoryUsage: number;
    peakMemoryUsage: number;
    stateFragmentation: number;
    memoryReclaimed: number;
  } = {
    lastCleanup: new Date(),
    totalPatternsCreated: 0,
    totalPatternsEvicted: 0,
    currentMemoryUsage: 0,
    peakMemoryUsage: 0,
    stateFragmentation: 0,
    memoryReclaimed: 0
  };

  constructor(options?: Partial<PatternEvaluationOptions>) {
    super();
    this.logger = new Logger('SequentialPatternEngine');

    if (options) {
      this.evaluationOptions = { ...this.evaluationOptions, ...options };
    }
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing sequential pattern engine...');

      // Reset state
      this.activePatterns.clear();
      this.patternStates.clear();
      this.patternCache.clear();

      // Start cleanup interval
      this.startCleanupInterval();

      this.isInitialized = true;
      this.logger.info('✅ Sequential pattern engine initialized successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to initialize sequential pattern engine', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      this.logger.info('Stopping sequential pattern engine...');

      // Stop cleanup interval
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
        this.cleanupInterval = null;
      }

      // Clear all state
      this.activePatterns.clear();
      this.patternStates.clear();
      this.patternCache.clear();

      this.isInitialized = false;
      this.logger.info('✅ Sequential pattern engine stopped successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to stop sequential pattern engine', error);
      throw error;
    }
  }

  /**
   * Process a new signal for pattern matching with time window management
   */
  processSignal(signal: NormalizedSignal): void {
    if (!this.isInitialized) {
      throw new Error('Sequential pattern engine is not initialized');
    }

    try {
      this.logger.debug('Processing signal for pattern matching', {
        signalId: signal.id,
        signalType: signal.type,
        timestamp: signal.timestamp
      });

      // Check temporal constraints for signal
      if (!this.checkTemporalConstraints(signal)) {
        this.logger.debug('Signal filtered out by temporal constraints', {
          signalId: signal.id,
          timestamp: signal.timestamp
        });
        return;
      }

      // Update time windows for all patterns
      this.updateTimeWindows(signal);

      // Update all active pattern states
      this.updatePatternStates(signal);

      // Clean up expired patterns and windows
      this.cleanupExpiredPatterns();
      this.cleanupExpiredWindows();

      this.logger.debug('Signal processed for pattern matching', {
        activePatterns: this.activePatterns.size,
        activeWindows: this.getTotalActiveWindows()
      });

    } catch (error: any) {
      this.logger.error('Failed to process signal for pattern matching', {
        signalId: signal.id,
        error: error.message
      });
    }
  }

  /**
   * Create a new advanced pattern state with enhanced state machine features
   */
  createAdvancedPatternState(
    patternId: string,
    ruleId: string,
    sequenceNode: SequenceNode,
    matcher?: PatternMatcher,
    initialSignal?: NormalizedSignal
  ): AdvancedPatternState {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (sequenceNode.maxGap * 1000));

    const state: AdvancedPatternState = {
      patternId,
      ruleId,
      startTime: now,
      currentStep: 0,
      matchedSteps: [],
      isActive: true,
      expiresAt,
      matchType: matcher?.matcherType || 'exact',
      similarity: 1.0,
      partialMatches: new Map(),
      gapHistory: [],
      stateTransitions: [],
      lastTransitionAt: now,
      transitionHistory: [],
      metadata: {
        maxGap: sequenceNode.maxGap,
        orderSensitive: sequenceNode.orderSensitive,
        timeWeighted: sequenceNode.timeWeighted
      }
    };

    // Initialize state machine tracking
    if (this.evaluationOptions.stateMachine?.enableTransitionTracking) {
      this.stateTransitions.set(patternId, []);
    }

    if (this.evaluationOptions.stateMachine?.enablePartialBuffering) {
      this.partialStateBuffer.set(patternId, {
        patternId,
        bufferSize: 50,
        maxBufferAge: 300000, // 5 minutes
        states: new Map(),
        compressionEnabled: true,
        compressionRatio: 0.7
      });
    }

    // Record initial state transition
    this.recordStateTransition(patternId, state, -1, 0, 'initialization' as StateTransition['transitionType'], now, 0, initialSignal);

    // Add initial signal if provided
    if (initialSignal) {
      const stepMatch = this.checkAdvancedStepMatch(sequenceNode.steps[0], initialSignal, matcher);
      if (stepMatch && stepMatch.matches) {
        this.transitionState(patternId, state, 0, 1, 'step_match', now, stepMatch.confidence, initialSignal);
        state.matchedSteps.push({
          stepIndex: 0,
          signal: initialSignal,
          matchedAt: now,
          confidence: stepMatch.confidence
        });
        state.currentStep = 1;
      }
    }

    return state;
  }

  /**
   * Create a new pattern state (backward compatibility)
   */
  createPatternState(
    patternId: string,
    ruleId: string,
    sequenceNode: SequenceNode,
    initialSignal?: NormalizedSignal
  ): PatternState {
    return this.createAdvancedPatternState(patternId, ruleId, sequenceNode, undefined, initialSignal) as PatternState;
  }

  /**
   * Update pattern states with new signal (advanced version)
   */
  private updateAdvancedPatternStates(signal: NormalizedSignal): void {
    const now = new Date();

    // Update existing active patterns
    for (const [patternId, state] of this.activePatterns) {
      if (!state.isActive) continue;

      // Check if pattern expired
      if (now > state.expiresAt) {
        state.isActive = false;
        continue;
      }

      // Try to match current step with advanced matching
      const sequenceNode = this.getSequenceNode(patternId);
      if (!sequenceNode) continue;

      const currentStepIndex = state.currentStep;
      if (currentStepIndex >= sequenceNode.steps.length) continue;

      const currentStep = sequenceNode.steps[currentStepIndex];
      const matcher = this.patternMatchers.get(patternId);
      const stepMatch = this.checkAdvancedStepMatch(currentStep, signal, matcher);

      if (stepMatch && stepMatch.matches) {
        // Track gap if this is not the first step
        if (state.matchedSteps.length > 0) {
          const lastStep = state.matchedSteps[state.matchedSteps.length - 1];
          const gapDuration = now.getTime() - lastStep.matchedAt.getTime();

          if (state instanceof Object && 'gapHistory' in state) {
            (state as AdvancedPatternState).gapHistory.push({
              fromStep: lastStep.stepIndex,
              toStep: currentStepIndex,
              gapDuration,
              timestamp: now
            });
          }
        }

        // Add matched step
        state.matchedSteps.push({
          stepIndex: currentStepIndex,
          signal,
          matchedAt: now,
          confidence: stepMatch.confidence
        });

        // Update advanced state properties
        if (state instanceof Object && 'matchType' in state) {
          const advancedState = state as AdvancedPatternState;
          advancedState.matchType = stepMatch.matchType || 'exact';
          if (stepMatch.similarity !== undefined) {
            advancedState.similarity = (advancedState.similarity || 1.0) * stepMatch.similarity;
          }
        }

        // Move to next step with state transition
        this.transitionState(patternId, state as AdvancedPatternState, currentStepIndex, currentStepIndex + 1, 'step_match', now, stepMatch.confidence, signal);

        // Check if pattern completed
        if (state.currentStep >= sequenceNode.steps.length) {
          this.transitionState(patternId, state as AdvancedPatternState, state.currentStep - 1, -1, 'completion', now, 1.0, signal);
          this.handleAdvancedPatternCompletion(patternId, state as AdvancedPatternState);
        }
      }
    }

    // Check for new pattern starts
    this.checkForNewPatternStarts(signal);
  }

  /**
   * Update pattern states with new signal (backward compatibility)
   */
  private updatePatternStates(signal: NormalizedSignal): void {
    this.updateAdvancedPatternStates(signal);
  }

  /**
   * Check if a signal matches a pattern step (basic matching)
   */
  private checkStepMatch(step: ASTNode, signal: NormalizedSignal): {
    matches: boolean;
    confidence: number;
  } | null {
    return this.evaluateASTNode(step, signal);
  }

  /**
   * Advanced step matching with fuzzy and partial matching support
   */
  private checkAdvancedStepMatch(
    step: ASTNode,
    signal: NormalizedSignal,
    matcher?: PatternMatcher
  ): {
    matches: boolean;
    confidence: number;
    similarity?: number;
    matchType?: 'exact' | 'fuzzy' | 'partial';
  } | null {

    if (!matcher) {
      // Fall back to basic matching
      const basicMatch = this.checkStepMatch(step, signal);
      if (!basicMatch) return null;

      return {
        matches: basicMatch.matches,
        confidence: basicMatch.confidence,
        matchType: 'exact'
      };
    }

    switch (matcher.matcherType) {
      case 'exact':
        const exactMatch = this.checkStepMatch(step, signal);
        if (!exactMatch) return null;
        return {
          matches: exactMatch.matches,
          confidence: exactMatch.confidence,
          matchType: 'exact'
        };

      case 'fuzzy':
        return this.checkFuzzyStepMatch(step, signal, matcher);

      case 'partial':
        return this.checkPartialStepMatch(step, signal, matcher);

      default:
        return null;
    }
  }

  /**
   * Fuzzy step matching with similarity calculation
   */
  private checkFuzzyStepMatch(
    step: ASTNode,
    signal: NormalizedSignal,
    matcher: PatternMatcher
  ): {
    matches: boolean;
    confidence: number;
    similarity: number;
    matchType: 'fuzzy';
  } | null {

    const fuzzyMatcher = this.fuzzyMatchers.get(matcher.patternId);
    if (!fuzzyMatcher) return null;

    const basicMatch = this.evaluateASTNode(step, signal);
    if (!basicMatch) return null;

    // Calculate fuzzy similarity
    const similarity = this.calculateFuzzySimilarity(step, signal, fuzzyMatcher);

    // Check if similarity meets threshold
    if (similarity < fuzzyMatcher.similarityThreshold) {
      return null;
    }

    const adjustedConfidence = basicMatch.confidence * similarity;

    return {
      matches: true,
      confidence: adjustedConfidence,
      similarity,
      matchType: 'fuzzy'
    };
  }

  /**
   * Partial step matching for subsequence detection
   */
  private checkPartialStepMatch(
    step: ASTNode,
    signal: NormalizedSignal,
    matcher: PatternMatcher
  ): {
    matches: boolean;
    confidence: number;
    similarity?: number;
    matchType: 'partial';
  } | null {

    const basicMatch = this.evaluateASTNode(step, signal);
    if (!basicMatch) return null;

    // For partial matching, we consider any signal that meets the basic condition
    // but with adjusted confidence based on how well it matches
    const adjustedConfidence = basicMatch.confidence * (matcher.allowSubsequences ? 0.8 : 1.0);

    return {
      matches: true,
      confidence: adjustedConfidence,
      matchType: 'partial'
    };
  }

  /**
   * Calculate fuzzy similarity between step and signal
   */
  private calculateFuzzySimilarity(
    step: ASTNode,
    signal: NormalizedSignal,
    fuzzyMatcher: FuzzyPatternMatcher
  ): number {

    if (step.type !== 'signal_condition') return 0;

    // Extract expected and actual values
    const expectedValue = step.threshold;
    const actualValue = this.extractSignalValue(signal, step.field);

    // Calculate temporal similarity
    const temporalSimilarity = this.calculateTemporalSimilarity(signal, fuzzyMatcher);

    // Calculate amplitude similarity
    const amplitudeSimilarity = this.calculateAmplitudeSimilarity(expectedValue, actualValue, fuzzyMatcher);

    // Combine similarities based on distance metric
    switch (fuzzyMatcher.distanceMetric) {
      case 'euclidean':
        return Math.sqrt(temporalSimilarity * temporalSimilarity + amplitudeSimilarity * amplitudeSimilarity);

      case 'manhattan':
        return (temporalSimilarity + amplitudeSimilarity) / 2;

      case 'cosine':
        return (temporalSimilarity * amplitudeSimilarity) /
               Math.sqrt(temporalSimilarity * temporalSimilarity + amplitudeSimilarity * amplitudeSimilarity);

      case 'dtw':
        return this.calculateDTWSimilarity(step, signal, fuzzyMatcher);

      default:
        return amplitudeSimilarity * temporalSimilarity;
    }
  }

  /**
   * Calculate temporal similarity
   */
  private calculateTemporalSimilarity(signal: NormalizedSignal, fuzzyMatcher: FuzzyPatternMatcher): number {
    // For now, use a simple time-based similarity
    // In a real implementation, this would consider the signal's timestamp relative to expected timing
    return 1.0; // Placeholder
  }

  /**
   * Calculate amplitude similarity
   */
  private calculateAmplitudeSimilarity(
    expected: number,
    actual: number,
    fuzzyMatcher: FuzzyPatternMatcher
  ): number {
    const diff = Math.abs(expected - actual);
    const tolerance = fuzzyMatcher.amplitudeTolerance * Math.max(expected, actual);

    if (diff <= tolerance) {
      return 1.0;
    } else {
      return Math.max(0, 1.0 - (diff - tolerance) / Math.max(expected, actual));
    }
  }

  /**
   * Calculate Dynamic Time Warping similarity
   */
  private calculateDTWSimilarity(
    step: ASTNode,
    signal: NormalizedSignal,
    fuzzyMatcher: FuzzyPatternMatcher
  ): number {
    // Simplified DTW implementation for pattern matching
    // In a real implementation, this would use proper DTW algorithm

    if (step.type !== 'signal_condition') return 0;

    const expectedValue = step.threshold;
    const actualValue = this.extractSignalValue(signal, step.field);

    // Simple distance-based similarity
    const distance = Math.abs(expectedValue - actualValue);
    const maxDistance = Math.max(expectedValue, actualValue);

    return Math.max(0, 1.0 - distance / maxDistance);
  }

  /**
   * Record state transition for state machine tracking
   */
  private recordStateTransition(
    patternId: string,
    state: AdvancedPatternState,
    fromState: number,
    toState: number,
    transitionType: StateTransition['transitionType'] | 'initialization',
    timestamp: Date,
    duration: number,
    signal?: NormalizedSignal
  ): void {
    if (!this.evaluationOptions.stateMachine?.enableTransitionTracking) return;

    const transition: StateTransition = {
      id: `transition_${patternId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      patternId,
      fromState,
      toState,
      transitionType,
      timestamp,
      duration,
      signal,
      metadata: {
        confidence: state.matchedSteps.length > 0 ?
          state.matchedSteps[state.matchedSteps.length - 1]?.confidence : undefined,
        similarity: state.similarity,
        gapDuration: state.gapHistory.length > 0 ?
          state.gapHistory[state.gapHistory.length - 1]?.gapDuration : undefined
      }
    };

    // Record in state's transition history
    state.stateTransitions.push(transition);
    state.transitionHistory.push({
      fromState,
      toState,
      transition: transitionType,
      timestamp,
      duration
    });

    // Limit transition history size
    const maxTransitions = this.evaluationOptions.stateMachine?.transitionHistorySize || 100;
    if (state.stateTransitions.length > maxTransitions) {
      state.stateTransitions = state.stateTransitions.slice(-maxTransitions);
    }
    if (state.transitionHistory.length > maxTransitions) {
      state.transitionHistory = state.transitionHistory.slice(-maxTransitions);
    }

    // Record in global transition tracking
    const transitions = this.stateTransitions.get(patternId) || [];
    transitions.push(transition);

    const maxPerPattern = this.evaluationOptions.stateMachine?.maxTransitionsPerPattern || 1000;
    if (transitions.length > maxPerPattern) {
      transitions.splice(0, transitions.length - maxPerPattern);
    }
    this.stateTransitions.set(patternId, transitions);

    // Update metrics
    this.stateMachineMetrics.totalTransitions++;
    this.stateMachineMetrics.averageTransitionTime =
      (this.stateMachineMetrics.averageTransitionTime * (this.stateMachineMetrics.totalTransitions - 1) + duration) /
      this.stateMachineMetrics.totalTransitions;

    state.lastTransitionAt = timestamp;
  }

  /**
   * Transition state with validation and buffering
   */
  private transitionState(
    patternId: string,
    state: AdvancedPatternState,
    fromState: number,
    toState: number,
    transitionType: StateTransition['transitionType'],
    timestamp: Date,
    confidence?: number,
    signal?: NormalizedSignal
  ): void {
    const startTime = Date.now();

    // Validate state consistency
    if (!this.validateStateConsistency(state, fromState, toState)) {
      this.handleStateCorruption(patternId, state);
      return;
    }

    // Update state
    state.currentStep = toState;

    // Record transition
    this.recordStateTransition(patternId, state, fromState, toState, transitionType, timestamp, Date.now() - startTime, signal);

    // Buffer partial state if enabled
    if (this.evaluationOptions.stateMachine?.enablePartialBuffering) {
      this.bufferPartialState(patternId, state);
    }
  }

  /**
   * Validate state consistency
   */
  private validateStateConsistency(
    state: AdvancedPatternState,
    expectedFromState: number,
    expectedToState: number
  ): boolean {
    // Check if current state matches expected from state
    if (state.currentStep !== expectedFromState) {
      this.logger.warn('State inconsistency detected', {
        patternId: state.patternId,
        currentStep: state.currentStep,
        expectedFromState,
        expectedToState
      });
      return false;
    }

    // Check if state is still active and not expired
    if (!state.isActive || new Date() > state.expiresAt) {
      return false;
    }

    // Check for corruption indicators
    if (state.matchedSteps.length > 0) {
      const lastStep = state.matchedSteps[state.matchedSteps.length - 1];
      if (lastStep.stepIndex !== expectedFromState) {
        return false;
      }
    }

    return true;
  }

  /**
   * Handle state corruption and recovery
   */
  private handleStateCorruption(patternId: string, corruptedState: AdvancedPatternState): void {
    this.stateMachineMetrics.stateCorruptionCount++;

    if (!this.evaluationOptions.stateMachine?.autoRecoveryEnabled) {
      this.logger.error('State corruption detected and auto-recovery disabled', {
        patternId,
        currentStep: corruptedState.currentStep,
        matchedSteps: corruptedState.matchedSteps.length
      });
      corruptedState.isActive = false;
      return;
    }

    // Attempt recovery
    this.recoverCorruptedState(patternId, corruptedState);
  }

  /**
   * Recover corrupted state using partial buffer
   */
  private recoverCorruptedState(patternId: string, corruptedState: AdvancedPatternState): void {
    const buffer = this.partialStateBuffer.get(patternId);
    if (!buffer || buffer.states.size === 0) {
      this.logger.warn('Cannot recover corrupted state - no buffer available', { patternId });
      corruptedState.isActive = false;
      return;
    }

    // Find most recent valid state
    let bestState: AdvancedPatternState | null = null;
    let bestTimestamp: Date | null = null;

    for (const [stateId, buffered] of buffer.states) {
      if (buffered.addedAt > (bestTimestamp || new Date(0))) {
        bestState = buffered.state;
        bestTimestamp = buffered.addedAt;
      }
    }

    if (bestState) {
      // Restore from best available state
      Object.assign(corruptedState, bestState);
      corruptedState.isActive = true;

      this.stateMachineMetrics.recoveryCount++;

      this.logger.info('State recovered from buffer', {
        patternId,
        recoveredStep: corruptedState.currentStep,
        recoveryCount: this.stateMachineMetrics.recoveryCount
      });
    } else {
      corruptedState.isActive = false;
    }
  }

  /**
   * Buffer partial state for recovery purposes
   */
  private bufferPartialState(patternId: string, state: AdvancedPatternState): void {
    const buffer = this.partialStateBuffer.get(patternId);
    if (!buffer) return;

    const stateId = `state_${patternId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create lightweight copy for buffering
    const bufferedState: AdvancedPatternState = {
      ...state,
      partialMatches: new Map(), // Don't buffer partial matches to save memory
      gapHistory: state.gapHistory.slice(-10), // Keep only recent gaps
      stateTransitions: [], // Don't buffer full transitions
      transitionHistory: state.transitionHistory.slice(-20) // Keep recent history
    };

    buffer.states.set(stateId, {
      state: bufferedState,
      addedAt: new Date(),
      lastAccessed: new Date(),
      accessCount: 0
    });

    // Clean up old states
    if (buffer.states.size > buffer.bufferSize) {
      const sortedStates = Array.from(buffer.states.entries())
        .sort((a, b) => a[1].addedAt.getTime() - b[1].addedAt.getTime());

      const toRemove = sortedStates.slice(0, buffer.states.size - buffer.bufferSize);
      toRemove.forEach(([id]) => buffer.states.delete(id));
    }

    // Clean up old states by age
    const cutoffTime = new Date(Date.now() - buffer.maxBufferAge);
    for (const [stateId, buffered] of buffer.states) {
      if (buffered.addedAt < cutoffTime) {
        buffer.states.delete(stateId);
      }
    }
  }

  /**
   * Evaluate an AST node for pattern matching
   */
  private evaluateASTNode(node: ASTNode, signal: NormalizedSignal): {
    matches: boolean;
    confidence: number;
  } | null {
    switch (node.type) {
      case 'signal_condition':
        return this.evaluateSignalCondition(node, signal);

      case 'logical_and':
        return this.evaluateLogicalAnd(node, signal);

      case 'logical_or':
        return this.evaluateLogicalOr(node, signal);

      case 'logical_not':
        return this.evaluateLogicalNot(node, signal);

      case 'group':
        return this.evaluateASTNode(node.expression, signal);

      default:
        return null;
    }
  }

  /**
   * Evaluate signal condition for pattern matching
   */
  private evaluateSignalCondition(node: any, signal: NormalizedSignal): {
    matches: boolean;
    confidence: number;
  } | null {
    const signalType = node.signalType;
    if (signal.type !== signalType) return null;

    // Extract value and check condition
    const signalValue = this.extractSignalValue(signal, node.field);
    const matches = this.evaluateCondition(signalValue, node.operator, node.threshold);
    const confidence = matches ? signal.metadata.confidence : 0;

    return {
      matches,
      confidence
    };
  }

  /**
   * Evaluate logical AND for pattern matching
   */
  private evaluateLogicalAnd(node: any, signal: NormalizedSignal): {
    matches: boolean;
    confidence: number;
  } | null {
    if (!node.left || !node.right) return null;

    const leftResult = this.evaluateASTNode(node.left, signal);
    const rightResult = this.evaluateASTNode(node.right, signal);

    if (!leftResult || !rightResult) return null;

    const matches = leftResult.matches && rightResult.matches;
    const confidence = matches ? (leftResult.confidence + rightResult.confidence) / 2 : 0;

    return {
      matches,
      confidence
    };
  }

  /**
   * Evaluate logical OR for pattern matching
   */
  private evaluateLogicalOr(node: any, signal: NormalizedSignal): {
    matches: boolean;
    confidence: number;
  } | null {
    if (!node.left || !node.right) return null;

    const leftResult = this.evaluateASTNode(node.left, signal);
    const rightResult = this.evaluateASTNode(node.right, signal);

    if (!leftResult || !rightResult) return null;

    const matches = leftResult.matches || rightResult.matches;
    const confidence = matches ? Math.max(leftResult.confidence, rightResult.confidence) : 0;

    return {
      matches,
      confidence
    };
  }

  /**
   * Evaluate logical NOT for pattern matching
   */
  private evaluateLogicalNot(node: any, signal: NormalizedSignal): {
    matches: boolean;
    confidence: number;
  } | null {
    if (!node.left) return null;

    const operandResult = this.evaluateASTNode(node.left, signal);
    if (!operandResult) return null;

    const matches = !operandResult.matches;
    const confidence = operandResult.confidence; // Same confidence for negation

    return {
      matches,
      confidence
    };
  }

  /**
   * Extract signal value for condition evaluation
   */
  private extractSignalValue(signal: NormalizedSignal, field: string): number {
    if (field === 'value' || field === 'primary') {
      const values = Object.values(signal.normalizedValues);
      return values.length > 0 ? values[0] as number : 0;
    }
    return 0;
  }

  /**
   * Evaluate condition (from RuleEngine)
   */
  private evaluateCondition(value: number, operator: string, threshold: number): boolean {
    switch (operator) {
      case '>':
        return value > threshold;
      case '<':
        return value < threshold;
      case '>=':
        return value >= threshold;
      case '<=':
        return value <= threshold;
      case '==':
        return Math.abs(value - threshold) < 0.001;
      case '!=':
        return Math.abs(value - threshold) >= 0.001;
      default:
        return false;
    }
  }

  /**
   * Check for new pattern starts
   */
  private checkForNewPatternStarts(signal: NormalizedSignal): void {
    // For each sequence pattern that could start with this signal type
    for (const [patternId, state] of this.activePatterns) {
      if (!state.isActive || state.currentStep > 0) continue;

      const sequenceNode = this.getSequenceNode(patternId);
      if (!sequenceNode || sequenceNode.steps.length === 0) continue;

      const firstStep = sequenceNode.steps[0];
      const stepMatch = this.checkStepMatch(firstStep, signal);

      if (stepMatch && stepMatch.matches) {
        // Start new pattern
        const newState = this.createPatternState(patternId, state.ruleId, sequenceNode, signal);
        this.activePatterns.set(patternId, newState);

        this.logger.debug('Started new pattern', {
          patternId,
          signalId: signal.id,
          signalType: signal.type
        });
      }
    }
  }

  /**
   * Handle advanced pattern completion with gap analysis
   */
  private async handleAdvancedPatternCompletion(patternId: string, state: AdvancedPatternState): Promise<void> {
    try {
      const sequenceNode = this.getSequenceNode(patternId);
      if (!sequenceNode) return;

      // Calculate completeness and confidence
      const completeness = state.matchedSteps.length / sequenceNode.steps.length;
      const avgConfidence = state.matchedSteps.reduce((sum, step) => sum + step.confidence, 0) / state.matchedSteps.length;

      // Calculate configurable score using scoring strategy
      const scoringStrategy = this.scoringStrategies.get(patternId);
      const scoringContext = this.buildScoringContext(state, sequenceNode);
      const configurableScore = this.calculateConfigurableScore(scoringContext, scoringStrategy);

      // Apply time decay if enabled
      const finalScore = this.evaluationOptions.scoring?.enableTimeDecay
        ? this.applyTimeDecay(configurableScore, state)
        : configurableScore;

      // Generate gap analysis if enabled
      let gapAnalysis;
      if (this.evaluationOptions.enableGapAnalysis && state.gapHistory.length > 0) {
        gapAnalysis = this.calculateGapAnalysis(state);
      }

      const matchResult: PatternMatchResult = {
        patternId,
        ruleId: state.ruleId,
        matchedAt: new Date(),
        matchedSteps: state.matchedSteps,
        completeness,
        confidence: avgConfidence,
        timeWeightedScore: finalScore,
        matchType: state.matchType,
        similarity: state.similarity,
        gapAnalysis,
        explanation: `Pattern completed with ${state.matchedSteps.length}/${sequenceNode.steps.length} steps (${state.matchType} match, score: ${finalScore.toFixed(3)})`
      };

      // Emit pattern match event
      this.emit('patternMatch', matchResult);

      // Deactivate pattern
      state.isActive = false;

      this.logger.info('Advanced pattern completed', {
        patternId,
        ruleId: state.ruleId,
        completeness,
        confidence: avgConfidence,
        matchType: state.matchType,
        similarity: state.similarity
      });

    } catch (error: any) {
      this.logger.error('Failed to handle advanced pattern completion', {
        patternId,
        error: error.message
      });
    }
  }

  /**
   * Handle pattern completion (backward compatibility)
   */
  private async handlePatternCompletion(patternId: string, state: PatternState): Promise<void> {
    return this.handleAdvancedPatternCompletion(patternId, state as AdvancedPatternState);
  }

  /**
   * Calculate gap analysis for pattern
   */
  private calculateGapAnalysis(state: AdvancedPatternState): PatternMatchResult['gapAnalysis'] {
    const gaps = state.gapHistory.map(gap => gap.gapDuration);

    return {
      totalGaps: gaps.length,
      averageGap: gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length,
      maxGap: Math.max(...gaps),
      gapDistribution: this.calculateGapDistribution(gaps)
    };
  }

  /**
   * Calculate gap distribution for histogram
   */
  private calculateGapDistribution(gaps: number[]): number[] {
    // Simple distribution calculation - in real implementation would use proper histogram
    const maxGap = Math.max(...gaps);
    const buckets = 10;
    const distribution = new Array(buckets).fill(0);

    gaps.forEach(gap => {
      const bucket = Math.min(Math.floor((gap / maxGap) * buckets), buckets - 1);
      distribution[bucket]++;
    });

    return distribution.map(count => count / gaps.length);
  }

  /**
   * Build scoring context for pattern evaluation
   */
  private buildScoringContext(state: AdvancedPatternState, sequenceNode: SequenceNode): ScoringContext {
    const totalDuration = state.expiresAt.getTime() - state.startTime.getTime();
    const gaps = state.gapHistory.map(gap => gap.gapDuration);
    const averageGap = gaps.length > 0 ? gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length : 0;
    const stepConfidences = state.matchedSteps.map(step => step.confidence);
    const gapDistribution = this.calculateGapDistribution(gaps);

    return {
      patternState: state,
      sequenceNode,
      totalDuration,
      averageGap,
      stepConfidences,
      gapDistribution,
      temporalConstraints: this.temporalConstraints.get(state.patternId)
    };
  }

  /**
   * Calculate configurable score using specified strategy
   */
  private calculateConfigurableScore(context: ScoringContext, strategy?: ScoringStrategy): number {
    if (!strategy) {
      return this.calculateGapAwareScore(context);
    }

    switch (strategy.type) {
      case 'time_weighted':
        return this.calculateTimeWeightedScore(context.patternState);

      case 'confidence_weighted':
        return this.calculateConfidenceWeightedScore(context);

      case 'completeness_weighted':
        return this.calculateCompletenessWeightedScore(context);

      case 'gap_aware':
        return this.calculateGapAwareScore(context);

      case 'custom':
        return strategy.customFormula ? strategy.customFormula(context) : this.calculateGapAwareScore(context);

      default:
        return this.calculateGapAwareScore(context);
    }
  }

  /**
   * Calculate time-weighted score
   */
  private calculateTimeWeightedScore(state: AdvancedPatternState): number {
    if (state.matchedSteps.length === 0) return 0;

    const totalDuration = state.expiresAt.getTime() - state.startTime.getTime();
    const actualDuration = Date.now() - state.startTime.getTime();

    // Base confidence score
    const avgConfidence = state.matchedSteps.reduce((sum, step) => sum + step.confidence, 0) / state.matchedSteps.length;

    // Time bonus - earlier completion gets higher score
    const timeRatio = actualDuration / totalDuration;
    let timeBonus = 0;

    if (timeRatio <= 0.5) {
      // Completed in first half - maximum bonus
      timeBonus = 0.5;
    } else if (timeRatio <= 0.8) {
      // Completed in 50-80% time - moderate bonus
      timeBonus = 0.3;
    } else if (timeRatio <= 1.0) {
      // Completed just in time - small bonus
      timeBonus = 0.1;
    } else {
      // Completed after expiration - no bonus
      timeBonus = 0;
    }

    // Step timing bonus - consecutive steps get bonus for tight timing
    const stepTimingBonus = this.calculateStepTimingBonus(state);

    return avgConfidence * (1 + timeBonus + stepTimingBonus);
  }

  /**
   * Calculate confidence-weighted score
   */
  private calculateConfidenceWeightedScore(context: ScoringContext): number {
    const avgConfidence = context.stepConfidences.reduce((sum, conf) => sum + conf, 0) / context.stepConfidences.length;

    // Apply completeness factor
    const completenessFactor = context.patternState.matchedSteps.length / context.sequenceNode.steps.length;

    return avgConfidence * completenessFactor;
  }

  /**
   * Calculate completeness-weighted score
   */
  private calculateCompletenessWeightedScore(context: ScoringContext): number {
    const completeness = context.patternState.matchedSteps.length / context.sequenceNode.steps.length;

    // Boost score for patterns that complete more steps
    const stepBonus = Math.log(context.patternState.matchedSteps.length + 1) / Math.log(context.sequenceNode.steps.length + 1);

    return completeness * (1 + stepBonus * 0.2);
  }

  /**
   * Calculate gap-aware score with configurable weights
   */
  private calculateGapAwareScore(context: ScoringContext): number {
    const strategy = this.evaluationOptions.scoring?.defaultStrategy;
    if (!strategy?.weights) {
      return this.calculateTimeWeightedScore(context.patternState);
    }

    const { timeWeight, confidenceWeight, completenessWeight, gapWeight } = strategy.weights;

    // Base components
    const timeComponent = timeWeight * this.calculateTimeWeightedScore(context.patternState);
    const confidenceComponent = confidenceWeight * this.calculateConfidenceWeightedScore(context);
    const completenessComponent = completenessWeight * this.calculateCompletenessWeightedScore(context);

    // Gap analysis component
    let gapComponent = 0;
    if (gapWeight > 0 && this.evaluationOptions.scoring?.enableGapAnalysis) {
      gapComponent = gapWeight * this.calculateGapQualityScore(context);
    }

    return Math.min(
      timeComponent + confidenceComponent + completenessComponent + gapComponent,
      this.evaluationOptions.scoring?.maxScoreCap || 1.0
    );
  }

  /**
   * Calculate gap quality score based on timing and distribution
   */
  private calculateGapQualityScore(context: ScoringContext): number {
    if (context.gapDistribution.length === 0) return 0.5; // Neutral score if no gaps

    // Prefer consistent gaps (low variance)
    const avgGap = context.averageGap;
    const variance = context.gapDistribution.reduce((sum, gap) => sum + Math.pow(gap - avgGap, 2), 0) / context.gapDistribution.length;

    // Lower variance gets higher score
    const consistencyScore = Math.max(0, 1 - variance / (avgGap * avgGap));

    // Prefer gaps that match preferred timing from constraints
    let timingScore = 0.5; // Neutral if no constraints
    if (context.temporalConstraints?.stepGaps) {
      timingScore = this.calculateGapTimingScore(context);
    }

    return (consistencyScore + timingScore) / 2;
  }

  /**
   * Calculate gap timing score based on constraints
   */
  private calculateGapTimingScore(context: ScoringContext): number {
    if (!context.temporalConstraints?.stepGaps) return 0.5;

    let totalScore = 0;
    let constraintCount = 0;

    context.temporalConstraints.stepGaps.forEach(constraint => {
      // Find actual gap for this step pair
      const actualGap = context.patternState.gapHistory.find(
        gap => gap.fromStep === constraint.fromStep && gap.toStep === constraint.toStep
      );

      if (actualGap) {
        const gapRatio = actualGap.gapDuration / constraint.maxGap;

        if (gapRatio <= 1.0) {
          // Within acceptable range
          const preferredRatio = constraint.preferredGap
            ? actualGap.gapDuration / constraint.preferredGap
            : 1.0;

          // Score based on how close to preferred gap
          const score = Math.max(0, 1 - Math.abs(Math.log(preferredRatio)));
          totalScore += score;
        } else {
          // Exceeds maximum gap
          totalScore += 0;
        }

        constraintCount++;
      }
    });

    return constraintCount > 0 ? totalScore / constraintCount : 0.5;
  }

  /**
   * Apply time decay to score
   */
  private applyTimeDecay(baseScore: number, state: AdvancedPatternState): number {
    const decayFactor = this.evaluationOptions.scoring?.timeDecayFactor || 0.95;
    const ageInMinutes = (Date.now() - state.startTime.getTime()) / (1000 * 60);

    // Apply exponential decay
    const decayMultiplier = Math.pow(decayFactor, ageInMinutes / 60); // Decay per hour

    return baseScore * decayMultiplier;
  }

  /**
   * Calculate bonus for tight step timing
   */
  private calculateStepTimingBonus(state: AdvancedPatternState): number {
    if (state.matchedSteps.length < 2) return 0;

    let totalGapBonus = 0;
    const sortedSteps = [...state.matchedSteps].sort((a, b) => a.matchedAt.getTime() - b.matchedAt.getTime());

    for (let i = 1; i < sortedSteps.length; i++) {
      const gap = sortedSteps[i].matchedAt.getTime() - sortedSteps[i - 1].matchedAt.getTime();
      const maxGap = state.metadata.maxGap * 1000; // Convert to milliseconds

      // Tighter gaps get higher bonus (up to 0.2 per gap)
      const gapRatio = Math.min(gap / maxGap, 1);
      const gapBonus = Math.max(0, 0.2 * (1 - gapRatio));
      totalGapBonus += gapBonus;
    }

    return Math.min(totalGapBonus / state.matchedSteps.length, 0.3); // Cap at 0.3 total bonus
  }

  /**
   * Check if signal meets temporal constraints
   */
  private checkTemporalConstraints(signal: NormalizedSignal): boolean {
    const now = new Date();

    // Check time of day constraints for all patterns
    for (const [patternId, constraints] of this.temporalConstraints) {
      if (constraints.timeOfDayConstraints) {
        for (const constraint of constraints.timeOfDayConstraints) {
          // Check if constraint applies to all steps or specific step
          if (constraint.allowedHours && !constraint.allowedHours.includes(now.getHours())) {
            this.logger.debug('Signal filtered by time of day constraint', {
              patternId,
              signalId: signal.id,
              hour: now.getHours(),
              allowedHours: constraint.allowedHours
            });
            return false;
          }

          if (constraint.allowedDays && !constraint.allowedDays.includes(now.getDay())) {
            this.logger.debug('Signal filtered by day of week constraint', {
              patternId,
              signalId: signal.id,
              day: now.getDay(),
              allowedDays: constraint.allowedDays
            });
            return false;
          }
        }
      }
    }

    return true;
  }

  /**
   * Update time windows for all patterns
   */
  private updateTimeWindows(signal: NormalizedSignal): void {
    // For each pattern that could start with this signal type
    for (const [patternId, state] of this.activePatterns) {
      if (!state.isActive || state.currentStep > 0) continue;

      const sequenceNode = this.getSequenceNode(patternId);
      if (!sequenceNode || sequenceNode.steps.length === 0) continue;

      const firstStep = sequenceNode.steps[0];
      const windowStrategy = this.windowStrategies.get(patternId);

      // Check if signal matches first step
      const matcher = this.patternMatchers.get(patternId);
      const stepMatch = this.checkAdvancedStepMatch(firstStep, signal, matcher);

      if (stepMatch && stepMatch.matches) {
        // Create or update time windows
        this.createOrUpdateTimeWindows(patternId, sequenceNode, signal, windowStrategy);
      }
    }
  }

  /**
   * Create or update time windows for a pattern
   */
  private createOrUpdateTimeWindows(
    patternId: string,
    sequenceNode: SequenceNode,
    signal: NormalizedSignal,
    windowStrategy?: WindowStrategy
  ): void {
    if (!windowStrategy) {
      // Default to fixed window behavior
      this.createFixedWindow(patternId, sequenceNode, signal);
      return;
    }

    switch (windowStrategy.type) {
      case 'fixed':
        this.createFixedWindow(patternId, sequenceNode, signal);
        break;

      case 'sliding':
        this.createSlidingWindow(patternId, sequenceNode, signal, windowStrategy);
        break;

      case 'expanding':
        this.createExpandingWindow(patternId, sequenceNode, signal, windowStrategy);
        break;

      case 'tumbling':
        this.createTumblingWindow(patternId, sequenceNode, signal, windowStrategy);
        break;
    }
  }

  /**
   * Create a fixed time window
   */
  private createFixedWindow(patternId: string, sequenceNode: SequenceNode, signal: NormalizedSignal): void {
    const windowId = `window_${patternId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const maxGap = sequenceNode.maxGap;

    const window: TimeWindow = {
      id: windowId,
      patternId,
      startTime: new Date(signal.timestamp.getTime()),
      endTime: new Date(signal.timestamp.getTime() + (maxGap * 1000)),
      windowType: 'fixed',
      activeSteps: new Map([[0, {
        signal,
        matchedAt: signal.timestamp,
        confidence: 1.0 // Would calculate actual confidence
      }]]),
      isComplete: false,
      isExpired: false,
      metadata: {
        totalSignals: 1,
        matchedSteps: 1,
        currentGap: 0,
        windowUtilization: 1.0 / sequenceNode.steps.length
      }
    };

    // Store window
    if (!this.activeWindows.has(patternId)) {
      this.activeWindows.set(patternId, []);
    }
    this.activeWindows.get(patternId)!.push(window);

    this.windowMetrics.totalWindowsCreated++;

    this.logger.debug('Fixed time window created', {
      patternId,
      windowId,
      signalId: signal.id,
      maxGap
    });
  }

  /**
   * Create a sliding time window
   */
  private createSlidingWindow(
    patternId: string,
    sequenceNode: SequenceNode,
    signal: NormalizedSignal,
    strategy: WindowStrategy
  ): void {
    const windowSize = strategy.size || sequenceNode.maxGap;
    const slideInterval = strategy.slideInterval || windowSize / 4;

    // Create initial window
    const windowId = `sliding_${patternId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const window: TimeWindow = {
      id: windowId,
      patternId,
      startTime: new Date(signal.timestamp.getTime()),
      endTime: new Date(signal.timestamp.getTime() + (windowSize * 1000)),
      windowType: 'sliding',
      activeSteps: new Map([[0, {
        signal,
        matchedAt: signal.timestamp,
        confidence: 1.0
      }]]),
      isComplete: false,
      isExpired: false,
      metadata: {
        totalSignals: 1,
        matchedSteps: 1,
        currentGap: 0,
        windowUtilization: 1.0 / sequenceNode.steps.length
      }
    };

    // Store window
    if (!this.activeWindows.has(patternId)) {
      this.activeWindows.set(patternId, []);
    }
    this.activeWindows.get(patternId)!.push(window);

    // Schedule window slides
    this.scheduleWindowSlides(patternId, window, strategy);

    this.windowMetrics.totalWindowsCreated++;
  }

  /**
   * Create an expanding time window
   */
  private createExpandingWindow(
    patternId: string,
    sequenceNode: SequenceNode,
    signal: NormalizedSignal,
    strategy: WindowStrategy
  ): void {
    // Similar to sliding but window grows as new signals arrive
    const windowId = `expanding_${patternId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const window: TimeWindow = {
      id: windowId,
      patternId,
      startTime: new Date(signal.timestamp.getTime()),
      endTime: new Date(signal.timestamp.getTime() + (strategy.size || sequenceNode.maxGap) * 1000),
      windowType: 'expanding',
      activeSteps: new Map([[0, {
        signal,
        matchedAt: signal.timestamp,
        confidence: 1.0
      }]]),
      isComplete: false,
      isExpired: false,
      metadata: {
        totalSignals: 1,
        matchedSteps: 1,
        currentGap: 0,
        windowUtilization: 1.0 / sequenceNode.steps.length
      }
    };

    // Store window
    if (!this.activeWindows.has(patternId)) {
      this.activeWindows.set(patternId, []);
    }
    this.activeWindows.get(patternId)!.push(window);

    this.windowMetrics.totalWindowsCreated++;
  }

  /**
   * Create a tumbling time window
   */
  private createTumblingWindow(
    patternId: string,
    sequenceNode: SequenceNode,
    signal: NormalizedSignal,
    strategy: WindowStrategy
  ): void {
    // Non-overlapping windows
    const windowSize = strategy.size || sequenceNode.maxGap;
    const windowId = `tumbling_${patternId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const window: TimeWindow = {
      id: windowId,
      patternId,
      startTime: new Date(signal.timestamp.getTime()),
      endTime: new Date(signal.timestamp.getTime() + (windowSize * 1000)),
      windowType: 'tumbling',
      activeSteps: new Map([[0, {
        signal,
        matchedAt: signal.timestamp,
        confidence: 1.0
      }]]),
      isComplete: false,
      isExpired: false,
      metadata: {
        totalSignals: 1,
        matchedSteps: 1,
        currentGap: 0,
        windowUtilization: 1.0 / sequenceNode.steps.length
      }
    };

    // Store window
    if (!this.activeWindows.has(patternId)) {
      this.activeWindows.set(patternId, []);
    }
    this.activeWindows.get(patternId)!.push(window);

    this.windowMetrics.totalWindowsCreated++;
  }

  /**
   * Schedule window slides for sliding windows
   */
  private scheduleWindowSlides(patternId: string, window: TimeWindow, strategy: WindowStrategy): void {
    const slideInterval = strategy.slideInterval || 1000; // Default 1 second
    const maxSlides = strategy.maxWindows || 100;

    let slideCount = 0;
    const slideTimer = setInterval(() => {
      if (slideCount >= maxSlides || window.isExpired) {
        clearInterval(slideTimer);
        return;
      }

      // Slide the window
      window.startTime = new Date(window.startTime.getTime() + (slideInterval * 1000));
      window.endTime = new Date(window.endTime.getTime() + (slideInterval * 1000));

      // Check if window should expire
      if (window.endTime.getTime() - window.startTime.getTime() > (strategy.size || 3600) * 1000) {
        window.isExpired = true;
        clearInterval(slideTimer);
      }

      slideCount++;
    }, slideInterval * 1000);
  }

  /**
   * Get total number of active windows across all patterns
   */
  private getTotalActiveWindows(): number {
    let total = 0;
    for (const windows of this.activeWindows.values()) {
      total += windows.filter(w => !w.isExpired).length;
    }
    return total;
  }

  /**
   * Clean up expired time windows
   */
  private cleanupExpiredWindows(): void {
    let cleanedCount = 0;

    for (const [patternId, windows] of this.activeWindows) {
      const activeWindows = windows.filter(w => {
        if (w.isExpired || new Date() > w.endTime) {
          cleanedCount++;
          return false;
        }
        return true;
      });

      if (activeWindows.length !== windows.length) {
        this.activeWindows.set(patternId, activeWindows);
      }

      // Remove pattern entry if no active windows
      if (activeWindows.length === 0) {
        this.activeWindows.delete(patternId);
      }
    }

    if (cleanedCount > 0) {
      this.windowMetrics.totalWindowsExpired += cleanedCount;
      this.logger.debug('Cleaned up expired time windows', { cleanedCount });
    }
  }

  /**
   * Get sequence node for pattern
   */
  private getSequenceNode(patternId: string): SequenceNode | null {
    const cached = this.patternCache.get(patternId);
    return cached ? cached.pattern : null;
  }

  /**
   * Register a sequence pattern for tracking (basic version)
   */
  registerSequencePattern(ruleId: string, sequenceNode: SequenceNode): string {
    return this.registerAdvancedSequencePattern(ruleId, sequenceNode, undefined, undefined);
  }

  /**
   * Register an advanced sequence pattern with custom matchers
   */
  registerAdvancedSequencePattern(
    ruleId: string,
    sequenceNode: SequenceNode,
    patternMatcher?: PatternMatcher,
    fuzzyMatcher?: FuzzyPatternMatcher
  ): string {
    // Check memory pressure before creating new pattern
    if (this.isMemoryPressureHigh()) {
      this.evictLeastRecentlyUsedPatterns();
    }

    // Validate pattern complexity
    if (sequenceNode.steps.length > this.evaluationOptions.patternComplexityLimit) {
      throw new Error(`Pattern complexity exceeds limit: ${sequenceNode.steps.length} > ${this.evaluationOptions.patternComplexityLimit}`);
    }

    const patternId = `pattern_${ruleId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Cache pattern for performance
    this.patternCache.set(patternId, {
      pattern: sequenceNode,
      lastUsed: new Date(),
      accessCount: 0
    });

    // Register advanced matchers if provided
    if (patternMatcher) {
      this.patternMatchers.set(patternId, patternMatcher);
    }

    if (fuzzyMatcher) {
      this.fuzzyMatchers.set(patternId, fuzzyMatcher);
    }

    // Register time window configuration
    if (sequenceNode.windowStrategy) {
      this.windowStrategies.set(patternId, sequenceNode.windowStrategy);
    }

    if (sequenceNode.temporalConstraints) {
      this.temporalConstraints.set(patternId, sequenceNode.temporalConstraints);
    }

    // Register scoring strategy
    const scoringStrategy = this.evaluationOptions.scoring?.defaultStrategy || {
      type: 'gap_aware',
      weights: { timeWeight: 0.3, confidenceWeight: 0.4, completenessWeight: 0.2, gapWeight: 0.1 }
    };
    this.scoringStrategies.set(patternId, scoringStrategy);

    // Create initial pattern state
    const state = this.createAdvancedPatternState(patternId, ruleId, sequenceNode, patternMatcher);
    this.activePatterns.set(patternId, state);

    // Track by rule
    if (!this.patternStates.has(ruleId)) {
      this.patternStates.set(ruleId, new Map());
    }
    this.patternStates.get(ruleId)!.set(patternId, state);

    // Update memory stats
    this.memoryStats.totalPatternsCreated++;

    this.logger.debug('Advanced sequence pattern registered', {
      patternId,
      ruleId,
      steps: sequenceNode.steps.length,
      maxGap: sequenceNode.maxGap,
      matcherType: patternMatcher?.matcherType || 'exact',
      fuzzyMatching: !!fuzzyMatcher,
      activePatterns: this.activePatterns.size,
      memoryPressure: this.getMemoryPressure()
    });

    return patternId;
  }

  /**
   * Check if memory pressure is high
   */
  private isMemoryPressureHigh(): boolean {
    const currentMemoryUsage = this.estimateMemoryUsage();
    this.memoryStats.currentMemoryUsage = currentMemoryUsage;
    this.memoryStats.peakMemoryUsage = Math.max(this.memoryStats.peakMemoryUsage, currentMemoryUsage);

    const pressure = currentMemoryUsage / this.maxActivePatterns;
    return pressure > this.memoryPressureThreshold;
  }

  /**
   * Evict least recently used patterns to reduce memory pressure
   */
  private evictLeastRecentlyUsedPatterns(): void {
    const patternsToEvict = this.patternEvictionBatchSize;
    let evictedCount = 0;

    // Sort patterns by last access time (oldest first)
    const sortedPatterns = Array.from(this.patternCache.entries())
      .sort((a, b) => a[1].lastUsed.getTime() - b[1].lastUsed.getTime())
      .slice(0, patternsToEvict);

    for (const [patternId, cached] of sortedPatterns) {
      // Remove from active patterns
      const state = this.activePatterns.get(patternId);
      if (state) {
        state.isActive = false;
        this.activePatterns.delete(patternId);

        // Remove from rule-specific tracking
        const rulePatterns = this.patternStates.get(state.ruleId);
        if (rulePatterns) {
          rulePatterns.delete(patternId);
          if (rulePatterns.size === 0) {
            this.patternStates.delete(state.ruleId);
          }
        }

        evictedCount++;
      }

      // Remove from cache
      this.patternCache.delete(patternId);
    }

    this.memoryStats.totalPatternsEvicted += evictedCount;

    if (evictedCount > 0) {
      this.logger.info('Evicted patterns due to memory pressure', {
        evictedCount,
        remainingPatterns: this.activePatterns.size,
        memoryPressure: this.getMemoryPressure()
      });
    }
  }

  /**
   * Estimate current memory usage
   */
  private estimateMemoryUsage(): number {
    // Rough estimation: each pattern state ~1KB
    return this.activePatterns.size * 1024;
  }

  /**
   * Get current memory pressure (0-1)
   */
  private getMemoryPressure(): number {
    return this.estimateMemoryUsage() / (this.maxActivePatterns * 1024);
  }

  /**
   * Get active patterns for a rule
   */
  getActivePatternsForRule(ruleId: string): PatternState[] {
    const rulePatterns = this.patternStates.get(ruleId);
    if (!rulePatterns) return [];

    return Array.from(rulePatterns.values()).filter(state => state.isActive);
  }

  /**
   * Get pattern statistics with advanced metrics
   */
  getPatternStatistics(): {
    totalPatterns: number;
    activePatterns: number;
    completedPatterns: number;
    averageSteps: number;
    memoryUsage: number;
    memoryPressure: number;
    totalCreated: number;
    totalEvicted: number;
    evictionRate: number;
    advancedMatchers: number;
    fuzzyMatchers: number;
    averageMatchTime: number;
    patternComplexity: {
      simple: number;
      moderate: number;
      complex: number;
    };
    matchTypeDistribution: {
      exact: number;
      partial: number;
      fuzzy: number;
    };
    timeWindows: {
      totalCreated: number;
      totalExpired: number;
      averageDuration: number;
      utilizationRate: number;
      activeWindows: number;
    };
  } {
    const totalPatterns = this.patternCache.size;
    const activePatterns = this.activePatterns.size;
    const completedPatterns = totalPatterns - activePatterns;

    const stepCounts = Array.from(this.patternCache.values())
      .map(cached => cached.pattern.steps.length);

    const averageSteps = stepCounts.length > 0
      ? stepCounts.reduce((sum, count) => sum + count, 0) / stepCounts.length
      : 0;

    const memoryUsage = this.estimateMemoryUsage();
    const memoryPressure = this.getMemoryPressure();

    // Advanced metrics
    const advancedMatchers = this.patternMatchers.size;
    const fuzzyMatchers = this.fuzzyMatchers.size;

    // Pattern complexity distribution
    const patternComplexity = stepCounts.reduce((acc, steps) => {
      if (steps <= 3) acc.simple++;
      else if (steps <= 7) acc.moderate++;
      else acc.complex++;
      return acc;
    }, { simple: 0, moderate: 0, complex: 0 });

    // Match type distribution (from active patterns)
    const matchTypeDistribution = Array.from(this.activePatterns.values())
      .filter((state): state is AdvancedPatternState => state instanceof Object && 'matchType' in state)
      .reduce((acc: { exact: number; partial: number; fuzzy: number; }, state: AdvancedPatternState) => {
        acc[state.matchType]++;
        return acc;
      }, { exact: 0, partial: 0, fuzzy: 0 });

    return {
      totalPatterns,
      activePatterns,
      completedPatterns,
      averageSteps,
      memoryUsage,
      memoryPressure,
      totalCreated: this.memoryStats.totalPatternsCreated,
      totalEvicted: this.memoryStats.totalPatternsEvicted,
      evictionRate: this.memoryStats.totalPatternsCreated > 0
        ? this.memoryStats.totalPatternsEvicted / this.memoryStats.totalPatternsCreated
        : 0,
      advancedMatchers,
      fuzzyMatchers,
      averageMatchTime: 45, // Mock value - would calculate from real timing data
      patternComplexity,
      matchTypeDistribution,
      timeWindows: {
        totalCreated: this.windowMetrics.totalWindowsCreated,
        totalExpired: this.windowMetrics.totalWindowsExpired,
        averageDuration: this.windowMetrics.averageWindowDuration,
        utilizationRate: this.windowMetrics.windowUtilizationRate,
        activeWindows: this.getTotalActiveWindows()
      }
    };
  }

  /**
   * Clean up expired patterns and matchers
   */
  private cleanupExpiredPatterns(): void {
    const now = new Date();
    let cleanedCount = 0;

    for (const [patternId, state] of this.activePatterns) {
      if (!state.isActive || now > state.expiresAt) {
        // Remove from active patterns
        this.activePatterns.delete(patternId);

        // Remove from rule-specific tracking
        const rulePatterns = this.patternStates.get(state.ruleId);
        if (rulePatterns) {
          rulePatterns.delete(patternId);
          if (rulePatterns.size === 0) {
            this.patternStates.delete(state.ruleId);
          }
        }

        // Clean up matchers
        this.patternMatchers.delete(patternId);
        this.fuzzyMatchers.delete(patternId);

        // Clean up time window configuration
        this.windowStrategies.delete(patternId);
        this.temporalConstraints.delete(patternId);

        cleanedCount++;
      }
    }

    // Clean up pattern cache
    for (const [patternId, cached] of this.patternCache) {
      if (now.getTime() - cached.lastUsed.getTime() > 24 * 60 * 60 * 1000) { // 24 hours
        // Also clean up matchers for cached patterns
        this.patternMatchers.delete(patternId);
        this.fuzzyMatchers.delete(patternId);
        this.windowStrategies.delete(patternId);
        this.temporalConstraints.delete(patternId);
        this.patternCache.delete(patternId);
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug('Cleaned up expired patterns', { cleanedCount });
    }
  }

  /**
   * Start cleanup interval with state validation
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredPatterns();
      this.validateActiveStates();
      this.cleanupStateMachineBuffers();
    }, 60000); // Clean up every minute
  }

  /**
   * Validate all active states for consistency
   */
  private validateActiveStates(): void {
    const validationInterval = this.evaluationOptions.stateMachine?.stateValidationInterval || 60000;
    if (Date.now() % validationInterval > 60000) return; // Only validate periodically

    let corruptionCount = 0;

    for (const [patternId, state] of this.activePatterns) {
      if (state instanceof Object && 'currentStep' in state && 'matchedSteps' in state) {
        const advancedState = state as AdvancedPatternState;

        // Check state consistency
        if (advancedState.matchedSteps.length > 0) {
          const lastStep = advancedState.matchedSteps[advancedState.matchedSteps.length - 1];
          if (lastStep.stepIndex !== advancedState.currentStep - 1) {
            this.logger.warn('State validation failed - step mismatch', {
              patternId,
              currentStep: advancedState.currentStep,
              lastStepIndex: lastStep.stepIndex
            });
            corruptionCount++;
          }
        }

        // Check for stuck states (no transitions for too long)
        const timeSinceLastTransition = Date.now() - advancedState.lastTransitionAt.getTime();
        if (timeSinceLastTransition > 300000) { // 5 minutes
          this.logger.warn('State appears stuck - no recent transitions', {
            patternId,
            currentStep: advancedState.currentStep,
            timeSinceLastTransition: timeSinceLastTransition + 'ms'
          });
          corruptionCount++;
        }
      }
    }

    if (corruptionCount > 0) {
      this.logger.info('State validation completed', {
        totalStates: this.activePatterns.size,
        corruptionCount,
        corruptionRate: (corruptionCount / this.activePatterns.size * 100).toFixed(2) + '%'
      });
    }
  }

  /**
   * Clean up state machine buffers and old transitions
   */
  private cleanupStateMachineBuffers(): void {
    // Clean up old transitions
    for (const [patternId, transitions] of this.stateTransitions) {
      const cutoffTime = new Date(Date.now() - 3600000); // 1 hour ago
      const filteredTransitions = transitions.filter(t => t.timestamp > cutoffTime);

      if (filteredTransitions.length !== transitions.length) {
        this.stateTransitions.set(patternId, filteredTransitions);
      }
    }

    // Clean up partial state buffers
    for (const [patternId, buffer] of this.partialStateBuffer) {
      const cutoffTime = new Date(Date.now() - buffer.maxBufferAge);

      for (const [stateId, buffered] of buffer.states) {
        if (buffered.addedAt < cutoffTime) {
          buffer.states.delete(stateId);
        }
      }

      // Remove empty buffers
      if (buffer.states.size === 0) {
        this.partialStateBuffer.delete(patternId);
      }
    }
  }

  /**
   * Get current status
   */
  getStatus(): string {
    if (!this.isInitialized) return 'Not Initialized';

    const stats = this.getPatternStatistics();
    const memoryPressure = stats.memoryPressure > 0.8 ? 'HIGH' :
                          stats.memoryPressure > 0.6 ? 'MEDIUM' : 'LOW';

    return `Active (${stats.activePatterns} patterns, ${stats.totalPatterns} total, ${memoryPressure} memory pressure)`;
  }

  /**
   * Get detailed status with memory and state machine info
   */
  getDetailedStatus(): {
    isInitialized: boolean;
    activePatterns: number;
    totalPatterns: number;
    memoryUsage: number;
    memoryPressure: number;
    memoryPressureLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    totalCreated: number;
    totalEvicted: number;
    evictionRate: number;
    stateMachine: {
      totalTransitions: number;
      averageTransitionTime: number;
      stateCorruptionCount: number;
      recoveryCount: number;
      transitionBuffers: number;
      partialBuffers: number;
    };
    fragmentation: {
      stateFragmentation: number;
      memoryReclaimed: number;
    };
  } {
    const stats = this.getPatternStatistics();
    const memoryPressureLevel = stats.memoryPressure > 0.9 ? 'CRITICAL' :
                               stats.memoryPressure > 0.8 ? 'HIGH' :
                               stats.memoryPressure > 0.6 ? 'MEDIUM' : 'LOW';

    return {
      isInitialized: this.isInitialized,
      activePatterns: stats.activePatterns,
      totalPatterns: stats.totalPatterns,
      memoryUsage: stats.memoryUsage,
      memoryPressure: stats.memoryPressure,
      memoryPressureLevel,
      totalCreated: stats.totalCreated,
      totalEvicted: stats.totalEvicted,
      evictionRate: stats.evictionRate,
      stateMachine: {
        totalTransitions: this.stateMachineMetrics.totalTransitions,
        averageTransitionTime: this.stateMachineMetrics.averageTransitionTime,
        stateCorruptionCount: this.stateMachineMetrics.stateCorruptionCount,
        recoveryCount: this.stateMachineMetrics.recoveryCount,
        transitionBuffers: this.stateTransitions.size,
        partialBuffers: this.partialStateBuffer.size
      },
      fragmentation: {
        stateFragmentation: this.memoryStats.stateFragmentation,
        memoryReclaimed: this.memoryStats.memoryReclaimed
      }
    };
  }
}

