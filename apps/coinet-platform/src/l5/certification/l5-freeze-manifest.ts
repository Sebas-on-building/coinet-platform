/**
 * ═══════════════════════════════════════════════════════════════════════
 * LAYER 5 — FROZEN CERTIFICATION AND HANDOFF MANIFEST
 * ═══════════════════════════════════════════════════════════════════════
 *
 * This file is the single canonical source of truth for what Layer 5 is,
 * what it governs, what it guarantees, and what it exposes to Layer 6.
 *
 * Layer 6 and all downstream consumers MUST treat this manifest as the
 * immutable contract. Nothing in Layer 5 may be reinterpreted, extended,
 * or silently overridden by any layer above it.
 *
 * FREEZE STATUS: FROZEN
 * FREEZE DATE:   2026-04-03
 * CERTIFICATION:  1,371 assertions across 7 test suites, 0 failures
 * INVARIANTS:     84 constitutional invariants, all holding
 * FILES:          121 production files, 7 test files
 * ═══════════════════════════════════════════════════════════════════════
 */

// ─────────────────────────────────────────────────────────────────────
// §1 — LAYER 5 MISSION
// ─────────────────────────────────────────────────────────────────────

export const L5_MISSION = {
  name: 'Layer 5 — Storage Sovereignty and State Engine',
  purpose:
    'Layer 5 receives governed outputs from Layer 3 (Source Systems) and Layer 4 (Graph Intelligence), ' +
    'and stores them durably across a multi-store topology with single-authority truth, coordinated writes, ' +
    'idempotent projections, replay capability, repair infrastructure, security governance, and ' +
    'constitutional guarantees that are machine-verifiable.',
  oneLineSummary:
    'The governed, multi-store, replay-safe, repairable state engine for the Coinet platform.',
} as const;

// ─────────────────────────────────────────────────────────────────────
// §2 — SECTION REGISTRY
// ─────────────────────────────────────────────────────────────────────

export interface L5SectionDescriptor {
  readonly id: string;
  readonly name: string;
  readonly module: string;
  readonly fileCount: number;
  readonly invariantCount: number;
  readonly testAssertions: number;
  readonly charter: string;
}

export const L5_SECTIONS: readonly L5SectionDescriptor[] = [
  {
    id: 'L5.1', name: 'Purpose', module: 'l5/purpose', fileCount: 8, invariantCount: 10, testAssertions: 206,
    charter: 'Defines what Layer 5 is for, what state classes exist, what capabilities are allowed, what actions are forbidden, and why.',
  },
  {
    id: 'L5.2', name: 'Authority Model', module: 'l5/authority', fileCount: 13, invariantCount: 12, testAssertions: 183,
    charter: 'Defines which store owns each datum family, what projections exist, what happens when stores fail, and how manifests track lifecycle.',
  },
  {
    id: 'L5.3', name: 'Topology', module: 'l5/topology', fileCount: 12, invariantCount: 12, testAssertions: 229,
    charter: 'Defines the multi-store topology (Postgres, ClickHouse, Redis, Object Storage), store profiles, interaction rules, service boundaries, namespace policy, and constrained-mode substitution law.',
  },
  {
    id: 'L5.4', name: 'Universal Write Contract', module: 'l5/envelope', fileCount: 18, invariantCount: 14, testAssertions: 142,
    charter: 'Defines the StorageEnvelope as the single universal write primitive, including write classes, producer layers, ingress modes, deduplication, validation, quarantine, lifecycle, and routing.',
  },
  {
    id: 'L5.5', name: 'Write Coordination', module: 'l5/coordination', fileCount: 24, invariantCount: 12, testAssertions: 140,
    charter: 'Defines the operational write machine: archive-first/authority-first sequencing, single-authority transactional commit with async idempotent projections, manifest lifecycle, outbox, repair, late-data policy, and read resolution.',
  },
  {
    id: 'L5.6', name: 'Physical Design', module: 'l5/physical', fileCount: 23, invariantCount: 12, testAssertions: 263,
    charter: 'Defines exact Postgres schemas/tables/keys, ClickHouse DDL families, Redis key families with TTL law, object storage path grammar and tag policy, and the physical identity spine.',
  },
  {
    id: 'L5.7', name: 'Assurance', module: 'l5/assurance', fileCount: 23, invariantCount: 12, testAssertions: 208,
    charter: 'Defines replay law (3 fidelity levels, 7 entry points), repair classes (RP-0 through RP-7), failure ontology (7 families, 37 codes), security law, PII minimization, access policy, and the executable done-gate evaluator.',
  },
] as const;

