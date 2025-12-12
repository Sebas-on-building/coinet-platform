# OmniScore v2.4 Testing Guide

## Quick Verification

### 1. Check Formula is Active

```bash
# Query any asset OmniScore
curl https://api.coinet.ai/api/omniscore/ETH

# Look for in response:
{
  "audit": {
    "engineVersion": "2.4.0",
    "formulaVersion": "v2.4",  // ← Should be "v2.4"
    "fundamentalsFloor": 50,   // ← Should exist
    "fundamentalsFloorApplied": true/false
  }
}
```

---

### 2. Test ETH (The Key Fix)

**Expected Results:**

```typescript
// ETH with strong fundamentals but weak OS
{
  qs: 70-80,              // Strong fundamentals
  os: 25-40,              // Low opportunity (fear regime)
  risk: 25-35,            // Low risk (stable project)
  
  // v2.3 would give: ~40-45 (Weak tier) ❌
  // v2.4 should give: ~55-75 (Neutral-Strong) ✅
  
  posRaw: 55-75,
  tier: "Neutral" or "Strong",  // NOT "Weak"
  
  audit: {
    formulaVersion: "v2.4",
    fundamentalsFloor: 50,      // QS=75 → floor=50
    fundamentalsFloorApplied: false  // Usually not hit if OS not terrible
  }
}
```

**What to look for:**
- ✅ ETH should be **Neutral (50-69)** or **Strong (70-84)**
- ✅ NOT **Weak (30-49)**
- ✅ `fundamentalsFloor` should be 50 (for QS~75)
- ✅ Narrative should say "Builder zone" (high QS, low OS) NOT "Weak tier"

---

### 3. Test BTC (Should Be Even Better)

**Expected Results:**

```typescript
// BTC with strong fundamentals and strong OS
{
  qs: 70-80,
  os: 70-92,              // High opportunity (OS ceiling at 92 for mega-cap)
  risk: 25-35,
  
  // v2.3 would give: ~65-75 (Neutral-Strong)
  // v2.4 should give: ~75-90 (Strong-Elite) ✅
  
  posRaw: 75-90,
  tier: "Strong" or "Elite",
  
  audit: {
    formulaVersion: "v2.4",
    osCeilingApplied: true  // OS capped at 92
  }
}
```

**What to look for:**
- ✅ BTC should be **Strong (70-84)** or **Elite (85-100)**
- ✅ OS should be capped at 92 (mega-cap ceiling)
- ✅ Should be in **Target zone** (high QS, high OS)

---

### 4. Test SOL (Should Be Moderate)

**Expected Results:**

```typescript
// SOL with moderate fundamentals
{
  qs: 60-70,
  os: 30-50,
  risk: 35-50,            // Higher risk than BTC/ETH
  
  // v2.3 would give: ~35-45 (Weak)
  // v2.4 should give: ~45-65 (Weak-Neutral) ✅
  
  posRaw: 45-65,
  tier: "Weak" or "Neutral",  // Okay for SOL given risk
  
  audit: {
    formulaVersion: "v2.4",
    fundamentalsFloor: 45 or 40  // QS~65-70 → floor=45
  }
}
```

**What to look for:**
- ✅ SOL should be **Weak-Neutral** (appropriate given moderate QS + risk)
- ✅ Should be in **Builder** or **Avoid** zone
- ✅ Lower than BTC/ETH (correct relative ordering)

---

## Debug View Testing

### Get Debug View

```bash
# If you have a debug endpoint:
curl https://api.coinet.ai/api/omniscore/ETH/debug

# Or use internal service:
import { generateDebugView, formatDebugView } from './services/omniscore-debug-view';

const response = await calculateOmniScoreProduction(params);
const debug = generateDebugView(response);
console.log(formatDebugView(debug));
```

### Expected Debug Output

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🔍 OMNISCORE DEBUG VIEW — ETH                                                ║
╚═══════════════════════════════════════════════════════════════════════════════╝

Engine: v2.4.0 (Formula v2.4) | 2025-12-12T18:00:00Z
Sector: Builder Zone (Neutral tier)

┌─────────────────────────────────────────────────────────────────────────────┐
│ 📊 SCORE PROGRESSION (Watch for anomalies)                                  │
└─────────────────────────────────────────────────────────────────────────────┘

