/**
 * GoPlus Connector — Structural Safety Truth Domain
 *
 * Truth role: Contract security, honeypot detection, tax analysis.
 * Not for: Market quality or trading signals.
 */

import { BaseConnector, type RawAcquisition } from '../base-connector';
import type { ConnectorAcquireParams } from '../types';
import type { SecurityData, HoldersData } from '../../evidence-pack/types';

// ═══════════════════════════════════════════════════════════════════════════════
// SECURITY CONNECTOR
// ═══════════════════════════════════════════════════════════════════════════════

interface SecurityRaw {
  is_honeypot?: boolean | null;
  buy_tax?: number | null;
  sell_tax?: number | null;
  is_mintable?: boolean | null;
  has_blacklist?: boolean | null;
  is_proxy?: boolean | null;
  is_open_source?: boolean | null;
  owner_change_balance?: boolean | null;
  can_take_back_ownership?: boolean | null;
  risk_score?: number;
}

export class GoPlusSecurityConnector extends BaseConnector<SecurityRaw, SecurityData> {
  constructor() {
    super({
      id: 'cxn-goplus-security',
      provider: 'goplus',
      source_class: 'security',
      truth_class: 'structural_safety',
      category: 'triggered',
      default_entity_type: 'asset',
      default_timeout_ms: 15_000,
      enabled: true,
    });
  }

  protected async acquire(
    params: ConnectorAcquireParams,
    _timeoutMs: number,
  ): Promise<RawAcquisition<SecurityRaw>> {
    if (!params.address) {
      return { ok: false, error: 'No address provided for security check' };
    }
    // GoPlus integration is via the builder's existing fetch path.
    // This connector serves as the governed ingress boundary.
    // When a dedicated GoPlus client exists, it replaces this.
    return {
      ok: false,
      error: 'GoPlus direct integration pending — using builder fetch path',
      error_code: 'NOT_WIRED',
    };
  }

  protected validate(raw: SecurityRaw): string[] {
    return [];
  }

  protected normalize(raw: SecurityRaw, _params: ConnectorAcquireParams): SecurityData {
    return {
      is_honeypot: raw.is_honeypot ?? null,
      buy_tax: raw.buy_tax ?? null,
      sell_tax: raw.sell_tax ?? null,
      is_mintable: raw.is_mintable ?? null,
      has_blacklist: raw.has_blacklist ?? null,
      is_proxy: raw.is_proxy ?? null,
      is_open_source: raw.is_open_source ?? null,
      owner_change_balance: raw.owner_change_balance ?? null,
      can_take_back_ownership: raw.can_take_back_ownership ?? null,
      flags: [],
      risk_score: raw.risk_score ?? 50,
      provider: 'goplus',
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOLDERS CONNECTOR (shares GoPlus security source class)
// ═══════════════════════════════════════════════════════════════════════════════

interface HoldersRaw {
  totalHolders?: number;
  top10Percentage?: number;
  top20Percentage?: number;
  topHolders?: Array<{
    address: string;
    balance: number;
    percentage: number;
    is_contract?: boolean;
    label?: string;
  }>;
  holderChange24h?: number;
  holderChange7d?: number;
}

export class GoPlusHoldersConnector extends BaseConnector<HoldersRaw, HoldersData> {
  constructor() {
    super({
      id: 'cxn-goplus-holders',
      provider: 'goplus',
      source_class: 'security',
      truth_class: 'structural_safety',
      category: 'triggered',
      default_entity_type: 'asset',
      default_timeout_ms: 15_000,
      enabled: true,
    });
  }

  protected async acquire(
    params: ConnectorAcquireParams,
    _timeoutMs: number,
  ): Promise<RawAcquisition<HoldersRaw>> {
    if (!params.address) {
      return { ok: false, error: 'No address provided for holders check' };
    }
    return {
      ok: false,
      error: 'GoPlus holders direct integration pending — using builder fetch path',
      error_code: 'NOT_WIRED',
    };
  }

  protected validate(raw: HoldersRaw): string[] {
    return [];
  }

  protected normalize(raw: HoldersRaw, _params: ConnectorAcquireParams): HoldersData {
    const top10 = raw.top10Percentage ?? 0;
    const concentration: HoldersData['concentration_risk'] =
      top10 > 80 ? 'critical' : top10 > 60 ? 'high' : top10 > 40 ? 'medium' : 'low';

    return {
      total_holders: raw.totalHolders ?? 0,
      top_10_percentage: top10,
      top_20_percentage: raw.top20Percentage,
      top_holders: (raw.topHolders ?? []).slice(0, 20).map(h => ({
        address: h.address,
        balance: h.balance,
        percentage: h.percentage,
        is_contract: h.is_contract,
        label: h.label,
      })),
      holder_change_24h: raw.holderChange24h,
      holder_change_7d: raw.holderChange7d,
      concentration_risk: concentration,
    };
  }
}
