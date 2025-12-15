# OmniScore v2.5.0 — PR-by-PR Implementation Plan

> Execute these PRs in order. Each PR has exact files, changes, and acceptance tests.

---

## PR #1: Version Integrity & Audit Trail

**Branch**: `fix/omniscore-version-integrity`  
**Time Estimate**: 30-60 minutes  
**Blockers**: None

### Files to Modify

#### 1. `apps/coinet-platform/src/services/omniscore/current/version.ts` (CREATE)

```typescript
/**
 * OMNISCORE VERSION CONSTANTS — SINGLE SOURCE OF TRUTH
 * 
 * All version-related constants MUST be imported from here.
 * DO NOT define version strings anywhere else.
 */

export const ENGINE_VERSION = '2.5.0' as const;
export const FORMULA_VERSION = 'v2.5' as const;
export const METHODOLOGY_ID = 'OMNISCORE_V2.5.0_CONVEX_COMBINATION' as const;
export const METHODOLOGY_URL = '/docs/omniscore/v2.5' as const;

// Build-time commit hash (injected by build process or fallback)
export const BUILD_COMMIT_SHA = process.env.GIT_COMMIT_SHA || 'unknown';

// Compute deterministic methodology hash
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

// Methodology provenance object
export const METHODOLOGY_PROVENANCE = {
  id: METHODOLOGY_ID,
  get hash() { return computeMethodologyHash(); },
  url: METHODOLOGY_URL,
  version: ENGINE_VERSION,
  formula: FORMULA_VERSION,
} as const;

// Runtime version check — throws if mismatch detected
export function assertVersionIntegrity(
  receivedEngine: string,
  receivedFormula: string
): void {
  if (receivedEngine !== ENGINE_VERSION) {
    throw new OmniScoreVersionError(
      'ENGINE_VERSION_MISMATCH',
      `Expected engine ${ENGINE_VERSION}, received ${receivedEngine}`
    );
  }
  if (receivedFormula !== FORMULA_VERSION) {
    throw new OmniScoreVersionError(
      'FORMULA_VERSION_MISMATCH',
      `Expected formula ${FORMULA_VERSION}, received ${receivedFormula}`
    );
  }
}

// Custom error for version mismatches
export class OmniScoreVersionError extends Error {
  public readonly code: string;
  
  constructor(code: string, message: string) {
    super(message);
    this.name = 'OmniScoreVersionError';
    this.code = code;
  }
}
```

#### 2. `apps/coinet-platform/src/services/omniscore-v2.5.ts`

**Replace these sections:**

```typescript
// BEFORE (around line 608-621):
export const OMNISCORE_ENGINE_VERSION = '2.5.0' as const;

const CONFIG = {
  VERSION: '2.5.0' as const,
  METHODOLOGY_VERSION: '2.5.0' as const,
  ENGINE_NAME: 'OmniScore' as const,
  FEATURE_SCHEMA_VERSION: '2.5.0-core40' as const,
  
  // Methodology provenance
  METHODOLOGY: {
    ID: 'OMNISCORE_V2.3.2_DIABOLICAL',  // ← WRONG!
    URL: '/docs/omniscore/v2.3',          // ← WRONG!
    get HASH() { return computeMethodologyHash('2.3.2'); },  // ← WRONG!
  },
  // ...
}

// AFTER:
import { 
  ENGINE_VERSION,
  FORMULA_VERSION,
  METHODOLOGY_PROVENANCE,
  BUILD_COMMIT_SHA,
  computeMethodologyHash,
  assertVersionIntegrity,
  OmniScoreVersionError
} from './omniscore/current/version';

export const OMNISCORE_ENGINE_VERSION = ENGINE_VERSION;

const CONFIG = {
  VERSION: ENGINE_VERSION,
  METHODOLOGY_VERSION: ENGINE_VERSION,
  ENGINE_NAME: 'OmniScore' as const,
  FEATURE_SCHEMA_VERSION: `${ENGINE_VERSION}-core40` as const,
  
  METHODOLOGY: METHODOLOGY_PROVENANCE,
  // ...
}
```

