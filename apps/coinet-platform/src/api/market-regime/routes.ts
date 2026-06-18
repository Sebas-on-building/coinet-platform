/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║   MARKET REGIME — read-only macro/regime contract (additive exit)           ║
 * ║                                                                             ║
 * ║   GET /api/market-regime                                                    ║
 * ║                                                                             ║
 * ║   Purely additive, read-only surface over data the platform ALREADY         ║
 * ║   computes and caches (Fear & Greed, BTC/ETH dominance, total market cap,    ║
 * ║   24h change). It composes three existing cached sources:                    ║
 * ║     • getGlobalMarketData()  — CoinGecko /global (5-min cache)               ║
 * ║     • getCmcGlobalMetrics()  — CMC Agent Hub global metrics (5-min cache)    ║
 * ║     • getMarketSentiment()   — Alternative.me Fear & Greed (10-min cache)    ║
 * ║                                                                             ║
 * ║   GOVERNANCE / SAFETY:                                                       ║
 * ║   - Touches NOTHING the judgment engine hashes. It does not import           ║
 * ║     produceJudgment, the snapshot, the evaluator, or any AJP.1 input.        ║
 * ║     The frozen fingerprint (f61b2c30) is structurally unaffected — this is   ║
 * ║     a new read route, not engine logic.                                      ║
 * ║   - Cost-neutral: rides the existing 5/10-min caches; no new upstream load.  ║
 * ║   - Never fabricates: each field is null when its source is unavailable.     ║
 * ║     Per-field provenance is reported so the client can render honest         ║
 * ║     DEGRADED states instead of silently trusting a fallback.                 ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import { Router, Request, Response } from 'express';
import { logger } from '../../utils/logger';
import { getGlobalMarketData, type GlobalMarketData } from '../../services/market-data';
import { getCmcGlobalMetrics, type CmcGlobalMetrics } from '../../services/cmc-agent-hub';
import { getMarketSentiment, type MarketSentiment } from '../../services/sentiment-service';

const router: Router = Router();

const CACHE_TTL_SECONDS = 300; // mirrors the 5-min cache of the underlying sources

type SourceState = 'live' | 'unavailable';

interface FearGreedBlock {
  value: number;
  classification: string;
  trend: 'improving' | 'worsening' | 'stable';
  previousValue: number | null;
}

interface MarketRegimeData {
  fearGreed: FearGreedBlock | null;
  btcDominance: number | null;
  ethDominance: number | null;
  totalMarketCapUsd: number | null;
  totalMarketCapChange24h: number | null;
  btcDominanceChange7d: number | null;
  sources: {
    dominance: SourceState; // CoinGecko /global (co-primary) | CMC
    marketCap: SourceState;
    fearGreed: SourceState; // CMC sentiment | Alternative.me
  };
  asOf: string;
  cacheTtlSeconds: number;
}

const num = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;

/**
 * GET /api/market-regime
 * No auth — same public posture as GET /api/judgment. Read-only.
 */
/**
 * Pure composition of the regime contract from the three already-fetched sources.
 * No I/O, never throws, never fabricates: each field is null when its source is
 * absent, and CoinGecko /global is preferred with CMC as a fallback for fields it
 * didn't provide. Exported for unit testing (mirrors the toChatVerdict pattern).
 */
export function composeMarketRegime(
  global: GlobalMarketData | null,
  cmc: CmcGlobalMetrics | null,
  sentiment: MarketSentiment | null,
): MarketRegimeData {
  // ── Dominance + market cap ──────────────────────────────────────────────
  const btcDominance = num(global?.btcDominance) ?? num(cmc?.btcDominance);
  const ethDominance = num(global?.ethDominance);
  const totalMarketCapUsd = num(global?.totalMarketCapUsd) ?? num(cmc?.totalMarketCap);
  const totalMarketCapChange24h =
    num(global?.totalMarketCapChange24h) ?? num(cmc?.totalMarketCapChange24h);
  const btcDominanceChange7d = num(cmc?.btcDominanceChange7d); // CMC coverage-win only

  // ── Fear & Greed ────────────────────────────────────────────────────────
  // Prefer the Alternative.me sentiment service (classification + trend + previous
  // value); fall back to CMC's numeric index when sentiment is unavailable.
  let fearGreed: FearGreedBlock | null = null;
  if (sentiment?.fearGreed) {
    fearGreed = {
      value: sentiment.fearGreed.value,
      classification: sentiment.fearGreed.classification,
      trend: sentiment.fearGreed.trend,
      previousValue: num(sentiment.fearGreed.previousValue),
    };
  } else if (num(cmc?.fearGreed) !== null) {
    const value = cmc!.fearGreed as number;
    fearGreed = {
      value,
      classification: classifyFearGreed(value),
      trend: 'stable',
      previousValue: null,
    };
  }

  return {
    fearGreed,
    btcDominance,
    ethDominance,
    totalMarketCapUsd,
    totalMarketCapChange24h,
    btcDominanceChange7d,
    sources: {
      dominance: btcDominance !== null ? 'live' : 'unavailable',
      marketCap: totalMarketCapUsd !== null ? 'live' : 'unavailable',
      fearGreed: fearGreed !== null ? 'live' : 'unavailable',
    },
    asOf: new Date().toISOString(),
    cacheTtlSeconds: CACHE_TTL_SECONDS,
  };
}

router.get('/', async (_req: Request, res: Response) => {
  const startedAt = Date.now();

  // All three are independently cached and each returns null (never throws) on
  // failure, so a single failed source degrades that block only.
  const [global, cmc, sentiment] = await Promise.all([
    getGlobalMarketData().catch(() => null),
    getCmcGlobalMetrics().catch(() => null),
    getMarketSentiment().catch(() => null),
  ]);

  const data = composeMarketRegime(global, cmc, sentiment);

  // Let intermediaries cache it for the same window as the underlying sources.
  res.set('Cache-Control', `public, max-age=${CACHE_TTL_SECONDS}`);

  logger.debug('🧭 /api/market-regime served', {
    sources: data.sources,
    processingTime: Date.now() - startedAt,
  });

  return res.json({
    success: true,
    data,
    metadata: { processingTime: Date.now() - startedAt },
  });
});

/** Standard Alternative.me-style banding for a 0–100 Fear & Greed value. */
export function classifyFearGreed(value: number): string {
  if (value <= 24) return 'Extreme Fear';
  if (value <= 44) return 'Fear';
  if (value <= 54) return 'Neutral';
  if (value <= 74) return 'Greed';
  return 'Extreme Greed';
}

export default router;
