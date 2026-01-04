# 🛡️ OmniScore Failsafe System

**Status**: ✅ **ACTIVE** (Deployed to production)  
**Version**: v2.9.1  
**Last Updated**: Dec 16, 2025

---

## Overview

The OmniScore Failsafe System is a **3-layer defense-in-depth architecture** that ensures top-tier cryptocurrency assets (BTC, ETH, SOL, top 20 by market cap) **ALWAYS** receive analysis, even during system degradation.

**Core Principle**: *Fail-closed but never fail-silent for major assets.*

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER REQUESTS OMNISCORE                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
          ┌──────────────▼──────────────┐
          │   🔧 LAYER 1: TECHNICAL     │
          │   Infrastructure Fixes       │
          │   - Prisma singleton         │
          │   - Clock skew tolerance     │
          │   - TypeScript compilation   │
          │   - Database migrations      │
          └──────────────┬──────────────┘
                         │
                    ✅ Success?
                         │
                    ❌ No (success=false)
                         │
          ┌──────────────▼──────────────┐
          │ 🛡️ LAYER 2: TYPESCRIPT GUARD│
          │   shouldNeverFailForTopTier()│
          │   synthesizeOmniScore()      │
          │   - Market cap analysis      │
          │   - Momentum heuristics      │
          │   - Quadrant placement       │
          └──────────────┬──────────────┘
                         │
                    ✅ Synthetic Score
                         │
          ┌──────────────▼──────────────┐
          │  🤖 LAYER 3: AI PROMPT      │
          │   Fallback Protocol          │
          │   - Data integrity check     │
          │   - Synthetic estimation     │
          │   - Confidence disclosure    │
          └──────────────┬──────────────┘
                         │
          ┌──────────────▼──────────────┐
          │ 🔍 LAYER 4: INVESTIGATION   │
          │   CoinGecko Fallback         │
          │   - Comprehensive data fetch │
          │   - No OmniScore score       │
          │   - Raw data analysis        │
          └──────────────┬──────────────┘
                         │
          ┌──────────────▼──────────────┐
          │    ✅ USER RECEIVES ANALYSIS │
          └─────────────────────────────┘
