/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     📝 OMNISCORE STRUCTURED LOGGING                                          ║
 * ║                                                                               ║
 * ║   Structured logs with all required context fields.                          ║
 * ║   Every log includes: projectId, engineVersion, buildSha, requestId.         ║
 * ║                                                                               ║
 * ║   Production Readiness Gate: Phase 7                                         ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { ENGINE_VERSION, FORMULA_VERSION, BUILD_COMMIT_SHA } from './version';
import { isVerboseAuditEnabled } from './feature-flags';
import { OmniScoreError } from './errors';

// ═══════════════════════════════════════════════════════════════════════════════
// LOG LEVELS
// ═══════════════════════════════════════════════════════════════════════════════

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

// ═══════════════════════════════════════════════════════════════════════════════
// LOG CONTEXT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Required context for all OmniScore logs
 */
export interface OmniScoreLogContext {
  // Always present
  engineVersion: string;
  formulaVersion: string;
  buildCommitSha: string;
  timestamp: string;
  
  // Request context (when available)
  requestId?: string;
  projectId?: string;
  
  // Calculation context
  sector?: string;
  capBucket?: string;
  regime?: string;
  
  // Data quality
  qsCoverage?: number;
  osCoverage?: number;
  degraded?: boolean;
  
  // Performance
  durationMs?: number;
  
  // Error context
  errorCode?: string;
  errorSeverity?: string;
}

/**
 * Structured log entry
 */
