/**
 * L6.7 — Evidence Pack Storage Validator
 *
 * §6.7.5.7 — Blocks:
 *   - evidence packs without archive pointers
 *   - packs without manifest linkage
 *   - packs without replay-safe refs
 *   - current/event outputs that reference missing evidence where policy
 *     requires evidence
 *   - orphan evidence packs (not reachable from registry index)
 */

import {
  L6PersistenceViolationCode,
} from '../contracts/l6-persistence-surface';
import {
  L6EvidencePack,
  L6EvidencePackClass,
  L6EvidencePackIdentity,
} from '../contracts/l6-evidence-storage';

export interface L6EvidenceViolation {
  readonly code: L6PersistenceViolationCode;
  readonly field: string;
  readonly detail: string;
}

export interface L6EvidenceValidationResult {
  readonly ok: boolean;
  readonly violations: readonly L6EvidenceViolation[];
}

export interface L6EvidenceIndexView {
  has(pack_id: string): boolean;
  get(pack_id: string): L6EvidencePack | null;
}

export class EvidencePackStorageValidator {
  constructor(private readonly index: L6EvidenceIndexView) {}

  /**
   * Validate a pack as written: identity, archive, payload-per-class,
   * manifest linkage, and replay safety.
   */
  validatePack(pack: L6EvidencePack): L6EvidenceValidationResult {
    const v: L6EvidenceViolation[] = [];

    this.validateIdentity(pack.identity, v);

    // §6.7.5.3 — archive URI required and object-store-flavored
    if (!pack.archive.archive_uri) {
      v.push({
        code: L6PersistenceViolationCode.MISSING_EVIDENCE_ARCHIVE,
        field: 'archive.archive_uri',
        detail: 'evidence pack missing archive URI',
      });
    } else if (!/^(s3|gs|oss|obj|blob|archive):\/\//i.test(pack.archive.archive_uri) &&
               !pack.archive.archive_uri.startsWith('evidence/')) {
      v.push({
        code: L6PersistenceViolationCode.MISSING_EVIDENCE_ARCHIVE,
        field: 'archive.archive_uri',
        detail: `archive URI ${pack.archive.archive_uri} does not reference object storage`,
      });
    }
    if (!pack.archive.archive_checksum) {
      v.push({
        code: L6PersistenceViolationCode.MISSING_EVIDENCE_ARCHIVE,
        field: 'archive.archive_checksum',
        detail: 'evidence pack missing archive checksum',
      });
    }
    if (!pack.archive.manifest_id) {
      v.push({
        code: L6PersistenceViolationCode.EVIDENCE_WITHOUT_MANIFEST,
        field: 'archive.manifest_id',
        detail: 'evidence pack missing manifest linkage',
      });
    }
    if (!pack.archive.pointer_index_ref) {
      v.push({
        code: L6PersistenceViolationCode.ORPHAN_EVIDENCE_PACK,
        field: 'archive.pointer_index_ref',
        detail: 'evidence pack not pointer-indexed',
      });
    }

    // payload must match class
    if (pack.identity.pack_class === L6EvidencePackClass.FEATURE_EVIDENCE_PACK) {
      if (!pack.feature_payload) {
        v.push({
          code: L6PersistenceViolationCode.MISSING_EVIDENCE_ARCHIVE,
          field: 'feature_payload',
          detail: 'feature evidence pack missing feature payload',
        });
      } else if (pack.event_payload) {
        v.push({
          code: L6PersistenceViolationCode.MISSING_EVIDENCE_ARCHIVE,
          field: 'event_payload',
          detail: 'feature evidence pack carries an event payload',
        });
      }
    }
    if (pack.identity.pack_class === L6EvidencePackClass.EVENT_EVIDENCE_PACK) {
      if (!pack.event_payload) {
        v.push({
          code: L6PersistenceViolationCode.MISSING_EVIDENCE_ARCHIVE,
          field: 'event_payload',
          detail: 'event evidence pack missing event payload',
        });
      } else if (pack.feature_payload) {
        v.push({
          code: L6PersistenceViolationCode.MISSING_EVIDENCE_ARCHIVE,
          field: 'feature_payload',
          detail: 'event evidence pack carries a feature payload',
        });
      }
    }

    // §6.7.5.5 — index discoverability
    if (!this.index.has(pack.identity.evidence_pack_id)) {
      v.push({
        code: L6PersistenceViolationCode.ORPHAN_EVIDENCE_PACK,
        field: 'evidence_pack_id',
        detail: `evidence pack ${pack.identity.evidence_pack_id} not in discovery index`,
      });
    }

    return { ok: v.length === 0, violations: v };
  }

  /**
   * §6.7.5.7 — A primitive output that declares it requires evidence must
   * reference a pack that exists in the index.
   */
  validateReference(
    evidence_required: boolean,
    evidence_pack_ref: string | null,
  ): L6EvidenceValidationResult {
    const v: L6EvidenceViolation[] = [];
    if (evidence_required && !evidence_pack_ref) {
      v.push({
        code: L6PersistenceViolationCode.EVIDENCE_REQUIRED_MISSING,
        field: 'evidence_pack_ref',
        detail: 'primitive requires evidence but no pack reference present',
      });
    }
    if (evidence_pack_ref && !this.index.has(evidence_pack_ref)) {
      v.push({
        code: L6PersistenceViolationCode.ORPHAN_EVIDENCE_PACK,
        field: 'evidence_pack_ref',
        detail: `referenced evidence pack ${evidence_pack_ref} not discoverable`,
      });
    }
    return { ok: v.length === 0, violations: v };
  }

  private validateIdentity(
    id: L6EvidencePackIdentity,
    v: L6EvidenceViolation[],
  ): void {
    const required: (keyof L6EvidencePackIdentity)[] = [
      'evidence_pack_id', 'pack_class', 'primitive_id', 'primitive_version',
      'scope_type', 'scope_id', 'anchor_at', 'compute_run_id', 'trace_id', 'replay_hash',
    ];
    for (const k of required) {
      if (!id[k]) {
        v.push({
          code: L6PersistenceViolationCode.IDENTITY_INCOMPLETE,
          field: `identity.${k}`,
          detail: `evidence pack identity missing ${k}`,
        });
      }
    }
  }
}

/**
 * Simple in-memory evidence index used by validators and tests. Real
 * deployments back this with `l6.evidence_pack_index` in Postgres.
 */
export class L6InMemoryEvidenceIndex implements L6EvidenceIndexView {
  private readonly byId = new Map<string, L6EvidencePack>();

  register(pack: L6EvidencePack): void {
    this.byId.set(pack.identity.evidence_pack_id, pack);
  }

  has(pack_id: string): boolean {
    return this.byId.has(pack_id);
  }

  get(pack_id: string): L6EvidencePack | null {
    return this.byId.get(pack_id) ?? null;
  }

  size(): number {
    return this.byId.size;
  }

  clear(): void {
    this.byId.clear();
  }
}
