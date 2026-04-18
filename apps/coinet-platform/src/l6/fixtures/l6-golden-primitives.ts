/**
 * L6.8 — Golden Primitive Fixtures
 *
 * §6.8.2.4 — Canonical legal feature/event primitive cases. Their
 * `replay_hash` must remain stable across versions unless a migration
 * explicitly changes semantics (§6.8.4.3 Band H).
 */

import { L6FeatureFamilyId } from '../contracts/feature-family-definition';
import { L6EventFamilyId } from '../contracts/event-family-definition';
import { L6MaterializationMode } from '../contracts/l6-persistence-surface';

export interface L6GoldenFeaturePrimitive {
  readonly case_id: string;
  readonly family: L6FeatureFamilyId;
  readonly feature_id: string;
  readonly feature_version: string;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly as_of: string;
  readonly window_id: string;
  readonly baseline_id: string | null;
  readonly expected_value: number | string | boolean;
  readonly validity_state: 'VALID' | 'DEGRADED' | 'PROVISIONAL' | 'BLOCKED';
  readonly confidence_band: 'HIGH' | 'MEDIUM' | 'LOW';
  readonly replay_hash: string;
  readonly materialization_mode: L6MaterializationMode;
}

export interface L6GoldenEventPrimitive {
  readonly case_id: string;
  readonly family: L6EventFamilyId;
  readonly event_id: string;
  readonly event_version: string;
  readonly event_instance_id: string;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly lifecycle_state: 'CANDIDATE' | 'CONFIRMED' | 'ACTIVE' | 'RESOLVED' | 'EXPIRED';
  readonly severity_band: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  readonly confidence_band: 'HIGH' | 'MEDIUM' | 'LOW';
  readonly dedupe_key: string;
  readonly replay_hash: string;
}

export const GOLDEN_FEATURES: readonly L6GoldenFeaturePrimitive[] = Object.freeze([
  {
    case_id: 'gf.market.ret_1h.btc.v1',
    family: L6FeatureFamilyId.MARKET,
    feature_id: 'market.return_1h',
    feature_version: '1.0.0',
    scope_type: 'ASSET', scope_id: 'btc',
    as_of: '2026-01-01T00:00:00Z',
    window_id: 'w:1h:2026-01-01T00:00:00Z',
    baseline_id: 'b:30d:2026-01-01T00:00:00Z',
    expected_value: 0.0125,
    validity_state: 'VALID',
    confidence_band: 'HIGH',
    replay_hash: 'rh:gf.market.ret_1h.btc.v1',
    materialization_mode: L6MaterializationMode.LIVE_MATERIALIZATION,
  },
  {
    case_id: 'gf.dex.liq_ratio.pair.v1',
    family: L6FeatureFamilyId.DEX,
    feature_id: 'dex.liquidity_ratio',
    feature_version: '1.0.0',
    scope_type: 'PAIR', scope_id: 'uniswap:eth-usdc',
    as_of: '2026-01-01T00:00:00Z',
    window_id: 'w:15m:2026-01-01T00:00:00Z',
    baseline_id: 'b:7d:2026-01-01T00:00:00Z',
    expected_value: 0.87,
    validity_state: 'VALID',
    confidence_band: 'HIGH',
    replay_hash: 'rh:gf.dex.liq_ratio.pair.v1',
    materialization_mode: L6MaterializationMode.LIVE_MATERIALIZATION,
  },
  {
    case_id: 'gf.deriv.funding_z.btc.v1',
    family: L6FeatureFamilyId.DERIVATIVES,
    feature_id: 'deriv.funding_zscore',
    feature_version: '1.0.0',
    scope_type: 'ASSET', scope_id: 'btc',
    as_of: '2026-01-01T00:00:00Z',
    window_id: 'w:1h:2026-01-01T00:00:00Z',
    baseline_id: 'b:30d:2026-01-01T00:00:00Z',
    expected_value: 2.4,
    validity_state: 'DEGRADED',
    confidence_band: 'MEDIUM',
    replay_hash: 'rh:gf.deriv.funding_z.btc.v1',
    materialization_mode: L6MaterializationMode.LIVE_MATERIALIZATION,
  },
  {
    case_id: 'gf.onchain.tvl_drift.v1',
    family: L6FeatureFamilyId.ONCHAIN,
    feature_id: 'onchain.tvl_drift',
    feature_version: '1.0.0',
    scope_type: 'PROJECT', scope_id: 'aave',
    as_of: '2026-01-01T00:00:00Z',
    window_id: 'w:1d:2026-01-01T00:00:00Z',
    baseline_id: 'b:30d:2026-01-01T00:00:00Z',
    expected_value: -0.12,
    validity_state: 'VALID',
    confidence_band: 'HIGH',
    replay_hash: 'rh:gf.onchain.tvl_drift.v1',
    materialization_mode: L6MaterializationMode.LIVE_MATERIALIZATION,
  },
  {
    case_id: 'gf.security.risk_score.v1',
    family: L6FeatureFamilyId.SECURITY,
    feature_id: 'security.risk_score',
    feature_version: '1.0.0',
    scope_type: 'CONTRACT', scope_id: '0xabc',
    as_of: '2026-01-01T00:00:00Z',
    window_id: 'w:1d:2026-01-01T00:00:00Z',
    baseline_id: null,
    expected_value: 0.62,
    validity_state: 'VALID',
    confidence_band: 'MEDIUM',
    replay_hash: 'rh:gf.security.risk_score.v1',
    materialization_mode: L6MaterializationMode.LIVE_MATERIALIZATION,
  },
  {
    case_id: 'gf.narrative.momentum.v1',
    family: L6FeatureFamilyId.NARRATIVE,
    feature_id: 'narrative.momentum',
    feature_version: '1.0.0',
    scope_type: 'NARRATIVE', scope_id: 'ai-agents',
    as_of: '2026-01-01T00:00:00Z',
    window_id: 'w:4h:2026-01-01T00:00:00Z',
    baseline_id: 'b:7d:2026-01-01T00:00:00Z',
    expected_value: 0.48,
    validity_state: 'PROVISIONAL',
    confidence_band: 'LOW',
    replay_hash: 'rh:gf.narrative.momentum.v1',
    materialization_mode: L6MaterializationMode.LIVE_MATERIALIZATION,
  },
  {
    case_id: 'gf.entity.flow.v1',
    family: L6FeatureFamilyId.ENTITY,
    feature_id: 'entity.flow_net',
    feature_version: '1.0.0',
    scope_type: 'ADDRESS', scope_id: '0xwhale',
    as_of: '2026-01-01T00:00:00Z',
    window_id: 'w:1d:2026-01-01T00:00:00Z',
    baseline_id: 'b:30d:2026-01-01T00:00:00Z',
    expected_value: 1e6,
    validity_state: 'VALID',
    confidence_band: 'HIGH',
    replay_hash: 'rh:gf.entity.flow.v1',
    materialization_mode: L6MaterializationMode.LIVE_MATERIALIZATION,
  },
  {
    case_id: 'gf.protocol.gov_stress.v1',
    family: L6FeatureFamilyId.PROTOCOL,
    feature_id: 'protocol.governance_stress',
    feature_version: '1.0.0',
    scope_type: 'PROJECT', scope_id: 'uniswap',
    as_of: '2026-01-01T00:00:00Z',
    window_id: 'w:1d:2026-01-01T00:00:00Z',
    baseline_id: null,
    expected_value: 0.34,
    validity_state: 'VALID',
    confidence_band: 'MEDIUM',
    replay_hash: 'rh:gf.protocol.gov_stress.v1',
    materialization_mode: L6MaterializationMode.LIVE_MATERIALIZATION,
  },
]);

