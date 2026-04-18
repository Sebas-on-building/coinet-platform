/**
 * L5.5 Write Coordination — Archive Writer
 *
 * §5.5.5.2 — ArchiveWriter
 * §5.5.4.5 — Archive-first branch
 */

import { createHash, randomUUID } from 'crypto';
import { canonicalizePayload } from '../envelope';
import type { ResolvedStorageEnvelope } from '../envelope';

// ═══════════════════════════════════════════════════════════════════════════════
// ARCHIVE PROOF
// ═══════════════════════════════════════════════════════════════════════════════

export interface ArchiveProof {
  readonly archive_id: string;
  readonly archive_uri: string;
  readonly archive_checksum_sha256: string;
  readonly archive_size_bytes: number;
  readonly archived_at: string;
  readonly verified: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARCHIVE WRITE RESULT
// ═══════════════════════════════════════════════════════════════════════════════

export interface ArchiveWriteResult {
  readonly success: boolean;
  readonly proof: ArchiveProof | null;
  readonly failureRetryable: boolean;
  readonly failureReason: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARCHIVE STORE (in-memory; production uses object storage)
// ═══════════════════════════════════════════════════════════════════════════════

const archiveStore = new Map<string, { proof: ArchiveProof; data: string }>();

export function resetArchiveStore(): void {
  archiveStore.clear();
}

export function getArchivedObject(archiveId: string): ArchiveProof | undefined {
  return archiveStore.get(archiveId)?.proof;
}

export function getAllArchivedObjects(): ArchiveProof[] {
  return Array.from(archiveStore.values()).map(e => e.proof);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARCHIVE PATH DETERMINATION
// ═══════════════════════════════════════════════════════════════════════════════

export function deriveArchivePath(env: ResolvedStorageEnvelope): string {
  const dateSegment = env.source_observed_at.slice(0, 10).replace(/-/g, '/');
  return `archive/${env.write_class}/${dateSegment}/${env.envelope_id}.json`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARCHIVE WRITE
// ═══════════════════════════════════════════════════════════════════════════════

export function writeArchive(env: ResolvedStorageEnvelope): ArchiveWriteResult {
  try {
    const canonicalized = canonicalizePayload(env.payload);
    const checksum = createHash('sha256').update(canonicalized, 'utf8').digest('hex');
    const uri = deriveArchivePath(env);
    const archiveId = randomUUID();

    const proof: ArchiveProof = {
      archive_id: archiveId,
      archive_uri: uri,
      archive_checksum_sha256: checksum,
      archive_size_bytes: Buffer.byteLength(canonicalized, 'utf8'),
      archived_at: new Date().toISOString(),
      verified: true,
    };

    archiveStore.set(archiveId, { proof, data: canonicalized });

    return { success: true, proof, failureRetryable: false, failureReason: null };
  } catch (err) {
    return {
      success: false,
      proof: null,
      failureRetryable: true,
      failureReason: err instanceof Error ? err.message : 'Unknown archive write failure',
    };
  }
}

export function verifyArchiveChecksum(archiveId: string, expectedChecksum: string): boolean {
  const entry = archiveStore.get(archiveId);
  if (!entry) return false;
  const actual = createHash('sha256').update(entry.data, 'utf8').digest('hex');
  return actual === expectedChecksum;
}