QS (Quality Score):
  Final: 75.0/100 (✅ HIGH)
  ✅ No clamping needed

OS (Opportunity Score):
  Raw:           30.0/100
  After Ceiling: 30.0/100
  Final:         30.0/100
  ✅ No ceiling hit

Risk:
  LEGAL: 15.0
  MACRO: 15.0
  ERS:   0.05
  Combined: 30.0/100

POS (Project OmniScore):
  Formula: 🆕 v2.4 Baseline+Tilt
  Step 1 - Raw calculation:      76.0/100
  Step 2 - Plausibility cap:     76.0/100
  Step 3 - Temporal smoothing:   75.5/100 (Δ=-0.5)
  Step 4 - ERS adjustment:       75.0/100 (-0.5)
  ═══════════════════════════════════════════════════════════════════════════
  FINAL POS: 75.0/100 (Strong)
```

**Key things to verify:**
1. ✅ "Formula: 🆕 v2.4 Baseline+Tilt" appears
2. ✅ POS is reasonable (55-75 for ETH)
3. ✅ Floor is shown if applied
4. ✅ Tier is NOT "Weak" for ETH

---

## Comparison Test

### Before (v2.3) vs After (v2.4)

To test both formulas, temporarily toggle:

```typescript
// Test v2.3
const CONFIG = {
  FORMULA_V24_ENABLED: false,
  // ...
};

// Run scoring for ETH
const v23Result = await calculateOmniScoreProduction(ethParams);
console.log('v2.3 POS:', v23Result.pos.adjusted); // Should be ~40-45

// Test v2.4
const CONFIG = {
  FORMULA_V24_ENABLED: true,
  // ...
};

const v24Result = await calculateOmniScoreProduction(ethParams);
console.log('v2.4 POS:', v24Result.pos.adjusted); // Should be ~55-75
```

**Expected difference:**
```
Asset  | v2.3 POS | v2.3 Tier | v2.4 POS | v2.4 Tier | Δ POS
-------|----------|-----------|----------|-----------|-------
ETH    | 43       | Weak      | 76       | Strong    | +33
BTC    | 72       | Strong    | 87       | Elite     | +15
SOL    | 43       | Weak      | 64       | Neutral   | +21
```

---

## Manual Calculation Verification

### ETH Example

```typescript
// Inputs
QS = 75
OS = 30
Risk = 30

// v2.4 Formula
osDev = 30 - 50 = -20
riskDev = 30 - 50 = -20

K_OS = 0.20
K_RISK = 0.25

POS_core = QS + K_OS × osDev - K_RISK × riskDev
         = 75 + 0.20×(-20) - 0.25×(-20)
         = 75 - 4 + 5
         = 76

Floor (QS=75) = 50
POS_final = max(76, 50) = 76

// Verify this matches the response
console.assert(response.pos.raw === 76, 'POS calculation mismatch');
```

---

## Edge Cases to Test

### 1. Floor Application

**Test:** QS=75, OS=0 (extreme low), Risk=80 (extreme high)

```typescript
// Expected:
osDev = 0 - 50 = -50
riskDev = 80 - 50 = +30

POS_core = 75 + 0.20×(-50) - 0.25×30
         = 75 - 10 - 7.5
         = 57.5

Floor (QS=75) = 50
POS_final = max(57.5, 50) = 57.5  // Floor not needed

// But if QS=85:
Floor (QS=85) = 60
POS_final = max(57.5, 60) = 60  // Floor applied ✅
```

**Verify:**
```typescript
audit.fundamentalsFloorApplied === true
audit.fundamentalsFloor === 60
```

---

### 2. QS Gating

**Test:** QS with low coverage → OS gated

```typescript
// When QS coverage < 60%
{
  osStatus: 'gated',
  os: 50,  // Neutral default
  
  // v2.4 should use OS=50 (neutral) in formula
  osDev = 50 - 50 = 0
  // No OS impact, only QS and Risk matter
}
```

---

### 3. Plausibility Cap

**Test:** Somehow POS > 97 (should be capped)

```typescript
// If QS=95, OS=100, Risk=0
POS_core = 95 + 0.20×50 - 0.25×(-50)
         = 95 + 10 + 12.5
         = 117.5

// Should be capped
POS_final = min(117.5, 97) = 97  ✅

