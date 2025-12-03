/**
 * =========================================
 * ELITE OBSERVABILITY SYSTEM
 * =========================================
 * World-class observability with distributed tracing, metrics, and logging
 * Built on OpenTelemetry standards for enterprise-grade monitoring
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-otlp-grpc';
import { OTLPLogExporter } from '@opentelemetry/exporter-otlp-grpc';
import { OTLPLogExporter as OTLPLogExporterHTTP } from '@opentelemetry/exporter-otlp-http';
import { OTLPLogExporter as OTLPLogExporterProto } from '@opentelemetry/exporter-otlp-proto';
import { OTLPMetricExporter } from '@opentelemetry/exporter-otlp-grpc';
import { OTLPMetricExporter as OTLPMetricExporterHTTP } from '@opentelemetry/exporter-otlp-http';
import { OTLPMetricExporter as OTLPMetricExporterProto } from '@opentelemetry/exporter-otlp-proto';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { diag, DiagConsoleLogger, DiagLogLevel, trace, metrics } from '@opentelemetry/api';
import { logs } from '@opentelemetry/api-logs';
import { MeterProvider } from '@opentelemetry/sdk-metrics';
import { v4 as uuidv4 } from 'uuid';
import { LoggerProvider, SimpleLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { TracerProvider } from '@opentelemetry/sdk-trace-node';

// Enhanced configuration for observability
export interface ObservabilityConfig {
  serviceName: string;
  serviceVersion: string;
  environment: string;

  tracing: {
    enabled: boolean;
    endpoint?: string;
    protocol: 'grpc' | 'http' | 'proto';
    samplingRate: number;
    maxAttributesPerSpan: number;
    maxEventsPerSpan: number;
  };

  metrics: {
    enabled: boolean;
    endpoint?: string;
    protocol: 'grpc' | 'http' | 'proto';
    collectionInterval: number; // milliseconds
    exportInterval: number; // milliseconds
  };

  logging: {
    enabled: boolean;
    endpoint?: string;
    protocol: 'grpc' | 'http' | 'proto';
    level: 'error' | 'warn' | 'info' | 'debug';
    structured: boolean;
  };

  resource: {
    serviceNamespace?: string;
    serviceInstanceId?: string;
    deploymentEnvironment?: string;
    cloudProvider?: string;
    cloudRegion?: string;
  };
}

// Default configuration
const defaultConfig: ObservabilityConfig = {
  serviceName: 'coinet-service',
  serviceVersion: '1.0.0',
  environment: process.env.NODE_ENV || 'development',

  tracing: {
    enabled: process.env.OTEL_TRACING_ENABLED !== 'false',
    endpoint: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
    protocol: (process.env.OTEL_EXPORTER_OTLP_TRACES_PROTOCOL as 'grpc' | 'http' | 'proto') || 'grpc',
    samplingRate: parseFloat(process.env.OTEL_TRACES_SAMPLER_ARG || '0.1'),
    maxAttributesPerSpan: parseInt(process.env.OTEL_SPAN_ATTRIBUTE_COUNT_LIMIT || '128'),
    maxEventsPerSpan: parseInt(process.env.OTEL_SPAN_EVENT_COUNT_LIMIT || '128'),
  },

  metrics: {
    enabled: process.env.OTEL_METRICS_ENABLED !== 'false',
    endpoint: process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT,
    protocol: (process.env.OTEL_EXPORTER_OTLP_METRICS_PROTOCOL as 'grpc' | 'http' | 'proto') || 'grpc',
    collectionInterval: parseInt(process.env.OTEL_METRIC_COLLECTION_INTERVAL || '60000'),
    exportInterval: parseInt(process.env.OTEL_METRIC_EXPORT_INTERVAL || '60000'),
  },

  logging: {
    enabled: process.env.OTEL_LOGS_ENABLED !== 'false',
    endpoint: process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT,
    protocol: (process.env.OTEL_EXPORTER_OTLP_LOGS_PROTOCOL as 'grpc' | 'http' | 'proto') || 'grpc',
    level: (process.env.LOG_LEVEL as 'error' | 'warn' | 'info' | 'debug') || 'info',
    structured: process.env.OTEL_LOGS_STRUCTURED === 'true',
  },

  resource: {
    serviceNamespace: process.env.OTEL_SERVICE_NAMESPACE || 'coinet',
    serviceInstanceId: process.env.OTEL_SERVICE_INSTANCE_ID || process.pid?.toString(),
    deploymentEnvironment: process.env.NODE_ENV || 'development',
    cloudProvider: process.env.CLOUD_PROVIDER,
    cloudRegion: process.env.CLOUD_REGION,
  }
};

/**
 * Elite Observability Manager with comprehensive monitoring capabilities
 */
