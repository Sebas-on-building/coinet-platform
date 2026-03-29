/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     CONNECTOR & ROUTING LAYER — Layer 2 Type System                           ║
 * ║                                                                               ║
 * ║   The ConnectorEnvelope is the minimum valid unit of data ingress in Coinet.  ║
 * ║   No downstream system may ever consume raw provider output.                  ║
 * ║   Everything enters through this contract.                                    ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type { SourceClass, TruthClass } from '../source-systems/registry';

// ═══════════════════════════════════════════════════════════════════════════════
// ENTITY TYPE — What kind of object the payload refers to
// ═══════════════════════════════════════════════════════════════════════════════

export type EntityType =
  | 'asset'
  | 'pair'
  | 'protocol'
  | 'wallet'
  | 'chain'
  | 'narrative'
  | 'market_event';

// ═══════════════════════════════════════════════════════════════════════════════
// TRUST CLASS — Current usable trust, not abstract provider reputation
// ═══════════════════════════════════════════════════════════════════════════════

export type TrustClass =
  | 'high'       // Primary source, healthy, fresh
  | 'medium'     // Primary source but slightly stale, or strong secondary
  | 'low'        // Degraded primary or weaker secondary
  | 'degraded'   // Source is unhealthy or data is significantly stale
  | 'fallback';  // Data came from a fallback path

// ═══════════════════════════════════════════════════════════════════════════════
// FALLBACK STATUS — How the data was obtained
// ═══════════════════════════════════════════════════════════════════════════════

export type FallbackStatus =
  | 'primary'    // Direct from primary source
  | 'fallback'   // From a fallback provider
  | 'cached'     // From trusted cached state
  | 'degraded'   // Reconstructed under degraded conditions
  | 'backfill';  // From historical/replay process

// ═══════════════════════════════════════════════════════════════════════════════
// FALLBACK DESIGN — Section 4.3 (semantic / epistemic)
// ═══════════════════════════════════════════════════════════════════════════════

/** 4.3.4 — semantic classification of fallback (not just transport) */
export type FallbackSemanticCategory =
  | 'source_substitution'
  | 'cached_trusted_state'
  | 'temporal_downgrade'
  | 'authority_downgrade'
  | 'partial_layer'
  | 'no_fallback_failure';

/** 4.3.3 B — required distinction between live, retained, substitute, historical */
export type TruthStateKind =
  | 'live_primary_truth'
  | 'retained_trusted_state'
  | 'fallback_source_truth'
  | 'historical_backfill_state'
  /** Ingress failed — no envelope; judgment layer must not assume observation */
  | 'layer_unavailable';

/**
 * 4.3.3 A — whether a substitute is semantically equivalent to primary for the claim class.
 * `unknown` until provider-tier / cross-check logic fills it (P1 improvement).
 */
export type SubstitutionSemantics =
  | 'equivalent'
  | 'degraded'
  | 'unknown'
  | 'not_applicable';

/**
 * 4.3.3 A — whether current output can support full vs partial vs no judgment for this layer.
 */
export type JudgmentMeaningfulness =
  | 'full'
  | 'bounded_partial'
  | 'unavailable';

/**
 * 4.3.6 — Continuity hierarchy rank (attempt fallback in this order by semantic integrity).
 * Lower rank = higher integrity, attempted first.
 */
export type ContinuityHierarchyRank =
  | 1  // equivalent source substitution
  | 2  // domain-valid but lower-authority substitution
  | 3  // retained trusted state
  | 4  // bounded partial operation without the missing domain
  | 5; // explicit non-availability

/**
 * 4.3.5 Step 2 — Structured truth-loss accounting: what kind of knowledge was lost.
 */