// ─────────────────────────────────────────────────────────────────────
// §3 — AGGREGATE STATISTICS
// ─────────────────────────────────────────────────────────────────────

export const L5_STATISTICS = {
  totalProductionFiles: 121,
  totalTestFiles: 7,
  totalTestAssertions: 1371,
  totalInvariants: 84,
  totalFailureCodes: 37,
  totalRepairClasses: 8,
  totalReplayFidelityLevels: 3,
  totalReplayEntryPoints: 7,
  totalFailureFamilies: 7,
  totalPostgresSchemas: 8,
  totalPostgresTables: 11,
  totalClickHouseTables: 4,
  totalRedisKeyFamilies: 7,
  totalObjectPathFamilies: 8,
  totalServiceRoles: 9,
  totalSensitiveArtifactClasses: 7,
} as const;

// ─────────────────────────────────────────────────────────────────────
// §4 — CONSTITUTIONAL INVARIANT REGISTRY
// ─────────────────────────────────────────────────────────────────────

export interface InvariantEntry {
  readonly id: string;
  readonly section: string;
  readonly summary: string;
}

export const L5_INVARIANT_REGISTRY: readonly InvariantEntry[] = [
  // L5.1 Purpose — 10 invariants
  { id: 'INV-5.1-A', section: 'L5.1', summary: 'Every governed write has exactly one state class' },
  { id: 'INV-5.1-B', section: 'L5.1', summary: 'Every state class has exactly one authority home store' },
  { id: 'INV-5.1-C', section: 'L5.1', summary: 'No write to a store outside its declared capability' },
  { id: 'INV-5.1-D', section: 'L5.1', summary: 'No forbidden action may execute in production code' },
  { id: 'INV-5.1-E', section: 'L5.1', summary: 'State class classification is deterministic for identical inputs' },
  { id: 'INV-5.1-F', section: 'L5.1', summary: 'L5 stores L3/L4 outputs but never redefines their law' },
  { id: 'INV-5.1-G', section: 'L5.1', summary: 'Every write domain maps to exactly one primary state class' },
  { id: 'INV-5.1-H', section: 'L5.1', summary: 'No time-series fact without metric contract' },
  { id: 'INV-5.1-I', section: 'L5.1', summary: 'No identity invention — L5 uses canonical refs from lower layers' },
  { id: 'INV-5.1-J', section: 'L5.1', summary: 'Failure signatures are explicitly declared for each failure mode' },

  // L5.2 Authority — 12 invariants
  { id: 'INV-5.2-A', section: 'L5.2', summary: 'Every datum family has exactly one authority store' },
  { id: 'INV-5.2-B', section: 'L5.2', summary: 'Authority store tier determines truth source' },
  { id: 'INV-5.2-C', section: 'L5.2', summary: 'No shadow authority — projections cannot contradict authority' },
  { id: 'INV-5.2-D', section: 'L5.2', summary: 'Projection plans reference only legal stores for the datum family' },
  { id: 'INV-5.2-E', section: 'L5.2', summary: 'Required projections block finalization when missing' },
  { id: 'INV-5.2-F', section: 'L5.2', summary: 'Optional projections degrade gracefully without blocking' },
  { id: 'INV-5.2-G', section: 'L5.2', summary: 'Redis loss is speed loss, never truth loss' },
  { id: 'INV-5.2-H', section: 'L5.2', summary: 'Manifest lifecycle transitions are acyclic and legal' },
  { id: 'INV-5.2-I', section: 'L5.2', summary: 'Terminal manifest states are immutable' },
  { id: 'INV-5.2-J', section: 'L5.2', summary: 'Repairability classes are deterministic for each failure mode' },
  { id: 'INV-5.2-K', section: 'L5.2', summary: 'Authority evaluation is reproducible for identical inputs' },
  { id: 'INV-5.2-L', section: 'L5.2', summary: 'Authority home declarations are cross-validated with state classes' },

  // L5.3 Topology — 12 invariants
  { id: 'INV-5.3-A', section: 'L5.3', summary: 'Reference topology has all four stores operational' },
  { id: 'INV-5.3-B', section: 'L5.3', summary: 'Every store has exactly one plane assignment' },
  { id: 'INV-5.3-C', section: 'L5.3', summary: 'Inter-store interactions obey legality matrix' },
  { id: 'INV-5.3-D', section: 'L5.3', summary: 'Service roles cannot write to stores outside their boundary' },
  { id: 'INV-5.3-E', section: 'L5.3', summary: 'Namespace policy isolates environments' },
  { id: 'INV-5.3-F', section: 'L5.3', summary: 'Constrained mode only uses legal substitutions' },
  { id: 'INV-5.3-G', section: 'L5.3', summary: 'No silent downgrade from reference to constrained' },
  { id: 'INV-5.3-H', section: 'L5.3', summary: 'Forbidden data classes never enter wrong stores' },
  { id: 'INV-5.3-I', section: 'L5.3', summary: 'Configuration validation is mode-aware' },
  { id: 'INV-5.3-J', section: 'L5.3', summary: 'Store profiles are deterministic for each store kind' },
  { id: 'INV-5.3-K', section: 'L5.3', summary: 'Topology evaluation is reproducible' },
  { id: 'INV-5.3-L', section: 'L5.3', summary: 'All interaction rules are exhaustively declared' },

  // L5.4 Envelope — 14 invariants
  { id: 'INV-5.4-A', section: 'L5.4', summary: 'Every write enters L5 through exactly one StorageEnvelope' },
  { id: 'INV-5.4-B', section: 'L5.4', summary: 'Canonical serialization is deterministic' },
  { id: 'INV-5.4-C', section: 'L5.4', summary: 'Payload hash is reproducible for identical payloads' },
  { id: 'INV-5.4-D', section: 'L5.4', summary: 'Dedupe keys are stable across retries' },
  { id: 'INV-5.4-E', section: 'L5.4', summary: 'Envelope validation is exhaustive — no partial acceptance' },
  { id: 'INV-5.4-F', section: 'L5.4', summary: 'Lifecycle transitions are legal and acyclic' },
  { id: 'INV-5.4-G', section: 'L5.4', summary: 'Write class determines routing constraints' },
  { id: 'INV-5.4-H', section: 'L5.4', summary: 'Producer layer determines what may produce the envelope' },
  { id: 'INV-5.4-I', section: 'L5.4', summary: 'Quarantine is durable and explicit, not silent' },
  { id: 'INV-5.4-J', section: 'L5.4', summary: 'Derived writes preserve parent lineage' },
  { id: 'INV-5.4-K', section: 'L5.4', summary: 'Resolved envelopes carry routing blocks' },
  { id: 'INV-5.4-L', section: 'L5.4', summary: 'Non-identical duplicates are never silently accepted' },
  { id: 'INV-5.4-M', section: 'L5.4', summary: 'Manifest readiness requires all validation stages passed' },
  { id: 'INV-5.4-N', section: 'L5.4', summary: 'Ingress mode determines acceptance semantics' },

  // L5.5 Coordination — 12 invariants
  { id: 'INV-5.5-A', section: 'L5.5', summary: 'Every write passes execution preflight' },
  { id: 'INV-5.5-B', section: 'L5.5', summary: 'Store routing is deterministic for identical envelopes' },
  { id: 'INV-5.5-C', section: 'L5.5', summary: 'Archive-first policy is evaluated before authority commit' },
  { id: 'INV-5.5-D', section: 'L5.5', summary: 'Dedupe gate runs before any durable mutation' },
  { id: 'INV-5.5-E', section: 'L5.5', summary: 'Authority transaction is the single atomic boundary' },
  { id: 'INV-5.5-F', section: 'L5.5', summary: 'Outbox jobs are durable and idempotent' },
  { id: 'INV-5.5-G', section: 'L5.5', summary: 'Projection workers are idempotent' },
  { id: 'INV-5.5-H', section: 'L5.5', summary: 'Finalization requires all required projections' },
  { id: 'INV-5.5-I', section: 'L5.5', summary: 'Repair scans find and retry failed projections' },
  { id: 'INV-5.5-J', section: 'L5.5', summary: 'Late data is classified, not silently applied' },
  { id: 'INV-5.5-K', section: 'L5.5', summary: 'Read resolver prefers authority, falls back to projection' },
  { id: 'INV-5.5-L', section: 'L5.5', summary: 'Replay context preserves lineage chain' },

  // L5.6 Physical — 12 invariants
  { id: 'INV-5.6-A', section: 'L5.6', summary: 'All 8 Postgres schemas are declared' },
  { id: 'INV-5.6-B', section: 'L5.6', summary: 'Forbidden schema and table names are enforced' },
  { id: 'INV-5.6-C', section: 'L5.6', summary: 'L5 coordination tables carry full lineage spine' },
  { id: 'INV-5.6-D', section: 'L5.6', summary: 'ClickHouse tables carry mandatory lineage fields' },
  { id: 'INV-5.6-E', section: 'L5.6', summary: 'Redis keys follow namespace and TTL policy' },
  { id: 'INV-5.6-F', section: 'L5.6', summary: 'Redis values carry required lineage' },
  { id: 'INV-5.6-G', section: 'L5.6', summary: 'Object storage paths are deterministic' },
  { id: 'INV-5.6-H', section: 'L5.6', summary: 'Object storage tags enforce required metadata' },
  { id: 'INV-5.6-I', section: 'L5.6', summary: 'Compression law is enforced (.zst)' },
  { id: 'INV-5.6-J', section: 'L5.6', summary: 'Cross-store identity spine is linkable' },
  { id: 'INV-5.6-K', section: 'L5.6', summary: 'No shapeless tables (events, misc, data)' },
  { id: 'INV-5.6-L', section: 'L5.6', summary: 'Domain tables carry typed columns and foreign keys' },

  // L5.7 Assurance — 12 invariants
  { id: 'INV-5.7-A', section: 'L5.7', summary: 'Replay-required writes are reconstructable from approved entry points' },
  { id: 'INV-5.7-B', section: 'L5.7', summary: 'Repair cannot invent new authority truth' },
  { id: 'INV-5.7-C', section: 'L5.7', summary: 'Every failure has a durable class and visible consequence' },
  { id: 'INV-5.7-D', section: 'L5.7', summary: 'Archive failure aborts durable completion' },
  { id: 'INV-5.7-E', section: 'L5.7', summary: 'Redis failure degrades speed only, never truth' },
  { id: 'INV-5.7-F', section: 'L5.7', summary: 'Replay bundle regeneration preserves original meaning' },
  { id: 'INV-5.7-G', section: 'L5.7', summary: 'No direct public write path to L5' },
  { id: 'INV-5.7-H', section: 'L5.7', summary: 'Sensitive artifacts require governed access' },
  { id: 'INV-5.7-I', section: 'L5.7', summary: 'Analytical stores exclude prohibited PII' },
  { id: 'INV-5.7-J', section: 'L5.7', summary: 'No invisible correctness-affecting failure' },
  { id: 'INV-5.7-K', section: 'L5.7', summary: 'Late data cannot silently mutate authority' },
  { id: 'INV-5.7-L', section: 'L5.7', summary: 'Done-gate evaluation is executable and deterministic' },
];

