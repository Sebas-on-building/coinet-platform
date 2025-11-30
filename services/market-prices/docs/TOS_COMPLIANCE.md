# API Terms of Service Compliance Guide

> **Last Updated:** 2025-12-01
> **Version:** 1.0.0
> **Status:** Production Ready

## Overview

This document outlines the Terms of Service (ToS) compliance requirements for all third-party APIs used in the Coinet market-prices service. Proper compliance ensures:

- ✅ Legal operation of the service
- ✅ Continued API access
- ✅ No rate limit bans
- ✅ Commercial use authorization

---

## 1. CoinGecko API

### 1.1 Plan Details

| Tier | Rate Limit | Commercial Use | Cost |
|------|------------|----------------|------|
| Demo (Free) | 30 calls/min | ✅ Yes (with attribution) | $0 |
| Analyst | 500 calls/min | ✅ Yes | $129/mo |
| Pro | 1000 calls/min | ✅ Yes | $499/mo |

### 1.2 Compliance Requirements

**Attribution (Required for Free Tier):**

```html
<!-- Must display on any page showing CoinGecko data -->
<a href="https://www.coingecko.com/api" target="_blank">
  Powered by CoinGecko API
</a>
```

**Data Caching:**
- ✅ Allowed: Cache data for performance optimization
- ⚠️ Required: Refresh data within reasonable intervals
- ❌ Prohibited: Re-selling raw API data

**Rate Limit Compliance:**

```typescript
// Our implementation respects rate limits
const COINGECKO_FREE_TIER = {
  callsPerMinute: 30,
  burstAllowed: false,
  retryAfter: true, // Respect 429 Retry-After header
};
```

### 1.3 Our Compliance Status

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Attribution | ✅ Compliant | Footer component in UI |
| Rate Limiting | ✅ Compliant | `rate-limit-handler.ts` |
| Caching Policy | ✅ Compliant | 30s-5min TTL tiers |
| Commercial Use | ✅ Compliant | Aggregation service |

---

## 2. CoinMarketCap API

### 2.1 Plan Details

| Tier | Rate Limit | Commercial Use | Cost |
|------|------------|----------------|------|
| Basic | 30 calls/min, 10k/mo | ⚠️ Personal only | $0 |
| Hobbyist | 30 calls/min | ⚠️ Personal only | $29/mo |
| Startup | 120 calls/min | ✅ Yes | $79/mo |

### 2.2 Compliance Requirements

**⚠️ CRITICAL: Commercial Use Restriction**

The Basic (free) tier explicitly prohibits commercial use:

> "You may not use the Basic plan for any commercial purpose including but not limited to: selling, licensing, or distributing the Data..."
> — CoinMarketCap API Terms

**Our Solution:**

1. **Use CMC only as fallback** - Not primary data source
2. **Aggregate with other sources** - Never expose raw CMC data
3. **Consider Startup plan** - If CMC becomes primary

```typescript
// CMC is SECONDARY - used only when CoinGecko fails
const CMC_USAGE_POLICY = {
  role: 'fallback',
  priority: 2, // Lower than CoinGecko
  rawDataExposure: false, // Never expose raw CMC data
  aggregationOnly: true, // Only use for aggregated insights
};
```

### 2.3 Risk Mitigation

| Risk | Mitigation | Status |
|------|------------|--------|
| ToS Violation | Use as fallback only | ✅ Implemented |
| API Ban | Fallback to other sources | ✅ DeFiLlama ready |
| Rate Limit | Aggressive caching | ✅ 60s+ TTL |

**Recommendation:** Upgrade to Startup plan ($79/mo) for full commercial compliance.

---

## 3. Alchemy API

### 3.1 Plan Details

| Tier | Compute Units | Commercial Use | Cost |
|------|---------------|----------------|------|
| Free | 300M CU/mo | ✅ Yes | $0 |
| Growth | 400M CU/mo | ✅ Yes | $49/mo |
| Scale | Unlimited | ✅ Yes | Custom |

### 3.2 Compliance Requirements

**Commercial Use:** ✅ Allowed on all tiers

**CU Management:**
- Each method has different CU costs
- Batch requests for efficiency
- Monitor usage in dashboard

```typescript
// Our CU-optimized implementation
const ALCHEMY_OPTIMIZATION = {
  batchSize: 100, // Batch transfers requests
  cacheEnabled: true, // Cache to reduce CU usage
  priorityRouting: true, // Route to cheapest methods
};
```

### 3.3 Our Compliance Status

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| CU Limits | ✅ Compliant | `CUTracker` in WhaleFusion |
| Commercial Use | ✅ Compliant | All tiers allow |
| Rate Limiting | ✅ Compliant | Built-in backoff |

---

## 4. QuickNode API

### 4.1 Plan Details

| Tier | Requests | Commercial Use | Cost |
|------|----------|----------------|------|
| Discover (Free) | 10M/mo | ✅ Yes | $0 |
| Build | 50M/mo | ✅ Yes | $49/mo |
| Scale | Custom | ✅ Yes | Custom |

### 4.2 Compliance Status

✅ **Fully Compliant** - No restrictions on free tier for commercial use.

---

## 5. CryptoPanic API

### 5.1 Plan Details

| Tier | Rate Limit | Commercial Use | Cost |
|------|------------|----------------|------|
| Free | 2 req/s | ✅ Yes (with attribution) | $0 |
| Pro | 10 req/s | ✅ Yes | $49/mo |

### 5.2 Compliance Requirements

**Attribution Required:**

```html
<a href="https://cryptopanic.com" target="_blank">
  News powered by CryptoPanic
</a>
```

**Data Delay:**
- Free tier: 24-hour delay on some data
- Pro tier: Real-time access