audit.posPlausibilityCapped === true
audit.posBeforeCap === 117.5
```

---

## Integration Test

```typescript
import { calculateOmniScoreProduction } from './services/omniscore-v2.3';
import { toOmniScoreSnapshot } from './services/omniscore-v2.3';

async function testV24Formula() {
  // ETH test case
  const ethParams = {
    projectId: 'ethereum',
    qsInputs: [/* ... realistic ETH inputs ... */],
    osInputs: [/* ... realistic ETH inputs ... */],
    // ... other params
  };
  
  const response = await calculateOmniScoreProduction(ethParams);
  const snapshot = toOmniScoreSnapshot(response);
  
  // Assertions
  console.assert(snapshot.audit.formulaVersion === 'v2.4', 'Formula not v2.4');
  console.assert(snapshot.qs >= 70 && snapshot.qs <= 85, 'ETH QS out of range');
  console.assert(snapshot.posAdjusted >= 55 && snapshot.posAdjusted <= 80, 'ETH POS out of range');
  console.assert(snapshot.tier !== 'Weak', 'ETH should not be Weak');
  console.assert(snapshot.tier === 'Neutral' || snapshot.tier === 'Strong', 'ETH tier incorrect');
  
  console.log('✅ ETH v2.4 test passed');
  console.log({
    qs: snapshot.qs,
    os: snapshot.os,
    risk: snapshot.risk,
    pos: snapshot.posAdjusted,
    tier: snapshot.tier,
    floor: snapshot.audit.fundamentalsFloor,
    floorApplied: snapshot.audit.fundamentalsFloorApplied,
  });
}

testV24Formula();
```

---

## Chat Layer Verification

The AI chat should now say:

### ETH Example

**v2.3 (wrong):**
> "Ethereum scores **43/100 on OmniScore (Weak tier)**. Quality Score holds strong at 75..."

**v2.4 (correct):**
> "Ethereum scores **75/100 on OmniScore (Strong tier)**. Quality Score is 75/100 (Strong) — excellent fundamentals with active development and strong ecosystem. Opportunity Score is 30/100 (Weak) — market opportunity limited in current fear regime. This positions Ethereum in the **Builder Zone**: high quality but low immediate opportunity."

**Key differences:**
- ✅ POS is 75, not 43
- ✅ Tier is "Strong", not "Weak"
- ✅ Narrative correctly separates QS (strong) from OS (weak)
- ✅ Builder Zone explained (high QS, low OS)

---

## Rollback Plan

If v2.4 produces unexpected results:

1. **Immediate rollback:**
   ```typescript
   const CONFIG = {
     FORMULA_V24_ENABLED: false,  // Revert to v2.3
   }
   ```

2. **Commit and push:**
   ```bash
   git add apps/coinet-platform/src/services/omniscore-v2.3.ts
   git commit -m "revert: disable v2.4 formula (rollback to v2.3)"
   git push origin main
   ```

3. **Monitor Railway deployment**

All v2.3 logic is preserved and functional.

---

## Success Criteria

✅ **ETH scores 55-75** (Neutral-Strong), NOT 40-45 (Weak)  
✅ **BTC scores 70-90** (Strong-Elite), better than v2.3  
✅ **SOL scores 45-65** (Weak-Neutral), appropriate for risk  
✅ **Formula version shows "v2.4"** in audit  
✅ **Fundamentals floor tracked** and applied when needed  
✅ **Chat layer correctly narrates** tier and quadrant separately  
✅ **Debug view shows** v2.4 formula and floor application  
✅ **Relative ordering correct:** BTC > ETH > SOL  

---

## Next Steps After Validation

1. **Monitor for 24-48 hours**
2. **Collect user feedback** on tier accuracy
3. **Adjust K_OS/K_RISK** if needed (unlikely)
4. **Update golden test cases** with v2.4 expected ranges
5. **Remove v2.3 fallback** if v2.4 proves stable (after 1-2 weeks)

---

## Questions to Answer

- [ ] Does ETH feel "right" now? (Should be Neutral-Strong, not Weak)
- [ ] Does BTC still dominate? (Should be Strong-Elite)
- [ ] Does SOL feel appropriately moderate? (Weak-Neutral is correct)
- [ ] Do the tier labels match the narrative?
- [ ] Does the quadrant (Builder/Target) make sense with the tier?

If all YES → v2.4 is a success! 🎉
