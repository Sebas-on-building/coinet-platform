/**
 * L6.8 — Concurrency & Load Cases
 *
 * §6.8.4.2 Band G, §6.8.6.1–6.8.6.2 — Load and concurrency scenarios.
 */

export enum L6LoadScenarioKind {
  HIGH_FREQUENCY_FACTS = 'HIGH_FREQUENCY_FACTS',
  EVENT_BURST = 'EVENT_BURST',
  BASELINE_WINDOW_UNDER_LOAD = 'BASELINE_WINDOW_UNDER_LOAD',
  BACKLOG_RECOVERY = 'BACKLOG_RECOVERY',
  DUPLICATE_TRIGGER = 'DUPLICATE_TRIGGER',
  WATERMARK_RACE = 'WATERMARK_RACE',
  EVENT_TRANSITION_RACE = 'EVENT_TRANSITION_RACE',
  REMATERIALIZATION_CONFLICT = 'REMATERIALIZATION_CONFLICT',
}

export interface L6ConcurrencyLoadCase {
  readonly case_id: string;
  readonly kind: L6LoadScenarioKind;
  readonly description: string;
  readonly expected_guarantee: string;
  readonly target_scope_type: string;
  readonly target_scope_id: string;
  readonly concurrency: number;
  readonly burst_size: number;
  readonly expected_max_duplicates_emitted: number;
}

export const CONCURRENCY_LOAD_CASES: readonly L6ConcurrencyLoadCase[] = Object.freeze([
  {
    case_id: 'cl.high_freq.btc',
    kind: L6LoadScenarioKind.HIGH_FREQUENCY_FACTS,
    description: 'High-frequency BTC trade fact arrivals; feature recompute must remain deterministic.',
    expected_guarantee: 'output values depend only on finalized window inputs',
    target_scope_type: 'ASSET', target_scope_id: 'btc',
    concurrency: 8, burst_size: 10_000,
    expected_max_duplicates_emitted: 0,
  },
  {
    case_id: 'cl.event_burst.funding.eth',
    kind: L6LoadScenarioKind.EVENT_BURST,
    description: 'Funding rate spike burst; event detection must dedupe deterministically.',
    expected_guarantee: 'dedupe by dedupe_key; no storm',
    target_scope_type: 'ASSET', target_scope_id: 'eth',
    concurrency: 4, burst_size: 500,
    expected_max_duplicates_emitted: 0,
  },
  {
    case_id: 'cl.baseline_under_load',
    kind: L6LoadScenarioKind.BASELINE_WINDOW_UNDER_LOAD,
    description: 'Baseline window recomputation under concurrent fact bursts must remain stable.',
    expected_guarantee: 'baseline_id unchanged for same window boundaries',
    target_scope_type: 'ASSET', target_scope_id: 'btc',
    concurrency: 6, burst_size: 5_000,
    expected_max_duplicates_emitted: 0,
  },
  {
    case_id: 'cl.backlog.recovery',
    kind: L6LoadScenarioKind.BACKLOG_RECOVERY,
    description: 'Catch-up from backlog must converge without semantic drift.',
    expected_guarantee: 'no current-state divergence vs live',
    target_scope_type: 'ASSET', target_scope_id: 'btc',
    concurrency: 4, burst_size: 100_000,
    expected_max_duplicates_emitted: 0,
  },
  {
    case_id: 'cl.dup_trigger',
    kind: L6LoadScenarioKind.DUPLICATE_TRIGGER,
    description: 'Duplicate compute-run triggers must be idempotent.',
    expected_guarantee: 'same compute_run_id produces identical outputs',
    target_scope_type: 'ASSET', target_scope_id: 'btc',
    concurrency: 3, burst_size: 10,
    expected_max_duplicates_emitted: 0,
  },
  {
    case_id: 'cl.watermark_race',
    kind: L6LoadScenarioKind.WATERMARK_RACE,
    description: 'Parallel watermark advances may not lose events.',
    expected_guarantee: 'watermark advances monotonically',
    target_scope_type: 'ASSET', target_scope_id: 'btc',
    concurrency: 4, burst_size: 50,
    expected_max_duplicates_emitted: 0,
  },
  {
    case_id: 'cl.event_transition_race',
    kind: L6LoadScenarioKind.EVENT_TRANSITION_RACE,
    description: 'Concurrent event lifecycle transitions must be serialized per event_instance_id.',
    expected_guarantee: 'transition order matches state machine',
    target_scope_type: 'ASSET', target_scope_id: 'eth',
    concurrency: 4, burst_size: 20,
    expected_max_duplicates_emitted: 0,
  },
  {
    case_id: 'cl.remat_conflict',
    kind: L6LoadScenarioKind.REMATERIALIZATION_CONFLICT,
    description: 'Two late-data rematerializations targeting same scope must resolve deterministically.',
    expected_guarantee: 'last legal supersession wins with tagged lineage',
    target_scope_type: 'ASSET', target_scope_id: 'btc',
    concurrency: 2, burst_size: 2,
    expected_max_duplicates_emitted: 0,
  },
]);
