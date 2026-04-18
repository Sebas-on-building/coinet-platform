/**
 * L7.8 — Concurrency / Load Scenarios
 *
 * §7.8.4.1 Band G — Runtime stability under production conditions:
 * concurrent validation runs on the same scope must remain deterministic;
 * contradiction bundling must be stable under bursty event flow;
 * recompute backlog must recover without semantic drift.
 *
 * These are declarative scenario specs; the band test consumes them and
 * asserts observed behavior against `expected_*` fields.
 */

import { L7ValidationFamilyId } from '../contracts/validation-family-definition';

export enum L7LoadScenarioKind {
  CONCURRENT_SAME_SCOPE = 'CONCURRENT_SAME_SCOPE',
  BURSTY_CONTRADICTION_CLUSTERING = 'BURSTY_CONTRADICTION_CLUSTERING',
  RECOMPUTE_BACKLOG_DRAIN = 'RECOMPUTE_BACKLOG_DRAIN',
  CROSS_FAMILY_FAN_OUT = 'CROSS_FAMILY_FAN_OUT',
  LATE_DATA_REPROJECTION_STORM = 'LATE_DATA_REPROJECTION_STORM',
  REPLAY_AND_LIVE_RACE = 'REPLAY_AND_LIVE_RACE',
}

export interface L7LoadScenario {
  readonly case_id: string;
  readonly kind: L7LoadScenarioKind;
  readonly family: L7ValidationFamilyId;
  readonly scope_id: string;
  readonly concurrency: number;
  readonly event_burst_size: number;
  readonly expected_max_duplicate_validations: 0;
  readonly expected_deterministic_outputs: true;
  readonly expected_drift_tolerance: 0;
  readonly description: string;
}

export const L7_LOAD_SCENARIOS: readonly L7LoadScenario[] = Object.freeze([
  {
    case_id: 'load.market.concurrent_btc',
    kind: L7LoadScenarioKind.CONCURRENT_SAME_SCOPE,
    family: L7ValidationFamilyId.MARKET_STRENGTH_VALIDATION,
    scope_id: 'BTC', concurrency: 8, event_burst_size: 0,
    expected_max_duplicate_validations: 0,
    expected_deterministic_outputs: true,
    expected_drift_tolerance: 0,
    description: 'Eight concurrent validation runs on same scope must produce identical single authoritative row.',
  },
  {
    case_id: 'load.derivatives.contradiction_burst_sol',
    kind: L7LoadScenarioKind.BURSTY_CONTRADICTION_CLUSTERING,
    family: L7ValidationFamilyId.DERIVATIVES_CONTRADICTION_VALIDATION,
    scope_id: 'SOL', concurrency: 4, event_burst_size: 200,
    expected_max_duplicate_validations: 0,
    expected_deterministic_outputs: true,
    expected_drift_tolerance: 0,
    description: 'Bursty price/flow divergence events must bundle deterministically.',
  },
  {
    case_id: 'load.narrative.backlog_drain',
    kind: L7LoadScenarioKind.RECOMPUTE_BACKLOG_DRAIN,
    family: L7ValidationFamilyId.NARRATIVE_VALIDATION,
    scope_id: 'PEPE', concurrency: 2, event_burst_size: 0,
    expected_max_duplicate_validations: 0,
    expected_deterministic_outputs: true,
    expected_drift_tolerance: 0,
    description: 'Backlog drain must converge to a single consistent current state.',
  },
  {
    case_id: 'load.cross_domain.fan_out',
    kind: L7LoadScenarioKind.CROSS_FAMILY_FAN_OUT,
    family: L7ValidationFamilyId.CROSS_DOMAIN_ALIGNMENT_VALIDATION,
    scope_id: 'L2_BASKET', concurrency: 6, event_burst_size: 50,
    expected_max_duplicate_validations: 0,
    expected_deterministic_outputs: true,
    expected_drift_tolerance: 0,
    description: 'Cross-family fan-out must serialize on subject identity without drift.',
  },
  {
    case_id: 'load.risk.late_data_storm',
    kind: L7LoadScenarioKind.LATE_DATA_REPROJECTION_STORM,
    family: L7ValidationFamilyId.RISK_OVERHANG_VALIDATION,
    scope_id: 'XYZ', concurrency: 4, event_burst_size: 500,
    expected_max_duplicate_validations: 0,
    expected_deterministic_outputs: true,
    expected_drift_tolerance: 0,
    description: 'Late-data reprojection must not silently mutate current state.',
  },
  {
    case_id: 'load.accumulation.replay_live_race',
    kind: L7LoadScenarioKind.REPLAY_AND_LIVE_RACE,
    family: L7ValidationFamilyId.ACCUMULATION_VALIDATION,
    scope_id: 'DOGE', concurrency: 4, event_burst_size: 0,
    expected_max_duplicate_validations: 0,
    expected_deterministic_outputs: true,
    expected_drift_tolerance: 0,
    description: 'Replay and live runs on same scope must not overwrite each other.',
  },
]);

export const ALL_L7_LOAD_SCENARIO_KINDS: readonly L7LoadScenarioKind[] =
  Object.values(L7LoadScenarioKind);