export class EliteObservabilityManager {
  private config: ObservabilityConfig;
  private sdk?: NodeSDK;
  private meterProvider?: MeterProvider;
  private loggerProvider?: LoggerProvider;
  private tracerProvider?: TracerProvider;
  private isInitialized: boolean = false;

  // Custom metrics and spans
  private customMeters: Map<string, unknown> = new Map();
  private activeSpans: Map<string, unknown> = new Map();

  constructor(config?: Partial<ObservabilityConfig>) {
    this.config = { ...defaultConfig, ...config };

    // Configure OpenTelemetry diagnostics
    diag.setLogger(new DiagConsoleLogger());
    diag.setLogLevel(
      this.config.environment === 'development'
        ? DiagLogLevel.DEBUG
        : DiagLogLevel.INFO
    );
  }

  /**
   * Initialize the observability system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // console.log(`🚀 Initializing Elite Observability for ${this.config.serviceName}`);

    // Create resource attributes
    const resource = new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: this.config.serviceName,
      [SemanticResourceAttributes.SERVICE_VERSION]: this.config.serviceVersion,
      [SemanticResourceAttributes.SERVICE_NAMESPACE]: this.config.resource.serviceNamespace,
      [SemanticResourceAttributes.SERVICE_INSTANCE_ID]: this.config.resource.serviceInstanceId,
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: this.config.resource.deploymentEnvironment,
      [SemanticResourceAttributes.CLOUD_PROVIDER]: this.config.resource.cloudProvider,
      [SemanticResourceAttributes.CLOUD_REGION]: this.config.resource.cloudRegion,
    });

    // Initialize tracing if enabled
    if (this.config.tracing.enabled) {
      await this.initializeTracing(resource);
    }

    // Initialize metrics if enabled
    if (this.config.metrics.enabled) {
      await this.initializeMetrics(resource);
    }

    // Initialize logging if enabled
    if (this.config.logging.enabled) {
      await this.initializeLogging(resource);
    }

    // Initialize NodeSDK for auto-instrumentation
    await this.initializeAutoInstrumentation(resource);

    this.isInitialized = true;
    // console.log(`✅ Elite Observability initialized for ${this.config.serviceName}`);
  }

  /**
   * Initialize distributed tracing
   */
  private async initializeTracing(resource: Resource): Promise<void> {
    const traceExporter = this.createTraceExporter();

    this.tracerProvider = new TracerProvider({
      resource,
      spanProcessors: [
        new BatchSpanProcessor(traceExporter, {
          maxExportBatchSize: 512,
          exportIntervalMillis: 2000,
          maxExportTimeoutMillis: 2000,
        })
      ]
    });

    // Set global tracer provider
    trace.setGlobalTracerProvider(this.tracerProvider);

    // console.log('📊 Tracing initialized');
  }

  /**
   * Initialize metrics collection
   */
  private async initializeMetrics(resource: Resource): Promise<void> {
    const metricExporter = this.createMetricExporter();

    this.meterProvider = new MeterProvider({
      resource,
      readers: [
        new PeriodicExportingMetricReader({
          exporter: metricExporter,
          exportIntervalMillis: this.config.metrics.exportInterval,
        })
      ]
    });

    // Set global meter provider
    metrics.setGlobalMeterProvider(this.meterProvider);

    // console.log('📈 Metrics initialized');
  }

  /**
   * Initialize structured logging
   */
  private async initializeLogging(resource: Resource): Promise<void> {
    const logExporter = this.createLogExporter();

    this.loggerProvider = new LoggerProvider({
      resource,
      processors: [
        new BatchLogRecordProcessor(logExporter, {
          maxExportBatchSize: 512,
          exportIntervalMillis: 5000,
          maxExportTimeoutMillis: 2000,
        })
      ]
    });

    // Set global logger provider
    logs.setGlobalLoggerProvider(this.loggerProvider);

    // console.log('📝 Logging initialized');
  }

