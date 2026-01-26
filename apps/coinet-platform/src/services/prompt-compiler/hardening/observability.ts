/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     📊 OBSERVABILITY — STRUCTURED EVENTS FOR DEBUGGING                       ║
 * ║                                                                               ║
 * ║   Turns "why is it cringe?" into "guardrail X fired because Y".              ║
 * ║                                                                               ║
 * ║   EVENTS LOGGED:                                                              ║
 * ║   - Token resolution (confidence, candidates)                                ║
 * ║   - Evidence coverage (available, missing, freshness)                        ║
 * ║   - Pass-1 parse (success, failures, retries)                                ║
 * ║   - Conflict analysis (class, resolution)                                    ║
 * ║   - Guardrail blocks (rule, reason)                                          ║
 * ║   - Regeneration events (count, reason)                                      ║
 * ║   - Latency breakdown (by stage)                                             ║
 * ║                                                                               ║
 * ║   @version 1.0.0 - Production hardening                                      ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { logger } from '../../../utils/logger';

// ============================================================================
// TYPES
// ============================================================================

export type EventCategory = 
  | 'TOKEN_RESOLUTION'
  | 'EVIDENCE_COVERAGE'
  | 'PASS1_PARSE'
  | 'CONFLICT_ANALYSIS'
  | 'GUARDRAIL_BLOCK'
  | 'REGENERATION'
  | 'LATENCY'
  | 'USER_FEEDBACK'
  | 'SYSTEM_ERROR';

export type EventSeverity = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface BaseEvent {
  eventId: string;
  category: EventCategory;
  severity: EventSeverity;
  timestamp: number;
  conversationId: string;
  userId?: string;
  sessionId?: string;
}

// ============================================================================
// SPECIFIC EVENT TYPES
// ============================================================================

export interface TokenResolutionEvent extends BaseEvent {
  category: 'TOKEN_RESOLUTION';
  data: {
    input: string;
    resolved: boolean;
    confidence: number;
    chain: string | null;
    address: string | null;
    symbol: string | null;
    candidateCount: number;
    topCandidates: Array<{
      chain: string;
      symbol: string;
      score: number;
    }>;
    source: 'ticker' | 'address' | 'user_confirmed' | 'reused';
    askedClarification: boolean;
  };
}

export interface EvidenceCoverageEvent extends BaseEvent {
  category: 'EVIDENCE_COVERAGE';
  data: {
    availableModules: string[];
    missingModules: string[];
    coveragePercent: number;
    staleModules: string[];
    freshnessMap: Record<string, number>;
    tokenChain: string;
    tokenSymbol: string | null;
  };
}

export interface Pass1ParseEvent extends BaseEvent {
  category: 'PASS1_PARSE';
  data: {
    engine: 'grok' | 'gemini';
    success: boolean;
    extractionMethod: string;
    schemaErrors: string[];
    retryCount: number;
    latencyMs: number;
    rawLengthChars: number;
    driverCount: number;
    riskCount: number;
    unknownCount: number;
  };
}

export interface ConflictAnalysisEvent extends BaseEvent {
  category: 'CONFLICT_ANALYSIS';
  data: {
    hasGrok: boolean;
    hasGemini: boolean;
    driverConflicts: Array<{
      topic: string;
      class: string;
      resolution: string;
    }>;
    riskConflicts: Array<{
      risk: string;
      class: string;
      resolution: string;
    }>;
    scenarioConflict: boolean;
    overallLevel: string;
    maxAllowedConfidence: string;
    mustShowMixed: boolean;
    unknownsAdded: string[];
  };
}

export interface GuardrailBlockEvent extends BaseEvent {
  category: 'GUARDRAIL_BLOCK';
  data: {
    rule: string;
    severity: string;
    reason: string;
    context: string | null;
    wasRegenerated: boolean;
    regenerationSucceeded: boolean;
    originalContentPreview: string;
  };
}

export interface RegenerationEvent extends BaseEvent {
  category: 'REGENERATION';
  data: {
    stage: 'pass1' | 'pass2' | 'guardrail';
    engine: string;
    attemptNumber: number;
    reason: string;
    succeeded: boolean;
    latencyMs: number;
    errorTypes: string[];
  };
}

