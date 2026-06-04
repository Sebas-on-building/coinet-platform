/**
 * CoinGecko Connector — Market Surface Truth Domain
 *
 * Truth role: Global market snapshot, BTC/ETH prices, dominance, fear/greed.
 * Not for: DEX pair discovery, derivatives, or on-chain data.
 */

import { BaseConnector, type RawAcquisition } from '../base-connector';
import type { ConnectorAcquireParams } from '../types';
import type { MarketSnapshotData } from '../../evidence-pack/types';

interface MarketStatusRaw {
  btcPrice?: number;
  btcDominance?: number;
  ethPrice?: number;
  totalMarketCap?: number;
  totalVolume24h?: number;
  fearGreedIndex?: number;
  fearGreedLabel?: string;
}

export class CoinGeckoConnector extends BaseConnector<MarketStatusRaw, MarketSnapshotData> {
  constructor() {
    super({
      id: 'cxn-coingecko',
      provider: 'coingecko',
      source_class: 'market_data',
      truth_class: 'market_surface',
      category: 'polling',
      scheduled_cadence_tier: 'low_frequency',
      default_entity_type: 'market_event',
      default_timeout_ms: 10_000,
      enabled: true,
    });
  }

  protected async acquire(
    _params: ConnectorAcquireParams,
    timeoutMs: number,
  ): Promise<RawAcquisition<MarketStatusRaw>> {
    // Real CoinGecko /global snapshot (dominance + total market cap). Previously
    // this read getMarketDataStatus() — a rate-limit/cache DIAGNOSTICS function
    // that has no market fields — so dominance/market-cap were silently 0. Now
    // sourced from the real /global endpoint; missing fields stay undefined
    // rather than fabricated. (btc/eth price + fear/greed are not part of
    // /global and remain unset here.)
    const { getGlobalMarketData } = await import('../../market-data');

    const data = await Promise.race([
      getGlobalMarketData(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`CoinGecko timeout after ${timeoutMs}ms`)), timeoutMs),
      ),
    ]);

    if (!data) return { ok: false, error: 'No global market data returned from CoinGecko' };
    const raw: MarketStatusRaw = {
      btcDominance: data.btcDominance,
      totalMarketCap: data.totalMarketCapUsd,
      totalVolume24h: data.totalVolume24hUsd,
    };
    return { ok: true, data: raw, raw };
  }

  protected validate(raw: MarketStatusRaw): string[] {
    return [];
  }

  protected buildCanonicalCandidateId(_params: ConnectorAcquireParams): string {
    return 'market:global';
  }

  protected normalize(raw: MarketStatusRaw, _params: ConnectorAcquireParams): MarketSnapshotData {
    return {
      btc_price: raw.btcPrice ?? 0,
      btc_dominance: raw.btcDominance ?? 0,
      eth_price: raw.ethPrice ?? 0,
      total_market_cap_usd: raw.totalMarketCap ?? 0,
      total_volume_24h_usd: raw.totalVolume24h ?? 0,
      fear_greed_index: raw.fearGreedIndex,
      fear_greed_label: raw.fearGreedLabel,
    };
  }
}
