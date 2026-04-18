/**
 * L7.7 — Constitutional Invariants
 *
 * §7.7.9.1 — Executable, test-covered invariants:
 *
 *   INV-7.7-A  Layer 7 persists through Layer 5 only; direct-store
 *              bypass is illegal.
 *   INV-7.7-B  Current validation, contradiction, confidence, and
 *              restriction state are authoritative only in Postgres
 *              current registries.
 *   INV-7.7-C  Historical validation, contradiction, confidence, and
 *              restriction facts are append-safe, replay-safe, and
 *              correction-aware.
 *   INV-7.7-D  Evidence bundles must be archive-linked, manifest-linked,
 *              checksum-bearing, and replay-safe.
 *   INV-7.7-E  Read surfaces must serve governed L7 state, not raw
 *              storage or ad hoc revalidation.
 *   INV-7.7-F  Later layers may consume L7 through read surfaces only,
 *              except in governed replay or repair modes.
 *   INV-7.7-G  Current and historical state must remain lineage-linked
 *              and semantically consistent across replay, repair, and
 *              late-data rematerialization.
 */

import {
  L7AuthorityStore,
  L7DurableSurfaceId,
  L7MaterializationMode,
  L7PersistenceClass,
  L7PersistenceEnvelope,
} from '../contracts/l7-persistence-surface';
import {
  L7CurrentStateIdentity,
  L7HistoricalFactBase,
} from '../contracts/l7-current-authority';
import {
  L7EvidencePointer,
  L7EvidencePointerCheckContext,
} from '../contracts/l7-evidence-storage';
import { L7ReadRequest } from '../contracts/l7-read-surface';
import {
  L7DurableSurfaceRegistry,
  getDefaultDurableSurfaceRegistry,
} from '../registry/durable-surface.registry';
import {
  L7ReadSurfaceRegistry,
  getDefaultReadSurfaceRegistry,
} from '../registry/read-surface.registry';
import {
  L7PersistencePolicyValidator,
  L7PersistenceValidationContext,
} from '../persistence/l7-persistence-policy.validator';
import {
  L7CurrentStateAuthorityValidator,
  L7CurrentStateValidationContext,
} from '../persistence/current-state-authority.validator';
import {
  L7HistoricalSurfaceValidator,
  L7HistoricalWriteContext,
} from '../persistence/historical-surface.validator';
import { L7EvidenceStorageValidator } from '../persistence/evidence-storage.validator';
import { L7ReadSurfaceValidator } from '../read/l7-read-surface.validator';
import {
  L7DownstreamConsumptionAttempt,
  L7DownstreamConsumptionValidator,
} from '../read/downstream-consumption.validator';
import {
  L7PersistenceViolation,
  L7PersistenceViolationCode,
  buildL7PersistenceViolation,
} from '../persistence/l7-persistence-violation-codes';
import {
  emitPersistenceAuditRecord,
  surfaceForPersistenceViolation,
  defaultSeverityForPersistenceViolation,
} from '../constitution/l7-persistence-audit';
import { L7_CURRENT_PERSISTENCE_CLASSES, L7_HISTORICAL_PERSISTENCE_CLASSES } from '../persistence/l7-materialization-policy';

// ── Shared result type ─────────────────────────────────────────────────

export interface L7_7InvariantResult {
  readonly invariant: string;
  readonly ok: boolean;
  readonly violations: readonly L7PersistenceViolation[];
  readonly detail: string;
}

function emitAll(source: string, violations: readonly L7PersistenceViolation[]): void {
  for (const v of violations) {
    emitPersistenceAuditRecord({
      violationCode: v.code,
      source,
      auditSurface: surfaceForPersistenceViolation(v.code),
      subjectId: v.subject_id ?? null,
      durableSurfaceId: v.surface ?? null,
      readSurfaceId: v.surface?.startsWith('l7.read.') ? v.surface : null,
      consumerClass:
        (v.context?.['consumer_class'] as string | undefined) ?? null,
      materializationMode:
        (v.context?.['mode'] as string | undefined) ?? null,
      detail: v.detail,
      context: v.context ?? {},
      severity: defaultSeverityForPersistenceViolation(v.code),
    });
  }
}

