/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     ENVELOPE VALIDATOR — Runtime Invariant Enforcement                        ║
 * ║                                                                               ║
 * ║   The envelope is the first formal truth object in the system.                ║
 * ║   If it is weak, everything downstream inherits ambiguity.                    ║
 * ║   If it is precise, everything downstream reasons with confidence.            ║
 * ║                                                                               ║
 * ║   This module enforces:                                                       ║
 * ║     - 7 envelope invariants (4.1.4)                                           ║
 * ║     - 8 contract rules (4.1.5)                                                ║
 * ║     - All forbidden behaviors specified in 4.1.3                              ║
 * ║     - The production-readiness standard of 4.1.6                              ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type {
  ConnectorEnvelope,
  EntityType,
  TrustClass,
  FallbackStatus,
  FreshnessBucket,
  RoutingMode,
  IngressOrigin,
  ModeOperationalFlags,
  TruthStateKind,
  FallbackEpistemicMetadata,
  SubstitutionSemantics,
  JudgmentMeaningfulness,
  ContinuityHierarchyRank,
} from './types';
import { ROUTING_MODE_TO_INGRESS_ORIGIN } from './routing-modes';

// ═══════════════════════════════════════════════════════════════════════════════
// CONTROLLED VOCABULARIES
// ═══════════════════════════════════════════════════════════════════════════════

const VALID_ENTITY_TYPES: ReadonlySet<EntityType> = new Set([
  'asset', 'pair', 'protocol', 'wallet', 'chain', 'narrative', 'market_event',
]);

const VALID_TRUST_CLASSES: ReadonlySet<TrustClass> = new Set([
  'high', 'medium', 'low', 'degraded', 'fallback',
]);

const VALID_FALLBACK_STATUSES: ReadonlySet<FallbackStatus> = new Set([
  'primary', 'fallback', 'cached', 'degraded', 'backfill',
]);

const VALID_FRESHNESS_BUCKETS: ReadonlySet<FreshnessBucket> = new Set([
  'live', 'fresh', 'acceptable', 'stale', 'expired',
]);

const VALID_ROUTING_MODES: ReadonlySet<RoutingMode> = new Set([
  'realtime', 'scheduled', 'on_demand', 'backfill',
]);

const VALID_INGRESS_ORIGINS: ReadonlySet<IngressOrigin> = new Set([
  'stream_event',
  'periodic_fetch',
  'user_triggered',
  'historical_replay',
]);

const VALID_TRUTH_STATE_KINDS: ReadonlySet<TruthStateKind> = new Set([
  'live_primary_truth',
  'retained_trusted_state',
  'fallback_source_truth',
  'historical_backfill_state',
  'layer_unavailable',
]);

const VALID_SUBSTITUTION_SEMANTICS: ReadonlySet<SubstitutionSemantics> = new Set([
  'equivalent',
  'degraded',
  'unknown',
  'not_applicable',
]);

const VALID_JUDGMENT_MEANINGFULNESS: ReadonlySet<JudgmentMeaningfulness> = new Set([
  'full',
  'bounded_partial',
  'unavailable',
]);

const FORBIDDEN_SOURCE_LABELS: ReadonlySet<string> = new Set([
  'market_data', 'dex_discovery', 'derivatives', 'fundamentals',
  'onchain', 'security', 'narrative', 'entity', 'reasoning',
  'market_surface', 'dex_emergence', 'derivatives_pressure',
  'protocol_substance', 'onchain_behavior', 'structural_safety',
  'narrative_attention', 'entity_context', 'reasoning_expression',
]);

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION RESULT
// ═══════════════════════════════════════════════════════════════════════════════

export interface EnvelopeValidationResult {
  valid: boolean;
  violations: EnvelopeViolation[];
}

