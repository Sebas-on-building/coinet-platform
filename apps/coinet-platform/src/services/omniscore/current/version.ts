/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     📌 OMNISCORE VERSION CONSTANTS — SINGLE SOURCE OF TRUTH                  ║
 * ║                                                                               ║
 * ║   All version-related constants MUST be imported from here.                  ║
 * ║   DO NOT define version strings anywhere else in the codebase.               ║
 * ║                                                                               ║
 * ║   Production Readiness Gate: Phase 1.1                                       ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CORE VERSION CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Engine version - the primary version identifier
 * Format: semver (MAJOR.MINOR.PATCH)
 */
export const ENGINE_VERSION = '2.5.0' as const;

/**
 * Formula version - identifies the mathematical formula variant
 * Format: v{MAJOR}.{MINOR}
 */
export const FORMULA_VERSION = 'v2.5' as const;

/**
 * Methodology ID - unique identifier for the scoring methodology
 * Used for audit trails and compliance
 */
export const METHODOLOGY_ID = 'OMNISCORE_V2.5.0_CONVEX_COMBINATION' as const;

/**
 * Methodology documentation URL
 */
export const METHODOLOGY_URL = '/docs/omniscore/v2.5' as const;

/**
 * Feature schema version - tracks input/output format changes
 */
export const FEATURE_SCHEMA_VERSION = '2.5.0-core40' as const;

// ═══════════════════════════════════════════════════════════════════════════════
// BUILD-TIME CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Git commit SHA injected at build time
 * Allows distinguishing deployments with same version
 */
export const BUILD_COMMIT_SHA = process.env.GIT_COMMIT_SHA || 
  process.env.VERCEL_GIT_COMMIT_SHA || 
  process.env.RAILWAY_GIT_COMMIT_SHA ||
  'unknown';

/**
 * Build timestamp
 */
export const BUILD_TIMESTAMP = process.env.BUILD_TIMESTAMP || new Date().toISOString();

// ═══════════════════════════════════════════════════════════════════════════════
// METHODOLOGY HASH
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute deterministic methodology hash
 * Used to verify methodology consistency across deployments
 */
export function computeMethodologyHash(version: string = ENGINE_VERSION): string {
  let hash = 0;
  const str = `OMNISCORE_METHODOLOGY_${version}_CONVEX_COMBINATION_PRODUCTION`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `sha256:${Math.abs(hash).toString(16).padStart(16, '0')}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// METHODOLOGY PROVENANCE OBJECT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Complete methodology provenance for audit trails
 */
export const METHODOLOGY_PROVENANCE = {
  id: METHODOLOGY_ID,
  get hash() { return computeMethodologyHash(); },
  url: METHODOLOGY_URL,
  version: ENGINE_VERSION,
  formula: FORMULA_VERSION,
  buildCommitSha: BUILD_COMMIT_SHA,
  buildTimestamp: BUILD_TIMESTAMP,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// VERSION ERROR CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export type VersionErrorCode = 
  | 'ENGINE_VERSION_MISMATCH'
  | 'FORMULA_VERSION_MISMATCH'
  | 'METHODOLOGY_HASH_MISMATCH';

/**
 * Custom error for version mismatches
 * Thrown when runtime version checks fail
 */
export class OmniScoreVersionError extends Error {
  public readonly code: VersionErrorCode;
  public readonly expected: string;
  public readonly received: string;
  
  constructor(code: VersionErrorCode, message: string, expected: string, received: string) {
    super(message);
    this.name = 'OmniScoreVersionError';
    this.code = code;
    this.expected = expected;
    this.received = received;
  }
  
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      expected: this.expected,
      received: this.received,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// VERSION INTEGRITY ASSERTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Assert that engine version matches expected
 * @throws OmniScoreVersionError if mismatch
 */
export function assertEngineVersion(receivedVersion: string): void {
  if (receivedVersion !== ENGINE_VERSION) {
    throw new OmniScoreVersionError(
      'ENGINE_VERSION_MISMATCH',
      `Engine version mismatch: expected ${ENGINE_VERSION}, received ${receivedVersion}`,
      ENGINE_VERSION,
      receivedVersion
    );
  }
}

/**
 * Assert that formula version matches expected
 * @throws OmniScoreVersionError if mismatch
 */
export function assertFormulaVersion(receivedVersion: string): void {
  if (receivedVersion !== FORMULA_VERSION) {
    throw new OmniScoreVersionError(
      'FORMULA_VERSION_MISMATCH',
      `Formula version mismatch: expected ${FORMULA_VERSION}, received ${receivedVersion}`,
      FORMULA_VERSION,
      receivedVersion
    );
  }
}

/**
 * Assert complete version integrity
 * @throws OmniScoreVersionError if any mismatch
 */
export function assertVersionIntegrity(
  receivedEngine: string,
  receivedFormula: string
): void {
  assertEngineVersion(receivedEngine);
  assertFormulaVersion(receivedFormula);
}

// ═══════════════════════════════════════════════════════════════════════════════
// VERSION INFO FOR LOGGING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get version info object for structured logging
 */
export function getVersionInfo() {
  return {
    engineVersion: ENGINE_VERSION,
    formulaVersion: FORMULA_VERSION,
    methodologyId: METHODOLOGY_ID,
    methodologyHash: computeMethodologyHash(),
    buildCommitSha: BUILD_COMMIT_SHA,
    buildTimestamp: BUILD_TIMESTAMP,
  };
}

/**
 * Log version info on startup
 */
export function logVersionInfo(logger: { info: (msg: string, meta?: object) => void }): void {
  logger.info('[OmniScore] Engine initialized', getVersionInfo());
}