**Update audit object (around line 2525-2545):**

```typescript
// Add to audit object:
buildCommitSha: BUILD_COMMIT_SHA,
```

#### 3. Update all v2.3 references in `omniscore-v2.5.ts`

**Search and replace comment blocks only (not functionality):**

- `// v2.3.2:` → `// v2.5.0:` (where appropriate)
- Remove stale version comments that are confusing

### Commit Message

```
fix(omniscore): centralize version constants and fix methodology hash

- Create single source of truth for version constants
- Fix METHODOLOGY_ID from 'V2.3.2_DIABOLICAL' to 'V2.5.0_CONVEX_COMBINATION'
- Fix METHODOLOGY_URL from '/docs/omniscore/v2.3' to '/docs/omniscore/v2.5'
- Add BUILD_COMMIT_SHA to audit trail
- Add assertVersionIntegrity() for fail-fast version checks
```

### Acceptance Tests

```bash
# 1. Grep should return zero matches for old version in active code
grep -r "V2\.3\.2" apps/coinet-platform/src/services/omniscore-v2.5.ts | grep -v "legacy\|comment"
# Expected: 0 lines

# 2. Grep should return zero matches for old URL
grep -r "/docs/omniscore/v2.3" apps/coinet-platform/src/services/omniscore-v2.5.ts
# Expected: 0 lines

# 3. Build should pass
cd apps/coinet-platform && pnpm build
```

---

## PR #2: Remove Duplicate Files + CI Guards

**Branch**: `chore/remove-duplicate-files`  
**Time Estimate**: 30-90 minutes  
**Blockers**: PR #1

### Files to Delete

Run this script to generate the deletion list:

```bash
#!/bin/bash
# scripts/list-duplicate-files.sh

echo "=== Files with ' 2.ts' pattern ==="
find apps/coinet-platform/src/services -name "* 2.ts" -type f

echo ""
echo "=== Files with ' 3.ts' pattern ==="
find apps/coinet-platform/src/services -name "* 3.ts" -type f

echo ""
echo "=== Files with ' 2.md' pattern ==="
find apps/coinet-platform/src/services -name "* 2.md" -type f
```

**Delete all matched files (~76 files)**

### Files to Create

#### 1. `scripts/check-duplicate-files.sh` (CREATE)

```bash
#!/bin/bash
# CI guardrail: Fail if duplicate files exist

set -e

echo "🔍 Checking for duplicate files..."

# Pattern: files ending with " N.ts" where N is a number
DUPLICATES=$(find . -type f \( -name "* [0-9].ts" -o -name "* [0-9][0-9].ts" \) 2>/dev/null | grep -v node_modules | grep -v .git || true)

if [ -n "$DUPLICATES" ]; then
  echo "❌ ERROR: Duplicate files detected!"
  echo "$DUPLICATES"
  echo ""
  echo "These files follow the pattern '* N.ts' which indicates accidental duplication."
  echo "Please remove duplicates and keep only the canonical version."
  exit 1
fi

echo "✅ No duplicate files found"
exit 0
```

#### 2. `.github/workflows/ci.yml` (MODIFY)

Add this job:

```yaml
  check-duplicates:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Check for duplicate files
        run: bash scripts/check-duplicate-files.sh
```

#### 3. `apps/coinet-platform/src/services/omniscore/index.ts` (MODIFY)

Ensure this is the ONLY entrypoint:

```typescript
/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🎯 OMNISCORE v2.5.0 CANONICAL ENTRYPOINT                                 ║
 * ║                                                                               ║
 * ║   This is the SINGLE SOURCE OF TRUTH for OmniScore engine.                  ║
 * ║   All consumers MUST import from here, never from versioned files directly. ║
 * ║                                                                               ║
 * ║   ⚠️ BANNED IMPORTS:                                                         ║
 * ║   - ../omniscore-v2.5.ts (use this index instead)                            ║
 * ║   - ../omniscore-v2.3.ts (deprecated)                                        ║
 * ║   - ../omniscore-v2.2.ts (legacy)                                            ║
 * ║   - ../omniscore/legacy/** (legacy versions)                                 ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

// Version constants (ALWAYS export these first)
export {
  ENGINE_VERSION,
  FORMULA_VERSION,
  METHODOLOGY_ID,
  METHODOLOGY_URL,
  BUILD_COMMIT_SHA,
  METHODOLOGY_PROVENANCE,
  computeMethodologyHash,
  assertVersionIntegrity,
  OmniScoreVersionError,
} from './current/version';

// Core engine exports (v2.5.0 Convex Combination)
export * from '../omniscore-v2.5';

// ... rest of exports
```

### Commit Message

```
chore(omniscore): remove 76 duplicate files and add CI guardrails

- Delete all '* 2.ts' and '* 3.ts' duplicate files
- Add scripts/check-duplicate-files.sh
- Add duplicate check to CI workflow
- Enforce single entrypoint via omniscore/index.ts
```

### Acceptance Tests

```bash
# 1. No duplicate files exist
find apps/coinet-platform/src/services -name "* 2.ts" | wc -l
# Expected: 0

# 2. CI script passes
bash scripts/check-duplicate-files.sh
# Expected: exit 0

# 3. Build passes
cd apps/coinet-platform && pnpm build

# 4. Tests pass
cd apps/coinet-platform && pnpm test
```

---

## PR #3: Runtime Input Validation with Zod

**Branch**: `feat/omniscore-input-validation`  
**Time Estimate**: 30-60 minutes  
**Blockers**: PR #2

### Files to Create

#### 1. `apps/coinet-platform/src/services/omniscore/current/validation.ts`