### 5.3 Our Compliance Status

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Attribution | ✅ Compliant | Footer component |
| Rate Limiting | ✅ Compliant | 2 req/s enforced |
| Caching | ✅ Compliant | 15min+ TTL |

---

## 6. DeFiLlama API

### 6.1 Compliance Status

✅ **Fully Compliant** - Open API, no restrictions.

| Aspect | Status |
|--------|--------|
| Rate Limiting | Self-imposed 10 req/s |
| Commercial Use | ✅ Allowed |
| Attribution | Not required |
| Caching | ✅ Implemented |

---

## 7. DexScreener API

### 7.1 Plan Details

| Tier | Rate Limit | Commercial Use | Cost |
|------|------------|----------------|------|
| Free | 300 req/min | ⚠️ Check terms | $0 |
| Pro | Custom | ✅ Yes | Contact |

### 7.2 Compliance Requirements

**Commercial Use:** Review terms at checkout for confirmation.

**Our Implementation:**

```typescript
const DEXSCREENER_POLICY = {
  rateLimit: 300, // Stay under limit
  caching: true, // Reduce requests
  attribution: true, // Include where possible
};
```

---

## 8. Implementation Checklist

### 8.1 Technical Compliance

```typescript
// src/compliance/tos-checker.ts

export interface ComplianceStatus {
  api: string;
  compliant: boolean;
  issues: string[];
  recommendations: string[];
}

export function checkCompliance(): ComplianceStatus[] {
  return [
    {
      api: 'CoinGecko',
      compliant: true,
      issues: [],
      recommendations: ['Consider Pro for higher limits'],
    },
    {
      api: 'CoinMarketCap',
      compliant: false, // Free tier commercial restriction
      issues: ['Free tier prohibits commercial use'],
      recommendations: ['Upgrade to Startup ($79/mo)', 'Use as fallback only'],
    },
    {
      api: 'Alchemy',
      compliant: true,
      issues: [],
      recommendations: ['Monitor CU usage'],
    },
    // ... etc
  ];
}
```

### 8.2 Attribution Components

```typescript
// src/components/ApiAttribution.tsx

export const ApiAttribution = () => (
  <footer className="api-attribution">
    <p>Market data powered by:</p>
    <ul>
      <li><a href="https://coingecko.com">CoinGecko</a></li>
      <li><a href="https://cryptopanic.com">CryptoPanic</a></li>
      <li><a href="https://defillama.com">DeFiLlama</a></li>
    </ul>
  </footer>
);
```

### 8.3 Rate Limit Configuration

```typescript
// src/config/rate-limits.ts

export const RATE_LIMITS = {
  coingecko: {
    free: { rpm: 30, burst: 1 },
    pro: { rpm: 500, burst: 10 },
  },
  coinmarketcap: {
    free: { rpm: 30, burst: 1 },
    startup: { rpm: 120, burst: 5 },
  },
  alchemy: {
    free: { cuPerMonth: 300_000_000 },
    growth: { cuPerMonth: 400_000_000 },
  },
  cryptopanic: {
    free: { rps: 2 },
    pro: { rps: 10 },
  },
  dexscreener: {
    free: { rpm: 300 },
  },
  defillama: {
    free: { rps: 10 }, // Self-imposed
  },
};
```

---

## 9. Risk Summary

| API | Risk Level | Commercial OK? | Action Required |
|-----|------------|----------------|-----------------|
| CoinGecko | 🟢 Low | ✅ Yes | Attribution |
| CoinMarketCap | 🔴 High | ⚠️ Upgrade needed | Use fallback only OR upgrade |
| Alchemy | 🟢 Low | ✅ Yes | Monitor CU |
| QuickNode | 🟢 Low | ✅ Yes | None |
| CryptoPanic | 🟢 Low | ✅ Yes | Attribution |
| DeFiLlama | 🟢 Low | ✅ Yes | None |
| DexScreener | 🟡 Medium | ⚠️ Verify | Check terms |

---

## 10. Upgrade Path

For full commercial compliance and higher limits:

| Priority | API | Upgrade | Cost | Benefit |
|----------|-----|---------|------|---------|
| 1 | CoinMarketCap | Startup | $79/mo | Commercial license |
| 2 | CoinGecko | Analyst | $129/mo | 16x rate limit |
| 3 | CryptoPanic | Pro | $49/mo | Real-time news |
| 4 | Alchemy | Growth | $49/mo | +33% CU |

**Total for full compliance:** ~$306/mo

---

## 11. Monitoring & Enforcement

### 11.1 Automated Checks

```typescript
// Run daily compliance check
// npm run compliance:check

export async function runComplianceCheck(): Promise<void> {
  const issues = checkCompliance().filter(c => !c.compliant);
  
  if (issues.length > 0) {
    logger.warn('Compliance issues detected', { issues });
    // Alert to Slack/PagerDuty
  }
}
```

### 11.2 Rate Limit Monitoring

All rate limits are tracked in Prometheus:

```
# HELP api_rate_limit_remaining Remaining API calls
# TYPE api_rate_limit_remaining gauge
api_rate_limit_remaining{api="coingecko"} 25
api_rate_limit_remaining{api="coinmarketcap"} 30
```

---

## 12. Conclusion

**Current Status:** ⚠️ Mostly Compliant (CMC free tier risk)

**Recommendations:**
1. ✅ Continue using CMC as fallback only (current implementation)
2. 📋 Add attribution components to UI
3. 💰 Consider CMC Startup upgrade for full compliance
4. 📊 Monitor rate limits via Prometheus

**Last Audit:** 2025-12-01
**Next Audit:** 2026-03-01