export interface TruthLossAccounting {
  /** Which truth class lost (behavioral, structural, narrative, fundamental, safety, contextual) */
  lost_truth_class: TruthClass;
  /** Resolution lost (e.g. 'event-level timing' vs 'periodic snapshot') */
  lost_resolution: string;
  /** Freshness lost (e.g. 'live → stale', 'acceptable → expired') */
  lost_freshness: string;
  /** Timing precision lost (e.g. 'sub-second → multi-minute lag') */
  lost_timing_precision: string;
  /** Relational/contextual support lost (e.g. 'entity labels for whale flows') */
  lost_relational_context: string;
  /** Which hypotheses are weakened by this loss */
  weakened_hypotheses: readonly string[];
  /** Which scores must be penalized */
  penalized_scores: readonly string[];
  /** Which scenarios become less defensible */
  narrowed_scenarios: readonly string[];
}

/**
 * Machine-readable epistemic state at ingress (4.3.2 doctrine, 4.3.12 invariant 2).
 * Every successful envelope carries this; failures surface equivalent via ConnectorResult.
 */
export interface FallbackEpistemicMetadata {
  /** 4.3.4 Step 1 — system not under full-source conditions */
  degraded_mode_active: boolean;
  /** 4.3.5 Step 2 — semantic classification of what kind of loss */
  fallback_semantic_category: FallbackSemanticCategory | null;
  truth_state_kind: TruthStateKind;
  /** 4.3.5 — substitute quality vs primary */
  substitution_semantics: SubstitutionSemantics;
  /** 4.3.8 — whether meaningful bounded judgment remains for this truth dimension */
  judgment_meaningfulness: JudgmentMeaningfulness;
  /** 4.3.6 — which continuity hierarchy level was achieved */
  continuity_hierarchy_rank: ContinuityHierarchyRank;
  /** 0..1 suggested confidence deduction (scoring engine applies with thesis weighting) */
  confidence_penalty_suggestion: number;
  /** True when this truth class is thesis-critical for the active query */
  thesis_critical_for_query?: boolean;
  affected_truth_class: TruthClass;
  /** 4.3.5 Step 2 — structured truth-loss accounting */
  truth_loss_accounting: TruthLossAccounting | null;
  /** 4.3.8 Step 5 — score families to penalize */
  penalized_score_families: readonly string[];
  /** 4.3.9 Step 6 — explicit user-visible line; empty string when fully healthy */
  user_visible_layer_message: string;
  effective_provider: string;
  primary_provider_id: string;
  /** 4.3.8 — hard-blocker determination for this truth dimension */
  is_hard_blocker: boolean;
  epistemic_notes?: readonly string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONNECTOR CATEGORY — Transport mode classification (legacy, maps to RoutingMode)
// ═══════════════════════════════════════════════════════════════════════════════

export type ConnectorCategory =
  | 'polling'    // Scheduled provider fetches
  | 'stream'     // WebSocket or event-based flows
  | 'triggered'  // User-requested or AI-requested retrievals
  | 'backfill';  // Historical rebuilds, calibration, replay

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTING MODE — Formal execution class (4.2)
// ═══════════════════════════════════════════════════════════════════════════════

export type RoutingMode =
  | 'realtime'   // Perishable event truth — capture first, enrich safely
  | 'scheduled'  // Periodic state maintenance — regularity, cost efficiency
  | 'on_demand'  // Contextual depth tied to explicit user/system need
  | 'backfill';  // Historical reconstruction, calibration, replay

/**
 * Ingress origin — semantic class for how the observation entered (4.2.3 Rule 1).
 * Must align with routing_mode; downstream uses this to avoid confusing live events with polls.
 */
export type IngressOrigin =
  | 'stream_event'       // Live event / websocket / webhook path (realtime)
  | 'periodic_fetch'     // Scheduled connector pull (scheduled)
  | 'user_triggered'     // Explicit user or intelligence action (on_demand)
  | 'historical_replay'; // Backfill, calibration, audit replay (backfill)

/** Scheduled cadence tier — domain-aware refresh economics (4.2.4) */
export type ScheduledCadenceTier = 'high_frequency' | 'medium_frequency' | 'low_frequency';

/**
 * Per-envelope operational flags so mode semantics stay visible downstream (4.2.2, 4.2.8).
 * Computed at ingress from latency, freshness vs mode contract, and fallback path.
 */
export interface ModeOperationalFlags {
  /** Total connector latency exceeded mode contract */
  latency_exceeds_contract: boolean;
  /** Freshness bucket not in mode's acceptable set */
  freshness_below_mode_standard: boolean;
  /** Realtime path used cache/fallback/degraded or sub-mode freshness — timing-sensitive outputs must downgrade */
  temporal_downgrade: boolean;
}

/** Operational contract for a routing mode — full 4.2.2 doctrine */
export interface RoutingModeContract {
  mode: RoutingMode;
  /** Max acceptable latency (ms) before degraded */
  latency_expectation_ms: number;
  /** Freshness buckets acceptable for this mode */
  freshness_acceptable_buckets: readonly string[];
  /** Max retries before giving up / escalating */
  retry_budget: number;
  /** Max fallback depth (primary → fallback chain) */
  fallback_depth: number;
  /** Whether cached data is permissible under mode doctrine */
  cache_permissible: boolean;
  /** Downstream scheduling priority — higher = must not be starved by lower (4.2.4 Rule 4) */
  downstream_priority: number;
  /** Retry semantics summary */
  retry_behavior: string;
  /** Fallback semantics when primary fails */
  fallback_behavior: string;
  /** How this mode degrades (4.2.8) */
  degradation_semantics: string;
  /** Downstream consumers that may consume envelopes in this mode (4.2.3–4.2.6) */
  allowed_downstream_consumers: readonly string[];
  /** Realtime only — workloads that must NOT auto-fire on every envelope */
  forbidden_auto_triggers?: readonly string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// FRESHNESS — Computed at ingress, never guessed downstream
// ═══════════════════════════════════════════════════════════════════════════════

export type FreshnessBucket =
  | 'live'        // < 5s — realtime
  | 'fresh'       // < expected freshness threshold
  | 'acceptable'  // < 2× expected freshness threshold
  | 'stale'       // > 2× expected freshness threshold
  | 'expired';    // > 5× expected freshness threshold or manual expiry

export interface Freshness {
  /** Age of observation in seconds at ingestion time */
  age_seconds: number;
  /** Classified freshness bucket */
  bucket: FreshnessBucket;
  /** Whether this freshness is acceptable for the use case */
  acceptable: boolean;
  /** Provider's expected freshness threshold in ms */
  threshold_ms: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONNECTOR ENVELOPE — The standard internal ingress unit
// ═══════════════════════════════════════════════════════════════════════════════

export interface ConnectorEnvelope<T = unknown> {
  /** Concrete provider identity (e.g. 'coingecko', 'dexscreener') */
  source: string;