export interface EnvelopeViolation {
  invariant: string;
  field?: string;
  message: string;
  severity: 'error' | 'warning';
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate a ConnectorEnvelope against all 7 invariants, 8 contract rules,
 * and all forbidden behaviors from the 4.1 specification.
 *
 * Returns a result with all detected violations.
 * An envelope is valid only if zero error-severity violations exist.
 */
export function validateEnvelope(envelope: ConnectorEnvelope): EnvelopeValidationResult {
  const violations: EnvelopeViolation[] = [];

  // ─── Invariant 1: Envelope must contain all mandatory fields ────────────
  checkMandatoryField(envelope, 'source', violations);
  checkMandatoryField(envelope, 'entity_type', violations);
  checkMandatoryField(envelope, 'canonical_candidate_id', violations);
  checkMandatoryField(envelope, 'timestamp_observed', violations);
  checkMandatoryField(envelope, 'timestamp_ingested', violations);
  checkMandatoryField(envelope, 'freshness', violations);
  checkMandatoryField(envelope, 'trust_class', violations);
  checkMandatoryField(envelope, 'trace_id', violations);
  checkMandatoryField(envelope, 'fallback_status', violations);
  // raw_payload may be null/undefined for error envelopes but must exist as key
  if (!('raw_payload' in envelope)) {
    violations.push({
      invariant: 'INV-1',
      field: 'raw_payload',
      message: 'Mandatory field raw_payload is missing from envelope',
      severity: 'error',
    });
  }
  if (!('normalized_payload_fragment' in envelope)) {
    violations.push({
      invariant: 'INV-1',
      field: 'normalized_payload_fragment',
      message: 'Mandatory field normalized_payload_fragment is missing from envelope',
      severity: 'error',
    });
  }
  if (typeof envelope.canonical_confidence !== 'number') {
    violations.push({
      invariant: 'INV-1',
      field: 'canonical_confidence',
      message: 'Mandatory field canonical_confidence is missing or not a number',
      severity: 'error',
    });
  }
  if (!envelope.routing_mode || !VALID_ROUTING_MODES.has(envelope.routing_mode)) {
    violations.push({
      invariant: 'INV-1',
      field: 'routing_mode',
      message: `Mandatory field routing_mode is missing or invalid: '${envelope.routing_mode}'. Must be one of: realtime, scheduled, on_demand, backfill`,
      severity: 'error',
    });
  }

  // ─── 4.2: ingress_origin + mode_operational_flags (mandatory) ─────────────
  if (!envelope.ingress_origin || !VALID_INGRESS_ORIGINS.has(envelope.ingress_origin)) {
    violations.push({
      invariant: 'INV-1',
      field: 'ingress_origin',
      message: `Mandatory field ingress_origin is missing or invalid (4.2.3 Rule 1 — stream vs periodic vs user vs replay)`,
      severity: 'error',
    });
  }

  const expectedOrigin = ROUTING_MODE_TO_INGRESS_ORIGIN[envelope.routing_mode];
  if (envelope.ingress_origin && envelope.ingress_origin !== expectedOrigin) {
    violations.push({
      invariant: '4.2.3',
      field: 'ingress_origin',
      message: `ingress_origin '${envelope.ingress_origin}' inconsistent with routing_mode '${envelope.routing_mode}' (expected '${expectedOrigin}')`,
      severity: 'error',
    });
  }

  const flags = envelope.mode_operational_flags as ModeOperationalFlags | undefined;
  if (
    !flags ||
    typeof flags.latency_exceeds_contract !== 'boolean' ||
    typeof flags.freshness_below_mode_standard !== 'boolean' ||
    typeof flags.temporal_downgrade !== 'boolean'
  ) {
    violations.push({
      invariant: 'INV-1',
      field: 'mode_operational_flags',
      message: 'Mandatory mode_operational_flags missing or incomplete (4.2.2 — mode semantics visible downstream)',
      severity: 'error',
    });
  }

  // ─── 4.3 Fallback epistemic metadata (mandatory machine-readable state) ──
  const fe = envelope.fallback_epistemic as FallbackEpistemicMetadata | undefined;
  if (!fe || typeof fe.degraded_mode_active !== 'boolean') {
    violations.push({
      invariant: '4.3.7',
      field: 'fallback_epistemic',
      message: 'Mandatory fallback_epistemic missing (4.3 — fallback is part of the truth model)',
      severity: 'error',
    });
  } else {
    if (!VALID_TRUTH_STATE_KINDS.has(fe.truth_state_kind)) {
      violations.push({
        invariant: '4.3.3',
        field: 'fallback_epistemic.truth_state_kind',
        message: `Invalid truth_state_kind: ${fe.truth_state_kind}`,
        severity: 'error',
      });
    }
    if (typeof fe.confidence_penalty_suggestion !== 'number' || fe.confidence_penalty_suggestion < 0 || fe.confidence_penalty_suggestion > 1) {
      violations.push({
        invariant: '4.3.3',
        field: 'fallback_epistemic.confidence_penalty_suggestion',
        message: 'confidence_penalty_suggestion must be a number in [0, 1]',
        severity: 'error',
      });
    }
    if (fe.degraded_mode_active && (!fe.user_visible_layer_message || fe.user_visible_layer_message.trim().length === 0)) {
      violations.push({
        invariant: '4.3.3-E',
        field: 'fallback_epistemic.user_visible_layer_message',
        message: 'When degraded_mode_active, user_visible_layer_message must name the affected layer (no vague disclaimers)',
        severity: 'error',
      });
    }
    if (envelope.fallback_status === 'backfill' && fe.truth_state_kind !== 'historical_backfill_state') {
      violations.push({
        invariant: '4.3.3-B',
        field: 'fallback_epistemic.truth_state_kind',
        message: 'backfill envelopes must use truth_state_kind historical_backfill_state',
        severity: 'error',
      });
    }
    if (envelope.fallback_status === 'cached' && fe.truth_state_kind !== 'retained_trusted_state') {
      violations.push({
        invariant: '4.3.3-B',
        field: 'fallback_epistemic.truth_state_kind',
        message: 'cached envelopes must use truth_state_kind retained_trusted_state',
        severity: 'warning',
      });
    }

    if (!fe.substitution_semantics || !VALID_SUBSTITUTION_SEMANTICS.has(fe.substitution_semantics)) {
      violations.push({
        invariant: '4.3.3-A',
        field: 'fallback_epistemic.substitution_semantics',
        message: 'substitution_semantics is required (4.3.3 A — never silently assume equivalent substitute)',
        severity: 'error',
      });
    }
    if (!fe.judgment_meaningfulness || !VALID_JUDGMENT_MEANINGFULNESS.has(fe.judgment_meaningfulness)) {
      violations.push({
        invariant: '4.3.3-A',
        field: 'fallback_epistemic.judgment_meaningfulness',
        message: 'judgment_meaningfulness is required (full vs bounded partial vs unavailable)',
        severity: 'error',
      });
    }
    if (fe.degraded_mode_active && fe.confidence_penalty_suggestion === 0 && fe.fallback_semantic_category !== null) {
      violations.push({
        invariant: '4.3.12-I5',
        field: 'fallback_epistemic.confidence_penalty_suggestion',
        message: 'Invariant I5: confidence must respond when fallback materially alters evidence quality',
        severity: 'error',
      });
    }

    // 4.3.6 — continuity hierarchy rank
    const validRanks: ReadonlySet<ContinuityHierarchyRank> = new Set([1, 2, 3, 4, 5]);
    if (!validRanks.has(fe.continuity_hierarchy_rank)) {
      violations.push({
        invariant: '4.3.6',
        field: 'fallback_epistemic.continuity_hierarchy_rank',
        message: `continuity_hierarchy_rank must be 1-5, got: ${fe.continuity_hierarchy_rank}`,
        severity: 'error',
      });
    }

    // 4.3.8 — is_hard_blocker must be boolean
    if (typeof fe.is_hard_blocker !== 'boolean') {
      violations.push({
        invariant: '4.3.8',
        field: 'fallback_epistemic.is_hard_blocker',
        message: 'is_hard_blocker must be boolean (hard-blocker determination)',
        severity: 'error',
      });
    }

    // 4.3.12 I8 — if hard blocker, judgment_meaningfulness should not be 'full'
    if (fe.is_hard_blocker && fe.judgment_meaningfulness === 'full') {
      violations.push({
        invariant: '4.3.12-I8',
        field: 'fallback_epistemic.judgment_meaningfulness',
        message: 'Invariant I8: hard blocker must narrow claims — judgment_meaningfulness cannot be full',
        severity: 'error',
      });
    }

    // 4.3.12 I9 — if degraded, user_visible_layer_message must mention truth domain, not be generic
    if (fe.degraded_mode_active && fe.user_visible_layer_message && fe.user_visible_layer_message === 'data may be incomplete') {
      violations.push({
        invariant: '4.3.12-I9',
        field: 'fallback_epistemic.user_visible_layer_message',
        message: 'Invariant I9: user-visible must reflect missing truth domains, not generic uncertainty',
        severity: 'error',
      });
    }
  }

  // ─── Invariant 2: timestamp_ingested >= timestamp_observed ──────────────
  // (unless backfill semantics explicitly justify otherwise)
  if (
    envelope.timestamp_ingested < envelope.timestamp_observed &&
    envelope.fallback_status !== 'backfill'
  ) {
    violations.push({
      invariant: 'INV-2',
      message: `timestamp_ingested (${envelope.timestamp_ingested}) is before timestamp_observed (${envelope.timestamp_observed}) without backfill justification`,
      severity: 'error',
    });
  }

  // ─── Invariant 3: Freshness must be derivable from timestamps ───────────
  if (envelope.freshness) {
    const expectedAge = Math.max(0, envelope.timestamp_ingested - envelope.timestamp_observed) / 1000;
    const drift = Math.abs(envelope.freshness.age_seconds - expectedAge);
    if (drift > 2) {
      violations.push({
        invariant: 'INV-3',
        field: 'freshness',
        message: `Freshness age_seconds (${envelope.freshness.age_seconds}) inconsistent with timestamp difference (${expectedAge.toFixed(1)}s), drift: ${drift.toFixed(1)}s`,
        severity: 'warning',
      });
    }
    if (!VALID_FRESHNESS_BUCKETS.has(envelope.freshness.bucket)) {
      violations.push({
        invariant: 'INV-3',
        field: 'freshness.bucket',
        message: `Invalid freshness bucket: ${envelope.freshness.bucket}`,
        severity: 'error',
      });
    }
  }

  // ─── Invariant 4: trust_class must reflect usable trust ─────────────────
  if (!VALID_TRUST_CLASSES.has(envelope.trust_class)) {
    violations.push({
      invariant: 'INV-4',
      field: 'trust_class',
      message: `Invalid trust_class: ${envelope.trust_class}`,
      severity: 'error',
    });
  }
  // Cross-check: stale/expired freshness should not have high trust
  if (
    envelope.freshness &&
    (envelope.freshness.bucket === 'stale' || envelope.freshness.bucket === 'expired') &&
    envelope.trust_class === 'high'
  ) {
    violations.push({
      invariant: 'INV-4',
      field: 'trust_class',
      message: `trust_class is 'high' but freshness is '${envelope.freshness.bucket}' — trust must reflect usable trust, not nominal quality`,
      severity: 'error',
    });
  }
  // Cross-check: fallback data should not have high trust
  if (envelope.fallback_status === 'fallback' && envelope.trust_class === 'high') {
    violations.push({
      invariant: 'INV-4',
      field: 'trust_class',
      message: `trust_class is 'high' but fallback_status is 'fallback' — fallback path cannot be high trust`,
      severity: 'error',
    });
  }

  // ─── Invariant 5: normalized_payload_fragment must be sufficient ─────────
  if (
    envelope.normalized_payload_fragment === undefined &&
    envelope.trust_class !== 'degraded'
  ) {
    violations.push({
      invariant: 'INV-5',
      field: 'normalized_payload_fragment',
      message: 'normalized_payload_fragment is undefined on a non-degraded envelope — downstream cannot compute',
      severity: 'error',
    });
  }

  // ─── Invariant 6: fallback_status must reflect actual path ──────────────
  if (!VALID_FALLBACK_STATUSES.has(envelope.fallback_status)) {
    violations.push({
      invariant: 'INV-6',
      field: 'fallback_status',
      message: `Invalid fallback_status: ${envelope.fallback_status}`,
      severity: 'error',
    });
  }

  // ─── Invariant 7: trace_id must uniquely identify ingress ───────────────
  if (!envelope.trace_id || envelope.trace_id.length < 10) {
    violations.push({
      invariant: 'INV-7',
      field: 'trace_id',
      message: `trace_id is missing or too short: '${envelope.trace_id}'`,
      severity: 'error',
    });
  }

  // ─── Forbidden: source must not use class labels ────────────────────────
  if (FORBIDDEN_SOURCE_LABELS.has(envelope.source)) {
    violations.push({
      invariant: 'RULE-1',
      field: 'source',
      message: `source uses class label '${envelope.source}' instead of concrete provider — forbidden by 4.1.3`,
      severity: 'error',
    });
  }

  // ─── Forbidden: entity_type must be from controlled vocabulary ──────────
  if (!VALID_ENTITY_TYPES.has(envelope.entity_type)) {
    violations.push({
      invariant: 'RULE-2',
      field: 'entity_type',
      message: `entity_type '${envelope.entity_type}' is not in controlled vocabulary — forbidden by 4.1.3`,
      severity: 'error',
    });
  }

  // ─── Forbidden: canonical_confidence out of range ───────────────────────
  if (
    typeof envelope.canonical_confidence === 'number' &&
    (envelope.canonical_confidence < 0 || envelope.canonical_confidence > 1)
  ) {
    violations.push({
      invariant: 'RULE-8',
      field: 'canonical_confidence',
      message: `canonical_confidence (${envelope.canonical_confidence}) must be between 0 and 1`,
      severity: 'error',
    });
  }

  // ─── Forbidden: chain omitted on chain-specific entity types ────────────
  const chainSpecific: ReadonlySet<string> = new Set(['pair', 'wallet', 'protocol']);
  if (chainSpecific.has(envelope.entity_type) && envelope.chain === null) {
    violations.push({
      invariant: 'RULE-2',
      field: 'chain',
      message: `chain is null on chain-specific entity_type '${envelope.entity_type}' — chain must be explicit or ambiguity acknowledged`,
      severity: 'warning',
    });
  }

  return {
    valid: violations.filter(v => v.severity === 'error').length === 0,
    violations,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCTION-READINESS ASSESSMENT (4.1.6)
// ═══════════════════════════════════════════════════════════════════════════════

export interface ProductionReadinessResult {
  ready: boolean;
  criteria: Array<{
    criterion: string;
    met: boolean;
    detail: string;
  }>;
}

/**
 * Assess whether a ConnectorEnvelope meets the 4.1.6 production-readiness standard.
 *
 * A connector is only production-ready if it can emit envelopes that are:
 * complete, typed, source-attributable, time-correct, freshness-aware,
 * trust-labeled, traceable, fallback-explicit, provider-decoupled,
 * and safe for downstream computation.
 */
export function assessProductionReadiness(envelope: ConnectorEnvelope): ProductionReadinessResult {
  const criteria: ProductionReadinessResult['criteria'] = [];

  criteria.push({
    criterion: 'complete',
    met: allFieldsPresent(envelope),
    detail: 'All mandatory envelope fields are present (including 4.2 routing doctrine fields)',
  });

  criteria.push({
    criterion: 'typed',
    met: VALID_ENTITY_TYPES.has(envelope.entity_type),
    detail: `entity_type '${envelope.entity_type}' is in controlled vocabulary`,
  });

  criteria.push({
    criterion: 'source-attributable',
    met: !!envelope.source && !FORBIDDEN_SOURCE_LABELS.has(envelope.source),
    detail: `source '${envelope.source}' is a concrete provider identity`,
  });

  criteria.push({
    criterion: 'time-correct',
    met: envelope.timestamp_observed > 0 &&
         envelope.timestamp_ingested > 0 &&
         (envelope.timestamp_ingested >= envelope.timestamp_observed || envelope.fallback_status === 'backfill'),
    detail: 'Observation and ingestion timestamps are separate, valid, and correctly ordered',
  });

  criteria.push({
    criterion: 'freshness-aware',
    met: !!envelope.freshness &&
         typeof envelope.freshness.age_seconds === 'number' &&
         VALID_FRESHNESS_BUCKETS.has(envelope.freshness.bucket) &&
         typeof envelope.freshness.acceptable === 'boolean',
    detail: 'Freshness is computed with age, bucket, and acceptability at ingress',
  });

  criteria.push({
    criterion: 'trust-labeled',
    met: VALID_TRUST_CLASSES.has(envelope.trust_class),
    detail: `trust_class '${envelope.trust_class}' reflects usable trust at ingress`,
  });

  criteria.push({
    criterion: 'traceable',
    met: !!envelope.trace_id && envelope.trace_id.length >= 10,
    detail: `trace_id '${envelope.trace_id}' uniquely identifies this ingress instance`,
  });

  criteria.push({
    criterion: 'fallback-explicit',
    met: VALID_FALLBACK_STATUSES.has(envelope.fallback_status),
    detail: `fallback_status '${envelope.fallback_status}' explicitly marks ingress path`,
  });

  criteria.push({
    criterion: 'provider-decoupled',
    met: envelope.normalized_payload_fragment !== undefined || envelope.trust_class === 'degraded',
    detail: 'normalized_payload_fragment is present and provider-independent',
  });

  criteria.push({
    criterion: 'safe-for-downstream',
    met: (envelope.normalized_payload_fragment !== undefined || envelope.trust_class === 'degraded') &&
         'raw_payload' in envelope,
    detail: 'Both raw (audit) and normalized (compute) forms coexist',
  });

  criteria.push({
    criterion: 'routing-doctrine-4.2',
    met:
      !!envelope.routing_mode &&
      VALID_ROUTING_MODES.has(envelope.routing_mode) &&
      !!envelope.ingress_origin &&
      envelope.ingress_origin === ROUTING_MODE_TO_INGRESS_ORIGIN[envelope.routing_mode] &&
      !!envelope.mode_operational_flags,
    detail: 'routing_mode, ingress_origin, and mode_operational_flags present and aligned',
  });

  criteria.push({
    criterion: 'fallback-doctrine-4.3',
    met:
      !!envelope.fallback_epistemic &&
      typeof envelope.fallback_epistemic.degraded_mode_active === 'boolean' &&
      VALID_TRUTH_STATE_KINDS.has(envelope.fallback_epistemic.truth_state_kind) &&
      typeof envelope.fallback_epistemic.continuity_hierarchy_rank === 'number' &&
      typeof envelope.fallback_epistemic.is_hard_blocker === 'boolean',
    detail: 'fallback_epistemic carries governed truth-loss state: hierarchy rank, hard-blocker, truth-loss accounting',
  });

  return {
    ready: criteria.every(c => c.met),
    criteria,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function checkMandatoryField(
  envelope: ConnectorEnvelope,
  field: keyof ConnectorEnvelope,
  violations: EnvelopeViolation[],
): void {
  const value = envelope[field];
  if (value === undefined || value === null || value === '') {
    violations.push({
      invariant: 'INV-1',
      field: field as string,
      message: `Mandatory field '${field}' is missing, null, or empty`,
      severity: 'error',
    });
  }
}

function allFieldsPresent(envelope: ConnectorEnvelope): boolean {
  const f = envelope.mode_operational_flags;
  return (
    !!envelope.source &&
    !!envelope.entity_type &&
    !!envelope.canonical_candidate_id &&
    typeof envelope.canonical_confidence === 'number' &&
    typeof envelope.timestamp_observed === 'number' &&
    typeof envelope.timestamp_ingested === 'number' &&
    !!envelope.freshness &&
    !!envelope.trust_class &&
    'raw_payload' in envelope &&
    'normalized_payload_fragment' in envelope &&
    !!envelope.trace_id &&
    !!envelope.fallback_status &&
    !!envelope.routing_mode &&
    VALID_ROUTING_MODES.has(envelope.routing_mode) &&
    !!envelope.ingress_origin &&
    VALID_INGRESS_ORIGINS.has(envelope.ingress_origin) &&
    envelope.ingress_origin === ROUTING_MODE_TO_INGRESS_ORIGIN[envelope.routing_mode] &&
    !!f &&
    typeof f.latency_exceeds_contract === 'boolean' &&
    typeof f.freshness_below_mode_standard === 'boolean' &&
    typeof f.temporal_downgrade === 'boolean' &&
    !!envelope.fallback_epistemic &&
    typeof envelope.fallback_epistemic.degraded_mode_active === 'boolean' &&
    VALID_TRUTH_STATE_KINDS.has(envelope.fallback_epistemic.truth_state_kind) &&
    !!envelope.fallback_epistemic.substitution_semantics &&
    VALID_SUBSTITUTION_SEMANTICS.has(envelope.fallback_epistemic.substitution_semantics) &&
    !!envelope.fallback_epistemic.judgment_meaningfulness &&
    VALID_JUDGMENT_MEANINGFULNESS.has(envelope.fallback_epistemic.judgment_meaningfulness) &&
    typeof envelope.fallback_epistemic.continuity_hierarchy_rank === 'number' &&
    envelope.fallback_epistemic.continuity_hierarchy_rank >= 1 &&
    envelope.fallback_epistemic.continuity_hierarchy_rank <= 5 &&
    typeof envelope.fallback_epistemic.is_hard_blocker === 'boolean'
  );
}
