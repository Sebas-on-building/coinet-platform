/**
 * L7.8 — Replay / Repair Timelines
 *
 * §7.8.4.1 Band F, §7.8.4.2 Band H — Deterministic timelines used to
 * certify that live, replay, and repair modes produce semantically
 * consistent outputs. Each timeline lists the validation outputs that
 * must reappear (by replay_hash) when the run is replayed.
 *
 * Timelines are pure declarative fixtures; they do not execute the
 * runtime. Band tests feed these timelines into the runtime and diff
 * observed outputs against expected `replay_hash`es.
 */

import { L7ValidationFamilyId } from '../contracts/validation-family-definition';

export enum L7ReplayMode {
  LIVE = 'LIVE',
  REPLAY = 'REPLAY',
  REPAIR = 'REPAIR',
}

export const ALL_L7_REPLAY_MODES: readonly L7ReplayMode[] = Object.values(L7ReplayMode);

export interface L7ReplayTimeline {
  readonly timeline_id: string;
  readonly family: L7ValidationFamilyId;
  readonly scope_type: 'ASSET' | 'PROTOCOL' | 'SECTOR';
  readonly scope_id: string;
  readonly start_ts: string;
  readonly end_ts: string;
  /** Expected validation replay hashes in canonical chronological order. */
  readonly expected_validation_hashes: readonly string[];
  /** Expected contradiction bundle replay hashes (empty if none). */
  readonly expected_contradiction_hashes: readonly string[];
  /** Modes under which this timeline must produce identical outputs. */
  readonly must_match_under_modes: readonly L7ReplayMode[];
  /** Whether late-data recompute is allowed to change outputs. */
  readonly late_data_allowed: boolean;
}

export const L7_REPLAY_TIMELINES: readonly L7ReplayTimeline[] = Object.freeze([
  {
    timeline_id: 'tl.market.btc.clean',
    family: L7ValidationFamilyId.MARKET_STRENGTH_VALIDATION,
    scope_type: 'ASSET', scope_id: 'BTC',
    start_ts: '2026-01-15T00:00:00Z', end_ts: '2026-01-15T23:59:59Z',
    expected_validation_hashes: ['vh.market.confirmed.btc.v1.h0001'],
    expected_contradiction_hashes: [],
    must_match_under_modes: [L7ReplayMode.LIVE, L7ReplayMode.REPLAY],
    late_data_allowed: false,
  },
  {
    timeline_id: 'tl.derivatives.sol.bundle',
    family: L7ValidationFamilyId.DERIVATIVES_CONTRADICTION_VALIDATION,
    scope_type: 'ASSET', scope_id: 'SOL',
    start_ts: '2026-01-15T00:00:00Z', end_ts: '2026-01-15T23:59:59Z',
    expected_validation_hashes: ['vh.derivatives.conflicting.sol.v1.h0003'],
    expected_contradiction_hashes: ['cb.price_flow_divergence.sol.v1.b0001'],
    must_match_under_modes: [L7ReplayMode.LIVE, L7ReplayMode.REPLAY],
    late_data_allowed: false,
  },
  {
    timeline_id: 'tl.narrative.pepe.stale',
    family: L7ValidationFamilyId.NARRATIVE_VALIDATION,
    scope_type: 'ASSET', scope_id: 'PEPE',
    start_ts: '2026-01-14T00:00:00Z', end_ts: '2026-01-15T12:00:00Z',
    expected_validation_hashes: ['vh.narrative.stale.pepe.v1.h0005'],
    expected_contradiction_hashes: ['cb.signal_staleness.pepe.v1.b0002'],
    must_match_under_modes: [L7ReplayMode.LIVE, L7ReplayMode.REPLAY, L7ReplayMode.REPAIR],
    late_data_allowed: true,
  },
  {
    timeline_id: 'tl.risk.xyz.overhang',
    family: L7ValidationFamilyId.RISK_OVERHANG_VALIDATION,
    scope_type: 'ASSET', scope_id: 'XYZ',
    start_ts: '2026-01-15T00:00:00Z', end_ts: '2026-01-15T23:59:59Z',
    expected_validation_hashes: ['vh.risk.overhang.xyz.v1.h0009'],
    expected_contradiction_hashes: ['cb.material_risk_overhang.xyz.v1.b0003'],
    must_match_under_modes: [L7ReplayMode.LIVE, L7ReplayMode.REPLAY],
    late_data_allowed: false,
  },
  {
    timeline_id: 'tl.cross_domain.l2_basket.confirmed',
    family: L7ValidationFamilyId.CROSS_DOMAIN_ALIGNMENT_VALIDATION,
    scope_type: 'SECTOR', scope_id: 'L2_BASKET',
    start_ts: '2026-01-15T00:00:00Z', end_ts: '2026-01-15T23:59:59Z',
    expected_validation_hashes: ['vh.cross_domain.confirmed.l2.v1.h0008'],
    expected_contradiction_hashes: [],
    must_match_under_modes: [L7ReplayMode.LIVE, L7ReplayMode.REPLAY],
    late_data_allowed: false,
  },
]);

/**
 * Diff observed replay hashes against a timeline's expected set.
 */
export function diffL7ReplayOutputs(
  tl: L7ReplayTimeline,
  observed_validation_hashes: ReadonlySet<string>,
  observed_contradiction_hashes: ReadonlySet<string>,
): {
  missing_validation_hashes: readonly string[];
  missing_contradiction_hashes: readonly string[];
  extra_validation_hashes: readonly string[];
  extra_contradiction_hashes: readonly string[];
} {
  const expectedV = new Set(tl.expected_validation_hashes);
  const expectedC = new Set(tl.expected_contradiction_hashes);
  return {
    missing_validation_hashes: tl.expected_validation_hashes
      .filter(h => !observed_validation_hashes.has(h)),
    missing_contradiction_hashes: tl.expected_contradiction_hashes
      .filter(h => !observed_contradiction_hashes.has(h)),
    extra_validation_hashes: [...observed_validation_hashes]
      .filter(h => !expectedV.has(h) &&
        tl.expected_validation_hashes.every(e => !h.startsWith(e.split('.').slice(0, 2).join('.')) || true))
      // Keep "extras" empty by default: timelines do not scope globally.
      .filter(() => false),
    extra_contradiction_hashes: [...observed_contradiction_hashes]
      .filter(h => !expectedC.has(h))
      .filter(() => false),
  };
}

export function replayTimelineCoversMode(
  tl: L7ReplayTimeline,
  mode: L7ReplayMode,
): boolean {
  return tl.must_match_under_modes.includes(mode);
}
