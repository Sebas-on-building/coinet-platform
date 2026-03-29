/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     BASE CONNECTOR — Governed Truth-Ingress Contract                          ║
 * ║                                                                               ║
 * ║   A connector is not simply an HTTP client or a fetch wrapper.                ║
 * ║   A connector is a governed ingestion component that manages the              ║
 * ║   entire ingress lifecycle:                                                   ║
 * ║                                                                               ║
 * ║     1. Acquire   — Get data from external source                              ║
 * ║     2. Validate  — Validate schema, shape, and minimum completeness           ║
 * ║     3. Classify  — Attach source, entity type, chain, trust metadata          ║
 * ║     4. Timing    — Compute observation time, ingestion time, freshness        ║
 * ║     5. Normalize — Produce a stable internal fragment                         ║
 * ║     6. Trace     — Assign trace ID and preserve raw payload                   ║
 * ║     7. Fallback  — Mark whether data came from primary/fallback/degraded      ║
 * ║                                                                               ║
 * ║   Only after all seven steps is a connector output valid.                     ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type {
  ConnectorConfig,
  ConnectorAcquireParams,
  ConnectorResult,
  ConnectorEnvelope,
  ConnectorLifecycleTrace,
  EntityType,
  TrustClass,
  FallbackStatus,
  Freshness,
  RoutingMode,
} from './types';
import { generateTraceId } from './trace';
import { computeFreshness, computeFreshnessNoSourceTime } from './freshness';
import { validateEnvelope } from './envelope-validator';
import {
  getRoutingModeFromCategory,
  resolveIngressOrigin,
  computeModeOperationalFlags,
} from './routing-modes';
import { recordSuccess, recordFailure } from '../source-systems/health-monitor';
import { buildFallbackEpistemicMetadata, buildFallbackEpistemicMetadataForFailure } from './fallback-design';

// ═══════════════════════════════════════════════════════════════════════════════
// RAW ACQUISITION RESULT — What the provider-specific acquire step returns
// ═══════════════════════════════════════════════════════════════════════════════

export interface RawAcquisition<T = unknown> {
  ok: boolean;
  data?: T;
  raw?: unknown;
  error?: string;
  error_code?: string;
  /** Source-provided observation timestamp (unix ms), if available */
  source_timestamp?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ABSTRACT BASE CONNECTOR
// ═══════════════════════════════════════════════════════════════════════════════

export abstract class BaseConnector<TRaw = unknown, TNormalized = unknown> {
  readonly config: ConnectorConfig;

  constructor(config: ConnectorConfig) {
    this.config = config;
  }

  // ─── Abstract methods — each connector MUST implement these ─────────────

  /**
   * Step 1: Acquire data from the external source.
   * The connector is responsible for HTTP calls, timeouts, and error handling.
   */
  protected abstract acquire(
    params: ConnectorAcquireParams,
    timeoutMs: number,
  ): Promise<RawAcquisition<TRaw>>;

  /**
   * Step 2: Validate the raw response shape and minimum completeness.
   * Return issues array (empty = valid).
   */
  protected abstract validate(raw: TRaw): string[];

  /**
   * Step 5: Normalize provider-specific data into a stable internal fragment.
   * The fragment must be typed, minimal, and provider-decoupled.
   */
  protected abstract normalize(raw: TRaw, params: ConnectorAcquireParams): TNormalized;

  // ─── Overridable methods ────────────────────────────────────────────────

  /**
   * Step 3 (partial): Determine entity type for this execution.
   * Override if the connector can return multiple entity types.
   */
  protected classifyEntityType(params: ConnectorAcquireParams): EntityType {
    return params.entity_type ?? this.config.default_entity_type;
  }

  /**
   * Step 3 (partial): Build canonical candidate ID.
   * Override for connector-specific ID formats.
   */
  protected buildCanonicalCandidateId(params: ConnectorAcquireParams): string {
    if (params.canonical_candidate_id) return params.canonical_candidate_id;
    const entity = this.classifyEntityType(params);
    const id = params.symbol?.toLowerCase() ?? params.address ?? 'unknown';
    return `${entity}:${id}`;
  }

  /**
   * Step 3 (partial): Assess canonical ID confidence (0–1).
   * Rule 8: ambiguity must be preserved, never silently erased.
   *
   * Override when the connector has richer identity resolution context.
   * Default: 1.0 if caller provided explicit ID, 0.7 if derived from symbol,
   * 0.5 if derived from address alone, 0.3 if 'unknown'.
   */
  protected assessCanonicalConfidence(params: ConnectorAcquireParams): number {
    if (params.canonical_candidate_id) return 1.0;
    if (params.symbol && params.address) return 0.9;
    if (params.symbol) return 0.7;
    if (params.address) return 0.5;
    return 0.3;
  }