// ─────────────────────────────────────────────────────────────────────
// §5 — LAYER 5 PUBLIC API CONTRACT FOR LAYER 6
// ─────────────────────────────────────────────────────────────────────

export const L5_PUBLIC_API = {
  writeIngress: {
    description: 'The single legal write entry point into Layer 5',
    entryFunction: 'coordinateWrite(envelope: ResolvedStorageEnvelope)',
    module: 'l5/coordination',
    preconditions: [
      'Envelope must be validated and resolved (L5.4)',
      'Canonical references must exist in L3/L4',
      'Metric contracts must exist for time-series writes',
      'Producer must be registered',
    ],
    postconditions: [
      'Manifest created and tracked',
      'Authority committed atomically',
      'Projections dispatched via outbox',
      'Archive written if required',
      'Finalization attempted when all projections complete',
    ],
  },

  readResolution: {
    description: 'Governed read path with authority preference and projection fallback',
    entryFunction: 'resolveRead(policy: ReadPolicy)',
    module: 'l5/coordination',
    guarantees: [
      'Prefers authority store',
      'Falls back to projection with visibility into staleness',
      'Never treats cache absence as truth loss',
    ],
  },

  replay: {
    description: 'Reconstruct historical write traces at 3 fidelity levels',
    entryPoints: ['TRACE_ID', 'REPLAY_WINDOW_ID', 'CANONICAL_SCOPE_TIME_RANGE', 'REPORT_ID', 'SCORE_ID', 'MANIFEST_ID', 'ENVELOPE_ID'],
    fidelityLevels: ['STRUCTURAL', 'ANALYTICAL', 'FORENSIC'],
    module: 'l5/assurance',
  },

  repair: {
    description: 'Background repair for incomplete lifecycle surfaces',
    repairClasses: ['RP0_NO_REPAIR_NEEDED', 'RP1_OPTIONAL_ACCELERATION_REPAIR', 'RP2_REQUIRED_PROJECTION_REPAIR', 'RP3_ARCHIVE_COMPLETENESS_REPAIR', 'RP4_LATE_DATA_REPROJECTION', 'RP5_REPLAY_BUNDLE_REGENERATION', 'RP6_QUARANTINE_BOUND_REPAIR', 'RP7_FATAL_NON_REPAIRABLE'],
    module: 'l5/assurance',
  },

  doneGate: {
    description: 'Executable evaluation of Layer 5 completion',
    entryFunction: 'evaluateL5DoneState(functional, operational, constitutional)',
    recommendations: ['NOT_DONE', 'DONE_WITH_WARNINGS', 'DONE'],
    module: 'l5/assurance',
  },
} as const;

