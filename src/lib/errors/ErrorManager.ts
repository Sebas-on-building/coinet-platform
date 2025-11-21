import { Logger } from '../logging/Logger';
import { MetricsCollector } from '../metrics/MetricsCollector';
import { NotificationService } from '../notifications/NotificationService';

export interface ErrorContext {
  userId?: string;
  operation: string;
  component?: string;
  requestId?: string;
  email?: string;
  sessionId?: string;
  url?: string;
  method?: string;
  metadata?: Record<string, any>;
}

export interface EnrichedError {
  name: string;
  message: string;
  stack?: string;
  timestamp: string;
  context: ErrorContext;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recovery: string;
  userImpact: 'none' | 'minimal' | 'moderate' | 'severe';
  businessImpact: 'none' | 'minimal' | 'moderate' | 'severe';
  errorId: string;
}

export class ServiceError extends Error {
  constructor(
    public code: string,
    message: string,
    public originalError?: Error,
    public context?: ErrorContext
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

export class AuthError extends ServiceError {
  constructor(code: string, originalError?: Error) {
    super(code, `Authentication failed: ${code}`, originalError);
    this.name = 'AuthError';
  }
}

export class PortfolioError extends ServiceError {
  constructor(code: string, originalError?: Error) {
    super(code, `Portfolio operation failed: ${code}`, originalError);
    this.name = 'PortfolioError';
  }
}

export class ApiError extends ServiceError {
  constructor(code: string, originalError?: Error) {
    super(code, `API operation failed: ${code}`, originalError);
    this.name = 'ApiError';
  }
}

export class ErrorManager {
  private static instance: ErrorManager;
  private logger: Logger;
  private metricsCollector: MetricsCollector;
  private notificationService: NotificationService;
  private errorHistory: Map<string, EnrichedError[]> = new Map();
  private errorCounts: Map<string, number> = new Map();

  private constructor() {
    this.logger = Logger.getInstance();
    this.metricsCollector = MetricsCollector.getInstance();
    this.notificationService = NotificationService.getInstance();
    this.setupGlobalErrorHandlers();
  }

  static getInstance(): ErrorManager {
    if (!ErrorManager.instance) {
      ErrorManager.instance = new ErrorManager();
    }
    return ErrorManager.instance;
  }

  handleError(error: Error, context: ErrorContext): void {
    try {
      const enrichedError = this.enrichError(error, context);

      // Log the error
      this.logError(enrichedError);

      // Update metrics
      this.updateMetrics(enrichedError);

      // Store in history for analysis
      this.storeErrorHistory(enrichedError);

      // Notify if critical
      this.notifyIfCritical(enrichedError);

      // Track error frequency
      this.trackErrorFrequency(enrichedError);

    } catch (handlingError) {
      // Fallback error handling
      console.error('Error in error handler:', handlingError);
      console.error('Original error:', error);
    }
  }

  private enrichError(error: Error, context: ErrorContext): EnrichedError {
    const errorId = this.generateErrorId();

    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      context,
      severity: this.classifyErrorSeverity(error),
      recovery: this.generateRecoverySuggestion(error),
      userImpact: this.assessUserImpact(error),
      businessImpact: this.assessBusinessImpact(error),
      errorId
    };
  }

  private logError(enrichedError: EnrichedError): void {
    const logLevel = this.getLogLevel(enrichedError.severity);

    this.logger[logLevel](`[${enrichedError.errorId}] ${enrichedError.message}`, {
      error: enrichedError,
      stack: enrichedError.stack,
      context: enrichedError.context,
      severity: enrichedError.severity,
      recovery: enrichedError.recovery
    });
  }

  private updateMetrics(enrichedError: EnrichedError): void {
    this.metricsCollector.incrementCounter('errors_total', {
      severity: enrichedError.severity,
      operation: enrichedError.context.operation,
      component: enrichedError.context.component || 'unknown'
    });

    this.metricsCollector.recordHistogram('error_handling_duration',
      Date.now() - new Date(enrichedError.timestamp).getTime()
    );
  }

  private storeErrorHistory(enrichedError: EnrichedError): void {
    const key = `${enrichedError.context.operation}_${enrichedError.name}`;

    if (!this.errorHistory.has(key)) {
      this.errorHistory.set(key, []);
    }

    const history = this.errorHistory.get(key)!;
    history.push(enrichedError);

    // Keep only last 100 errors per type
    if (history.length > 100) {
      history.shift();
    }
  }

  private async notifyIfCritical(enrichedError: EnrichedError): Promise<void> {
    if (enrichedError.severity === 'critical') {
      await this.notificationService.sendCriticalAlert({
        title: `Critical Error: ${enrichedError.name}`,
        message: enrichedError.message,
        errorId: enrichedError.errorId,
        context: enrichedError.context,
        recovery: enrichedError.recovery
      });
    }
  }

  private trackErrorFrequency(enrichedError: EnrichedError): void {
    const key = `${enrichedError.name}_${enrichedError.context.operation}`;
    const count = this.errorCounts.get(key) || 0;
    this.errorCounts.set(key, count + 1);

    // Alert if error frequency is too high
    if (count > 10) { // More than 10 errors of same type
      this.logger.warn(`High error frequency detected: ${key}`, {
        count,
        errorType: enrichedError.name,
        operation: enrichedError.context.operation
      });
    }
  }

  private classifyErrorSeverity(error: Error): 'low' | 'medium' | 'high' | 'critical' {
    // Critical errors
    if (error.message.includes('critical') ||
      error.message.includes('fatal') ||
      error.message.includes('system failure')) {
      return 'critical';
    }

    // High severity errors
    if (error.message.includes('database') ||
      error.message.includes('connection') ||
      error.message.includes('authentication') ||
      error.message.includes('authorization') ||
      error.message.includes('payment')) {
      return 'high';
    }

    // Medium severity errors
    if (error.name === 'ValidationError' ||
      error.message.includes('timeout') ||
      error.message.includes('rate limit')) {
      return 'medium';
    }

    // Default to low
    return 'low';
  }

  private generateRecoverySuggestion(error: Error): string {
    if (error.message.includes('connection')) {
      return 'Check network connectivity and retry the operation';
    }

    if (error.message.includes('timeout')) {
      return 'Increase timeout value or check service health';
    }

    if (error.message.includes('rate limit')) {
      return 'Wait before retrying or implement exponential backoff';
    }

    if (error.name === 'ValidationError') {
      return 'Validate input data and correct any issues';
    }

    if (error.message.includes('authentication')) {
      return 'Re-authenticate and ensure valid credentials';
    }

    if (error.message.includes('database')) {
      return 'Check database connection and query syntax';
    }

    return 'Review error details and contact support if issue persists';
  }

  private assessUserImpact(error: Error): 'none' | 'minimal' | 'moderate' | 'severe' {
    if (error.message.includes('authentication') ||
      error.message.includes('authorization') ||
      error.message.includes('payment') ||
      error.message.includes('critical')) {
      return 'severe';
    }

    if (error.message.includes('validation') ||
      error.message.includes('timeout') ||
      error.message.includes('rate limit')) {
      return 'moderate';
    }

    if (error.message.includes('cache') ||
      error.message.includes('logging')) {
      return 'minimal';
    }

    return 'none';
  }

  private assessBusinessImpact(error: Error): 'none' | 'minimal' | 'moderate' | 'severe' {
    if (error.message.includes('payment') ||
      error.message.includes('transaction') ||
      error.message.includes('trading')) {
      return 'severe';
    }

    if (error.message.includes('critical') ||
      error.message.includes('database') ||
      error.message.includes('authentication')) {
      return 'moderate';
    }

    return 'minimal';
  }

  private getLogLevel(severity: string): 'error' | 'warn' | 'info' | 'debug' {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'error';
      case 'medium':
        return 'warn';
      case 'low':
        return 'info';
      default:
        return 'debug';
    }
  }

  private generateErrorId(): string {
    return `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupGlobalErrorHandlers(): void {
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.handleError(error, {
        operation: 'uncaught_exception',
        component: 'global'
      });
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      const error = reason instanceof Error ? reason : new Error(String(reason));
      this.handleError(error, {
        operation: 'unhandled_rejection',
        component: 'global'
      });
    });
  }

  // Public methods for error analysis
  getErrorHistory(operation?: string): EnrichedError[] {
    if (operation) {
      return Array.from(this.errorHistory.entries())
        .filter(([key]) => key.includes(operation))
        .flatMap(([, errors]) => errors);
    }

    return Array.from(this.errorHistory.values()).flat();
  }

  getErrorStats(): Record<string, number> {
    return Object.fromEntries(this.errorCounts);
  }

  clearErrorHistory(): void {
    this.errorHistory.clear();
    this.errorCounts.clear();
  }
}

// Export singleton instance
export const errorManager = ErrorManager.getInstance(); 