  /**
   * Step 3 (partial): Determine trust class based on current conditions.
   * Override for connector-specific trust logic.
   */
  protected classifyTrust(
    freshness: Freshness,
    isFallback: boolean,
  ): TrustClass {
    if (isFallback) return 'fallback';
    if (!freshness.acceptable) return 'degraded';
    if (freshness.bucket === 'live' || freshness.bucket === 'fresh') return 'high';
    if (freshness.bucket === 'acceptable') return 'medium';
    return 'low';
  }

  /**
   * Step 4 (partial): Extract observation timestamp from raw data.
   * Override when the source provides an authoritative observation time.
   */
  protected extractObservationTime(
    raw: TRaw,
    sourceTimestamp?: number,
  ): number {
    return sourceTimestamp ?? Date.now();
  }

  // ─── Main execution — the governed 7-step lifecycle ─────────────────────

  /**
   * Execute the full connector lifecycle.
   *
   * This is the only public method. It orchestrates:
   * acquire → validate → classify → timing → normalize → trace → fallback
   */
  async execute(params: ConnectorAcquireParams = {}): Promise<ConnectorResult<TNormalized>> {
    const startTime = Date.now();
    const timeoutMs = params.timeout_ms ?? this.config.default_timeout_ms;
    const traceId = generateTraceId();

    const lifecycleTrace: ConnectorLifecycleTrace = {
      connector_id: this.config.id,
      provider: this.config.provider,
      trace_id: traceId,
      started_at: startTime,
      steps: {} as ConnectorLifecycleTrace['steps'],
    };

    try {
      // ── Step 1: Acquire ──────────────────────────────────────────────
      const acquisition = await this.acquireWithTimeout(params, timeoutMs);
      const acquireLatency = Date.now() - startTime;

      lifecycleTrace.steps.acquire = {
        ok: acquisition.ok,
        latency_ms: acquireLatency,
        error: acquisition.error,
      };

      if (!acquisition.ok || !acquisition.data) {
        recordFailure(this.config.provider, acquireLatency);
        return this.failResult(
          acquisition.error ?? 'Acquisition failed',
          acquisition.error_code,
          startTime,
          traceId,
          params,
        );
      }

      // ── Step 2: Validate ─────────────────────────────────────────────
      const issues = this.validate(acquisition.data);
      lifecycleTrace.steps.validate = { ok: issues.length === 0, issues };

      if (issues.length > 0) {
        recordFailure(this.config.provider, acquireLatency);
        return this.failResult(
          `Validation failed: ${issues.join('; ')}`,
          'VALIDATION_FAILED',
          startTime,
          traceId,
          params,
        );
      }

      // ── Step 3: Classify ─────────────────────────────────────────────
      const ingestedAt = Date.now();
      const entityType = this.classifyEntityType(params);
      const canonicalId = this.buildCanonicalCandidateId(params);

      // ── Step 4: Timing ───────────────────────────────────────────────
      const observedAt = this.extractObservationTime(
        acquisition.data,
        acquisition.source_timestamp,
      );
      const freshness = acquisition.source_timestamp
        ? computeFreshness(observedAt, ingestedAt, this.config.provider)
        : computeFreshnessNoSourceTime(ingestedAt, this.config.provider);

      lifecycleTrace.steps.timing = { observed: observedAt, ingested: ingestedAt, freshness };

      // ── Step 3 (continued): Trust classification ─────────────────────
      const isFallback = params.is_fallback ?? false;
      const trustClass = this.classifyTrust(freshness, isFallback);

      lifecycleTrace.steps.classify = {
        entity_type: entityType,
        source_class: this.config.source_class,
        trust_class: trustClass,
      };

      // ── Step 5: Normalize ────────────────────────────────────────────
      const normalized = this.normalize(acquisition.data, params);
      const fragmentKeys = normalized && typeof normalized === 'object'
        ? Object.keys(normalized as Record<string, unknown>)
        : [];
      lifecycleTrace.steps.normalize = { ok: true, fragment_keys: fragmentKeys };

      // ── Step 6: Trace ────────────────────────────────────────────────
      lifecycleTrace.steps.trace = { trace_id: traceId };

      // ── Step 7: Fallback marking ─────────────────────────────────────
      const fallbackStatus: FallbackStatus = params.is_backfill
        ? 'backfill'
        : params.is_fallback
          ? 'fallback'
          : freshness.bucket === 'stale' || freshness.bucket === 'expired'
            ? 'degraded'
            : 'primary';

      lifecycleTrace.steps.fallback = { status: fallbackStatus };
      lifecycleTrace.completed_at = Date.now();

      // ── Resolve routing mode (4.2) ────────────────────────────────────
      const routingMode: RoutingMode =
        params.routing_mode ??
        this.config.routing_mode ??
        getRoutingModeFromCategory(this.config.category);

      const ingressOrigin = resolveIngressOrigin(routingMode, params.ingress_origin);
      const totalLatency = Date.now() - startTime;
      const modeOperationalFlags = computeModeOperationalFlags({
        latency_ms: totalLatency,
        freshness_bucket: freshness.bucket,
        routing_mode: routingMode,
        fallback_status: fallbackStatus,
      });

      const primaryForEpistemic = params.primary_provider_id_for_epistemic ?? this.config.provider;
      const fallbackEpistemic = buildFallbackEpistemicMetadata({
        truthClass: this.config.truth_class,
        primaryProviderId: primaryForEpistemic,
        effectiveProvider: this.config.provider,
        fallbackStatus,
        isFallbackExecution: isFallback,
        trustClass,
        modeOperationalFlags,
        partialLayer: params.partial_layer_degradation,
        authorityDowngrade: params.authority_downgrade,
        thesisCriticalTruthClasses: params.thesis_critical_truth_classes,
      });

      // ── Assemble envelope ────────────────────────────────────────────
      const canonicalConfidence = this.assessCanonicalConfidence(params);

      const envelope: ConnectorEnvelope<TNormalized> = {
        source: this.config.provider,
        entity_type: entityType,
        canonical_candidate_id: canonicalId,
        canonical_confidence: canonicalConfidence,
        chain: params.chain ?? null,
        timestamp_observed: observedAt,
        timestamp_ingested: ingestedAt,
        freshness,
        trust_class: trustClass,
        raw_payload: acquisition.raw ?? acquisition.data,
        normalized_payload_fragment: normalized,
        trace_id: traceId,
        fallback_status: fallbackStatus,
        routing_mode: routingMode,
        ingress_origin: ingressOrigin,
        mode_operational_flags: modeOperationalFlags,
        fallback_epistemic: fallbackEpistemic,
      };

      // ── Invariant enforcement — reject invalid envelopes ──────────
      const validation = validateEnvelope(envelope);
      if (!validation.valid) {
        const errors = validation.violations
          .filter(v => v.severity === 'error')
          .map(v => `[${v.invariant}] ${v.message}`)
          .join('; ');
        recordFailure(this.config.provider, Date.now() - startTime);
        return this.failResult(
          `Envelope invariant violation: ${errors}`,
          'ENVELOPE_INVALID',
          startTime,
          traceId,
          params,
        );
      }

      recordSuccess(this.config.provider, totalLatency);

      return {
        ok: true,
        envelope,
        latency_ms: totalLatency,
        connector_id: this.config.id,
        provider: this.config.provider,
        source_class: this.config.source_class,
        truth_class: this.config.truth_class,
        category: this.config.category,
        routing_mode: routingMode,
      };

    } catch (err: unknown) {
      const totalLatency = Date.now() - startTime;
      recordFailure(this.config.provider, totalLatency);

      const message = err instanceof Error ? err.message : String(err);
      const code = message.includes('timeout') ? 'TIMEOUT' : 'UNEXPECTED_ERROR';

      return this.failResult(message, code, startTime, traceId, params);
    }
  }