  /** Kind of object the payload refers to */
  entity_type: EntityType;

  /** Best current internal candidate ID (e.g. 'asset:btc', 'pair:sol-usdc-raydium') */
  canonical_candidate_id: string;

  /**
   * Confidence in the canonical_candidate_id (0–1).
   * 1.0 = identity is fully resolved and certain.
   * < 1.0 = ambiguity exists; downstream must not treat as authoritative.
   * Required by Rule 8: identity ambiguity must be preserved, never silently erased.
   */
  canonical_confidence: number;

  /** Relevant chain/network context (null if truly chain-agnostic) */
  chain: string | null;

  /** When the data was observed/valid at the source (unix ms) */
  timestamp_observed: number;

  /** When Coinet received and wrapped the data (unix ms) */
  timestamp_ingested: number;

  /** Computed freshness assessment */
  freshness: Freshness;

  /** Current usable trust classification */
  trust_class: TrustClass;

  /** Original provider response for auditability and replay */
  raw_payload: unknown;

  /** Provider-decoupled normalized data fragment */
  normalized_payload_fragment: T;

  /** Unique trace ID for cross-layer diagnostics */
  trace_id: string;

  /** How the data was obtained */
  fallback_status: FallbackStatus;

  /**
   * Routing mode — formal execution class (4.2).
   * Downstream must always know whether observation is live, periodic, user-triggered, or historical.
   */
  routing_mode: RoutingMode;

  /**
   * Ingress origin — stream vs periodic vs user vs replay (4.2.3 Rule 1).
   * Must be consistent with routing_mode.
   */
  ingress_origin: IngressOrigin;