```typescript
import { z } from 'zod';
import { ENGINE_VERSION, FORMULA_VERSION } from './version';

// ═══════════════════════════════════════════════════════════════════════════════
// OMNISCORE INPUT VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export const SegmentSchema = z.enum([
  'TEAM', 'TECH', 'SEC', 'TOKEN', 'ADOPT', 'MARKET',
  'COMM', 'GOV', 'ECO', 'VAL', 'LEGAL', 'MACRO'
]);

export const FeatureInputSchema = z.object({
  key: z.string().min(1),
  segment: SegmentSchema,
  raw: z.number().finite().nullable(),
  timestamp: z.string().datetime(),
  sources: z.array(z.string()).optional(),
});

export const RegimeTypeSchema = z.enum(['bull', 'bear', 'neutral', 'crisis', 'recovery']);

export const SectorTypeSchema = z.enum([
  'DeFi', 'L1', 'L2', 'Infrastructure', 'Meme', 'AI', 'Gaming', 'Unknown'
]);

export const CapBucketSchema = z.enum(['mega', 'large', 'mid', 'small', 'micro']);

export const CryptoRegimeSignalsSchema = z.object({
  btcVolatility30d: z.number().finite(),
  btcTrend30d: z.number().finite(),
  btcTrend90d: z.number().finite(),
  fundingRateAvg: z.number().finite(),
  liquidationIntensity: z.number().finite(),
  stablecoinFlowWeekly: z.number().finite(),
  fearGreedIndex: z.number().finite(),
}).partial();

export const MarketDataSchema = z.object({
  btcTrend30d: z.number().finite(),
  btcTrend90d: z.number().finite(),
  volatilityIndex: z.number().finite(),
  fearGreedIndex: z.number().finite(),
});

// Minimum viable data thresholds
export const MIN_QS_INPUTS = 3;
export const MIN_OS_INPUTS = 2;

export const CalculateOmniScoreParamsSchema = z.object({
  projectId: z.string().min(1, 'projectId is required'),
  qsInputs: z.array(FeatureInputSchema).min(
    MIN_QS_INPUTS,
    `At least ${MIN_QS_INPUTS} QS inputs required`
  ),
  osInputs: z.array(FeatureInputSchema).min(
    MIN_OS_INPUTS,
    `At least ${MIN_OS_INPUTS} OS inputs required`
  ),
  sector: SectorTypeSchema.default('Unknown'),
  capBucket: CapBucketSchema.default('small'),
  eventRiskSeverity: z.number().min(0).max(1).default(0),
  botRisk: z.number().min(0).max(1).default(0),
  anomalyScore: z.number().min(0).max(1).default(0),
  influencerConcentration: z.number().min(0).max(1).default(0),
  sentimentDispersion: z.number().min(0).max(1).default(0),
  multiSourceConsistency: z.number().min(0).max(1).default(0.8),
  priceChange30d: z.number().finite().default(0),
  projectAgeDays: z.number().min(0).optional(),
  marketData: MarketDataSchema.optional(),
  cryptoRegimeSignals: CryptoRegimeSignalsSchema.optional(),
  previousPos: z.number().min(0).max(100).nullable().optional(),
  previousPosTimestamp: z.string().datetime().nullable().optional(),
}).refine(
  (data) => data.marketData || data.cryptoRegimeSignals,
  { message: 'Either marketData or cryptoRegimeSignals is required' }
);

export type ValidatedOmniScoreParams = z.infer<typeof CalculateOmniScoreParamsSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION ERROR CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class OmniScoreValidationError extends Error {
  public readonly code = 'VALIDATION_ERROR' as const;
  public readonly severity = 'CRITICAL' as const;
  public readonly details: z.ZodError;

  constructor(zodError: z.ZodError) {
    const issues = zodError.issues.map(i => `${i.path.join('.')}: ${i.message}`);
    super(`OmniScore validation failed: ${issues.join('; ')}`);
    this.name = 'OmniScoreValidationError';
    this.details = zodError;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

export function validateOmniScoreParams(
  params: unknown
): ValidatedOmniScoreParams {
  const result = CalculateOmniScoreParamsSchema.safeParse(params);
  
  if (!result.success) {
    throw new OmniScoreValidationError(result.error);
  }
  
  return result.data;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESULT VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

export function validateOmniScoreResult(result: unknown): void {
  const schema = z.object({
    qs: z.object({
      score: z.number().min(0).max(100).finite(),
      tier: z.string(),
    }),
    os: z.object({
      status: z.enum(['ok', 'gated']),
      score: z.number().min(0).max(100).finite(),
    }),
    pos: z.object({
      raw: z.number().min(0).max(100).finite(),
      adjusted: z.number().min(0).max(100).finite(),
    }),
    audit: z.object({
      engineVersion: z.literal(ENGINE_VERSION),
      formulaVersion: z.literal(FORMULA_VERSION),
    }),
  });
  
  const parsed = schema.safeParse(result);
  if (!parsed.success) {
    throw new OmniScoreValidationError(parsed.error);
  }
}
```

### Files to Modify

#### 2. `apps/coinet-platform/src/services/omniscore-v2.5.ts`

Add validation at the start of `calculateOmniScoreProduction`:

```typescript
import { 
  validateOmniScoreParams, 
  OmniScoreValidationError 
} from './omniscore/current/validation';

export async function calculateOmniScoreProduction(
  params: CalculateOmniScoreParams
): Promise<OmniScoreProductionResponse> {
  const requestId = params.requestId || uuidv4();
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 0: INPUT VALIDATION (Fail-fast)
  // ═══════════════════════════════════════════════════════════════════════════
  const validatedParams = validateOmniScoreParams(params);
  
  // Continue with validated params...
}
```

### Commit Message

```
feat(omniscore): add Zod runtime input validation

- Add CalculateOmniScoreParamsSchema with all field validations
- Enforce minimum QS/OS input counts
- Require marketData OR cryptoRegimeSignals
- Add OmniScoreValidationError with detailed error messages
- Validate at function entry (fail-fast)
```

