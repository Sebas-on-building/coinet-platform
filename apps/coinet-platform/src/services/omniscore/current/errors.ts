/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🚨 OMNISCORE ERROR TYPES & DATA QUALITY GATES                            ║
 * ║                                                                               ║
 * ║   Fail-closed: If data quality is below minimum, NO score is produced.       ║
 * ║   All errors are typed with codes for observability and debugging.           ║
 * ║                                                                               ║
 * ║   Production Readiness Gate: Phase 4                                         ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { MIN_QS_INPUTS, MIN_OS_INPUTS, MIN_COVERAGE_QS, MIN_COVERAGE_OS } from './validation';

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR CODES
// ═══════════════════════════════════════════════════════════════════════════════

export type OmniScoreErrorCode =
  // Validation errors
  | 'VALIDATION_ERROR'
  | 'MISSING_REQUIRED_FIELD'
  | 'INVALID_FIELD_VALUE'
  
  // Data quality errors (fail-closed)
  | 'INSUFFICIENT_DATA'
  | 'INSUFFICIENT_QS_DATA'
  | 'INSUFFICIENT_OS_DATA'
  | 'COVERAGE_BELOW_THRESHOLD'
  
  // Upstream errors
  | 'UPSTREAM_TIMEOUT'
  | 'UPSTREAM_FAILURE'
  | 'UPSTREAM_RATE_LIMITED'
  
  // Version/integrity errors
  | 'ENGINE_VERSION_MISMATCH'
  | 'FORMULA_VERSION_MISMATCH'
  | 'METHODOLOGY_HASH_MISMATCH'
  
  // Invariant violations
  | 'INVARIANT_VIOLATION'
  | 'SCORE_OUT_OF_BOUNDS'
  | 'NAN_DETECTED'
  | 'INFINITY_DETECTED'
  
  // Persistence errors
  | 'PERSISTENCE_FAILURE'
  | 'SMOOTHING_STATE_CORRUPT'
  
  // Generic
  | 'INTERNAL_ERROR'
  | 'UNKNOWN_ERROR';

export type OmniScoreErrorSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR DETAILS INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

export interface OmniScoreErrorDetails {
  // Input counts
  qsInputCount?: number;
  osInputCount?: number;
  qsValidCount?: number;
  osValidCount?: number;
  
  // Coverage
  qsCoverage?: number;
  osCoverage?: number;
  
  // Upstream info
  upstreamSource?: string;
  upstreamStatus?: number;
  upstreamMessage?: string;
  
  // Invariant info
  invariantCode?: string;
  invariantValue?: number;
  invariantBound?: string;
  
  // Version info
  expectedVersion?: string;
  receivedVersion?: string;
  
  // Field info
  fieldName?: string;
  fieldValue?: unknown;
  
  // Original error
  originalError?: Error | string;
  
  // Any additional context
  [key: string]: unknown;
}

// ═══════════════════════════════════════════════════════════════════════════════
// OMNISCORE ERROR CLASS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Base error class for all OmniScore errors
 * 
 * Usage:
 *   throw new OmniScoreError('INSUFFICIENT_DATA', 'Not enough QS signals', 'CRITICAL', {
 *     qsValidCount: 2,
 *     qsInputCount: 5,
 *   });
 */
export class OmniScoreError extends Error {
  public readonly code: OmniScoreErrorCode;
  public readonly severity: OmniScoreErrorSeverity;
  public readonly details: OmniScoreErrorDetails;
  public readonly timestamp: string;
  public readonly isRetryable: boolean;

