# OmniScore v2.5.0 Debugging Guide

## Is the Formula Broken or Are the Values Wrong?

This guide helps you systematically diagnose whether OmniScore issues stem from:
1. **Formula problems** (mathematical bugs in how POS is calculated)
2. **Input value problems** (QS, OS, Risk segments are inaccurate)
3. **Calibration issues** (formula works but weights need tuning)

---

## Quick Diagnostic Process

### Step 1: Run Formula Verification Tests

```bash
npm test -- omniscore-formula-verification
```

**What this tests:**
- Mathematical properties of the convex combination formula
- Weight proportions (0.6, 0.25, 0.15)
- Exact calculations for known scenarios (ETH, SOL, BTC)
- Fundamentals floor behavior
- Edge cases and invariants

**If these tests PASS:** The formula itself is working correctly. Move to Step 2.

**If these tests FAIL:** There's a bug in the formula implementation. File an issue immediately.

---

### Step 2: Run Input Diagnostics Tests

```bash
npm test -- omniscore-input-diagnostics
```

**What this tests:**
- QS/OS segment aggregation logic
- Coverage and confidence calculations
- Risk calculation from LEGAL/MACRO/ERS
- OS ceiling application for mega-caps
- Real-world scenarios with diagnostic output

**Watch the console output** for diagnostic messages showing:
- How input segments aggregate to QS/OS
- Whether values match expectations
- Formula verification (manual calculation vs actual)

**If values look wrong:** The issue is in data collection or segment calculation. See "Data Quality Issues" below.

---

### Step 3: Generate Debug View for Specific Project

For any project where the score feels "broken":

```typescript
import { getProjectOmniScoreV23, generateDebugView, formatDebugView } from './services/omniscore';

const result = await getProjectOmniScoreV23('ethereum');
const debug = generateDebugView(result);
console.log(formatDebugView(debug));
```

**Key sections to inspect:**

#### 3.1 Segment Scores (`debug.segments`)
```
QS Segments:
  TEAM: 90.0
  TECH: 88.0
  SEC: 75.0
  GOV: 70.0
  ECO: 95.0
  → Aggregated QS: 86.8
```

**Check:** Are these individual segment scores accurate for the project?

#### 3.2 POS Progression (`debug.progression.pos`)
```
step1_raw: 72.7      ← posCore from formula
step2_floor: 72.7    ← after fundamentals floor (if applied)
step3_smoothed: 71.5 ← after temporal smoothing
step4_final: 70.8    ← after ERS adjustment
```

**Manual verification:**
```
Expected POS = 0.6 * QS + 0.25 * OS + 0.15 * (100 - Risk)
             = 0.6 * 86.8 + 0.25 * 43 + 0.15 * (100 - 35)
             = 52.08 + 10.75 + 9.75
             = 72.58
```

**If step1_raw ≠ expected:** Formula bug (unlikely in v2.5.0)
**If step1_raw = expected but final feels wrong:** Check smoothing or floor behavior

#### 3.3 Audit Flags (`debug.audit`)
```
fundamentalsFloorApplied: false
fundamentalsFloor: 55.0
smoothingApplied: true
osCeilingApplied: true
posPlausibilityCapped: false
invariantStatus: "pass"
```

**Check for warnings:**
- `fundamentalsFloorApplied: true` → Score was artificially boosted
- `osCeilingApplied: true` → OS was capped (expected for mega-caps)
- `posPlausibilityCapped: true` → Raw score exceeded 97 (should be rare)
- `invariantStatus: "error"` → Serious data quality issue

---

## Common Issues and Solutions

### Issue 1: "ETH score is too high (e.g., 80) when OS is only 43"

**Diagnosis:**
1. Check `debug.progression.qs.final` - Is QS unexpectedly high?
2. Check `debug.progression.risk.final` - Is Risk unexpectedly low?
3. Manually calculate: `0.6*QS + 0.25*OS + 0.15*(100-Risk)`

**Most likely cause:**
- **QS is inflated** due to:
  - Overly generous segment scoring (e.g., ECO=95 when it should be 75)
  - Stale data showing historical highs
  - Incorrect segment weights favoring strong segments
- **Risk is too low** due to:
  - Missing legal/regulatory data
  - Not capturing recent security incidents
  - Macro risk not reflecting current conditions

**Solution:**
- Review and recalibrate segment score calculations in `omniscore-data-fetcher-v23.ts`
- Update data sources for more accurate real-time inputs
- Adjust segment weights in `CONFIG.SEGMENT_WEIGHTS`

---

### Issue 2: "Score feels right for ETH but wrong for SOL/smaller caps"

**Diagnosis:**
- Compare `debug` outputs for multiple projects
- Look for systematic biases (e.g., all small caps scoring low)

**Most likely cause:**
- **Weight calibration** doesn't account for cap bucket differences
- **OS ceiling** application may be too aggressive
- **Fundamentals floor** may not be appropriate for all project types

**Solution:**
- Consider dynamic weights based on `capBucket`:
  ```typescript
  // Example: Higher W_O for small caps
  const W_O = capBucket === 'micro' || capBucket === 'small' ? 0.30 : 0.25;
  const W_F = capBucket === 'mega' ? 0.65 : 0.60;
  ```

---