```

---

## Layer 1: Technical Infrastructure (Code-Level)

**Location**: `omniscore-data-fetcher-v23.ts`, `omniscore-v2.5.ts`

### Fixes Applied:
- ✅ **Prisma Singleton**: Use shared `db/client.ts` instead of creating new instances
- ✅ **Clock Skew Tolerance**: 2-minute tolerance for INV-10 timestamp validation
- ✅ **TypeScript Compilation**: Excluded problematic CIS module
- ✅ **Database Migrations**: Added `project_knowledge` and `project_research_logs` tables
- ✅ **Detailed Logging**: Log violations and coverage for `success=false` cases

**Commit**: `98ef7f7`, `63b73a7`, `391219d`, `0e4ddb7`

---

## Layer 2: TypeScript Guard (Code-Level)

**Location**: `omniscore-data-fetcher-v23.ts` (lines 1616-1900)

### Components:

#### 1. Top-Tier Asset Identification
```typescript
function shouldNeverFailForTopTier(projectId: string): boolean
```

**Recognizes**:
- Bitcoin (BTC), Ethereum (ETH), Solana (SOL)
- Top 20 by market cap: BNB, XRP, ADA, AVAX, DOT, MATIC, TRON, LINK, UNI, LTC, etc.
- Major DeFi blue chips: AAVE, MKR, CRV, LDO

#### 2. Synthetic Score Generator
```typescript
function synthesizeOmniScoreForTopTier(
  projectId: string,
  bundle: ProjectDataBundleV23,
  failedResult: OmniScoreProductionResponse | null
): OmniScoreProductionResponse
```

**Algorithm**:
1. **Quality Score (QS)**: Based on market cap dominance
   - >$100B = 85 (Elite) → BTC, ETH
   - >$50B = 78 (Strong)
   - >$10B = 70 (Strong)
   - >$1B = 62 (Neutral)

2. **Opportunity Score (OS)**: Based on 30-day momentum
   - >+50% = 75 (Strong momentum)
   - >+20% = 65 (Positive)
   - >0% = 55 (Slight positive)
   - <-20% = 45 (Slight negative)
   - <-40% = 25 (Strong decline)

3. **POS Calculation**: Weighted average
   - QS: 50%, OS: 30%, Risk: 20%

4. **Quadrant Placement**:
   - High QS + High OS → TARGET Zone
   - High QS + Low OS → BUILDER Zone
   - Low QS + High OS → HYPE Zone
   - Low QS + Low OS → AVOID Zone

**Triggers**:
- When `calculateOmniScoreProduction()` returns `success: false`
- When `getProjectOmniScoreV23()` throws an exception

**Output**:
- ✅ `success: true` (always for top-tier)
- Labeled as synthetic in audit violations
- Medium confidence rating
- Full OmniScore structure with all fields populated

**Commit**: `c505aa9`

---

## Layer 3: AI Prompt (LLM-Level)

**Location**: `ai-service.ts` (lines 191-241)

### Fallback Protocol

**Step 1 — Data Integrity Check**
- Verify availability of market cap, liquidity, on-chain activity, ecosystem signal
- If ≥70% present → proceed with fallback

**Step 2 — Synthetic OmniScore Estimation**
- Reconstruct QS using fundamentals + ecosystem dominance
- Reconstruct OS using momentum, volatility, sentiment, positioning
- Use relative positioning vs peers

**Step 3 — Quadrant Placement (Heuristic)**
- BUILDER: High QS + Low OS
- TARGET: High QS + High OS
- HYPE: Low QS + High OS
- AVOID: Low QS + Low OS

**Step 4 — Confidence Disclosure**
- Single line: *"Note: OmniScore engine fallback used due to partial system degradation. Directional validity remains intact."*

**Output Requirements**:
- Always provide: estimated QS, estimated OS, quadrant position
- Label as "Estimated OmniScore (engine fallback mode)"
- Calm, analytical, institutional tone
- 2-3 sentence actionable interpretation
- NEVER expose internal errors or stack traces

**Example Output**:
> "Bitcoin — Estimated OmniScore (engine fallback mode): QS ~85/100 (Elite), OS ~45/100 (Weak).  
> This positions BTC in the BUILDER Zone — excellent fundamentals but currently low market momentum.  
> Market cap $1.8T confirms top-tier quality, while Fear & Greed at 28 signals opportunity may emerge as sentiment improves.  
> Note: OmniScore engine fallback used due to partial system degradation. Directional validity remains intact."

**Commit**: User-added to `ai-service.ts`

---

## Layer 4: Investigation Fallback

**Location**: `project-investigation-service.ts`, `chat/service.ts`

### Already Implemented
- When all OmniScore layers fail, triggers `investigateProject()`
- Fetches comprehensive CoinGecko data
- Provides: description, market data, developer activity, community stats
- AI analyzes raw data without OmniScore numbers

**Commit**: Already active (pre-existing)

---

## Top-Tier Asset List

### Tier 1: Never Fail (BTC, ETH, SOL)
```typescript
'bitcoin', 'btc',
'ethereum', 'eth',
'solana', 'sol'
```

### Tier 2: Top 20 by Market Cap
```typescript
'binancecoin', 'bnb',
'ripple', 'xrp',
'cardano', 'ada',
'avalanche-2', 'avax',
'dogecoin', 'doge',
'polkadot', 'dot',
'polygon', 'matic',
'tron', 'trx',
'chainlink', 'link',
'uniswap', 'uni',
'litecoin', 'ltc',
'near-protocol', 'near',
'toncoin', 'ton',
'stellar', 'xlm',
'cosmos', 'atom'
```

### Tier 3: DeFi Blue Chips
```typescript
'aave',
'maker', 'mkr',
'curve-dao-token', 'crv',
'lido-dao', 'ldo'
```

---

## Logging & Observability

### TypeScript Guard Logs
```typescript
logger.warn(`[OmniScore v2.9.1] 🛡️ Top-tier asset ${projectId} returned success=false - synthesizing fallback score`);
logger.info(`[OmniScore v2.9.1] ✅ Synthetic score generated for ${projectId}`, {
  syntheticQS, syntheticOS, syntheticPOS, quadrant, marketCap, priceChange30d
});
```

### AI Prompt Logs
- Logs handled by LLM provider (xAI/Grok)
- User sees "Estimated OmniScore (engine fallback mode)" label

### Investigation Logs
```typescript
logger.info('[Fallback] Triggering comprehensive investigation', { reason, coin });
logger.info('[Fallback] Project investigation completed', { project, dataQuality, sources });
```

---

## Testing

### Manual Test Cases

#### Test 1: Top-Tier Asset with Forced Failure
```bash
# Simulate database failure for Ethereum
# Expected: TypeScript guard catches it, returns synthetic score
```

#### Test 2: Non-Top-Tier Asset Failure
```bash
# Simulate failure for obscure coin
# Expected: Returns success=false, triggers AI or investigation fallback
```

#### Test 3: Clock Skew Error
```bash
# Feature with future timestamp
# Expected: 2-minute tolerance prevents INV-10 error
```

---

## Deployment Status

### Production Commits (main branch)
```
c505aa9 feat: add TypeScript-level guard for top-tier asset OmniScore fallback
98ef7f7 fix: use shared Prisma singleton
63b73a7 fix: add 2-minute clock skew tolerance for INV-10 timestamp validation
391219d fix: add detailed logging for OmniScore success=false cases
a4e7f0c fix: exclude CIS module from root tsconfig
0b7a056 fix: exclude CIS module from build (has TypeScript errors, not used by OmniScore)
0e4ddb7 fix: add missing knowledge base migration and improve error handling
```

### Railway Deployment
- Auto-deploys from `main` branch
- Migration required: `npx prisma migrate deploy`
- Prisma client regeneration: `npx prisma generate` (automatic)

---

## Future Enhancements

### Potential Improvements
1. **Confidence Index**: Separate scoring for fallback vs full calculation
2. **UI Badge**: Visual indicator "Estimated · High Confidence"
3. **Telemetry**: Track fallback usage rates per asset
4. **Machine Learning**: Train ML model on historical synthetics vs actuals
5. **Sector-Specific Heuristics**: Different QS/OS estimation by sector

### Monitoring
- [ ] Add Datadog/Sentry alerts for fallback triggers
- [ ] Dashboard showing fallback usage by asset
- [ ] A/B test synthetic scores vs user satisfaction

---

## Documentation

### Related Files
- `omniscore-data-fetcher-v23.ts` - Main OmniScore calculation + TypeScript guard
- `omniscore-v2.5.ts` - Core calculation engine
- `ai-service.ts` - AI prompt with fallback protocol
- `project-investigation-service.ts` - CoinGecko fallback
- `chat/service.ts` - Orchestration with 3-tier error handling

### External Documentation
- [OmniScore Methodology](https://docs.coinet.app/omniscore)
- [Error Handling Guide](https://docs.coinet.app/error-handling)
- [Failsafe Architecture](https://docs.coinet.app/architecture/failsafe)

---

## Support

For issues or questions:
- GitHub Issues: [coinet-platform/issues](https://github.com/Sebas-on-building/coinet-platform/issues)
- Email: support@coinet.app
- Slack: #omniscore-engineering

---

**Last Review**: Dec 16, 2025  
**Next Review**: Jan 16, 2026
