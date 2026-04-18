/**
 * L5.5 Write Coordination — Replay Loader
 *
 * §5.5.5.9 — ReplayLoader
 */

import type { ResolvedStorageEnvelope } from '../envelope';
import type { L5CoordinationManifest } from './consistency-model';
import type { ArchiveProof } from './archive-writer';

// ═══════════════════════════════════════════════════════════════════════════════
// REPLAY CONTEXT
// ═══════════════════════════════════════════════════════════════════════════════

export interface ReplayContext {
  readonly envelope: ResolvedStorageEnvelope;
  readonly manifest: L5CoordinationManifest | null;
  readonly archiveProof: ArchiveProof | null;
  readonly replayWindowId: string | null;
  readonly lineageChain: readonly string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPLAY LINEAGE STORE (in-memory)
// ═══════════════════════════════════════════════════════════════════════════════

const replayStore = new Map<string, ReplayContext>();

export function resetReplayStore(): void {
  replayStore.clear();
}

export function recordReplayContext(envelopeId: string, ctx: ReplayContext): void {
  replayStore.set(envelopeId, ctx);
}

export function getReplayContext(envelopeId: string): ReplayContext | undefined {
  return replayStore.get(envelopeId);
}

// ═══════════════════════════════════════════════════════════════════════════════
// LINEAGE BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

export function buildLineageChain(env: ResolvedStorageEnvelope): string[] {
  const chain: string[] = [env.envelope_id];
  let parentId = env.parent_envelope_id;

  while (parentId) {
    chain.push(parentId);
    const parent = replayStore.get(parentId);
    parentId = parent?.envelope.parent_envelope_id ?? null;
  }

  return chain;
}

export function loadReplayEnvelope(
  env: ResolvedStorageEnvelope,
  manifest: L5CoordinationManifest | null,
  archiveProof: ArchiveProof | null,
): ReplayContext {
  const lineageChain = buildLineageChain(env);
  const ctx: ReplayContext = {
    envelope: env,
    manifest,
    archiveProof,
    replayWindowId: env.replay_window_id,
    lineageChain,
  };
  recordReplayContext(env.envelope_id, ctx);
  return ctx;
}