export interface LatencyEvent extends BaseEvent {
  category: 'LATENCY';
  data: {
    totalMs: number;
    stages: {
      tokenResolution: number;
      evidenceFetch: number;
      pass1Grok: number;
      pass1Gemini: number;
      aggregation: number;
      pass2Render: number;
      guardrails: number;
      streaming: number;
    };
    isSingleEngine: boolean;
    wasRegenerated: boolean;
    p95Target: number;
    withinTarget: boolean;
  };
}

export interface UserFeedbackEvent extends BaseEvent {
  category: 'USER_FEEDBACK';
  data: {
    feedbackType: 'thumbs_up' | 'thumbs_down' | 'regenerate_request' | 'report';
    responseId: string;
    tokenSymbol: string | null;
    intent: string;
    userLanguage: string;
    feedbackDetails?: string;
  };
}

export interface SystemErrorEvent extends BaseEvent {
  category: 'SYSTEM_ERROR';
  data: {
    errorType: string;
    errorMessage: string;
    stack?: string;
    component: string;
    recoverable: boolean;
    userImpact: 'none' | 'degraded' | 'blocked';
  };
}

export type ObservabilityEvent = 
  | TokenResolutionEvent
  | EvidenceCoverageEvent
  | Pass1ParseEvent
  | ConflictAnalysisEvent
  | GuardrailBlockEvent
  | RegenerationEvent
  | LatencyEvent
  | UserFeedbackEvent
  | SystemErrorEvent;

// ============================================================================
// EVENT EMITTER
// ============================================================================

type EventListener = (event: ObservabilityEvent) => void;

class EventEmitter {
  private listeners: Map<EventCategory | '*', EventListener[]> = new Map();
  private eventBuffer: ObservabilityEvent[] = [];
  private bufferSize = 1000;
  
  /**
   * Subscribe to events
   */
  on(category: EventCategory | '*', listener: EventListener): () => void {
    const listeners = this.listeners.get(category) || [];
    listeners.push(listener);
    this.listeners.set(category, listeners);
    
    // Return unsubscribe function
    return () => {
      const current = this.listeners.get(category) || [];
      this.listeners.set(category, current.filter(l => l !== listener));
    };
  }
  
  /**
   * Emit an event
   */
  emit(event: ObservabilityEvent): void {
    // Add to buffer
    this.eventBuffer.push(event);
    if (this.eventBuffer.length > this.bufferSize) {
      this.eventBuffer.shift();
    }
    
    // Notify category listeners
    const categoryListeners = this.listeners.get(event.category) || [];
    for (const listener of categoryListeners) {
      try {
        listener(event);
      } catch (e) {
        console.error('Event listener error:', e);
      }
    }
    
    // Notify wildcard listeners
    const wildcardListeners = this.listeners.get('*') || [];
    for (const listener of wildcardListeners) {
      try {
        listener(event);
      } catch (e) {
        console.error('Event listener error:', e);
      }
    }
    
    // Log based on severity
    this.logEvent(event);
  }
  
  /**
   * Get recent events
   */
  getRecentEvents(count: number = 100): ObservabilityEvent[] {
    return this.eventBuffer.slice(-count);
  }
  
  /**
   * Get events by category
   */
  getEventsByCategory(category: EventCategory, count: number = 100): ObservabilityEvent[] {
    return this.eventBuffer
      .filter(e => e.category === category)
      .slice(-count);
  }
  
  /**
   * Get events by conversation
   */
  getEventsByConversation(conversationId: string): ObservabilityEvent[] {
    return this.eventBuffer.filter(e => e.conversationId === conversationId);
  }
  
  private logEvent(event: ObservabilityEvent): void {
    const logData = {
      eventId: event.eventId,
      category: event.category,
      conversationId: event.conversationId,
      ...event.data,
    };
    
    switch (event.severity) {
      case 'ERROR':
        logger.error(`📊 [${event.category}]`, logData);
        break;
      case 'WARN':
        logger.warn(`📊 [${event.category}]`, logData);
        break;
      case 'INFO':
        logger.info(`📊 [${event.category}]`, logData);
        break;
      case 'DEBUG':
        logger.debug?.(`📊 [${event.category}]`, logData);
        break;
    }
  }
}

// Singleton instance
export const eventEmitter = new EventEmitter();

