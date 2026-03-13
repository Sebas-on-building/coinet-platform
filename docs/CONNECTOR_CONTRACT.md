# Coinet AI — Connector Contract

Every source connector MUST return data in the standard `ConnectorEnvelope` format. Downstream systems MUST NOT depend on provider-specific JSON.

---

## Envelope Schema

```typescript
interface ConnectorEnvelope {
  source: string;                    // e.g. "coingecko", "dexscreener"
  entity_type: 'asset' | 'pair' | 'protocol' | 'wallet' | 'chain';
  entity_id: string;
  chain: string | null;
  symbol: string | null;
  timestamp_observed: string;        // ISO8601
  timestamp_ingested: string;        // ISO8601
  raw_payload: Record<string, unknown>;
  normalized_partial_payload: Record<string, unknown>;  // canonical metrics
  freshness_seconds: number;
  source_confidence: number;         // 0-1
  rate_limit_cost: number;
  trace_id: string;
}
```

---

## Connector Rules (Resilience)

Each connector MUST support:

| Rule | Default | Description |
|------|---------|-------------|
| `maxRetries` | 3 | Retries on transient failure |
| `initialBackoffMs` | 1000 | Exponential backoff start |
| `timeoutMs` | 10000 | Request timeout |
| `circuitBreakerThreshold` | 5 | Open circuit after N failures |
| `circuitBreakerResetMs` | 60000 | Half-open after ms |
| `staleThresholdSeconds` | 300 | Mark data stale if older |

---

## Canonical Metric Namespace

`normalized_partial_payload` MUST use keys from the canonical namespace. See `packages/shared-models/src/schemas/canonical-metrics.ts`.

Examples:

- `price.spot`, `price.dex`
- `market_cap`, `fdv`
- `liquidity.usd`
- `oi.notional`, `funding.rate`
- `protocol.tvl`, `protocol.fees.usd`
- `security.risk_score`
- `sentiment.velocity`, `narrative.news_intensity`

---

## Usage

```typescript
import {
  ConnectorEnvelopeSchema,
  createConnectorEnvelope,
  DEFAULT_CONNECTOR_RULES,
  CANONICAL_METRICS,
} from '@coinet-ai/shared-models';

// Validate provider output
const envelope = ConnectorEnvelopeSchema.parse(rawFromProvider);

// Or create from adapter
const envelope = createConnectorEnvelope({
  source: 'dexscreener',
  entity_type: 'pair',
  entity_id: 'solana-abc123',
  chain: 'solana',
  symbol: 'PENGUIN',
  timestamp_observed: new Date().toISOString(),
  raw_payload: apiResponse,
  normalized_partial_payload: {
    [CANONICAL_METRICS.PRICE_DEX]: apiResponse.priceUsd,
    [CANONICAL_METRICS.LIQUIDITY_USD]: apiResponse.liquidity?.usd,
    [CANONICAL_METRICS.VOLUME_24H]: apiResponse.volume?.h24,
  },
  source_confidence: 0.85,
  rate_limit_cost: 1,
  trace_id: 'trace-xyz',
});
```

---

*Part of Coinet AI Production Architecture — Layer 1*