  /** Mode-level operational flags for downstream confidence / timing (4.2.8) */
  mode_operational_flags: ModeOperationalFlags;

  /** 4.3 — fallback as truth-model: degraded mode, category, penalties, user-visible layer */
  fallback_epistemic: FallbackEpistemicMetadata;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONNECTOR RESULT — What a connector execution returns
// ═══════════════════════════════════════════════════════════════════════════════

export interface ConnectorResult<T = unknown> {
  ok: boolean;
  envelope?: ConnectorEnvelope<T>;
  error?: string;
  error_code?: string;
  latency_ms: number;
  connector_id: string;
  provider: string;
  source_class: SourceClass;
  truth_class: TruthClass;
  category: ConnectorCategory;
  routing_mode: RoutingMode;
  /** Present when ok: false — semantic failure state for downstream (4.3.7) */
  fallback_epistemic?: FallbackEpistemicMetadata;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONNECTOR CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface ConnectorConfig {
  /** Unique connector identifier */
  id: string;
  /** Provider this connector integrates with */
  provider: string;
  /** Source class in the source-systems registry */
  source_class: SourceClass;
  /** Truth class this connector contributes to */
  truth_class: TruthClass;
  /** Transport mode */
  category: ConnectorCategory;
  /** Routing mode — formal execution class (4.2). Defaults from category if omitted. */
  routing_mode?: RoutingMode;
  /** For scheduled connectors: refresh tier for cadence policy (4.2.4) */
  scheduled_cadence_tier?: ScheduledCadenceTier;
  /** Default entity type for this connector */
  default_entity_type: EntityType;
  /** Default timeout in ms */
  default_timeout_ms: number;
  /** Whether this connector is enabled */
  enabled: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONNECTOR ACQUIRE PARAMS — Input to connector execution
// ═══════════════════════════════════════════════════════════════════════════════

export interface ConnectorAcquireParams {
  /** Symbol to query (e.g. 'BTC', 'SOL') */
  symbol?: string;
  /** Contract address */
  address?: string | null;
  /** Chain identifier */
  chain?: string;
  /** Override timeout for this execution */
  timeout_ms?: number;
  /** Override entity type */
  entity_type?: EntityType;
  /** Override canonical candidate ID */
  canonical_candidate_id?: string;
  /** Mark this as a fallback execution */
  is_fallback?: boolean;
  /** Mark this as a backfill execution */
  is_backfill?: boolean;
  /** Override routing mode (default: derived from connector category) */
  routing_mode?: RoutingMode;
  /** Override ingress origin (must still align with routing_mode unless backfill replay) */
  ingress_origin?: IngressOrigin;
  /** 4.3.4 partial-layer degradation (e.g. transfers without labels) */
  partial_layer_degradation?: boolean;
  /** 4.3.4 weaker substitute in same truth class */
  authority_downgrade?: boolean;
  /** When executing a registry fallback chain — id of module primary for 4.3 epistemic attribution */
  primary_provider_id_for_epistemic?: string;
  /**
   * 4.3.3 C — When the current judgment thesis is leverage-led, fundamentals-led, etc.,
   * downstream passes which truth classes are thesis-critical so confidence penalties amplify.
   */
  thesis_critical_truth_classes?: TruthClass[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONNECTOR LIFECYCLE HOOKS
// ═══════════════════════════════════════════════════════════════════════════════

export interface ConnectorLifecycleTrace {
  connector_id: string;
  provider: string;
  trace_id: string;
  started_at: number;
  completed_at?: number;
  steps: {
    acquire: { ok: boolean; latency_ms: number; error?: string };
    validate: { ok: boolean; issues?: string[] };
    classify: { entity_type: EntityType; source_class: SourceClass; trust_class: TrustClass };
    timing: { observed: number; ingested: number; freshness: Freshness };
    normalize: { ok: boolean; fragment_keys?: string[] };
    trace: { trace_id: string };
    fallback: { status: FallbackStatus };
  };
}