// ── INV-7.7-A ──────────────────────────────────────────────────────────

export interface L7_7_A_Input {
  readonly envelope: L7PersistenceEnvelope;
  readonly context: L7PersistenceValidationContext;
}

export function checkL7_7_A_L5OnlyPersistence(
  input: L7_7_A_Input,
  validator: L7PersistencePolicyValidator = new L7PersistencePolicyValidator(),
): L7_7InvariantResult {
  const r = validator.validate(input.envelope, input.context);
  emitAll('INV-7.7-A', r.violations);
  return {
    invariant: 'INV-7.7-A',
    ok: r.ok,
    violations: r.violations,
    detail: r.ok
      ? 'L7 persisted through L5 only'
      : `direct-store / L5 bypass violations (${r.violations.length})`,
  };
}

// ── INV-7.7-B ──────────────────────────────────────────────────────────

export interface L7_7_B_Input {
  readonly envelope: L7PersistenceEnvelope;
  readonly row: L7CurrentStateIdentity;
  readonly context: L7CurrentStateValidationContext;
}

export function checkL7_7_B_CurrentAuthorityIsPostgresOnly(
  input: L7_7_B_Input,
  validator: L7CurrentStateAuthorityValidator = new L7CurrentStateAuthorityValidator(),
  registry: L7DurableSurfaceRegistry = getDefaultDurableSurfaceRegistry(),
): L7_7InvariantResult {
  const descriptorOk =
    registry.authorityFor(input.envelope.surface_id) === L7AuthorityStore.POSTGRES;

  const extra: L7PersistenceViolation[] = [];
  if (!descriptorOk) {
    extra.push(
      buildL7PersistenceViolation(
        L7PersistenceViolationCode.AUTHORITY_STORE_INVALID_FOR_SURFACE,
        `surface ${input.envelope.surface_id} current-state authority must be POSTGRES`,
        { subject_id: input.envelope.subject_id, surface: input.envelope.surface_id },
      ),
    );
  }

  const r = validator.validate(input.envelope, input.row, input.context);
  const all = [...extra, ...r.violations];
  emitAll('INV-7.7-B', all);
  return {
    invariant: 'INV-7.7-B',
    ok: all.length === 0,
    violations: all,
    detail: all.length === 0
      ? 'current state authoritative only in Postgres current registries'
      : `current-authority violations (${all.length})`,
  };
}

// ── INV-7.7-C ──────────────────────────────────────────────────────────

export interface L7_7_C_Input {
  readonly envelope: L7PersistenceEnvelope;
  readonly row: L7HistoricalFactBase;
  readonly context: L7HistoricalWriteContext;
}

export function checkL7_7_C_HistoricalAppendSafety(
  input: L7_7_C_Input,
  validator: L7HistoricalSurfaceValidator = new L7HistoricalSurfaceValidator(),
): L7_7InvariantResult {
  const r = validator.validate(input.envelope, input.row, input.context);
  emitAll('INV-7.7-C', r.violations);
  return {
    invariant: 'INV-7.7-C',
    ok: r.ok,
    violations: r.violations,
    detail: r.ok
      ? 'historical facts are append-safe, replay-safe, correction-aware'
      : `historical-append violations (${r.violations.length})`,
  };
}

// ── INV-7.7-D ──────────────────────────────────────────────────────────

export interface L7_7_D_Input {
  readonly pointer: L7EvidencePointer;
  readonly context: L7EvidencePointerCheckContext;
}

export function checkL7_7_D_EvidenceArchiveLinked(
  input: L7_7_D_Input,
  validator: L7EvidenceStorageValidator = new L7EvidenceStorageValidator(),
): L7_7InvariantResult {
  const r = validator.validate(input.pointer, input.context);
  emitAll('INV-7.7-D', r.violations);
  return {
    invariant: 'INV-7.7-D',
    ok: r.ok,
    violations: r.violations,
    detail: r.ok
      ? 'evidence archive-linked, manifest-linked, checksum-bearing, replay-safe'
      : `evidence violations (${r.violations.length})`,
  };
}