### Acceptance Tests

```typescript
// tests/omniscore-validation.test.ts
import { describe, test, expect } from 'vitest';
import { validateOmniScoreParams, OmniScoreValidationError } from './validation';

describe('OmniScore Input Validation', () => {
  test('rejects empty projectId', () => {
    expect(() => validateOmniScoreParams({ projectId: '' }))
      .toThrow(OmniScoreValidationError);
  });

  test('rejects insufficient QS inputs', () => {
    expect(() => validateOmniScoreParams({
      projectId: 'test',
      qsInputs: [{ key: 'x', segment: 'TEAM', raw: 1, timestamp: '2024-01-01T00:00:00Z' }],
      osInputs: [],
    })).toThrow('At least 3 QS inputs required');
  });

  test('rejects missing market data', () => {
    expect(() => validateOmniScoreParams({
      projectId: 'test',
      qsInputs: [...threeValidInputs],
      osInputs: [...twoValidInputs],
      // Missing both marketData and cryptoRegimeSignals
    })).toThrow('Either marketData or cryptoRegimeSignals is required');
  });

  test('rejects NaN values', () => {
    expect(() => validateOmniScoreParams({
      projectId: 'test',
      qsInputs: [{ key: 'x', segment: 'TEAM', raw: NaN, timestamp: '...' }],
    })).toThrow();
  });
});
```

---

## PR #4: Kill Silent Error Degradation

**Branch**: `feat/omniscore-fail-closed`  
**Time Estimate**: 60-120 minutes  
**Blockers**: PR #3

### Files to Create

#### 1. `apps/coinet-platform/src/services/omniscore/current/errors.ts`