export const GOLDEN_EVENTS: readonly L6GoldenEventPrimitive[] = Object.freeze([
  {
    case_id: 'ge.whale.accum.cluster.v1',
    family: L6EventFamilyId.WHALE_ACCUMULATION_CLUSTER,
    event_id: 'event.whale_accum_cluster',
    event_version: '1.0.0',
    event_instance_id: 'inst-whale-001',
    scope_type: 'ASSET', scope_id: 'btc',
    lifecycle_state: 'CONFIRMED',
    severity_band: 'HIGH',
    confidence_band: 'HIGH',
    dedupe_key: 'whale|btc|2026-01-01|cluster-01',
    replay_hash: 'rh:ge.whale.accum.cluster.v1',
  },
  {
    case_id: 'ge.funding.spike.v1',
    family: L6EventFamilyId.FUNDING_SPIKE,
    event_id: 'event.funding_spike',
    event_version: '1.0.0',
    event_instance_id: 'inst-funding-001',
    scope_type: 'ASSET', scope_id: 'eth',
    lifecycle_state: 'ACTIVE',
    severity_band: 'MEDIUM',
    confidence_band: 'HIGH',
    dedupe_key: 'funding|eth|2026-01-01T00:00:00Z',
    replay_hash: 'rh:ge.funding.spike.v1',
  },
  {
    case_id: 'ge.liq.burst.v1',
    family: L6EventFamilyId.LIQUIDATION_BURST,
    event_id: 'event.liquidation_burst',
    event_version: '1.0.0',
    event_instance_id: 'inst-liq-001',
    scope_type: 'ASSET', scope_id: 'btc',
    lifecycle_state: 'RESOLVED',
    severity_band: 'CRITICAL',
    confidence_band: 'HIGH',
    dedupe_key: 'liq|btc|2026-01-01T00:30:00Z',
    replay_hash: 'rh:ge.liq.burst.v1',
  },
  {
    case_id: 'ge.new.pair.v1',
    family: L6EventFamilyId.NEW_PAIR_CREATED,
    event_id: 'event.new_pair_created',
    event_version: '1.0.0',
    event_instance_id: 'inst-pair-001',
    scope_type: 'PAIR', scope_id: 'uniswap:abc-usdc',
    lifecycle_state: 'CONFIRMED',
    severity_band: 'LOW',
    confidence_band: 'HIGH',
    dedupe_key: 'newpair|uniswap:abc-usdc',
    replay_hash: 'rh:ge.new.pair.v1',
  },
  {
    case_id: 'ge.security.risk.v1',
    family: L6EventFamilyId.SECURITY_RISK_CHANGE,
    event_id: 'event.security_risk',
    event_version: '1.0.0',
    event_instance_id: 'inst-sec-001',
    scope_type: 'CONTRACT', scope_id: '0xabc',
    lifecycle_state: 'ACTIVE',
    severity_band: 'CRITICAL',
    confidence_band: 'MEDIUM',
    dedupe_key: 'security|0xabc|2026-01-01',
    replay_hash: 'rh:ge.security.risk.v1',
  },
]);

/**
 * Stable corpus fingerprint. Changes only when primitive meaning changes.
 */
export function goldenCorpusSnapshot(): readonly string[] {
  const lines: string[] = [];
  for (const f of GOLDEN_FEATURES) lines.push(`F|${f.case_id}|${f.replay_hash}|${f.validity_state}`);
  for (const e of GOLDEN_EVENTS) lines.push(`E|${e.case_id}|${e.replay_hash}|${e.lifecycle_state}`);
  lines.sort();
  return lines;
}