// ============================================================================
// EVENT FACTORY FUNCTIONS
// ============================================================================

let eventCounter = 0;

function generateEventId(): string {
  return `evt_${Date.now()}_${++eventCounter}`;
}

export function emitTokenResolution(
  conversationId: string,
  data: TokenResolutionEvent['data'],
  userId?: string
): void {
  eventEmitter.emit({
    eventId: generateEventId(),
    category: 'TOKEN_RESOLUTION',
    severity: data.resolved ? 'INFO' : 'WARN',
    timestamp: Date.now(),
    conversationId,
    userId,
    data,
  });
}

export function emitEvidenceCoverage(
  conversationId: string,
  data: EvidenceCoverageEvent['data'],
  userId?: string
): void {
  const severity = data.coveragePercent < 50 ? 'WARN' : 'INFO';
  
  eventEmitter.emit({
    eventId: generateEventId(),
    category: 'EVIDENCE_COVERAGE',
    severity,
    timestamp: Date.now(),
    conversationId,
    userId,
    data,
  });
}

export function emitPass1Parse(
  conversationId: string,
  data: Pass1ParseEvent['data'],
  userId?: string
): void {
  eventEmitter.emit({
    eventId: generateEventId(),
    category: 'PASS1_PARSE',
    severity: data.success ? 'INFO' : 'ERROR',
    timestamp: Date.now(),
    conversationId,
    userId,
    data,
  });
}

export function emitConflictAnalysis(
  conversationId: string,
  data: ConflictAnalysisEvent['data'],
  userId?: string
): void {
  const severity = data.overallLevel === 'HIGH' ? 'WARN' : 'INFO';
  
  eventEmitter.emit({
    eventId: generateEventId(),
    category: 'CONFLICT_ANALYSIS',
    severity,
    timestamp: Date.now(),
    conversationId,
    userId,
    data,
  });
}

export function emitGuardrailBlock(
  conversationId: string,
  data: GuardrailBlockEvent['data'],
  userId?: string
): void {
  eventEmitter.emit({
    eventId: generateEventId(),
    category: 'GUARDRAIL_BLOCK',
    severity: 'WARN',
    timestamp: Date.now(),
    conversationId,
    userId,
    data,
  });
}

export function emitRegeneration(
  conversationId: string,
  data: RegenerationEvent['data'],
  userId?: string
): void {
  eventEmitter.emit({
    eventId: generateEventId(),
    category: 'REGENERATION',
    severity: data.succeeded ? 'INFO' : 'WARN',
    timestamp: Date.now(),
    conversationId,
    userId,
    data,
  });
}

export function emitLatency(
  conversationId: string,
  data: LatencyEvent['data'],
  userId?: string
): void {
  const severity = data.withinTarget ? 'INFO' : 'WARN';
  
  eventEmitter.emit({
    eventId: generateEventId(),
    category: 'LATENCY',
    severity,
    timestamp: Date.now(),
    conversationId,
    userId,
    data,
  });
}

export function emitUserFeedback(
  conversationId: string,
  data: UserFeedbackEvent['data'],
  userId?: string
): void {
  eventEmitter.emit({
    eventId: generateEventId(),
    category: 'USER_FEEDBACK',
    severity: 'INFO',
    timestamp: Date.now(),
    conversationId,
    userId,
    data,
  });
}

export function emitSystemError(
  conversationId: string,
  data: SystemErrorEvent['data'],
  userId?: string
): void {
  eventEmitter.emit({
    eventId: generateEventId(),
    category: 'SYSTEM_ERROR',
    severity: 'ERROR',
    timestamp: Date.now(),
    conversationId,
    userId,
    data,
  });
}

// ============================================================================
// METRICS AGGREGATION
// ============================================================================

export interface AggregatedMetrics {
  period: string;
  tokenResolution: {
    totalAttempts: number;
    successRate: number;
    avgConfidence: number;
    clarificationRate: number;
  };
  pass1: {
    grokSuccessRate: number;
    geminiSuccessRate: number;
    avgRetries: number;
    avgLatencyMs: number;
  };
  guardrails: {
    totalBlocks: number;
    byRule: Record<string, number>;
    regenerationSuccessRate: number;
  };
  latency: {
    avgTotalMs: number;
    p95TotalMs: number;
    withinTargetRate: number;
    avgByStage: Record<string, number>;
  };
  conflicts: {
    hardConflictRate: number;
    avgDisagreementLevel: number;
  };
}

