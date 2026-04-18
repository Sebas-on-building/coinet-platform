/**
 * L7.8 — Adversarial Corpus
 *
 * §7.8.4.1 Band F, §7.8.8.3 — Attacks and misuse patterns that Layer 7
 * must reject. Every case declares the `L7` violation-code namespace it
 * is expected to hit so the adversarial-band test can assert not just
 * "blocked" but "blocked for the right constitutional reason".
 */

export enum L7AdversarialCaseKind {
  RAW_L6_REVALIDATION = 'RAW_L6_REVALIDATION',
  CONTRADICTION_FLATTENING = 'CONTRADICTION_FLATTENING',
  STALE_AS_FRESH = 'STALE_AS_FRESH',
  MISSING_AS_CONFIRMED = 'MISSING_AS_CONFIRMED',
  CLEAN_CONFIDENCE_WITH_BLOCKING_CONTRADICTION = 'CLEAN_CONFIDENCE_WITH_BLOCKING_CONTRADICTION',
  RESTRICTION_BYPASS = 'RESTRICTION_BYPASS',
  SHADOW_AUTHORITY_READ = 'SHADOW_AUTHORITY_READ',
  SHADOW_AUTHORITY_WRITE = 'SHADOW_AUTHORITY_WRITE',
  RAW_OBJECT_STORE_READ = 'RAW_OBJECT_STORE_READ',
  DIRECT_POSTGRES_WRITE = 'DIRECT_POSTGRES_WRITE',
  DOWNSTREAM_SPOOFED_MODE = 'DOWNSTREAM_SPOOFED_MODE',
  ORPHAN_EVIDENCE = 'ORPHAN_EVIDENCE',
  OUT_OF_ORDER_FAMILY_ROLLOUT = 'OUT_OF_ORDER_FAMILY_ROLLOUT',
  MIGRATION_BREAKING_UNDECLARED = 'MIGRATION_BREAKING_UNDECLARED',
  AD_HOC_REBUILD_BY_LAYER_8 = 'AD_HOC_REBUILD_BY_LAYER_8',
}

export interface L7AdversarialCase {
  readonly case_id: string;
  readonly kind: L7AdversarialCaseKind;
  readonly description: string;
  readonly expected_violation_namespace: string;
  readonly must_block: true;
}