  /**
   * Initialize auto-instrumentation
   */
  private async initializeAutoInstrumentation(resource: Resource): Promise<void> {
    this.sdk = new NodeSDK({
      resource,
      serviceName: this.config.serviceName,
      serviceVersion: this.config.serviceVersion,
      traceExporter: this.config.tracing.enabled ? this.createTraceExporter() : undefined,
      metricExporter: this.config.metrics.enabled ? this.createMetricExporter() : undefined,
      logRecordProcessor: this.config.logging.enabled ? new SimpleLogRecordProcessor(this.createLogExporter()) : undefined,
      instrumentations: [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-fs': {
            enabled: false, // Disable file system instrumentation for performance
          },
          '@opentelemetry/instrumentation-net': {
            enabled: false, // Disable network instrumentation for performance
          },
          '@opentelemetry/instrumentation-dns': {
            enabled: false, // Disable DNS instrumentation for performance
          },
        })
      ]
    });

    await this.sdk.start();
    // console.log('🔧 Auto-instrumentation initialized');
  }

  /**
   * Create trace exporter based on configuration
   */
  private createTraceExporter() {
    const config = this.config.tracing;

    if (!config.endpoint) {
      throw new Error('OTLP endpoint required for tracing');
    }

    switch (config.protocol) {
      case 'grpc':
        return new OTLPTraceExporter({
          url: config.endpoint,
          headers: {
            'authorization': process.env.OTEL_EXPORTER_OTLP_HEADERS_AUTHORIZATION || '',
          },
        });
      case 'http':
        return new OTLPTraceExporter({
          url: config.endpoint,
          headers: {
            'authorization': process.env.OTEL_EXPORTER_OTLP_HEADERS_AUTHORIZATION || '',
          },
        });
      case 'proto':
        return new OTLPTraceExporter({
          url: config.endpoint,
          headers: {
            'authorization': process.env.OTEL_EXPORTER_OTLP_HEADERS_AUTHORIZATION || '',
          },
        });
      default:
        throw new Error(`Unsupported trace protocol: ${config.protocol}`);
    }
  }

  /**
   * Create metrics exporter based on configuration
   */
  private createMetricExporter() {
    const config = this.config.metrics;

    if (!config.endpoint) {
      throw new Error('OTLP endpoint required for metrics');
    }

    switch (config.protocol) {
      case 'grpc':
        return new OTLPMetricExporter({
          url: config.endpoint,
          headers: {
            'authorization': process.env.OTEL_EXPORTER_OTLP_HEADERS_AUTHORIZATION || '',
          },
        });
      case 'http':
        return new OTLPMetricExporterHTTP({
          url: config.endpoint,
          headers: {
            'authorization': process.env.OTEL_EXPORTER_OTLP_HEADERS_AUTHORIZATION || '',
          },
        });
      case 'proto':
        return new OTLPMetricExporterProto({
          url: config.endpoint,
          headers: {
            'authorization': process.env.OTEL_EXPORTER_OTLP_HEADERS_AUTHORIZATION || '',
          },
        });
      default:
        throw new Error(`Unsupported metrics protocol: ${config.protocol}`);
    }
  }

  /**
   * Create logs exporter based on configuration
   */
  private createLogExporter() {
    const config = this.config.logging;

    if (!config.endpoint) {
      throw new Error('OTLP endpoint required for logging');
    }

    switch (config.protocol) {
      case 'grpc':
        return new OTLPLogExporter({
          url: config.endpoint,
          headers: {
            'authorization': process.env.OTEL_EXPORTER_OTLP_HEADERS_AUTHORIZATION || '',
          },
        });
      case 'http':
        return new OTLPLogExporterHTTP({
          url: config.endpoint,
          headers: {
            'authorization': process.env.OTEL_EXPORTER_OTLP_HEADERS_AUTHORIZATION || '',
          },
        });
      case 'proto':
        return new OTLPLogExporterProto({
          url: config.endpoint,
          headers: {
            'authorization': process.env.OTEL_EXPORTER_OTLP_HEADERS_AUTHORIZATION || '',
          },
        });
      default:
        throw new Error(`Unsupported logging protocol: ${config.protocol}`);
    }
  }

  /**
   * Get a tracer for the service
   */
  getTracer(name?: string) {
    if (!this.tracerProvider) {
      throw new Error('Tracing not initialized');
    }

    return this.tracerProvider.getTracer(name || `${this.config.serviceName}-tracer`, this.config.serviceVersion);
  }

  /**
   * Get a meter for the service
   */
  getMeter(name?: string) {
    if (!this.meterProvider) {
      throw new Error('Metrics not initialized');
    }

    const meterName = name || `${this.config.serviceName}-meter`;
    if (!this.customMeters.has(meterName)) {
      this.customMeters.set(meterName, this.meterProvider.getMeter(meterName, this.config.serviceVersion));
    }

    return this.customMeters.get(meterName);
  }

  /**
   * Get a logger for the service
   */
  getLogger(name?: string) {
    if (!this.loggerProvider) {
      throw new Error('Logging not initialized');
    }

    return logs.getLogger(name || `${this.config.serviceName}-logger`, this.config.serviceVersion);
  }

  /**
   * Start a custom span for tracing
   */
  startSpan(name: string, attributes?: Record<string, unknown>, parentSpan?: unknown) {
    const tracer = this.getTracer();
    const span = tracer.startSpan(name, {
      attributes: {
        'service.name': this.config.serviceName,
        'service.version': this.config.serviceVersion,
        ...attributes,
      }
    }, parentSpan);

    // Store active span for cleanup
    // const _spanId = uuidv4();
    // this.activeSpans.set(_spanId, span);

    return { span };
  }

  /**
   * End a custom span
   */
  endSpan(spanId: string, error?: Error) {
    const span = this.activeSpans.get(spanId);
    if (span) {
      if (error) {
        span.recordException(error);
        span.setStatus({ code: 2, message: error.message });
      } else {
        span.setStatus({ code: 1, message: 'OK' });
      }

      span.end();
      this.activeSpans.delete(spanId);
    }
  }

  /**
   * Record a custom metric
   */
  recordMetric(name: string, value: number, attributes?: Record<string, string | number>) {
    try {
      const meter = this.getMeter();
      const counter = meter.createCounter(name, {
        description: `Custom metric: ${name}`,
      });

      counter.add(value, attributes || {});
    } catch (error) {
      // console.warn('Failed to record metric:', error);
    }
  }

  /**
   * Record a histogram metric
   */
  recordHistogram(name: string, value: number, attributes?: Record<string, string | number>) {
    try {
      const meter = this.getMeter();
      const histogram = meter.createHistogram(name, {
        description: `Custom histogram: ${name}`,
      });

      histogram.record(value, attributes || {});
    } catch (error) {
      // console.warn('Failed to record histogram:', error);
    }
  }

  /**
   * Record a gauge metric
   */
  recordGauge(name: string, value: number, attributes?: Record<string, string | number>) {
    try {
      const meter = this.getMeter();
      const gauge = meter.createObservableGauge(name, {
        description: `Custom gauge: ${name}`,
      });

      gauge.addCallback((result) => {
        result.observe(value, attributes || {});
      });
    } catch (error) {
      // console.warn('Failed to record gauge:', error);
    }
  }

  /**
   * Shutdown the observability system
   */
  async shutdown(): Promise<void> {
    // End all active spans
    for (const [_spanId, span] of this.activeSpans.entries()) {
      span.end();
    }
    this.activeSpans.clear();

    // Shutdown SDK
    if (this.sdk) {
      await this.sdk.shutdown();
    }

    // Shutdown providers
    if (this.tracerProvider) {
      await this.tracerProvider.shutdown();
    }

    if (this.meterProvider) {
      await this.meterProvider.shutdown();
    }

    if (this.loggerProvider) {
      await this.loggerProvider.shutdown();
    }

    this.isInitialized = false;
    // console.log(`✅ Elite Observability shutdown for ${this.config.serviceName}`);
  }

  /**
   * Get current observability status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      serviceName: this.config.serviceName,
      serviceVersion: this.config.serviceVersion,
      tracingEnabled: this.config.tracing.enabled,
      metricsEnabled: this.config.metrics.enabled,
      loggingEnabled: this.config.logging.enabled,
      activeSpans: this.activeSpans.size,
      customMeters: this.customMeters.size,
    };
  }
}

/**
 * Utility function to create observability manager with default config
 */
export function createObservabilityManager(config?: Partial<ObservabilityConfig>): EliteObservabilityManager {
  return new EliteObservabilityManager(config);
}

/**
 * Utility function to initialize observability for a service
 */
export async function initializeObservability(
  serviceName: string,
  config?: Partial<ObservabilityConfig>
): Promise<EliteObservabilityManager> {
  const observability = new EliteObservabilityManager({
    serviceName,
    ...config
  });

  await observability.initialize();
  return observability;
}

// UUID is imported at the top of the file