// ─────────────────────────────────────────────────────────────────────
// §6 — DOWNSTREAM CONTRACTS — WHAT LAYER 6 MAY DEPEND ON
// ─────────────────────────────────────────────────────────────────────

export const L5_DOWNSTREAM_CONTRACTS = {
  layer6MayAssume: [
    'Every write through coordinateWrite() is durably tracked via manifest',
    'Authority truth lives in exactly one store per datum family',
    'Projections are eventually consistent and idempotent',
    'Failed projections are automatically repaired by background workers',
    'Duplicates are idempotent; conflicting duplicates are quarantined',
    'Archive objects carry checksums and are immutable once written',
    'Redis loss degrades speed only — durable truth remains intact',
    'Replay can reconstruct any materially important write',
    'Security law prohibits direct public writes and ungoverned artifact access',
    'The done-gate evaluator provides machine-verifiable completion status',
  ],

  layer6MustNot: [
    'Write directly to Postgres/ClickHouse/Redis/Object Storage outside L5 coordination',
    'Invent canonical identity — use L3/L4 canonical refs',
    'Infer missing metric contracts — fail explicitly',
    'Silently upgrade unresolved identity to resolved',
    'Treat projection state as authority truth',
    'Access sensitive artifacts without governed policy',
    'Mutate authority truth without rematerialization law',
    'Redefine state classes, authority homes, or topology law',
    'Bypass envelope validation or quarantine checks',
    'Hide failures behind successful projections',
  ],

  layer6Receives: [
    'ResolvedStorageEnvelope — the write primitive',
    'L5CoordinationResult — the write outcome',
    'ReadResolution — the governed read result',
    'ReplayBundle — the reconstructed historical trace',
    'L5DoneAssessment — the completion evaluation',
    'L5FailureRecord — durable failure records',
    'RepairAttemptRecord — repair audit trail',
  ],
} as const;