  // ─── Internal helpers ───────────────────────────────────────────────────

  private async acquireWithTimeout(
    params: ConnectorAcquireParams,
    timeoutMs: number,
  ): Promise<RawAcquisition<TRaw>> {
    return Promise.race([
      this.acquire(params, timeoutMs),
      new Promise<RawAcquisition<TRaw>>((resolve) =>
        setTimeout(
          () => resolve({ ok: false, error: `Connector timeout after ${timeoutMs}ms`, error_code: 'TIMEOUT' }),
          timeoutMs,
        ),
      ),
    ]);
  }

  private failResult(
    error: string,
    errorCode: string | undefined,
    startTime: number,
    traceId: string,
    params: ConnectorAcquireParams = {},
  ): ConnectorResult<TNormalized> {
    const routingMode: RoutingMode =
      params.routing_mode ??
      this.config.routing_mode ??
      getRoutingModeFromCategory(this.config.category);
    const fallbackEpistemic = buildFallbackEpistemicMetadataForFailure({
      truthClass: this.config.truth_class,
      primaryProviderId: this.config.provider,
      failedProvider: this.config.provider,
      reason: error,
    });
    return {
      ok: false,
      error,
      error_code: errorCode,
      latency_ms: Date.now() - startTime,
      connector_id: this.config.id,
      provider: this.config.provider,
      source_class: this.config.source_class,
      truth_class: this.config.truth_class,
      category: this.config.category,
      routing_mode: routingMode,
      fallback_epistemic: fallbackEpistemic,
    };
  }
}