export interface StructuredLogEntry {
  level: LogLevel;
  message: string;
  context: OmniScoreLogContext;
  data?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOG CONTEXT BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build base context that's always present
 */
function buildBaseContext(): OmniScoreLogContext {
  return {
    engineVersion: ENGINE_VERSION,
    formulaVersion: FORMULA_VERSION,
    buildCommitSha: BUILD_COMMIT_SHA,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Merge additional context
 */
function mergeContext(
  base: OmniScoreLogContext,
  additional?: Partial<OmniScoreLogContext>
): OmniScoreLogContext {
  return { ...base, ...additional };
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOGGER CLASS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * OmniScore structured logger
 */
export class OmniScoreLogger {
  private requestId?: string;
  private projectId?: string;
  private additionalContext: Partial<OmniScoreLogContext> = {};
  
  constructor(requestId?: string, projectId?: string) {
    this.requestId = requestId;
    this.projectId = projectId;
  }
  
  /**
   * Add context that persists across log calls
   */
  withContext(context: Partial<OmniScoreLogContext>): this {
    this.additionalContext = { ...this.additionalContext, ...context };
    return this;
  }
  
  /**
   * Get full context for this logger
   */
  private getContext(extra?: Partial<OmniScoreLogContext>): OmniScoreLogContext {
    return mergeContext(buildBaseContext(), {
      requestId: this.requestId,
      projectId: this.projectId,
      ...this.additionalContext,
      ...extra,
    });
  }
  
  /**
   * Format and output log entry
   */
  private log(
    level: LogLevel,
    message: string,
    context?: Partial<OmniScoreLogContext>,
    data?: Record<string, unknown>
  ): void {
    const entry: StructuredLogEntry = {
      level,
      message,
      context: this.getContext(context),
      data: isVerboseAuditEnabled() ? data : undefined,
    };
    
    // Format as JSON for production log aggregation
    const logLine = JSON.stringify({
      level: entry.level,
      msg: entry.message,
      ...entry.context,
      ...(entry.data ? { data: entry.data } : {}),
    });
    
    // Output to appropriate stream
    switch (level) {
      case 'debug':
        if (process.env.NODE_ENV !== 'production') {
          console.debug(`[OmniScore] ${logLine}`);
        }
        break;
      case 'info':
        console.info(`[OmniScore] ${logLine}`);
        break;
      case 'warn':
        console.warn(`[OmniScore] ${logLine}`);
        break;
      case 'error':
      case 'fatal':
        console.error(`[OmniScore] ${logLine}`);
        break;
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // LOG METHODS
  // ═══════════════════════════════════════════════════════════════════════════
  
  debug(message: string, data?: Record<string, unknown>): void {
    this.log('debug', message, undefined, data);
  }
  
  info(message: string, context?: Partial<OmniScoreLogContext>, data?: Record<string, unknown>): void {
    this.log('info', message, context, data);
  }
  
  warn(message: string, context?: Partial<OmniScoreLogContext>, data?: Record<string, unknown>): void {
    this.log('warn', message, context, data);
  }
  
  error(message: string, context?: Partial<OmniScoreLogContext>, data?: Record<string, unknown>): void {
    this.log('error', message, context, data);
  }
  
  fatal(message: string, context?: Partial<OmniScoreLogContext>, data?: Record<string, unknown>): void {
    this.log('fatal', message, context, data);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SPECIALIZED LOGGING METHODS
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Log calculation start
   */
  calcStart(projectId: string): void {
    this.projectId = projectId;
    this.info('Calculation started', { projectId });
  }
  
  /**
   * Log calculation success
   */
  calcSuccess(result: {
    durationMs: number;
    qsCoverage: number;
    osCoverage: number;
    posScore: number;
    tier: string;
    degraded: boolean;
    sector?: string;
    capBucket?: string;
  }): void {
    this.info('Calculation completed', {
      durationMs: result.durationMs,
      qsCoverage: result.qsCoverage,
      osCoverage: result.osCoverage,
      degraded: result.degraded,
      sector: result.sector,
      capBucket: result.capBucket,
    }, {
      posScore: result.posScore,
      tier: result.tier,
    });
  }
  
  /**
   * Log calculation error
   */
  calcError(error: OmniScoreError | Error, durationMs?: number): void {
    if (error instanceof OmniScoreError) {
      this.error(`Calculation failed: ${error.code}`, {
        durationMs,
        errorCode: error.code,
        errorSeverity: error.severity,
      }, {
        message: error.message,
        details: error.details,
      });
    } else {
      this.error(`Calculation failed: ${error.message}`, {
        durationMs,
        errorCode: 'INTERNAL_ERROR',
      }, {
        stack: error.stack,
      });
    }
  }
  
  /**
   * Log upstream failure
   */
  upstreamFailure(source: string, error: Error | string): void {
    this.warn(`Upstream ${source} failed`, undefined, {
      source,
      error: typeof error === 'string' ? error : error.message,
    });
  }
  
  /**
   * Log version mismatch (critical!)
   */
  versionMismatch(type: 'engine' | 'formula', expected: string, received: string): void {
    this.fatal(`Version mismatch: ${type}`, {
      errorCode: `${type.toUpperCase()}_VERSION_MISMATCH`,
      errorSeverity: 'CRITICAL',
    }, {
      type,
      expected,
      received,
    });
  }
  
  /**
   * Log invariant violation
   */
  invariantViolation(code: string, message: string, value?: number): void {
    this.error(`Invariant ${code} violated: ${message}`, {
      errorCode: 'INVARIANT_VIOLATION',
      errorSeverity: 'CRITICAL',
    }, {
      invariantCode: code,
      value,
    });
  }
  
  /**
   * Log smoothing state miss
   */
  smoothingStateMiss(): void {
    this.debug('No previous state for smoothing (cold start)');
  }
  
  /**
   * Log data quality warning
   */
  dataQualityWarning(qsCoverage: number, osCoverage: number, warnings: string[]): void {
    this.warn('Data quality below threshold', {
      qsCoverage,
      osCoverage,
      degraded: true,
    }, {
      warnings,
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a logger for a request
 */
export function createOmniScoreLogger(requestId?: string, projectId?: string): OmniScoreLogger {
  return new OmniScoreLogger(requestId, projectId);
}

/**
 * Default logger instance
 */
export const defaultLogger = new OmniScoreLogger();

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT LOG HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create audit log entry for a calculation
 */
export interface AuditLogEntry {
  requestId: string;
  projectId: string;
  timestamp: string;
  engineVersion: string;
  formulaVersion: string;
  buildCommitSha: string;
  
  // Input summary
  qsInputCount: number;
  osInputCount: number;
  qsCoverage: number;
  osCoverage: number;
  
  // Result summary
  posScore?: number;
  tier?: string;
  
  // Flags
  degraded: boolean;
  smoothingApplied: boolean;
  
  // Performance
  durationMs: number;
  
  // Error (if any)
  error?: {
    code: string;
    message: string;
    severity: string;
  };
}

/**
 * Create audit log entry
 */
export function createAuditLogEntry(params: {
  requestId: string;
  projectId: string;
  qsInputCount: number;
  osInputCount: number;
  qsCoverage: number;
  osCoverage: number;
  posScore?: number;
  tier?: string;
  degraded: boolean;
  smoothingApplied: boolean;
  durationMs: number;
  error?: OmniScoreError;
}): AuditLogEntry {
  return {
    requestId: params.requestId,
    projectId: params.projectId,
    timestamp: new Date().toISOString(),
    engineVersion: ENGINE_VERSION,
    formulaVersion: FORMULA_VERSION,
    buildCommitSha: BUILD_COMMIT_SHA,
    qsInputCount: params.qsInputCount,
    osInputCount: params.osInputCount,
    qsCoverage: params.qsCoverage,
    osCoverage: params.osCoverage,
    posScore: params.posScore,
    tier: params.tier,
    degraded: params.degraded,
    smoothingApplied: params.smoothingApplied,
    durationMs: params.durationMs,
    error: params.error ? {
      code: params.error.code,
      message: params.error.message,
      severity: params.error.severity,
    } : undefined,
  };
}
