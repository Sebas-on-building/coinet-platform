/**
 * L12.6 — Persistence envelope validator (§12.6.7).
 *
 * Validates a `L12PersistenceEnvelope` against L5-routing law, surface /
 * authority / discipline / materialization-mode law, and supersession /
 * correction discipline. Pure — never writes anywhere.
 */

import {
  L12_DURABLE_SURFACE_AUTHORITY,
  L12MaterializationMode,
  L12MutationDiscipline,
  L12PersistenceEnvelope,
  L12StorageAuthorityClass,
  isL12CurrentAuthoritySurface,
  isL12HistoricalAppendSurface,
  l12ModeMayWriteCurrent,
  l12RunModeMayWriteCurrent,
} from '../contracts/l12-persistence-surface';
import { isL12DurableSurfaceRegistered } from '../registry/l12-durable-surface.registry';
import {
  L12PersistenceValidationResult,
  L12PersistenceViolationCode,
  L12PersistenceViolationIssue,
  l12PersistenceIssueOf,
} from './l12-persistence-violation-codes';
import {
  l12CanonicalDisciplineForSurface,
  l12IsModeAllowedForSurface,
} from './l12-materialization-policy';

export function validateL12PersistenceEnvelope(
  envelope: L12PersistenceEnvelope,
): L12PersistenceValidationResult {
  const issues: L12PersistenceViolationIssue[] = [];

  // L5 route
  if (!envelope.l5_route_ref || envelope.l5_route_ref.trim() === '') {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_L5_ROUTE_MISSING,
        'persistence envelope missing L5 route ref',
        envelope.persistence_envelope_id,
      ),
    );
  }

  // Direct write attempt
  if ((envelope as { direct_write_attempted?: unknown }).direct_write_attempted === true) {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_DIRECT_WRITE_ATTEMPT,
        'direct write attempted bypassing L5',
        envelope.persistence_envelope_id,
      ),
    );
  }

  // Surface registered
  if (!isL12DurableSurfaceRegistered(envelope.durable_surface_id)) {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_DURABLE_SURFACE_UNREGISTERED,
        `durable surface ${envelope.durable_surface_id} is not registered`,
        envelope.persistence_envelope_id,
      ),
    );
  }

  // Surface ↔ authority match
  const expectedAuthority = L12_DURABLE_SURFACE_AUTHORITY[envelope.durable_surface_id];
  if (expectedAuthority && expectedAuthority !== envelope.storage_authority) {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_SURFACE_AUTHORITY_MISMATCH,
        `surface ${envelope.durable_surface_id} expects authority ${expectedAuthority}, got ${envelope.storage_authority}`,
        envelope.persistence_envelope_id,
      ),
    );
  }

  // Redis as authority
  if (envelope.storage_authority === L12StorageAuthorityClass.REDIS_ACCELERATION_ONLY) {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_REDIS_USED_AS_AUTHORITY,
        'Redis is acceleration-only and cannot be persistence authority',
        envelope.persistence_envelope_id,
      ),
    );
  }

  // Discipline ↔ surface
  const canonicalDiscipline = l12CanonicalDisciplineForSurface(
    envelope.durable_surface_id,
  );
  if (envelope.mutation_discipline !== canonicalDiscipline) {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_SURFACE_DISCIPLINE_MISMATCH,
        `surface ${envelope.durable_surface_id} expects discipline ${canonicalDiscipline}, got ${envelope.mutation_discipline}`,
        envelope.persistence_envelope_id,
      ),
    );
  }

  // Mode allowed for surface
  if (
    !l12IsModeAllowedForSurface(envelope.durable_surface_id, envelope.materialization_mode)
  ) {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_MATERIALIZATION_MODE_NOT_ALLOWED_FOR_SURFACE,
        `mode ${envelope.materialization_mode} is not allowed for surface ${envelope.durable_surface_id}`,
        envelope.persistence_envelope_id,
      ),
    );
  }

  // Current authority safety
  const writesCurrent =
    isL12CurrentAuthoritySurface(envelope.durable_surface_id) &&
    envelope.current_authority_allowed;
  if (writesCurrent) {
    if (!l12ModeMayWriteCurrent(envelope.materialization_mode)) {
      // Specific cases for clearer codes
      switch (envelope.materialization_mode) {
        case L12MaterializationMode.REPLAY_HISTORICAL:
          issues.push(
            l12PersistenceIssueOf(
              L12PersistenceViolationCode.L12P_REPLAY_WRITES_CURRENT,
              'replay mode cannot write current authority',
              envelope.persistence_envelope_id,
            ),
          );
          break;
        case L12MaterializationMode.SHADOW_EVALUATION:
          issues.push(
            l12PersistenceIssueOf(
              L12PersistenceViolationCode.L12P_CURRENT_AUTHORITY_WRITTEN_BY_SHADOW,
              'shadow evaluation cannot write current authority',
              envelope.persistence_envelope_id,
            ),
          );
          break;
        case L12MaterializationMode.BACKFILL_HISTORICAL:
          issues.push(
            l12PersistenceIssueOf(
              L12PersistenceViolationCode.L12P_BACKFILL_WRITES_CURRENT,
              'backfill mode cannot write current authority',
              envelope.persistence_envelope_id,
            ),
          );
          break;
        default:
          issues.push(
            l12PersistenceIssueOf(
              L12PersistenceViolationCode.L12P_CURRENT_AUTHORITY_WRITTEN_BY_REPLAY,
              `mode ${envelope.materialization_mode} cannot write current authority`,
              envelope.persistence_envelope_id,
            ),
          );
      }
    }

    if (!l12RunModeMayWriteCurrent(envelope.source_run_mode)) {
      issues.push(
        l12PersistenceIssueOf(
          L12PersistenceViolationCode.L12P_CURRENT_WRITE_FROM_NON_LIVE_RUN,
          `run mode ${envelope.source_run_mode} cannot produce current writes`,
          envelope.persistence_envelope_id,
        ),
      );
    }
  }

  // Historical append needs lineage
  if (
    envelope.historical_append_allowed &&
    isL12HistoricalAppendSurface(envelope.durable_surface_id) &&
    envelope.lineage_refs.length === 0
  ) {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_HISTORICAL_APPEND_MISSING_LINEAGE,
        'historical append requires lineage_refs',
        envelope.persistence_envelope_id,
      ),
    );
  }

  // Evidence required
  if (
    envelope.evidence_archive_required &&
    (!envelope.evidence_pack_ref || envelope.evidence_pack_ref.trim() === '')
  ) {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_CURRENT_RECORD_MISSING_EVIDENCE,
        'envelope requires evidence pack ref',
        envelope.persistence_envelope_id,
      ),
    );
  }

  // Repair / supersession discipline
  if (
    envelope.materialization_mode === L12MaterializationMode.REPAIR_SUPERSESSION ||
    envelope.mutation_discipline === L12MutationDiscipline.CURRENT_UPSERT_WITH_SUPERSESSION
  ) {
    if (envelope.supersedes_ref && !envelope.correction_reason && envelope.materialization_mode === L12MaterializationMode.REPAIR_SUPERSESSION) {
      issues.push(
        l12PersistenceIssueOf(
          L12PersistenceViolationCode.L12P_REPAIR_REASON_MISSING,
          'repair supersession envelope missing correction reason',
          envelope.persistence_envelope_id,
        ),
      );
    }
  }

  // Replay hash
  if (!envelope.replay_hash || envelope.replay_hash.trim() === '') {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_CURRENT_RECORD_MISSING_REPLAY_HASH,
        'persistence envelope missing replay hash',
        envelope.persistence_envelope_id,
      ),
    );
  }

  return { ok: issues.length === 0, issues };
}