// ── INV-7.7-E ──────────────────────────────────────────────────────────

export interface L7_7_E_Input {
  readonly request: L7ReadRequest;
}

export function checkL7_7_E_ReadSurfacesGoverned(
  input: L7_7_E_Input,
  validator: L7ReadSurfaceValidator = new L7ReadSurfaceValidator(),
): L7_7InvariantResult {
  const r = validator.validate(input.request);
  emitAll('INV-7.7-E', r.violations);
  return {
    invariant: 'INV-7.7-E',
    ok: r.ok,
    violations: r.violations,
    detail: r.ok
      ? 'read surfaces serve governed L7 state only'
      : `read-surface violations (${r.violations.length})`,
  };
}

// ── INV-7.7-F ──────────────────────────────────────────────────────────

export interface L7_7_F_Input {
  readonly attempt: L7DownstreamConsumptionAttempt;
}

export function checkL7_7_F_DownstreamUsesReadSurface(
  input: L7_7_F_Input,
  validator: L7DownstreamConsumptionValidator = new L7DownstreamConsumptionValidator(),
): L7_7InvariantResult {
  const r = validator.validate(input.attempt);
  emitAll('INV-7.7-F', r.violations);
  return {
    invariant: 'INV-7.7-F',
    ok: r.ok,
    violations: r.violations,
    detail: r.ok
      ? 'downstream consumed L7 through governed read surfaces'
      : `downstream-consumption violations (${r.violations.length})`,
  };
}

// ── INV-7.7-G ──────────────────────────────────────────────────────────

export interface L7_7_G_LineageSnapshot {
  readonly current_state_id: string | null;
  readonly current_compute_run_id: string | null;
  readonly current_replay_hash: string | null;
  readonly historical_compute_run_id: string | null;
  readonly historical_replay_hash: string | null;
  readonly replay_generation_ref: string | null;
  readonly mode: L7MaterializationMode | null;
}

export function checkL7_7_G_LineageConsistency(
  snapshot: L7_7_G_LineageSnapshot,
  opts: { readonly subject_id: string; readonly surface: L7DurableSurfaceId },
): L7_7InvariantResult {
  const violations: L7PersistenceViolation[] = [];

  if (snapshot.current_state_id && !snapshot.current_compute_run_id) {
    violations.push(
      buildL7PersistenceViolation(
        L7PersistenceViolationCode.LINEAGE_LINK_BROKEN,
        'current state has no compute_run_id',
        { subject_id: opts.subject_id, surface: opts.surface },
      ),
    );
  }
  if (
    snapshot.current_compute_run_id &&
    snapshot.historical_compute_run_id &&
    snapshot.current_compute_run_id !== snapshot.historical_compute_run_id
  ) {
    violations.push(
      buildL7PersistenceViolation(
        L7PersistenceViolationCode.CURRENT_HISTORICAL_INCONSISTENCY,
        `current compute_run_id ${snapshot.current_compute_run_id} ≠ historical ${snapshot.historical_compute_run_id}`,
        { subject_id: opts.subject_id, surface: opts.surface },
      ),
    );
  }
  if (
    snapshot.current_replay_hash &&
    snapshot.historical_replay_hash &&
    snapshot.current_replay_hash !== snapshot.historical_replay_hash
  ) {
    violations.push(
      buildL7PersistenceViolation(
        L7PersistenceViolationCode.REPLAY_REPAIR_SEMANTIC_DRIFT,
        `replay_hash drift between current and historical rows`,
        { subject_id: opts.subject_id, surface: opts.surface },
      ),
    );
  }
  if (
    (snapshot.mode === L7MaterializationMode.REPLAY_HISTORICAL ||
      snapshot.mode === L7MaterializationMode.REPAIR_REBUILD) &&
    !snapshot.replay_generation_ref
  ) {
    violations.push(
      buildL7PersistenceViolation(
        L7PersistenceViolationCode.REPLAY_GENERATION_REF_MISSING,
        `mode ${snapshot.mode} requires replay_generation_ref`,
        { subject_id: opts.subject_id, surface: opts.surface },
      ),
    );
  }

  emitAll('INV-7.7-G', violations);
  return {
    invariant: 'INV-7.7-G',
    ok: violations.length === 0,
    violations,
    detail:
      violations.length === 0
        ? 'current and historical state remain lineage-linked and semantically consistent'
        : `lineage / replay-repair inconsistencies (${violations.length})`,
  };
}

