/**
 * L5.6 Physical Design — Physical Invariants
 *
 * §5.6.16 — INV-5.6-A through INV-5.6-L
 */

import { WRITE_MANIFESTS_TABLE } from './postgres-tables/write-manifests.table';
import { OUTBOX_JOBS_TABLE } from './postgres-tables/outbox-jobs.table';
import { ARCHIVE_POINTERS_TABLE } from './postgres-tables/archive-pointers.table';
import { TS_NUMERIC_FACT_TABLE } from './clickhouse/ts-numeric-fact.ddl';
import { TS_OHLCV_BAR_TABLE } from './clickhouse/ts-ohlcv-bar.ddl';
import { TS_FEATURE_FACT_TABLE } from './clickhouse/ts-feature-fact.ddl';
import { TS_SCORE_HISTORY_TABLE } from './clickhouse/ts-score-history.ddl';
import { isValidL5RedisKey, extractKeyFamily } from './redis/key-families';
import { isValidL5ObjectPath, hasRequiredCompression, extractPathFamily } from './object-store/path-builder';
import { validateObjectTags, REQUIRED_OBJECT_TAGS } from './object-store/tag-policy';
import { FORBIDDEN_TABLE_NAMES, isTableNameAllowed } from './postgres-schemas';

// ═══════════════════════════════════════════════════════════════════════════════
// INVARIANT IDS
// ═══════════════════════════════════════════════════════════════════════════════

export type L5PhysicalInvariantId =
  | 'INV-5.6-A' | 'INV-5.6-B' | 'INV-5.6-C' | 'INV-5.6-D'
  | 'INV-5.6-E' | 'INV-5.6-F' | 'INV-5.6-G' | 'INV-5.6-H'
  | 'INV-5.6-I' | 'INV-5.6-J' | 'INV-5.6-K' | 'INV-5.6-L';

export const ALL_PHYSICAL_INVARIANT_IDS: readonly L5PhysicalInvariantId[] = [
  'INV-5.6-A', 'INV-5.6-B', 'INV-5.6-C', 'INV-5.6-D',
  'INV-5.6-E', 'INV-5.6-F', 'INV-5.6-G', 'INV-5.6-H',
  'INV-5.6-I', 'INV-5.6-J', 'INV-5.6-K', 'INV-5.6-L',
];

export interface PhysicalInvariantResult {
  readonly id: L5PhysicalInvariantId;
  readonly label: string;
  readonly passed: boolean;
  readonly detail: string;
}

