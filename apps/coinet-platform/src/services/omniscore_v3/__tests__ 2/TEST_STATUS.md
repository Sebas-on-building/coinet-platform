# 🧪 OmniScore v3.0 Accuracy Test Status

## ✅ Test Suite Created

- **File**: `accuracy.test.ts` (1,041 lines)
- **Status**: Tests are running but need fixes
- **Progress**: 3/20 tests passing, 17 need fixes

## 🔧 Issues Found

### 1. Function References
- **Issue**: Some tests still use `computeOmniScore` which doesn't exist
- **Fix**: Replace with `calculateSnapshot` from pipeline
- **Affected**: ~10 tests

### 2. Data Point Key Mapping
- **Issue**: Test data uses keys like `security_posture` but CIS expects `qs_security_posture_v1`
- **Fix**: Update `createMajorAssetDataPoints` to use correct feature IDs
- **Affected**: All tests using CIS validation

### 3. POS Calculation Returns NaN
- **Issue**: `posRaw` is NaN, likely due to missing feature processing
- **Fix**: Ensure data points are properly mapped to features before calculation
- **Affected**: Formula verification tests

### 4. CIS Feature Mapping
- **Issue**: CIS bridge doesn't recognize test feature keys
- **Fix**: Map test keys to CIS metric IDs or update CIS bridge mapping
- **Affected**: CIS integration tests

## 📊 Current Test Results

```
✅ 3 tests passing
❌ 17 tests failing

Passing:
- All scores are bounded within [0, 100]
- Tier assignment matches thresholds  
- CIS validation gates low coverage

Failing:
- Formula verification (NaN issues)
- Monotonicity tests (function reference)
- CIS integration (feature mapping)
- Real-world scenarios (function reference)
- Truth dump tests (function reference)
- Stability tests (function reference)
- Edge case tests (function reference)
```

## 🛠️ Quick Fixes Needed

### Fix 1: Update Remaining Function References

Replace all instances of:
```typescript
const result = await computeOmniScore(input);
```

With:
```typescript
const bundle = createTestBundle(assetId, dataPoints);
const result = await calculateSnapshot({ bundle, config: {} });
```

### Fix 2: Update Feature Key Mapping

Update `createMajorAssetDataPoints` to use correct feature IDs:
```typescript
// Instead of: security_posture
// Use: qs_security_posture_v1

// Instead of: momentum  
// Use: os_momentum_v1

// Instead of: liquidity_fragility
// Use: risk_liquidity_fragility_v1
```

### Fix 3: Fix CIS Bridge Mapping

Either:
- Update `FEATURE_TO_CIS_MAPPING` in `omniscore-bridge.ts` to include test keys
- Or update tests to use CIS-compatible keys from the start

## 🎯 Next Steps

1. **Priority 1**: Fix function references (quick find/replace)
2. **Priority 2**: Fix feature key mapping (update test fixtures)
3. **Priority 3**: Debug NaN issues (check feature processing pipeline)
4. **Priority 4**: Update CIS mapping (bridge or test data)

## 📝 Running Tests

```bash
# From app directory
cd apps/coinet-platform

# Run all tests
npx vitest run src/services/omniscore_v3/__tests__/accuracy.test.ts

# Run specific test
npx vitest run src/services/omniscore_v3/__tests__/accuracy.test.ts -t "Mathematical Correctness"

# Watch mode
npx vitest src/services/omniscore_v3/__tests__/accuracy.test.ts
```

## ✅ What's Working

- Test structure is correct
- Test categories are comprehensive
- Test data fixtures are created
- Tests compile and run (no syntax errors)
- Some basic validations pass

## 🔄 Estimated Fix Time

- Function references: ~15 minutes
- Feature key mapping: ~30 minutes  
- NaN debugging: ~1 hour
- CIS mapping: ~30 minutes

**Total**: ~2-3 hours to get all tests passing