// ─────────────────────────────────────────────────────────────────────
// §7 — PHYSICAL SUBSTRATE SUMMARY
// ─────────────────────────────────────────────────────────────────────

export const L5_PHYSICAL_SUBSTRATE = {
  postgres: {
    schemas: ['l3', 'l4', 'l5', 'user_state', 'scoring', 'reports', 'audit', 'ops'],
    coordinationTables: ['l5.write_manifests', 'l5.outbox_jobs', 'l5.archive_pointers', 'l5.manifest_transitions', 'l5.projection_receipts', 'l5.quarantine_cases'],
    domainTables: ['user_state.watchlists', 'user_state.watchlist_items', 'user_state.user_settings', 'scoring.score_registry', 'reports.report_registry', 'audit.audit_events'],
    identitySpine: ['manifest_id', 'envelope_id', 'trace_id', 'dedupe_key'],
  },
  clickhouse: {
    tables: ['ts_numeric_fact_v1', 'ts_ohlcv_bar_v1', 'ts_feature_fact_v1', 'ts_score_history_v1'],
    engine: 'MergeTree',
    partitioning: 'toYYYYMM(event_time)',
    lineageFields: ['manifest_id', 'envelope_id', 'trace_id', 'dedupe_key'],
  },
  redis: {
    keyFamilies: ['hot:metric', 'recent:window', 'dedupe', 'alert:cooldown', 'trigger:active', 'feature:cache', 'context:cache'],
    namespaceLaw: '{env}:l5:{family}:{scope}',
    ttlPolicies: { hotMetric: 300, recentWindow: 600, dedupe: 86400, alertCooldown: 3600, triggerActive: 900, featureCache: 1800, contextCache: 3600 },
  },
  objectStorage: {
    pathFamilies: ['raw', 'normalized', 'backfill', 'model-io', 'reports', 'snapshots', 'replay', 'forensic'],
    compression: '.zst',
    requiredTags: ['trace_id', 'envelope_id', 'manifest_id', 'archive_id', 'checksum_sha256'],
  },
} as const;

