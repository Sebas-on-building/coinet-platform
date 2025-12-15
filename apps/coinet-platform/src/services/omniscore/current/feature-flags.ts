/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🚩 OMNISCORE FEATURE FLAGS                                               ║
 * ║                                                                               ║
 * ║   Controls for safe rollout of production features.                          ║
 * ║   All flags default to OFF (safe/legacy behavior).                           ║
 * ║                                                                               ║
 * ║   Production Readiness Gate: Phase 9                                         ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE FLAG DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export interface FeatureFlags {
  /**
   * FAIL_CLOSED: If true, insufficient data causes HARD FAIL (no score).
   * If false (default), degraded scores may be returned with warnings.
   * 
   * Recommended: true for production
   * Default: false (for safe rollout)
   */
  failClosed: boolean;
  
  /**
   * SMOOTHING_PERSIST: If true, POS state is persisted to database.
   * If false (default), smoothing only works within a single process lifetime.
   * 
   * Recommended: true once DB migration is complete
   * Default: false (for safe rollout)
   */
  smoothingPersist: boolean;
  
  /**
   * STRICT_VALIDATION: If true, all input validation is enforced.
   * If false (default), some validation is relaxed for backwards compatibility.
   * 
   * Recommended: true for production
   * Default: false (for safe rollout)
   */
  strictValidation: boolean;
  
  /**
   * METRICS_ENABLED: If true, Prometheus metrics are collected.
   * If false (default), no metrics overhead.
   * 
   * Recommended: true for production
   * Default: false
   */
  metricsEnabled: boolean;
  
  /**
   * VERBOSE_AUDIT: If true, full audit trail is included in responses.
   * If false, minimal audit for performance.
   * 
   * Recommended: true for production/debugging
   * Default: true
   */
  verboseAudit: boolean;
  
  /**
   * VERSION_CHECK_STRICT: If true, version mismatches throw errors.
   * If false, version mismatches log warnings only.
   * 
   * Recommended: true for production
   * Default: true
   */
  versionCheckStrict: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT VALUES
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_FLAGS: FeatureFlags = {
  failClosed: false,           // Safe default - don't break existing behavior
  smoothingPersist: false,     // Requires DB migration
  strictValidation: false,     // Backwards compatibility
  metricsEnabled: false,       // No overhead by default
  verboseAudit: true,          // Helpful for debugging
  versionCheckStrict: true,    // Prevent version drift
};

// ═══════════════════════════════════════════════════════════════════════════════
// ENVIRONMENT VARIABLE MAPPING
// ═══════════════════════════════════════════════════════════════════════════════

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Get current feature flags from environment
 */
export function getFeatureFlags(): FeatureFlags {
  return {
    failClosed: parseBoolean(
      process.env.OMNISCORE_FAIL_CLOSED, 
      DEFAULT_FLAGS.failClosed
    ),
    smoothingPersist: parseBoolean(
      process.env.OMNISCORE_SMOOTHING_PERSIST, 
      DEFAULT_FLAGS.smoothingPersist
    ),
    strictValidation: parseBoolean(
      process.env.OMNISCORE_STRICT_VALIDATION, 
      DEFAULT_FLAGS.strictValidation
    ),
    metricsEnabled: parseBoolean(
      process.env.OMNISCORE_METRICS_ENABLED, 
      DEFAULT_FLAGS.metricsEnabled
    ),
    verboseAudit: parseBoolean(
      process.env.OMNISCORE_VERBOSE_AUDIT, 
      DEFAULT_FLAGS.verboseAudit
    ),
    versionCheckStrict: parseBoolean(
      process.env.OMNISCORE_VERSION_CHECK_STRICT, 
      DEFAULT_FLAGS.versionCheckStrict
    ),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONVENIENCE ACCESSORS
// ═══════════════════════════════════════════════════════════════════════════════

// Cached flags (recomputed on first access)
let cachedFlags: FeatureFlags | null = null;

function getFlags(): FeatureFlags {
  if (!cachedFlags) {
    cachedFlags = getFeatureFlags();
  }
  return cachedFlags;
}

/**
 * Reset cached flags (for testing)
 */
export function resetFeatureFlagCache(): void {
  cachedFlags = null;
}

/**
 * Check if fail-closed mode is enabled
 */
export function isFailClosedEnabled(): boolean {
  return getFlags().failClosed;
}

/**
 * Check if smoothing persistence is enabled
 */
export function isSmoothingPersistEnabled(): boolean {
  return getFlags().smoothingPersist;
}

/**
 * Check if strict validation is enabled
 */
export function isStrictValidationEnabled(): boolean {
  return getFlags().strictValidation;
}

/**
 * Check if metrics collection is enabled
 */
export function isMetricsEnabled(): boolean {
  return getFlags().metricsEnabled;
}

/**
 * Check if verbose audit is enabled
 */
export function isVerboseAuditEnabled(): boolean {
  return getFlags().verboseAudit;
}

/**
 * Check if strict version checking is enabled
 */
export function isVersionCheckStrictEnabled(): boolean {
  return getFlags().versionCheckStrict;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FLAG INFO FOR LOGGING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get all flags as object for logging
 */
export function getFeatureFlagsForLogging(): Record<string, boolean> {
  const flags = getFlags();
  return {
    'omniscore.failClosed': flags.failClosed,
    'omniscore.smoothingPersist': flags.smoothingPersist,
    'omniscore.strictValidation': flags.strictValidation,
    'omniscore.metricsEnabled': flags.metricsEnabled,
    'omniscore.verboseAudit': flags.verboseAudit,
    'omniscore.versionCheckStrict': flags.versionCheckStrict,
  };
}

/**
 * Log feature flags on startup
 */
export function logFeatureFlags(logger: { info: (msg: string, meta?: object) => void }): void {
  logger.info('[OmniScore] Feature flags loaded', getFeatureFlagsForLogging());
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROLLOUT HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get percentage of traffic that should use new behavior
 * Useful for gradual rollouts
 */
export function getRolloutPercentage(): number {
  const value = process.env.OMNISCORE_ROLLOUT_PERCENT;
  if (!value) return 100;
  const percent = parseInt(value, 10);
  return isNaN(percent) ? 100 : Math.max(0, Math.min(100, percent));
}

/**
 * Check if this request should use new behavior based on rollout percentage
 * Uses simple hash of projectId for deterministic bucketing
 */
export function shouldUseNewBehavior(projectId: string): boolean {
  const rolloutPercent = getRolloutPercentage();
  if (rolloutPercent >= 100) return true;
  if (rolloutPercent <= 0) return false;
  
  // Simple hash for deterministic bucketing
  let hash = 0;
  for (let i = 0; i < projectId.length; i++) {
    hash = ((hash << 5) - hash) + projectId.charCodeAt(i);
    hash = hash & hash;
  }
  
  const bucket = Math.abs(hash) % 100;
  return bucket < rolloutPercent;
}