// ── Surface-registry sanity helper ─────────────────────────────────────

/**
 * §7.7.2 — Confirm that CURRENT_* classes map to Postgres-authoritative
 * surfaces and HISTORICAL_* classes map to ClickHouse-authoritative ones.
 * Used by the test suite as a sanity anchor.
 */
export function validateL7_7_SurfaceAuthorityMap(
  registry: L7DurableSurfaceRegistry = getDefaultDurableSurfaceRegistry(),
): { readonly ok: boolean; readonly violations: readonly L7PersistenceViolation[] } {
  const violations: L7PersistenceViolation[] = [];

  for (const cls of L7_CURRENT_PERSISTENCE_CLASSES) {
    const surface = surfaceForCurrentClass(cls);
    const auth = registry.authorityFor(surface);
    if (auth !== L7AuthorityStore.POSTGRES) {
      violations.push(
        buildL7PersistenceViolation(
          L7PersistenceViolationCode.AUTHORITY_STORE_INVALID_FOR_SURFACE,
          `current class ${cls} surface ${surface} authority must be POSTGRES, got ${auth}`,
          { surface },
        ),
      );
    }
  }
  for (const cls of L7_HISTORICAL_PERSISTENCE_CLASSES) {
    const surface = surfaceForHistoricalClass(cls);
    const auth = registry.authorityFor(surface);
    if (auth !== L7AuthorityStore.CLICKHOUSE) {
      violations.push(
        buildL7PersistenceViolation(
          L7PersistenceViolationCode.AUTHORITY_STORE_INVALID_FOR_SURFACE,
          `historical class ${cls} surface ${surface} authority must be CLICKHOUSE, got ${auth}`,
          { surface },
        ),
      );
    }
  }

  emitAll('L7.7.2-authority-map', violations);
  return { ok: violations.length === 0, violations };
}

function surfaceForCurrentClass(cls: L7PersistenceClass): L7DurableSurfaceId {
  switch (cls) {
    case L7PersistenceClass.CURRENT_VALIDATION:
      return L7DurableSurfaceId.CURRENT_VALIDATION_REGISTRY;
    case L7PersistenceClass.CURRENT_CONTRADICTION:
      return L7DurableSurfaceId.CURRENT_CONTRADICTION_REGISTRY;
    case L7PersistenceClass.CURRENT_CONFIDENCE:
      return L7DurableSurfaceId.CURRENT_CONFIDENCE_REGISTRY;
    case L7PersistenceClass.CURRENT_RESTRICTION:
      return L7DurableSurfaceId.CURRENT_RESTRICTION_REGISTRY;
    default:
      throw new Error(`${cls} is not a current class`);
  }
}

function surfaceForHistoricalClass(cls: L7PersistenceClass): L7DurableSurfaceId {
  switch (cls) {
    case L7PersistenceClass.HISTORICAL_VALIDATION:
      return L7DurableSurfaceId.HISTORICAL_VALIDATION_FACTS;
    case L7PersistenceClass.HISTORICAL_CONTRADICTION:
      return L7DurableSurfaceId.HISTORICAL_CONTRADICTION_FACTS;
    case L7PersistenceClass.HISTORICAL_CONFIDENCE:
      return L7DurableSurfaceId.HISTORICAL_CONFIDENCE_FACTS;
    case L7PersistenceClass.HISTORICAL_RESTRICTION:
      return L7DurableSurfaceId.HISTORICAL_RESTRICTION_FACTS;
    default:
      throw new Error(`${cls} is not a historical class`);
  }
}

// Convenience: make the read-surface registry available from here too.
export function l7_7DefaultReadSurfaceRegistry(): L7ReadSurfaceRegistry {
  return getDefaultReadSurfaceRegistry();
}
