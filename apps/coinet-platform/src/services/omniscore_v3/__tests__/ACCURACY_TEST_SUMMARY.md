# 🎯 OmniScore v3.0 Accuracy Test Suite

## Overview

Comprehensive test suite to prove the accuracy, correctness, and robustness of OmniScore v3.0 with CIS integration.

**Test File:** `accuracy.test.ts` (1,041 lines)

## Test Categories

### 1. Mathematical Correctness ✅
- **Formula Verification**: Tests POS formula `0.60×QS + 0.25×OS + 0.15×(100-Risk)`
- **OS-Gated Formula**: Tests fallback weights `0.80×QS + 0.20×(100-Risk)` when OS is gated
- **Score Bounds**: Verifies all scores are within [0, 100]
- **Tier Assignment**: Validates tier thresholds match score ranges
- **Monotonicity**: Tests that increasing QS increases POS, increasing Risk decreases POS

### 2. CIS Integration ✅
- **Semantic Filtering**: Tests that invalid metrics (e.g., TVL for Payment tokens) are excluded
- **Coverage Gating**: Tests that low coverage triggers gating
- **High-Quality Data**: Tests that complete data passes validation

### 3. Real-World Scenarios ✅
- **BTC**: Tests Elite tier scoring with high QS, moderate OS, low risk
- **ETH**: Tests Strong/Elite tier with very high QS (ecosystem depth)
- **SOL**: Tests Strong tier with good fundamentals

### 4. Truth Dump & Auditability ✅
- **Required Fields**: Verifies truth dump contains all required fields
- **JSON Serialization**: Tests truth dump can be serialized to JSON
- **Traceability**: Verifies every score component traces to data points

### 5. Score Stability & Consistency ✅
- **Determinism**: Identical inputs produce identical outputs
- **Smooth Changes**: Small data changes produce small score changes

### 6. Edge Cases & Failure Modes ✅
- **Low Confidence Gating**: Tests gating when confidence < 70%
- **Missing OS Data**: Tests graceful handling of missing OS features
- **Extreme Values**: Tests handling of extreme values (0, 100) without breaking

## Running the Tests

### Option 1: Run from app directory (Recommended)

```bash
# Navigate to the app directory
cd apps/coinet-platform

# Run all accuracy tests
npm test accuracy.test.ts

# Run specific test category
npx vitest run accuracy.test.ts -t "Mathematical Correctness"
npx vitest run accuracy.test.ts -t "CIS Integration"
npx vitest run accuracy.test.ts -t "Real-World Scenarios"

# Run with watch mode
npx vitest accuracy.test.ts

# Run with coverage
npx vitest run accuracy.test.ts --coverage
```

### Option 2: Run from root directory

```bash
# Run all tests in the platform app
cd apps/coinet-platform && npm test

# Run specific test file
cd apps/coinet-platform && npx vitest run src/services/omniscore_v3/__tests__/accuracy.test.ts
```

### Option 3: Using turbo (from root)

```bash
# Run all tests
npm test

# Run tests for specific app (if turbo.json configured)
turbo test --filter=coinet-platform
```

## Expected Results

All tests should pass, proving:

1. ✅ **Mathematical Correctness**: Formula is correct, weights sum to 1.0, scores are bounded
2. ✅ **CIS Integration**: Invalid metrics filtered, coverage gates work, validation passes
3. ✅ **Real-World Accuracy**: BTC/ETH/SOL score appropriately for their market positions
4. ✅ **Auditability**: Every score is traceable to source data
5. ✅ **Stability**: Deterministic outputs, smooth score transitions
6. ✅ **Robustness**: Handles edge cases and failure modes gracefully

## Key Validations

### Formula Accuracy
```typescript
POS = 0.60 × QS + 0.25 × OS + 0.15 × (100 - Risk)
```

### Tier Thresholds
- **Elite**: ≥ 85
- **Strong**: ≥ 70
- **Neutral**: ≥ 50
- **Weak**: ≥ 30
- **Critical**: < 30

### CIS Gates
- **Confidence**: < 70% → GATED
- **QS Coverage**: < 60% → GATED
- **OS Coverage**: < 40% → OS GATED (fallback weights)

## Notes

- Tests use `calculateSnapshot` directly with test bundles for unit testing
- All data points are mocked to avoid external API dependencies
- Tests validate both successful and failure paths
- CIS integration tests verify semantic filtering and validation

## Next Steps

1. Run the test suite to verify all tests pass
2. Fix any failing tests (likely due to data point structure mismatches)
3. Add integration tests with real API data (optional)
4. Generate accuracy report from test results