```typescript
/**
 * OMNISCORE ERROR TYPES
 * 
 * All OmniScore errors MUST be one of these types.
 * This ensures consistent error handling and observability.
 */

export type OmniScoreErrorCode =
  | 'VALIDATION_ERROR'
  | 'INSUFFICIENT_DATA'
  | 'UPSTREAM_TIMEOUT'
  | 'UPSTREAM_FAILURE'
  | 'ENGINE_VERSION_MISMATCH'
  | 'FORMULA_VERSION_MISMATCH'
  | 'INVARIANT_VIOLATION'
  | 'PERSISTENCE_FAILURE'
  | 'INTERNAL_ERROR';

export type OmniScoreErrorSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface OmniScoreErrorDetails {
  upstreamSource?: string;
  inputsCounts?: { qs: number; os: number };
  coveragePercent?: number;
  invariantCode?: string;
  originalError?: Error;
}

export class OmniScoreError extends Error {
  public readonly code: OmniScoreErrorCode;
  public readonly severity: OmniScoreErrorSeverity;
  public readonly details: OmniScoreErrorDetails;
  public readonly timestamp: string;
  
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
  }
  
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      severity: this.severity,
      details: this.details,
      timestamp: this.timestamp,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATA QUALITY GATES
// ═══════════════════════════════════════════════════════════════════════════════

export interface DataQualityResult {
  passed: boolean;
  qsValid: number;
  osValid: number;
  qsCoverage: number;
  osCoverage: number;
  degraded: boolean;
  missingFields: string[];
  warnings: string[];
}

export const DATA_QUALITY_THRESHOLDS = {
  MIN_QS_VALID: 3,
  MIN_OS_VALID: 2,
  MIN_COVERAGE_QS: 0.3,  // 30%
  MIN_COVERAGE_OS: 0.2,  // 20%
} as const;

export function checkDataQuality(
  qsInputs: Array<{ raw: number | null }>,
  osInputs: Array<{ raw: number | null }>
): DataQualityResult {
  const qsValid = qsInputs.filter(i => i.raw !== null && isFinite(i.raw)).length;
  const osValid = osInputs.filter(i => i.raw !== null && isFinite(i.raw)).length;
  
  const qsCoverage = qsInputs.length > 0 ? qsValid / qsInputs.length : 0;
  const osCoverage = osInputs.length > 0 ? osValid / osInputs.length : 0;
  
  const missingFields: string[] = [];
  const warnings: string[] = [];
  
  if (qsValid < DATA_QUALITY_THRESHOLDS.MIN_QS_VALID) {
    missingFields.push('qsInputs');
  }
  if (osValid < DATA_QUALITY_THRESHOLDS.MIN_OS_VALID) {
    missingFields.push('osInputs');
  }
  
  const degraded = qsCoverage < 0.5 || osCoverage < 0.5;
  if (degraded) {
    warnings.push(`Low coverage: QS=${(qsCoverage*100).toFixed(0)}%, OS=${(osCoverage*100).toFixed(0)}%`);
  }
  
  const passed = (
    qsValid >= DATA_QUALITY_THRESHOLDS.MIN_QS_VALID &&
    osValid >= DATA_QUALITY_THRESHOLDS.MIN_OS_VALID &&
    qsCoverage >= DATA_QUALITY_THRESHOLDS.MIN_COVERAGE_QS &&
    osCoverage >= DATA_QUALITY_THRESHOLDS.MIN_COVERAGE_OS
  );
  
  return {
    passed,
    qsValid,
    osValid,
    qsCoverage,
    osCoverage,
    degraded,
    missingFields,
    warnings,
  };
}

export function assertDataQualityOrThrow(
  qsInputs: Array<{ raw: number | null }>,
  osInputs: Array<{ raw: number | null }>
): DataQualityResult {
  const result = checkDataQuality(qsInputs, osInputs);
  
  if (!result.passed) {
    throw new OmniScoreError(
      'INSUFFICIENT_DATA',
      `Data quality gate failed: QS=${result.qsValid}/${DATA_QUALITY_THRESHOLDS.MIN_QS_VALID}, OS=${result.osValid}/${DATA_QUALITY_THRESHOLDS.MIN_OS_VALID}`,
      'CRITICAL',
      {
        inputsCounts: { qs: result.qsValid, os: result.osValid },
        coveragePercent: Math.min(result.qsCoverage, result.osCoverage) * 100,
      }
    );
  }
  
  return result;
}
```

### Files to Modify

#### 2. `apps/coinet-platform/src/services/omniscore-v2.5.ts`

Add data quality gate after validation:

```typescript
import { assertDataQualityOrThrow, OmniScoreError } from './omniscore/current/errors';

// In calculateOmniScoreProduction, after validation:
const dataQuality = assertDataQualityOrThrow(
  validatedParams.qsInputs,
  validatedParams.osInputs
);

// Add to audit object:
audit: {
  // ... existing fields
  dataCoverage: {
    qs: dataQuality.qsCoverage,
    os: dataQuality.osCoverage,
  },
  degraded: dataQuality.degraded,
  missingFields: dataQuality.missingFields,
  warnings: dataQuality.warnings,
}
```

### Commit Message

```
feat(omniscore): implement fail-closed data quality gates

- Add OmniScoreError class with typed error codes
- Add checkDataQuality() and assertDataQualityOrThrow()
- Fail with INSUFFICIENT_DATA when quality gates not met
- Add dataCoverage, degraded, missingFields to audit
- No score output on empty/invalid data
```

### Acceptance Tests

```typescript
describe('OmniScore Fail-Closed', () => {
  test('throws INSUFFICIENT_DATA when QS empty', async () => {
    await expect(calculateOmniScoreProduction({
      projectId: 'test',
      qsInputs: [],  // Empty!
      osInputs: validOsInputs,
      marketData: validMarketData,
    })).rejects.toThrow('INSUFFICIENT_DATA');
  });

  test('includes degraded flag when coverage low', async () => {
    const result = await calculateOmniScoreProduction({
      projectId: 'test',
      qsInputs: minimalValidInputs,  // Barely passing
      osInputs: minimalValidInputs,
      marketData: validMarketData,
    });
    expect(result.audit.degraded).toBe(true);
  });
});
```