export const L7_ADVERSARIAL_CASES: readonly L7AdversarialCase[] = Object.freeze([
  {
    case_id: 'adv.raw_l6_revalidation',
    kind: L7AdversarialCaseKind.RAW_L6_REVALIDATION,
    description: 'Later layer rebuilds validation output from raw L6 primitives in LIVE mode.',
    expected_violation_namespace: 'L7_7.DOWNSTREAM_RAW_L6_REBUILD',
    must_block: true,
  },
  {
    case_id: 'adv.contradiction_flattening',
    kind: L7AdversarialCaseKind.CONTRADICTION_FLATTENING,
    description: 'Validation collapses a bundle into a single Boolean verdict without linkage.',
    expected_violation_namespace: 'L7_2.CONTRADICTION_MUST_REMAIN_EXPLICIT',
    must_block: true,
  },
  {
    case_id: 'adv.stale_as_fresh',
    kind: L7AdversarialCaseKind.STALE_AS_FRESH,
    description: 'Stale support is promoted to CONFIRMED with no staleness modifier.',
    expected_violation_namespace: 'L7_5.STALE_CANNOT_MASQUERADE',
    must_block: true,
  },
  {
    case_id: 'adv.missing_as_confirmed',
    kind: L7AdversarialCaseKind.MISSING_AS_CONFIRMED,
    description: 'Missing confirmation surface is silently treated as CONFIRMED.',
    expected_violation_namespace: 'L7_5.MISSING_CANNOT_CONFIRM',
    must_block: true,
  },
  {
    case_id: 'adv.clean_conf_with_blocking',
    kind: L7AdversarialCaseKind.CLEAN_CONFIDENCE_WITH_BLOCKING_CONTRADICTION,
    description: 'Confidence is emitted high despite an attached blocking contradiction.',
    expected_violation_namespace: 'L7_6.CONFIDENCE_OUTRUNS_LAW',
    must_block: true,
  },
  {
    case_id: 'adv.restriction_bypass',
    kind: L7AdversarialCaseKind.RESTRICTION_BYPASS,
    description: 'Downstream ignores attached restriction profile and uses broader rights.',
    expected_violation_namespace: 'L7_6.RESTRICTION_BYPASS',
    must_block: true,
  },
  {
    case_id: 'adv.shadow_authority_read',
    kind: L7AdversarialCaseKind.SHADOW_AUTHORITY_READ,
    description: 'Downstream treats a Redis cache read as authoritative L7 current state.',
    expected_violation_namespace: 'L7_7.REDIS_AS_AUTHORITY_READ',
    must_block: true,
  },
  {
    case_id: 'adv.shadow_authority_write',
    kind: L7AdversarialCaseKind.SHADOW_AUTHORITY_WRITE,
    description: 'Validation materializer writes current state directly to Redis bypassing Postgres.',
    expected_violation_namespace: 'L7_7.REDIS_AS_AUTHORITY_WRITE',
    must_block: true,
  },
  {
    case_id: 'adv.raw_object_store_read',
    kind: L7AdversarialCaseKind.RAW_OBJECT_STORE_READ,
    description: 'Downstream reads evidence pack directly from archive, bypassing read surface.',
    expected_violation_namespace: 'L7_7.RAW_ARCHIVE_READ',
    must_block: true,
  },
  {
    case_id: 'adv.direct_postgres_write',
    kind: L7AdversarialCaseKind.DIRECT_POSTGRES_WRITE,
    description: 'Validation materializer writes Postgres directly, bypassing L5 envelope.',
    expected_violation_namespace: 'L7_7.DIRECT_STORE_BYPASS',
    must_block: true,
  },
  {
    case_id: 'adv.downstream_spoofed_mode',
    kind: L7AdversarialCaseKind.DOWNSTREAM_SPOOFED_MODE,
    description: 'Live consumer claims REPLAY mode to bypass restriction checks.',
    expected_violation_namespace: 'L7_7.DOWNSTREAM_MODE_SPOOF',
    must_block: true,
  },
  {
    case_id: 'adv.orphan_evidence',
    kind: L7AdversarialCaseKind.ORPHAN_EVIDENCE,
    description: 'Evidence bundle is written without manifest or subject linkage.',
    expected_violation_namespace: 'L7_7.ORPHAN_EVIDENCE',
    must_block: true,
  },
  {
    case_id: 'adv.out_of_order_rollout',
    kind: L7AdversarialCaseKind.OUT_OF_ORDER_FAMILY_ROLLOUT,
    description: 'CROSS_DOMAIN is enabled before constituent families reach PRODUCTION.',
    expected_violation_namespace: 'L7_8.ROLLOUT_OUT_OF_ORDER',
    must_block: true,
  },
  {
    case_id: 'adv.migration_breaking_undeclared',
    kind: L7AdversarialCaseKind.MIGRATION_BREAKING_UNDECLARED,
    description: 'A contradiction-family ontology change is shipped as PATCH.',
    expected_violation_namespace: 'L7_8.MIGRATION_MISCLASSIFIED',
    must_block: true,
  },
  {
    case_id: 'adv.ad_hoc_rebuild_by_l8',
    kind: L7AdversarialCaseKind.AD_HOC_REBUILD_BY_LAYER_8,
    description: 'Layer 8 consumer constructs its own validation verdict from L6 outputs.',
    expected_violation_namespace: 'L7_7.DOWNSTREAM_RAW_L6_REBUILD',
    must_block: true,
  },
]);

export const ALL_L7_ADVERSARIAL_KINDS: readonly L7AdversarialCaseKind[] =
  Object.values(L7AdversarialCaseKind);
