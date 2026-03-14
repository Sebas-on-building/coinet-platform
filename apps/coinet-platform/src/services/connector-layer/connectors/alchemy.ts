/**
 * Alchemy Connector — On-Chain Behavior Truth Domain
 *
 * Truth role: Whale flows, exchange flows, active addresses, transaction volume.
 * Not for: Market pricing or derivative signals.
 */

import { BaseConnector, type RawAcquisition } from '../base-connector';
import type { ConnectorAcquireParams } from '../types';
import type { OnchainData } from '../../evidence-pack/types';

interface WhaleContextRaw {
  whaleInflow24h?: number;
  whaleOutflow24h?: number;
  whaleNetFlow24h?: number;
  exchangeInflow24h?: number;
  exchangeOutflow24h?: number;
  exchangeNetFlow24h?: number;
  activeAddresses24h?: number;
  transactionCount24h?: number;
  largeTransactions?: number;
}

export class AlchemyConnector extends BaseConnector<WhaleContextRaw, OnchainData> {
  constructor() {
    super({
      id: 'cxn-alchemy',
      provider: 'alchemy',
      source_class: 'onchain',
      truth_class: 'onchain_behavior',
      category: 'triggered',
      default_entity_type: 'asset',
      default_timeout_ms: 12_000,
      enabled: true,
    });
  }

  protected async acquire(
    params: ConnectorAcquireParams,
    timeoutMs: number,
  ): Promise<RawAcquisition<WhaleContextRaw>> {
    const { getWhaleContextForAI } = await import('../../whale-data');

    const data = await Promise.race([
      getWhaleContextForAI(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Alchemy timeout after ${timeoutMs}ms`)), timeoutMs),
      ),
    ]);

    if (!data) return { ok: false, error: 'No onchain data returned from Alchemy' };
    return { ok: true, data: data as unknown as WhaleContextRaw, raw: data };
  }

  protected validate(raw: WhaleContextRaw): string[] {
    return [];
  }

  protected buildCanonicalCandidateId(params: ConnectorAcquireParams): string {
    if (params.canonical_candidate_id) return params.canonical_candidate_id;
    const id = params.address ?? params.symbol?.toLowerCase() ?? 'unknown';
    return `asset:${id}`;
  }

  protected normalize(raw: WhaleContextRaw, _params: ConnectorAcquireParams): OnchainData {
    return {
      whale_inflow_24h: raw.whaleInflow24h,
      whale_outflow_24h: raw.whaleOutflow24h,
      whale_net_flow_24h: raw.whaleNetFlow24h,
      exchange_inflow_24h: raw.exchangeInflow24h,
      exchange_outflow_24h: raw.exchangeOutflow24h,
      exchange_net_flow_24h: raw.exchangeNetFlow24h,
      active_addresses_24h: raw.activeAddresses24h,
      transaction_count_24h: raw.transactionCount24h,
      large_transactions_24h: raw.largeTransactions,
    };
  }
}
