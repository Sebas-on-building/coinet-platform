/**
 * =========================================
 * DISTRIBUTED TRACER
 * =========================================
 * Divine world-class distributed tracing system for observability
 */

import { Logger } from '../utils/Logger';

export interface TracingConfig {
  enabled: boolean;
  serviceName: string;
  samplingRate: number;
  exporter: {
    type: 'jaeger' | 'zipkin' | 'otlp';
    endpoint: string;
  };
}

export interface SpanContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
}

export interface Span {
  id: string;
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'success' | 'error' | 'unknown';
  tags: Record<string, string>;
  logs: Array<{
    timestamp: number;
    message: string;
    fields?: Record<string, any>;
  }>;
  children: Span[];
  parentId?: string;
}

/**
 * Advanced distributed tracing system
 */
export class DistributedTracer {
  private logger: Logger;
  private config: TracingConfig;
  private activeSpans: Map<string, Span> = new Map();
  private completedSpans: Span[] = [];
  private traceIdCounter: number = 0;

  constructor(config: TracingConfig) {
    this.logger = new Logger('DistributedTracer');
    this.config = config;
  }

  /**
   * Start a new span
   */
  startSpan(name: string, options: {
    parentSpanId?: string;
    traceId?: string;
    tags?: Record<string, string>;
  } = {}): string {
    if (!this.config.enabled) {
      return 'disabled';
    }

    const spanId = this.generateSpanId();
    const traceId = options.traceId || this.generateTraceId();

    // Create new span
    const span: Span = {
      id: spanId,
      name,
      startTime: Date.now(),
      status: 'unknown',
      tags: options.tags || {},
      logs: [],
      children: [],
    };

    // Set trace context
    span.tags['trace.id'] = traceId;
    span.tags['span.id'] = spanId;

    // Link to parent if specified
    if (options.parentSpanId) {
      span.parentId = options.parentSpanId;

      // Find parent span and add this as child
      const parentSpan = this.activeSpans.get(options.parentSpanId);
      if (parentSpan) {
        parentSpan.children.push(span);
      }
    }

    this.activeSpans.set(spanId, span);

    this.logger.debug('Span started', {
      spanId,
      name,
      traceId,
      parentSpanId: options.parentSpanId,
    });

    return spanId;
  }

  /**
   * End a span
   */
  endSpan(spanId: string, status: 'success' | 'error' = 'success'): void {
    if (!this.config.enabled) {
      return;
    }

    const span = this.activeSpans.get(spanId);
    if (!span) {
      this.logger.warn('Attempted to end non-existent span', { spanId });
      return;
    }

    span.endTime = Date.now();
    span.duration = span.endTime - span.startTime;
    span.status = status;

    // Move from active to completed
    this.activeSpans.delete(spanId);
    this.completedSpans.push(span);

    // Export if sampling allows
    if (Math.random() < this.config.samplingRate) {
      this.exportSpan(span);
    }

    this.logger.debug('Span ended', {
      spanId,
      name: span.name,
      duration: span.duration,
      status,
    });
  }

  /**
   * Add log to active span
   */
  log(spanId: string, message: string, fields?: Record<string, any>): void {
    if (!this.config.enabled) {
      return;
    }

    const span = this.activeSpans.get(spanId);
    if (!span) {
      this.logger.warn('Attempted to log to non-existent span', { spanId });
      return;
    }

    span.logs.push({
      timestamp: Date.now(),
      message,
      fields,
    });
  }

  /**
   * Set tag on active span
   */
  setTag(spanId: string, key: string, value: string): void {
    if (!this.config.enabled) {
      return;
    }

    const span = this.activeSpans.get(spanId);
    if (!span) {
      this.logger.warn('Attempted to set tag on non-existent span', { spanId });
      return;
    }

    span.tags[key] = value;
  }

  /**
   * Get trace context from headers
   */
  extractTraceContext(headers: Record<string, string>): SpanContext | null {
    const traceId = headers['x-trace-id'] || headers['x-b3-traceid'];
    const spanId = headers['x-span-id'] || headers['x-b3-spanid'];
    const parentSpanId = headers['x-parent-span-id'] || headers['x-b3-parentspanid'];

    if (!traceId || !spanId) {
      return null;
    }

    return {
      traceId,
      spanId,
      parentSpanId,
    };
  }

  /**
   * Inject trace context into headers
   */
  injectTraceContext(spanContext: SpanContext): Record<string, string> {
    return {
      'x-trace-id': spanContext.traceId,
      'x-span-id': spanContext.spanId,
      'x-parent-span-id': spanContext.parentSpanId || '',
    };
  }

  /**
   * Get active spans
   */
  getActiveSpans(): Span[] {
    return Array.from(this.activeSpans.values());
  }