// ─────────────────────────────────────────────────────────────────────
// §8 — FAILURE ONTOLOGY SUMMARY
// ─────────────────────────────────────────────────────────────────────

export const L5_FAILURE_ONTOLOGY = {
  families: {
    F1: { name: 'Ingress & Validation', codes: 7, handling: 'Immediate rejection, abort durable flow' },
    F2: { name: 'Quarantine & Semantic Conflict', codes: 6, handling: 'Quarantine, escalate, review required' },
    F3: { name: 'Archive & Integrity', codes: 5, handling: 'Abort if archive-required, repair if pointer/tag only' },
    F4: { name: 'Transaction & Coordination', codes: 5, handling: 'Abort, no partial success, explicit failure class' },
    F5: { name: 'Projection & Materialization', codes: 5, handling: 'Authority preserved, repair path opened, finalization blocked for required projections' },
    F6: { name: 'Security & Access', codes: 5, handling: 'Immediate rejection, audit logged, escalation required' },
    F7: { name: 'Replay & Repair', codes: 4, handling: 'Repair if possible, escalate if exhausted' },
  },
  totalCodes: 37,
  law: 'No failure affecting correctness, replay, archive integrity, or security may remain invisible',
} as const;

// ─────────────────────────────────────────────────────────────────────
// §9 — SECURITY LAW SUMMARY
// ─────────────────────────────────────────────────────────────────────

export const L5_SECURITY_LAW = {
  writeSurface: 'Trusted internal services only — no direct public write, no browser direct write, no ungoverned artifact upload',
  readSurface: 'Sensitive artifacts (reports, model I/O, replay bundles, forensic artifacts, quarantine evidence, audit events) require governed access roles',
  storeEncryption: 'At rest and in transit for all four stores',
  publicBuckets: 'Prohibited — anonymous access denied',
  piiMinimization: 'Prohibited PII fields in ClickHouse (10), Redis (8), object tags (10)',
  auditability: 'Every sensitive access attempt logged with actor, role, object, timestamp, outcome',
} as const;