---

## PR #5: Persistence for Temporal Smoothing

**Branch**: `feat/omniscore-persistence`  
**Time Estimate**: 2-4 hours  
**Blockers**: PR #4

### Files to Modify

#### 1. `prisma/schema.prisma` (ADD)

```prisma
// ═══════════════════════════════════════════════════════════════════════════════
// OMNISCORE STATE PERSISTENCE
// ═══════════════════════════════════════════════════════════════════════════════

model OmniScoreHistory {
  id            String   @id @default(uuid())
  projectId     String
  pos           Float
  engineVersion String
  formulaVersion String
  inputsHash    String?  // SHA256 of inputs for dedup
  regime        String?
  capBucket     String?
  sector        String?
  createdAt     DateTime @default(now())
  
  @@index([projectId, createdAt(sort: Desc)])
  @@index([projectId, engineVersion, createdAt(sort: Desc)])
  @@map("omniscore_history")
}
```

#### 2. `apps/coinet-platform/src/services/omniscore/current/persistence.ts` (CREATE)

```typescript
import { PrismaClient } from '@prisma/client';
import { ENGINE_VERSION, FORMULA_VERSION } from './version';
import { logger } from '../../../utils/logger';

const prisma = new PrismaClient();

export interface StoredPosState {
  pos: number;
  engineVersion: string;
  timestamp: Date;
}

/**
 * Get previous POS for temporal smoothing
 * Returns null if no previous state (cold start)
 */
export async function getPreviousPos(
  projectId: string,
  engineVersion: string = ENGINE_VERSION
): Promise<StoredPosState | null> {
  try {
    const record = await prisma.omniScoreHistory.findFirst({
      where: {
        projectId,
        engineVersion,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    if (!record) {
      logger.debug(`[OmniScore Persistence] Cold start for ${projectId}`);
      return null;
    }
    
    return {
      pos: record.pos,
      engineVersion: record.engineVersion,
      timestamp: record.createdAt,
    };
  } catch (error) {
    logger.error(`[OmniScore Persistence] Failed to get previous POS`, { projectId, error });
    // Return null on error to allow cold start fallback
    return null;
  }
}

/**
 * Store POS after successful calculation
 * Only call this after invariants are validated
 */
export async function storePosForSmoothing(
  projectId: string,
  pos: number,
  metadata: {
    regime?: string;
    capBucket?: string;
    sector?: string;
    inputsHash?: string;
  } = {}
): Promise<void> {
  try {
    await prisma.omniScoreHistory.create({
      data: {
        projectId,
        pos,
        engineVersion: ENGINE_VERSION,
        formulaVersion: FORMULA_VERSION,
        regime: metadata.regime,
        capBucket: metadata.capBucket,
        sector: metadata.sector,
        inputsHash: metadata.inputsHash,
      },
    });
    
    logger.debug(`[OmniScore Persistence] Stored POS ${pos} for ${projectId}`);
  } catch (error) {
    logger.error(`[OmniScore Persistence] Failed to store POS`, { projectId, pos, error });
    // Don't throw - persistence failure shouldn't block response
  }
}

/**
 * Calculate time since last POS in hours
 */
export function getHoursSinceLastPos(lastTimestamp: Date | null): number | null {
  if (!lastTimestamp) return null;
  const now = new Date();
  return (now.getTime() - lastTimestamp.getTime()) / (1000 * 60 * 60);
}
```

#### 3. `apps/coinet-platform/src/services/omniscore-v2.5.ts`

Integrate persistence:

```typescript
import { getPreviousPos, storePosForSmoothing, getHoursSinceLastPos } from './omniscore/current/persistence';

// In calculateOmniScoreProduction:

// Fetch previous POS for smoothing
const previousState = await getPreviousPos(validatedParams.projectId);
const previousPos = previousState?.pos ?? validatedParams.previousPos ?? null;
const timeSinceLastHours = getHoursSinceLastPos(previousState?.timestamp ?? null);

// ... calculation ...

// After invariant validation passes, store the result
await storePosForSmoothing(validatedParams.projectId, finalPosAdjusted, {
  regime: dominantRegime,
  capBucket: validatedParams.capBucket,
  sector: validatedParams.sector,
});
```

### Create Migration

```bash
cd prisma
npx prisma migrate dev --name add_omniscore_history
```

### Commit Message

```
feat(omniscore): add persistence for temporal smoothing

- Add OmniScoreHistory table to Prisma schema
- Implement getPreviousPos() for state retrieval
- Implement storePosForSmoothing() for state storage
- Integrate with calculateOmniScoreProduction
- Smoothing now survives restarts and deployments
```

### Acceptance Tests

```typescript
describe('OmniScore Persistence', () => {
  test('returns null on cold start', async () => {
    const state = await getPreviousPos('new-project-never-seen');
    expect(state).toBeNull();
  });

  test('retrieves previously stored POS', async () => {
    await storePosForSmoothing('test-persist', 75);
    const state = await getPreviousPos('test-persist');
    expect(state?.pos).toBe(75);
  });

  test('respects engine version isolation', async () => {
    // Store with v2.5.0
    await storePosForSmoothing('test-version', 80);
    // Query for v2.4.0 should return null
    const state = await getPreviousPos('test-version', '2.4.0');
    expect(state).toBeNull();
  });

  test('smoothing uses persisted state after restart', async () => {
    // First calculation
    const result1 = await calculateOmniScoreProduction({ projectId: 'test-restart', ... });
    
    // Simulate restart (new instance, no in-memory state)
    // Second calculation should use persisted state
    const result2 = await calculateOmniScoreProduction({ projectId: 'test-restart', ... });
    
    expect(result2.audit.smoothingApplied.previousPos).toBe(result1.pos.adjusted);
  });
});
```

---

## Remaining PRs (Summary)

### PR #6: Invariants & Quality Gates
- Add `validateBundleOrThrow(bundle)`
- Add `validateResultOrThrow(result)`
- Enforce all invariants (INV-1 through INV-12)
- Block output on invariant violation

### PR #7: Observability & Alerts
- Add Prometheus metrics
- Add structured logging with requestId, engineVersion, buildSha
- Configure alert rules

### PR #8: Test Suite
- Version string tests
- Mismatch failure tests
- Silent degradation tests
- Persistence tests
- Duplicate file CI guard tests

### PR #9: Feature Flags & Rollout
- Add `OMNISCORE_FAIL_CLOSED` flag
- Add `OMNISCORE_SMOOTHING_PERSIST` flag
- Add canary deployment config
- Add rollback script

---

## Execution Checklist

```markdown
## Daily Progress

### Day 1
- [ ] PR #1: Version Integrity (merge)
- [ ] PR #2: Delete duplicates (start)

### Day 2
- [ ] PR #2: Delete duplicates (merge)
- [ ] PR #3: Input validation (merge)

### Day 3
- [ ] PR #4: Fail-closed (merge)
- [ ] PR #5: Persistence (start)

### Day 4
- [ ] PR #5: Persistence (merge)
- [ ] PR #6: Invariants (merge)

### Day 5
- [ ] PR #7: Observability (merge)
- [ ] PR #8: Tests (start)

### Day 6
- [ ] PR #8: Tests (merge)
- [ ] PR #9: Rollout (merge)

### Day 7
- [ ] Canary deployment (5%)
- [ ] Monitor 24h

### Day 8
- [ ] Expand to 25%
- [ ] Monitor 24h

### Day 9
- [ ] Full rollout (100%)
- [ ] Update PRODUCTION_READINESS.md status to ✅
```