export function aggregateMetrics(events: ObservabilityEvent[]): AggregatedMetrics {
  const tokenEvents = events.filter(e => e.category === 'TOKEN_RESOLUTION') as TokenResolutionEvent[];
  const pass1Events = events.filter(e => e.category === 'PASS1_PARSE') as Pass1ParseEvent[];
  const guardrailEvents = events.filter(e => e.category === 'GUARDRAIL_BLOCK') as GuardrailBlockEvent[];
  const latencyEvents = events.filter(e => e.category === 'LATENCY') as LatencyEvent[];
  const conflictEvents = events.filter(e => e.category === 'CONFLICT_ANALYSIS') as ConflictAnalysisEvent[];
  
  // Token resolution metrics
  const tokenSuccesses = tokenEvents.filter(e => e.data.resolved).length;
  const tokenClarifications = tokenEvents.filter(e => e.data.askedClarification).length;
  const avgConfidence = tokenEvents.length > 0
    ? tokenEvents.reduce((sum, e) => sum + e.data.confidence, 0) / tokenEvents.length
    : 0;
  
  // Pass-1 metrics
  const grokEvents = pass1Events.filter(e => e.data.engine === 'grok');
  const geminiEvents = pass1Events.filter(e => e.data.engine === 'gemini');
  
  // Guardrail metrics
  const guardrailByRule: Record<string, number> = {};
  for (const e of guardrailEvents) {
    guardrailByRule[e.data.rule] = (guardrailByRule[e.data.rule] || 0) + 1;
  }
  const regenSuccesses = guardrailEvents.filter(e => e.data.regenerationSucceeded).length;
  
  // Latency metrics
  const latencies = latencyEvents.map(e => e.data.totalMs).sort((a, b) => a - b);
  const p95Index = Math.floor(latencies.length * 0.95);
  const p95Latency = latencies[p95Index] || 0;
  const withinTarget = latencyEvents.filter(e => e.data.withinTarget).length;
  
  // Conflict metrics
  const hardConflicts = conflictEvents.filter(e => e.data.overallLevel === 'HIGH').length;
  
  return {
    period: `${events.length} events`,
    tokenResolution: {
      totalAttempts: tokenEvents.length,
      successRate: tokenEvents.length > 0 ? tokenSuccesses / tokenEvents.length : 0,
      avgConfidence,
      clarificationRate: tokenEvents.length > 0 ? tokenClarifications / tokenEvents.length : 0,
    },
    pass1: {
      grokSuccessRate: grokEvents.length > 0 
        ? grokEvents.filter(e => e.data.success).length / grokEvents.length 
        : 0,
      geminiSuccessRate: geminiEvents.length > 0 
        ? geminiEvents.filter(e => e.data.success).length / geminiEvents.length 
        : 0,
      avgRetries: pass1Events.length > 0
        ? pass1Events.reduce((sum, e) => sum + e.data.retryCount, 0) / pass1Events.length
        : 0,
      avgLatencyMs: pass1Events.length > 0
        ? pass1Events.reduce((sum, e) => sum + e.data.latencyMs, 0) / pass1Events.length
        : 0,
    },
    guardrails: {
      totalBlocks: guardrailEvents.length,
      byRule: guardrailByRule,
      regenerationSuccessRate: guardrailEvents.length > 0 
        ? regenSuccesses / guardrailEvents.length 
        : 0,
    },
    latency: {
      avgTotalMs: latencies.length > 0
        ? latencies.reduce((a, b) => a + b, 0) / latencies.length
        : 0,
      p95TotalMs: p95Latency,
      withinTargetRate: latencyEvents.length > 0 
        ? withinTarget / latencyEvents.length 
        : 0,
      avgByStage: {}, // Would need to aggregate per stage
    },
    conflicts: {
      hardConflictRate: conflictEvents.length > 0 
        ? hardConflicts / conflictEvents.length 
        : 0,
      avgDisagreementLevel: 0, // Would need numeric disagreement scores
    },
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  eventEmitter as observabilityEmitter,
  generateEventId,
};
