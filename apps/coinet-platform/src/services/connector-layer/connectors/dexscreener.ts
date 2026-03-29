/**
 * DexScreener Connector — DEX Emergence Truth Domain
 *
 * Truth role: Market emergence, early pair discovery, DEX liquidity.
 * Not for: Authoritative pricing (that's market_data's role).
 */

import { BaseConnector, type RawAcquisition } from '../base-connector';
import type { ConnectorAcquireParams, EntityType } from '../types';
import type { DexScreenerData } from '../../evidence-pack/types';

interface DexScreenerRaw {
  priceUsd: number;
  priceNative: string;
  liquidity?: { usd: number };
  volume?: { h24?: number; h6?: number; h1?: number };
  marketCap?: number;
  fdv?: number;
  pairCreatedAt?: number;
  txns?: {
    m5?: { buys: number; sells: number };
    h1?: { buys: number; sells: number };
    h24?: { buys: number; sells: number };
  };
  priceChange?: { m5?: number; h1?: number; h6?: number; h24?: number };
  url?: string;
  dexId?: string;
}

export class DexScreenerConnector extends BaseConnector<DexScreenerRaw, DexScreenerData> {
  constructor() {
    super({
      id: 'cxn-dexscreener',
      provider: 'dexscreener',
      source_class: 'dex_discovery',
      truth_class: 'dex_emergence',
      category: 'triggered',
      /** 4.2.4: DEX emergence is periodic state maintenance when cron/evidence refreshes run */
      routing_mode: 'scheduled',
      scheduled_cadence_tier: 'high_frequency',
      default_entity_type: 'pair',
      default_timeout_ms: 10_000,
      enabled: true,
    });
  }

  protected async acquire(
    params: ConnectorAcquireParams,
    timeoutMs: number,
  ): Promise<RawAcquisition<DexScreenerRaw>> {
    const { fetchDexScreenerData } = await import('../../dexscreener');
    const searchQuery = params.address || params.symbol || '';
    const chain = params.chain || 'solana';

    const data = await Promise.race([
      fetchDexScreenerData(searchQuery, chain),
      new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error(`DexScreener timeout after ${timeoutMs}ms`)), timeoutMs),
      ),
    ]);

    if (!data) return { ok: false, error: 'No data returned from DexScreener' };
    return { ok: true, data: data as DexScreenerRaw, raw: data };
  }

  protected validate(raw: DexScreenerRaw): string[] {
    const issues: string[] = [];
    if (typeof raw.priceUsd !== 'number') issues.push('Missing priceUsd');
    return issues;
  }

  protected classifyEntityType(_params: ConnectorAcquireParams): EntityType {
    return 'pair';
  }

  protected buildCanonicalCandidateId(params: ConnectorAcquireParams): string {
    if (params.canonical_candidate_id) return params.canonical_candidate_id;
    const id = params.address ?? params.symbol?.toLowerCase() ?? 'unknown';
    return `pair:${id}`;
  }

  protected normalize(raw: DexScreenerRaw, _params: ConnectorAcquireParams): DexScreenerData {
    return {
      price_usd: raw.priceUsd || 0,
      price_native: raw.priceNative != null ? parseFloat(String(raw.priceNative)) : undefined,
      liquidity_usd: raw.liquidity?.usd || 0,
      volume_24h_usd: raw.volume?.h24 || 0,
      volume_6h_usd: raw.volume?.h6,
      volume_1h_usd: raw.volume?.h1,
      market_cap_usd: raw.marketCap,
      fdv_usd: raw.fdv,
      pair_created_at_unix: raw.pairCreatedAt
        ? Math.floor(new Date(raw.pairCreatedAt).getTime() / 1000)
        : undefined,
      txns_5m: raw.txns?.m5 ? { buys: raw.txns.m5.buys, sells: raw.txns.m5.sells } : undefined,
      txns_1h: raw.txns?.h1 ? { buys: raw.txns.h1.buys, sells: raw.txns.h1.sells } : undefined,
      txns_24h: raw.txns?.h24 ? { buys: raw.txns.h24.buys, sells: raw.txns.h24.sells } : undefined,
      price_change_5m: raw.priceChange?.m5,
      price_change_1h: raw.priceChange?.h1,
      price_change_6h: raw.priceChange?.h6,
      price_change_24h: raw.priceChange?.h24,
      pair_url: raw.url,
      dex_name: raw.dexId,
    };
  }
}