### Issue 3: "Scores are volatile, changing drastically day-to-day"

**Diagnosis:**
1. Check `debug.audit.smoothingApplied`
2. Look at `debug.progression.pos.step3_smoothed` vs `step1_raw`

**Most likely cause:**
- **Smoothing disabled** or alpha too high
- **previousEngineVersion mismatch** causing smoothing reset
- **High ERS** triggering larger deltas (this is expected for events)

**Solution:**
- Review smoothing config in `CONFIG.SMOOTHING`
- Ensure `previousEngineVersion` is being passed correctly
- Verify ERS is only high during actual events

---

### Issue 4: "Chat says project X has score Y, but I don't see it in the snapshot"

**Diagnosis:**
- Check if project is actually in the OmniScore response
- Review chat service logs for `formatSnapshotForAI` output

**Most likely cause:**
- **LLM is guessing/hallucinating** despite v2.5.0 hardening
- **Multiple OmniScore versions** being used (should be impossible now with entrypoint)
- **Old cached response** contaminating new output

**Solution:**
- Verify all consumers import from `services/omniscore/index.ts`
- Check `assertEngineVersion` is throwing if versions mismatch
- Review system prompt compliance in `omniscore-data-fetcher-v23.ts`

---

## Data Quality Checklist

If formula tests pass but scores feel wrong, audit your data sources:

### QS Segments
- [ ] **TEAM**: GitHub activity, team transparency, reputation
  - Source: GitHub API, manual research
  - Freshness: < 14 days
- [ ] **TECH**: Code quality, innovation, maturity
  - Source: GitHub metrics, audits
  - Freshness: < 7 days
- [ ] **SEC**: Audits, bug bounties, incident history
  - Source: Audit reports, security databases
  - Freshness: < 30 days
- [ ] **GOV**: Decentralization, governance process
  - Source: On-chain data, DAO tools
  - Freshness: < 30 days
- [ ] **ECO**: DeFi integration, L2s, tooling
  - Source: DefiLlama, ecosystem maps
  - Freshness: < 30 days

### OS Segments
- [ ] **MARKET**: Volume, liquidity, spreads
  - Source: CoinGecko, CEX APIs
  - Freshness: < 2 hours
- [ ] **VAL**: Price positioning, momentum
  - Source: Price feeds
  - Freshness: < 2 hours
- [ ] **ADOPT**: Active addresses, transactions
  - Source: Blockchain explorers
  - Freshness: < 24 hours
- [ ] **COMM**: Social metrics, engagement
  - Source: Twitter API, Discord
  - Freshness: < 24 hours
- [ ] **TOKEN**: Distribution, tokenomics
  - Source: On-chain analysis
  - Freshness: < 7 days

### Risk Factors
- [ ] **LEGAL**: Regulatory news, legal cases
  - Source: News aggregators, legal databases
  - Freshness: < 24 hours
- [ ] **MACRO**: Market conditions, correlations
  - Source: Fear & Greed, BTC trend
  - Freshness: < 6 hours
- [ ] **ERS**: Critical events (hacks, exploits, regulatory actions)
  - Source: Real-time monitoring
  - Freshness: < 1 hour

---

## Weight Calibration Process

If the formula works but scores don't "feel right," calibrate weights:

### Current Weights (v2.5.0)
```typescript
W_FUNDAMENTALS: 0.60  // QS contribution
W_OPPORTUNITY: 0.25   // OS contribution
W_SAFETY: 0.15        // (100-Risk) contribution
```

### Calibration Steps

1. **Define Golden Set**: Pick 5-10 assets with "known" correct scores
   ```typescript
   const goldenSet = [
     { id: 'btc', targetPOS: 75, targetTier: 'Strong' },
     { id: 'eth', targetPOS: 65, targetTier: 'Neutral' },
     { id: 'sol', targetPOS: 55, targetTier: 'Neutral' },
     // ...
   ];
   ```

2. **Grid Search**: Test weight combinations
   ```typescript
   for W_F in [0.55, 0.60, 0.65]:
     for W_O in [0.20, 0.25, 0.30]:
       W_S = 1.0 - W_F - W_O
       error = calculateError(goldenSet, W_F, W_O, W_S)
   ```

3. **Minimize Error**: Choose weights that minimize deviation from golden set

4. **Validate**: Test on live data for 1-2 weeks, gather feedback

---

## Getting Help

If you're still stuck after following this guide:

1. **Collect diagnostic data:**
   - Run both test suites and save output
   - Generate debug views for 3-5 problematic projects
   - Note specific scores that feel wrong and why

2. **File an issue** with:
   - Test results (pass/fail)
   - Debug view outputs
   - Specific examples of incorrect scores
   - Your hypothesis (formula bug vs data issue vs calibration)

3. **Review recent changes:**
   - Check `git log apps/coinet-platform/src/services/omniscore*`
   - Verify engine version is `2.5.0` everywhere
   - Ensure all consumers use canonical entrypoint

---

## Version History

- **v2.5.0**: Convex combination formula, guaranteed bounded
- **v2.4.1**: Baseline+tilt with versioned smoothing reset
- **v2.3.4**: Added plausibility cap, temporal smoothing
- **v2.3.3**: Tier label fixes, OS ceilings by cap bucket
