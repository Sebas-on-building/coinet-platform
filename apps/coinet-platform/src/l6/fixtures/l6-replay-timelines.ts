/**
 * L6.8 — Replay Timelines
 *
 * §6.8.4.2 Band E — Ordered input timelines used to verify that a replay
 * run reproduces the same primitive outputs (same replay_hash) as the
 * original live run.
 */

export interface L6ReplayTick {
  readonly t: string;
  readonly surface: string;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly payload_id: string;
}

export interface L6ReplayTimeline {
  readonly timeline_id: string;
  readonly description: string;
  readonly ticks: readonly L6ReplayTick[];
  readonly expected_feature_hashes: readonly string[];
  readonly expected_event_hashes: readonly string[];
}

export const REPLAY_TIMELINES: readonly L6ReplayTimeline[] = Object.freeze([
  {
    timeline_id: 'rpl.market.btc.1h',
    description: 'One hour of BTC trades yielding a stable market.return_1h feature.',
    ticks: [
      { t: '2026-01-01T00:05:00Z', surface: 'market.trade', scope_type: 'ASSET', scope_id: 'btc', payload_id: 'tr-001' },
      { t: '2026-01-01T00:20:00Z', surface: 'market.trade', scope_type: 'ASSET', scope_id: 'btc', payload_id: 'tr-002' },
      { t: '2026-01-01T00:55:00Z', surface: 'market.trade', scope_type: 'ASSET', scope_id: 'btc', payload_id: 'tr-003' },
    ],
    expected_feature_hashes: ['rh:gf.market.ret_1h.btc.v1'],
    expected_event_hashes: [],
  },
  {
    timeline_id: 'rpl.funding.spike.eth',
    description: 'Funding rate spike producing a confirmed funding-spike event.',
    ticks: [
      { t: '2026-01-01T00:00:00Z', surface: 'deriv.funding', scope_type: 'ASSET', scope_id: 'eth', payload_id: 'f-001' },
      { t: '2026-01-01T00:30:00Z', surface: 'deriv.funding', scope_type: 'ASSET', scope_id: 'eth', payload_id: 'f-002' },
      { t: '2026-01-01T01:00:00Z', surface: 'deriv.funding', scope_type: 'ASSET', scope_id: 'eth', payload_id: 'f-003' },
    ],
    expected_feature_hashes: ['rh:gf.deriv.funding_z.btc.v1'],
    expected_event_hashes: ['rh:ge.funding.spike.v1'],
  },
  {
    timeline_id: 'rpl.whale.accumulation',
    description: 'Clustered whale transfers producing a confirmed whale accumulation event.',
    ticks: [
      { t: '2026-01-01T00:10:00Z', surface: 'onchain.transfer', scope_type: 'ADDRESS', scope_id: '0xwhale', payload_id: 'tx-001' },
      { t: '2026-01-01T00:25:00Z', surface: 'onchain.transfer', scope_type: 'ADDRESS', scope_id: '0xwhale', payload_id: 'tx-002' },
      { t: '2026-01-01T00:45:00Z', surface: 'onchain.transfer', scope_type: 'ADDRESS', scope_id: '0xwhale', payload_id: 'tx-003' },
    ],
    expected_feature_hashes: ['rh:gf.entity.flow.v1'],
    expected_event_hashes: ['rh:ge.whale.accum.cluster.v1'],
  },
]);

export interface L6ReplayMismatch {
  readonly timeline_id: string;
  readonly missing_feature_hashes: readonly string[];
  readonly missing_event_hashes: readonly string[];
}

export function diffReplayOutputs(
  timeline: L6ReplayTimeline,
  observed_feature_hashes: ReadonlySet<string>,
  observed_event_hashes: ReadonlySet<string>,
): L6ReplayMismatch {
  const missingFeatures = timeline.expected_feature_hashes.filter(h => !observed_feature_hashes.has(h));
  const missingEvents = timeline.expected_event_hashes.filter(h => !observed_event_hashes.has(h));
  return {
    timeline_id: timeline.timeline_id,
    missing_feature_hashes: missingFeatures,
    missing_event_hashes: missingEvents,
  };
}