// ─────────────────────────────────────────────────────────────────────
// §10 — CERTIFICATION TEST REGISTRY
// ─────────────────────────────────────────────────────────────────────

export interface CertificationTestEntry {
  readonly suite: string;
  readonly script: string;
  readonly assertions: number;
  readonly bands: readonly string[];
}

export const L5_TEST_REGISTRY: readonly CertificationTestEntry[] = [
  { suite: 'L5.1 Purpose', script: 'test-l51-purpose.ts', assertions: 206,
    bands: ['State class completeness', 'Authority home declarations', 'Capability enforcement', 'Forbidden action prevention', 'Write classification', 'Invariant verification'] },
  { suite: 'L5.2 Authority', script: 'test-l52-authority.ts', assertions: 183,
    bands: ['Authority allocation', 'Projection policy', 'Manifest lifecycle', 'Loss semantics', 'Shadow authority detection', 'Invariant verification'] },
  { suite: 'L5.3 Topology', script: 'test-l53-topology.ts', assertions: 229,
    bands: ['Deployment modes', 'Store profiles', 'Interaction legality', 'Service boundaries', 'Namespace isolation', 'Constrained mode', 'Configuration validation', 'Invariant verification'] },
  { suite: 'L5.4 Envelope', script: 'test-l54-envelope.ts', assertions: 142,
    bands: ['Write class requirements', 'Canonical serialization', 'Payload hashing', 'Deduplication', 'Envelope validation', 'Lifecycle transitions', 'Quarantine', 'Resolution', 'Invariant verification'] },
  { suite: 'L5.5 Coordination', script: 'test-l55-coordination.ts', assertions: 140,
    bands: ['Preflight and routing', 'Archive and authority', 'Dedupe and outbox', 'Projection execution', 'Finalization and repair', 'Invariant verification'] },
  { suite: 'L5.6 Physical', script: 'test-l56-physical.ts', assertions: 263,
    bands: ['Postgres schemas', 'Coordination tables', 'Domain tables', 'ClickHouse DDL', 'Redis key families', 'Object storage paths', 'Physical invariants'] },
  { suite: 'L5.7 Assurance', script: 'test-l57-assurance.ts', assertions: 208,
    bands: ['Replay entry points and fidelity', 'Replay engine', 'Repair infrastructure', 'Failure ontology', 'Security and access', 'Done-gate evaluator', 'Constitutional invariants'] },
];

// ─────────────────────────────────────────────────────────────────────
// §11 — FREEZE BOUNDARY LAW
// ─────────────────────────────────────────────────────────────────────

export const L5_FREEZE_LAW = {
  frozenAt: '2026-04-03',
  status: 'FROZEN' as const,

  whatIsFrozen: [
    'State class definitions and authority home assignments',
    'Authority model: tiers, stores, projection categories, repairability classes',
    'Multi-store topology: store profiles, interaction rules, service boundaries, namespace policy',
    'StorageEnvelope contract: write classes, producer layers, ingress modes, dedupe law, validation rules',
    'Write coordination: sequencing modes, manifest lifecycle (15 states), consistency model, outbox, repair',
    'Physical design: all Postgres schemas/tables, ClickHouse DDL, Redis key families, object storage paths/tags',
    'Assurance: replay law, repair classes, failure ontology, security law, PII policy, done-gate',
    'All 76 constitutional invariants',
  ],

  whatMayChange: [
    'Implementation internals that do not alter the public contract',
    'Performance optimizations within the physical substrate',
    'New optional projection workers (if they follow existing law)',
    'Additional audit telemetry (if it follows existing observability law)',
    'Bug fixes that restore compliance with declared law',
  ],

  whatMayNeverChange: [
    'Authority home assignments for existing datum families',
    'Manifest lifecycle state machine transitions',
    'StorageEnvelope validation rules',
    'Physical identity spine (manifest_id, envelope_id, trace_id, dedupe_key)',
    'Security write-surface law (no public writes)',
    'Replay fidelity level semantics',
    'Constitutional invariant meaning',
  ],
} as const;
