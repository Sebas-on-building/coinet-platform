/**
 * L6.8 — Adversarial Corpus
 *
 * §6.8.4.2 Band F — Misuse attempts that Layer 6 must reject:
 * missing metric contracts, unresolved identity, stale context, raw
 * provider bypass, shadow-authority cache writes.
 */

export enum L6AdversarialCaseKind {
  MISSING_METRIC_CONTRACT = 'MISSING_METRIC_CONTRACT',
  UNRESOLVED_IDENTITY = 'UNRESOLVED_IDENTITY',
  STALE_CONTEXT_USED_AS_FRESH = 'STALE_CONTEXT_USED_AS_FRESH',
  RAW_PROVIDER_BYPASS = 'RAW_PROVIDER_BYPASS',
  SHADOW_AUTHORITY_CACHE_WRITE = 'SHADOW_AUTHORITY_CACHE_WRITE',
  COLLAPSED_TIMESTAMPS = 'COLLAPSED_TIMESTAMPS',
  ILLEGAL_INPUT_SURFACE = 'ILLEGAL_INPUT_SURFACE',
  ORPHAN_EVIDENCE_PACK = 'ORPHAN_EVIDENCE_PACK',
  SILENT_CURRENT_OVERWRITE = 'SILENT_CURRENT_OVERWRITE',
  DIRECT_POSTGRES_WRITE = 'DIRECT_POSTGRES_WRITE',
  AD_HOC_RECOMPUTE_BY_LATER_LAYER = 'AD_HOC_RECOMPUTE_BY_LATER_LAYER',
  DUPLICATE_EVENT_WITHOUT_DEDUPE = 'DUPLICATE_EVENT_WITHOUT_DEDUPE',
}

export interface L6AdversarialCase {
  readonly case_id: string;
  readonly kind: L6AdversarialCaseKind;
  readonly description: string;
  readonly expected_violation_code: string;
  readonly must_block: true;
}

export const ADVERSARIAL_CASES: readonly L6AdversarialCase[] = Object.freeze([
  {
    case_id: 'adv.missing_metric_contract',
    kind: L6AdversarialCaseKind.MISSING_METRIC_CONTRACT,
    description: 'Feature tries to compute using a metric with no contract version registered.',
    expected_violation_code: 'L6.3.MISSING_CONTRACT',
    must_block: true,
  },
  {
    case_id: 'adv.unresolved_identity',
    kind: L6AdversarialCaseKind.UNRESOLVED_IDENTITY,
    description: 'Scope identity was not resolved against canonical identity registry.',
    expected_violation_code: 'L6.2.UNRESOLVED_SCOPE_IDENTITY',
    must_block: true,
  },
  {
    case_id: 'adv.stale_context_as_fresh',
    kind: L6AdversarialCaseKind.STALE_CONTEXT_USED_AS_FRESH,
    description: 'Feature uses stale baseline as if fresh without temporal classifier.',
    expected_violation_code: 'L6.5.FRESHNESS_MISCLASSIFIED',
    must_block: true,
  },
  {
    case_id: 'adv.raw_provider_bypass',
    kind: L6AdversarialCaseKind.RAW_PROVIDER_BYPASS,
    description: 'Feature attempts to read directly from raw provider instead of L5 governed surface.',
    expected_violation_code: 'L6.6.RAW_PROVIDER_BYPASS',
    must_block: true,
  },
  {
    case_id: 'adv.shadow_authority_cache',
    kind: L6AdversarialCaseKind.SHADOW_AUTHORITY_CACHE_WRITE,
    description: 'Redis cache write claims current-state authority.',
    expected_violation_code: 'L6.7.SHADOW_AUTHORITY_WRITE',
    must_block: true,
  },
  {
    case_id: 'adv.collapsed_timestamps',
    kind: L6AdversarialCaseKind.COLLAPSED_TIMESTAMPS,
    description: 'Runtime output collapses observed_at and ingested_at into a single field.',
    expected_violation_code: 'L6.5.COLLAPSED_TIMESTAMPS',
    must_block: true,
  },
  {
    case_id: 'adv.illegal_input_surface',
    kind: L6AdversarialCaseKind.ILLEGAL_INPUT_SURFACE,
    description: 'Feature family consumes a surface not registered in legal input registry.',
    expected_violation_code: 'L6.6.ILLEGAL_INPUT_SURFACE',
    must_block: true,
  },
  {
    case_id: 'adv.orphan_evidence',
    kind: L6AdversarialCaseKind.ORPHAN_EVIDENCE_PACK,
    description: 'Evidence pack written to object store with no index row.',
    expected_violation_code: 'L6.7.ORPHAN_EVIDENCE_PACK',
    must_block: true,
  },
  {
    case_id: 'adv.silent_current_overwrite',
    kind: L6AdversarialCaseKind.SILENT_CURRENT_OVERWRITE,
    description: 'Late data path tries to overwrite current registry row without governed rematerialization.',
    expected_violation_code: 'L6.7.SILENT_OVERWRITE',
    must_block: true,
  },
  {
    case_id: 'adv.direct_postgres_write',
    kind: L6AdversarialCaseKind.DIRECT_POSTGRES_WRITE,
    description: 'Materializer writes directly to Postgres bypassing L5 manifest construction.',
    expected_violation_code: 'L6.7.DIRECT_STORE_WRITE',
    must_block: true,
  },
  {
    case_id: 'adv.ad_hoc_recompute',
    kind: L6AdversarialCaseKind.AD_HOC_RECOMPUTE_BY_LATER_LAYER,
    description: 'Later-layer consumer attempts ad hoc recomputation from raw history.',
    expected_violation_code: 'L6.7.AD_HOC_RECOMPUTE',
    must_block: true,
  },
  {
    case_id: 'adv.duplicate_event_no_dedupe',
    kind: L6AdversarialCaseKind.DUPLICATE_EVENT_WITHOUT_DEDUPE,
    description: 'Event emitted twice in the same dedupe window without dedupe key protection.',
    expected_violation_code: 'L6.6.EVENT_DEDUPE_BYPASS',
    must_block: true,
  },
]);