  constructor(
    code: OmniScoreErrorCode,
    message: string,
    severity: OmniScoreErrorSeverity = 'HIGH',
    details: OmniScoreErrorDetails = {}
  ) {
    super(message);
    this.name = 'OmniScoreError';
    this.code = code;
    this.severity = severity;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.isRetryable = this.determineRetryable(code);
    
    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, OmniScoreError);
    }
  }
  
  private determineRetryable(code: OmniScoreErrorCode): boolean {
    // These errors might succeed on retry
    const retryableCodes: OmniScoreErrorCode[] = [
      'UPSTREAM_TIMEOUT',
      'UPSTREAM_FAILURE',
      'UPSTREAM_RATE_LIMITED',
      'PERSISTENCE_FAILURE',
    ];
    return retryableCodes.includes(code);
  }
  
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      severity: this.severity,
      details: this.details,
      timestamp: this.timestamp,
      isRetryable: this.isRetryable,
      stack: this.stack,
    };
  }
  
  /**
   * Create a log-safe version (no sensitive data)
   */
  toLogSafe() {
    return {
      code: this.code,
      severity: this.severity,
      timestamp: this.timestamp,
      isRetryable: this.isRetryable,
      // Exclude details that might contain sensitive info
      qsValidCount: this.details.qsValidCount,
      osValidCount: this.details.osValidCount,
      qsCoverage: this.details.qsCoverage,
      osCoverage: this.details.osCoverage,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATA QUALITY RESULT INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

export interface DataQualityResult {
  /** Whether quality gate passed */
  passed: boolean;
  
  /** Number of valid (non-null, finite) QS inputs */
  qsValidCount: number;
  
  /** Number of valid (non-null, finite) OS inputs */
  osValidCount: number;
  
  /** Total QS inputs provided */
  qsTotalCount: number;
  
  /** Total OS inputs provided */
  osTotalCount: number;
  
  /** QS coverage (valid/total) */
  qsCoverage: number;
  
  /** OS coverage (valid/total) */
  osCoverage: number;
  
  /** Whether output is degraded (low coverage but still passing) */
  degraded: boolean;
  
  /** Fields that failed quality checks */
  failedFields: string[];
  
  /** Warnings for audit trail */
  warnings: string[];
  
  /** Reason for failure (if any) */
  failureReason?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATA QUALITY CHECK FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

interface FeatureInputLike {
  raw: number | null;
  key?: string;
}

/**
 * Check data quality without throwing
 * Returns detailed result for audit trail
 */
export function checkDataQuality(
  qsInputs: FeatureInputLike[],
  osInputs: FeatureInputLike[]
): DataQualityResult {
  // Count valid inputs (non-null and finite)
  const qsValidCount = qsInputs.filter(
    i => i.raw !== null && typeof i.raw === 'number' && isFinite(i.raw)
  ).length;
  
  const osValidCount = osInputs.filter(
    i => i.raw !== null && typeof i.raw === 'number' && isFinite(i.raw)
  ).length;
  
  const qsTotalCount = qsInputs.length;
  const osTotalCount = osInputs.length;
  
  // Calculate coverage
  const qsCoverage = qsTotalCount > 0 ? qsValidCount / qsTotalCount : 0;
  const osCoverage = osTotalCount > 0 ? osValidCount / osTotalCount : 0;
  
  const failedFields: string[] = [];
  const warnings: string[] = [];
  let failureReason: string | undefined;
  
  // Check minimum counts
  if (qsValidCount < MIN_QS_INPUTS) {
    failedFields.push('qsInputs');
    failureReason = `QS has ${qsValidCount} valid inputs (minimum: ${MIN_QS_INPUTS})`;
  }
  
  if (osValidCount < MIN_OS_INPUTS) {
    failedFields.push('osInputs');
    if (!failureReason) {
      failureReason = `OS has ${osValidCount} valid inputs (minimum: ${MIN_OS_INPUTS})`;
    }
  }
  
  // Check coverage thresholds
  if (qsCoverage < MIN_COVERAGE_QS && qsTotalCount > 0) {
    warnings.push(`QS coverage ${(qsCoverage * 100).toFixed(1)}% below threshold ${MIN_COVERAGE_QS * 100}%`);
  }
  
  if (osCoverage < MIN_COVERAGE_OS && osTotalCount > 0) {
    warnings.push(`OS coverage ${(osCoverage * 100).toFixed(1)}% below threshold ${MIN_COVERAGE_OS * 100}%`);
  }
  
  // Determine if degraded (passing but with warnings)
  const degraded = warnings.length > 0 || qsCoverage < 0.5 || osCoverage < 0.5;
  
  // Determine pass/fail
  const passed = failedFields.length === 0;
  
  return {
    passed,
    qsValidCount,
    osValidCount,
    qsTotalCount,
    osTotalCount,
    qsCoverage,
    osCoverage,
    degraded,
    failedFields,
    warnings,
    failureReason,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FAIL-CLOSED ASSERTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Assert data quality or throw INSUFFICIENT_DATA error
 * This is the fail-closed gate — no score is produced if this fails
 * 
 * @throws OmniScoreError with code INSUFFICIENT_DATA
 */
export function assertDataQualityOrThrow(
  qsInputs: FeatureInputLike[],
  osInputs: FeatureInputLike[]
): DataQualityResult {
  const result = checkDataQuality(qsInputs, osInputs);
  
  if (!result.passed) {
    throw new OmniScoreError(
      'INSUFFICIENT_DATA',
      `Data quality gate failed: ${result.failureReason}`,
      'CRITICAL',
      {
        qsInputCount: result.qsTotalCount,
        osInputCount: result.osTotalCount,
        qsValidCount: result.qsValidCount,
        osValidCount: result.osValidCount,
        qsCoverage: result.qsCoverage,
        osCoverage: result.osCoverage,
      }
    );
  }
  
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INVARIANT CHECKING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if a value is finite (not NaN, not Infinity)
 * @throws OmniScoreError if value is NaN or Infinity
 */
export function assertFinite(value: number, fieldName: string): void {
  if (typeof value !== 'number') {
    throw new OmniScoreError(
      'INVALID_FIELD_VALUE',
      `${fieldName} must be a number, got ${typeof value}`,
      'HIGH',
      { fieldName, fieldValue: value }
    );
  }
  
  if (Number.isNaN(value)) {
    throw new OmniScoreError(
      'NAN_DETECTED',
      `${fieldName} is NaN`,
      'CRITICAL',
      { fieldName, fieldValue: value }
    );
  }
  
  if (!Number.isFinite(value)) {
    throw new OmniScoreError(
      'INFINITY_DETECTED',
      `${fieldName} is Infinity`,
      'CRITICAL',
      { fieldName, fieldValue: value }
    );
  }
}

/**
 * Check if score is within valid bounds [0, 100]
 * @throws OmniScoreError if out of bounds
 */
export function assertScoreBounds(score: number, fieldName: string): void {
  assertFinite(score, fieldName);
  
  if (score < 0 || score > 100) {
    throw new OmniScoreError(
      'SCORE_OUT_OF_BOUNDS',
      `${fieldName} must be between 0 and 100, got ${score}`,
      'CRITICAL',
      {
        fieldName,
        fieldValue: score,
        invariantBound: '[0, 100]',
      }
    );
  }
}

/**
 * Check if a normalized value is within [0, 1]
 * @throws OmniScoreError if out of bounds
 */
export function assertNormalizedBounds(value: number, fieldName: string): void {
  assertFinite(value, fieldName);
  
  if (value < 0 || value > 1) {
    throw new OmniScoreError(
      'INVARIANT_VIOLATION',
      `${fieldName} must be between 0 and 1, got ${value}`,
      'HIGH',
      {
        fieldName,
        invariantValue: value,
        invariantBound: '[0, 1]',
      }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create UPSTREAM_TIMEOUT error
 */
export function createUpstreamTimeoutError(
  source: string,
  timeoutMs: number
): OmniScoreError {
  return new OmniScoreError(
    'UPSTREAM_TIMEOUT',
    `Upstream ${source} timed out after ${timeoutMs}ms`,
    'HIGH',
    { upstreamSource: source }
  );
}

/**
 * Create UPSTREAM_FAILURE error
 */
export function createUpstreamFailureError(
  source: string,
  status?: number,
  message?: string
): OmniScoreError {
  return new OmniScoreError(
    'UPSTREAM_FAILURE',
    `Upstream ${source} failed: ${message || 'Unknown error'}`,
    'HIGH',
    { upstreamSource: source, upstreamStatus: status, upstreamMessage: message }
  );
}

/**
 * Create VERSION_MISMATCH error
 */
export function createVersionMismatchError(
  type: 'ENGINE_VERSION_MISMATCH' | 'FORMULA_VERSION_MISMATCH',
  expected: string,
  received: string
): OmniScoreError {
  return new OmniScoreError(
    type,
    `Version mismatch: expected ${expected}, received ${received}`,
    'CRITICAL',
    { expectedVersion: expected, receivedVersion: received }
  );
}

/**
 * Create INVARIANT_VIOLATION error
 */
export function createInvariantViolationError(
  code: string,
  message: string,
  value?: number,
  bound?: string
): OmniScoreError {
  return new OmniScoreError(
    'INVARIANT_VIOLATION',
    `Invariant ${code} violated: ${message}`,
    'CRITICAL',
    { invariantCode: code, invariantValue: value, invariantBound: bound }
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR TYPE GUARDS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Type guard to check if an error is an OmniScoreError
 */
export function isOmniScoreError(error: unknown): error is OmniScoreError {
  return error instanceof OmniScoreError;
}

/**
 * Wrap unknown error in OmniScoreError
 */
export function wrapError(error: unknown): OmniScoreError {
  if (isOmniScoreError(error)) {
    return error;
  }
  
  if (error instanceof Error) {
    return new OmniScoreError(
      'INTERNAL_ERROR',
      error.message,
      'HIGH',
      { originalError: error }
    );
  }
  
  return new OmniScoreError(
    'UNKNOWN_ERROR',
    String(error),
    'HIGH',
    { originalError: String(error) }
  );
}