export interface PhysicalInvariantContext {
  readonly manifestHasEnvelopeId?: boolean;
  readonly outboxJobHasManifestId?: boolean;
  readonly archiveRequiredManifestHasArchivePointer?: boolean;
  readonly outboxJobCountMatchesManifestCounters?: boolean;
  readonly clickhouseRowLineageFields?: readonly string[];
  readonly redisKeys?: readonly string[];
  readonly redisEnv?: string;
  readonly objectPaths?: readonly string[];
  readonly objectTags?: readonly Record<string, string | undefined>[];
  readonly jsonbOnPrimaryQueryPath?: boolean;
  readonly tableNames?: readonly string[];
  readonly duplicateAnalyticalOverwrite?: boolean;
  readonly archiveLinkageViaTypedRef?: boolean;
  readonly replayFromTraceIdReachesAll?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INVARIANT DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

const CH_REQUIRED_LINEAGE = ['manifest_id', 'envelope_id', 'trace_id', 'dedupe_key'];

const DEFS: Record<L5PhysicalInvariantId, { label: string; check: (ctx: PhysicalInvariantContext) => { passed: boolean; detail: string } }> = {
  'INV-5.6-A': {
    label: 'Every accepted envelope has exactly one durable manifest row',
    check: (ctx) => ({
      passed: ctx.manifestHasEnvelopeId !== false,
      detail: ctx.manifestHasEnvelopeId === false ? 'Manifest missing envelope_id unique constraint' : 'Manifest has envelope_id uniqueness',
    }),
  },
  'INV-5.6-B': {
    label: 'No outbox job may exist without a parent manifest',
    check: (ctx) => ({
      passed: ctx.outboxJobHasManifestId !== false,
      detail: ctx.outboxJobHasManifestId === false ? 'Outbox job lacks manifest_id foreign key' : 'All outbox jobs reference a manifest',
    }),
  },
  'INV-5.6-C': {
    label: 'Every archive-required finalized manifest references a valid archive pointer',
    check: (ctx) => ({
      passed: ctx.archiveRequiredManifestHasArchivePointer !== false,
      detail: ctx.archiveRequiredManifestHasArchivePointer === false ? 'Archive-required manifest missing archive pointer' : 'Archive pointer linkage intact',
    }),
  },
  'INV-5.6-D': {
    label: 'Every required outbox job contributes to manifest projection counters consistently',
    check: (ctx) => ({
      passed: ctx.outboxJobCountMatchesManifestCounters !== false,
      detail: ctx.outboxJobCountMatchesManifestCounters === false ? 'Outbox job count does not match manifest counters' : 'Projection counters consistent',
    }),
  },
  'INV-5.6-E': {
    label: 'No ClickHouse analytical row may omit trace_id, manifest_id, or dedupe_key',
    check: (ctx) => {
      if (!ctx.clickhouseRowLineageFields) return { passed: true, detail: 'No ClickHouse rows to check' };
      const missing = CH_REQUIRED_LINEAGE.filter(f => !ctx.clickhouseRowLineageFields!.includes(f));
      return {
        passed: missing.length === 0,
        detail: missing.length > 0 ? `Missing ClickHouse lineage fields: ${missing.join(', ')}` : 'All ClickHouse lineage fields present',
      };
    },
  },
  'INV-5.6-F': {
    label: 'No Redis key may exist outside the environment-prefixed namespace family',
    check: (ctx) => {
      if (!ctx.redisKeys || ctx.redisKeys.length === 0) return { passed: true, detail: 'No Redis keys to check' };
      const invalid = ctx.redisKeys.filter(k => !isValidL5RedisKey(k) || !extractKeyFamily(k));
      return {
        passed: invalid.length === 0,
        detail: invalid.length > 0 ? `${invalid.length} Redis key(s) outside L5 namespace` : 'All Redis keys within L5 namespace',
      };
    },
  },
  'INV-5.6-G': {
    label: 'No object artifact may exist without deterministic path class and required metadata tags',
    check: (ctx) => {
      const pathIssues: string[] = [];
      if (ctx.objectPaths) {
        for (const p of ctx.objectPaths) {
          if (!isValidL5ObjectPath(p)) pathIssues.push(`Non-deterministic path: ${p.slice(0, 60)}`);
          if (!hasRequiredCompression(p)) pathIssues.push(`Missing compression: ${p.slice(0, 60)}`);
          if (!extractPathFamily(p)) pathIssues.push(`Unknown path family: ${p.slice(0, 60)}`);
        }
      }
      if (ctx.objectTags) {
        for (const tags of ctx.objectTags) {
          const v = validateObjectTags(tags);
          if (!v.valid) pathIssues.push(`Missing tags: ${v.missingTags.join(', ')}`);
        }
      }
      return {
        passed: pathIssues.length === 0,
        detail: pathIssues.length > 0 ? pathIssues.join('; ') : 'All object paths and tags valid',
      };
    },
  },
  'INV-5.6-H': {
    label: 'No primary query path may rely on JSONB where typed columns are required',
    check: (ctx) => ({
      passed: !ctx.jsonbOnPrimaryQueryPath,
      detail: ctx.jsonbOnPrimaryQueryPath ? 'JSONB used on primary query path' : 'JSONB restricted to sparse adjunct state',
    }),
  },
  'INV-5.6-I': {
    label: 'No shapeless miscellaneous table may exist in L5 physical design',
    check: (ctx) => {
      if (!ctx.tableNames) return { passed: true, detail: 'No tables to check' };
      const forbidden = ctx.tableNames.filter(n => !isTableNameAllowed(n));
      return {
        passed: forbidden.length === 0,
        detail: forbidden.length > 0 ? `Forbidden table names: ${forbidden.join(', ')}` : 'No shapeless tables',
      };
    },
  },
  'INV-5.6-J': {
    label: 'Non-identical duplicate analytical writes must not overwrite prior rows silently',
    check: (ctx) => ({
      passed: !ctx.duplicateAnalyticalOverwrite,
      detail: ctx.duplicateAnalyticalOverwrite ? 'Silent duplicate overwrite detected' : 'Duplicate conflicts handled upstream',
    }),
  },
  'INV-5.6-K': {
    label: 'Mutable authority rows referencing immutable artifacts must use archive_id or archive_uri',
    check: (ctx) => ({
      passed: ctx.archiveLinkageViaTypedRef !== false,
      detail: ctx.archiveLinkageViaTypedRef === false ? 'Archive linkage uses opaque text instead of typed ref' : 'Archive linkage uses typed references',
    }),
  },
  'INV-5.6-L': {
    label: 'Replay lookup from trace_id must reach manifest, jobs, and archive pointer surfaces',
    check: (ctx) => ({
      passed: ctx.replayFromTraceIdReachesAll !== false,
      detail: ctx.replayFromTraceIdReachesAll === false ? 'Replay lookup cannot traverse from trace_id to all surfaces' : 'Replay lookup traversal complete',
    }),
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

export function assertPhysicalInvariant(id: L5PhysicalInvariantId, ctx: PhysicalInvariantContext): PhysicalInvariantResult {
  const def = DEFS[id];
  const { passed, detail } = def.check(ctx);
  return { id, label: def.label, passed, detail };
}

export function assertAllPhysicalInvariants(ctx: PhysicalInvariantContext): PhysicalInvariantResult[] {
  return ALL_PHYSICAL_INVARIANT_IDS.map(id => assertPhysicalInvariant(id, ctx));
}

export function enforceAllPhysicalInvariants(ctx: PhysicalInvariantContext): void {
  const results = assertAllPhysicalInvariants(ctx);
  const failures = results.filter(r => !r.passed);
  if (failures.length > 0) {
    throw new Error(`Physical invariant violation(s): ${failures.map(f => `${f.id}: ${f.detail}`).join('; ')}`);
  }
}