  /**
   * Get completed spans
   */
  getCompletedSpans(limit: number = 100): Span[] {
    return this.completedSpans.slice(-limit);
  }

  /**
   * Get trace by ID
   */
  getTrace(traceId: string): Span[] {
    return this.completedSpans.filter(span => span.tags['trace.id'] === traceId);
  }

  /**
   * Export span to configured exporter
   */
  private exportSpan(span: Span): void {
    try {
      switch (this.config.exporter.type) {
        case 'jaeger':
          this.exportToJaeger(span);
          break;
        case 'zipkin':
          this.exportToZipkin(span);
          break;
        case 'otlp':
          this.exportToOTLP(span);
          break;
      }
    } catch (error: any) {
      this.logger.error('Failed to export span', error, { spanId: span.id });
    }
  }

  /**
   * Export span to Jaeger format
   */
  private exportToJaeger(span: Span): void {
    const jaegerSpan = {
      traceID: span.tags['trace.id'],
      spanID: span.id,
      operationName: span.name,
      startTime: span.startTime * 1000, // Jaeger expects microseconds
      duration: span.duration! * 1000,
      tags: Object.entries(span.tags).map(([key, value]) => ({
        key,
        value,
        type: 'string',
      })),
      logs: span.logs.map(log => ({
        timestamp: log.timestamp * 1000,
        fields: [
          { key: 'message', value: log.message, type: 'string' },
          ...(log.fields ? Object.entries(log.fields).map(([k, v]) => ({
            key: k,
            value: String(v),
            type: 'string',
          })) : []),
        ],
      })),
      references: span.parentId ? [{
        refType: 'CHILD_OF',
        traceID: span.tags['trace.id'],
        spanID: span.parentId,
      }] : [],
    };

    // In a real implementation, this would send to Jaeger collector
    this.logger.debug('Exporting span to Jaeger', {
      spanId: span.id,
      traceId: span.tags['trace.id'],
      duration: span.duration,
    });
  }

  /**
   * Export span to Zipkin format
   */
  private exportToZipkin(span: Span): void {
    const zipkinSpan = {
      traceId: span.tags['trace.id'],
      id: span.id,
      name: span.name,
      timestamp: span.startTime * 1000,
      duration: span.duration! * 1000,
      localEndpoint: {
        serviceName: this.config.serviceName,
      },
      tags: span.tags,
      annotations: span.logs.map(log => ({
        timestamp: log.timestamp * 1000,
        value: log.message,
      })),
    };

    // In a real implementation, this would send to Zipkin
    this.logger.debug('Exporting span to Zipkin', {
      spanId: span.id,
      traceId: span.tags['trace.id'],
    });
  }

  /**
   * Export span to OTLP format
   */
  private exportToOTLP(span: Span): void {
    const otlpSpan = {
      trace_id: span.tags['trace.id'],
      span_id: span.id,
      name: span.name,
      start_time_unix_nano: span.startTime * 1000000,
      end_time_unix_nano: (span.endTime || span.startTime) * 1000000,
      status: {
        code: span.status === 'error' ? 2 : 1, // ERROR = 2, OK = 1
      },
      attributes: Object.entries(span.tags).map(([key, value]) => ({
        key,
        value: { string_value: value },
      })),
    };

    // In a real implementation, this would send to OTLP collector
    this.logger.debug('Exporting span to OTLP', {
      spanId: span.id,
      traceId: span.tags['trace.id'],
    });
  }

  /**
   * Generate unique trace ID
   */
  private generateTraceId(): string {
    return `trace_${Date.now()}_${++this.traceIdCounter}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique span ID
   */
  private generateSpanId(): string {
    return `span_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get tracing statistics
   */
  getStats(): {
    activeSpans: number;
    completedSpans: number;
    averageSpanDuration: number;
    errorRate: number;
  } {
    const totalSpans = this.completedSpans.length;
    const errorSpans = this.completedSpans.filter(span => span.status === 'error').length;
    const totalDuration = this.completedSpans.reduce((sum, span) => sum + (span.duration || 0), 0);

    return {
      activeSpans: this.activeSpans.size,
      completedSpans: totalSpans,
      averageSpanDuration: totalSpans > 0 ? totalDuration / totalSpans : 0,
      errorRate: totalSpans > 0 ? errorSpans / totalSpans : 0,
    };
  }

  /**
   * Cleanup old completed spans
   */
  cleanup(maxAge: number = 3600000): number { // 1 hour default
    const cutoff = Date.now() - maxAge;
    const initialCount = this.completedSpans.length;

    this.completedSpans = this.completedSpans.filter(span =>
      (span.endTime || span.startTime) > cutoff
    );

    const removedCount = initialCount - this.completedSpans.length;

    if (removedCount > 0) {
      this.logger.debug('Cleaned up old spans', { removedCount });
    }

    return removedCount;
  }
}
