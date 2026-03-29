/**
 * CoinGlass Connector — Derivatives Pressure Truth Domain
 *
 * Truth role: Funding rates, open interest, liquidation data.
 * Not for: Spot price or market structure.
 */

import { BaseConnector, type RawAcquisition } from '../base-connector';
import type { ConnectorAcquireParams } from '../types';
import type { DerivativesData } from '../../evidence-pack/types';

interface LiquidationRaw {
  openInterest?: number;
  openInterestChange24h?: number;
  fundingRate?: number;
  fundingRateAnnualized?: number;
  longShortRatio?: number;
  liquidations24h?: number;
  liquidationsLong24h?: number;
  liquidationsShort24h?: number;
  predictedFunding?: number;
  basis?: number;
}

export class CoinGlassConnector extends BaseConnector<LiquidationRaw, DerivativesData> {
  constructor() {
    super({
      id: 'cxn-coinglass',
      provider: 'coinglass',
      source_class: 'derivatives',
      truth_class: 'derivatives_pressure',
      category: 'triggered',
      /** 4.2.4: funding/OI snapshots as scheduled surface unless wired to websocket (then realtime) */
      routing_mode: 'scheduled',
      scheduled_cadence_tier: 'high_frequency',
      default_entity_type: 'asset',
      default_timeout_ms: 10_000,
      enabled: true,
    });
  }

  protected async acquire(
    params: ConnectorAcquireParams,
    timeoutMs: number,
  ): Promise<RawAcquisition<LiquidationRaw>> {
    const { getLiquidationData } = await import('../../liquidation-service');
    const symbol = params.symbol || 'BTC';

    const data = await Promise.race([
      getLiquidationData(symbol),
      new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error(`CoinGlass timeout after ${timeoutMs}ms`)), timeoutMs),
      ),
    ]);

    if (!data) return { ok: false, error: 'No derivatives data returned from CoinGlass' };
    return { ok: true, data: data as unknown as LiquidationRaw, raw: data };
  }

  protected validate(raw: LiquidationRaw): string[] {
    return [];
  }

  protected buildCanonicalCandidateId(params: ConnectorAcquireParams): string {
    if (params.canonical_candidate_id) return params.canonical_candidate_id;
    return `asset:${(params.symbol || 'unknown').toLowerCase()}`;
  }

  protected normalize(raw: LiquidationRaw, _params: ConnectorAcquireParams): DerivativesData {
    return {
      open_interest_usd: raw.openInterest,
      open_interest_change_24h: raw.openInterestChange24h,
      funding_rate: raw.fundingRate,
      funding_rate_annualized: raw.fundingRateAnnualized,
      long_short_ratio: raw.longShortRatio,
      liquidations_24h_usd: raw.liquidations24h,
      liquidations_long_24h: raw.liquidationsLong24h,
      liquidations_short_24h: raw.liquidationsShort24h,
      predicted_funding: raw.predictedFunding,
      basis: raw.basis,
    };
  }
}
