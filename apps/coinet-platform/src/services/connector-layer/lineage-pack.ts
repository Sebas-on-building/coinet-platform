/**
 * L2.6 — Lineage Pack
 *
 * The compact evidentiary spine passed to upper layers. Not a log dump.
 * Contains: survivors, losses, blind spots, canonical targets,
 * and retrieval pointers for forensic expansion.
 *
 * Upper layers consume lineage packs for compact context and only
 * pull full forensic reconstruction when needed.
 */

import { createHash } from 'crypto';
import type { EnvelopeTrace, BlindSpotTrace } from './trace-graph';

// ═══════════════════════════════════════════════════════════════════════════════
// LINEAGE PACK
// ═══════════════════════════════════════════════════════════════════════════════

export interface LineagePack {
  lineagePackId: string;
  requestId: string;
  traceId: string;

  targetedEntities: string[];
  targetedFieldFamilies: string[];

  survivingEnvelopeIds: string[];
  suppressedEnvelopeIds: string[];
  dedupedEnvelopeIds: string[];
  correctedEnvelopeIds: string[];
  replayIsolatedEnvelopeIds: string[];
  rejectedEnvelopeIds: string[];

  blindSpotTraceIds: string[];
  routeTraceIds: string[];

  supportingRawPayloadRefs: string[];
  supportingNormalizedArtifactRefs: string[];

  canonicalEntityTargets: string[];
  reasonCodes: string[];
  createdAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUILD INPUT
// ═══════════════════════════════════════════════════════════════════════════════

export interface LineagePackInput {
  requestId: string;
  traceId: string;
  targetedEntities: string[];
  targetedFieldFamilies: string[];
  envelopeTraces: EnvelopeTrace[];
  blindSpotTraces: BlindSpotTrace[];
  routeTraceIds: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

export function buildLineagePack(input: LineagePackInput): LineagePack {
  const now = new Date().toISOString();
  const lineagePackId = `lp-${createHash('sha256')
    .update(`${input.traceId}-${now}`)
    .digest('hex').slice(0, 16)}`;

  const surviving: string[] = [];
  const suppressed: string[] = [];
  const deduped: string[] = [];
  const corrected: string[] = [];
  const replayIsolated: string[] = [];
  const rejected: string[] = [];
  const rawRefs: string[] = [];
  const normRefs: string[] = [];
  const canonicalTargets = new Set<string>();
  const reasons: string[] = [];

  for (const et of input.envelopeTraces) {
    switch (et.ingressDisposition) {
      case 'SURVIVED':
        surviving.push(et.envelopeTraceId);
        break;
      case 'DEDUPED':
        deduped.push(et.envelopeTraceId);
        break;
      case 'CORRECTED':
        corrected.push(et.envelopeTraceId);
        break;
      case 'REPLAY_ISOLATED':
        replayIsolated.push(et.envelopeTraceId);
        break;
      case 'SUPPRESSED':
      case 'QUARANTINED':
        suppressed.push(et.envelopeTraceId);
        break;
      case 'REJECTED':
        rejected.push(et.envelopeTraceId);
        break;
    }

    if (et.survivedIntoLineagePack) {
      if (et.rawPayloadRef) rawRefs.push(et.rawPayloadRef);
      if (et.normalizedArtifactRef) normRefs.push(et.normalizedArtifactRef);
    }

    for (const cid of et.canonicalCandidateIds) {
      canonicalTargets.add(cid);
    }

    for (const rc of et.reasonCodes) {
      if (!reasons.includes(rc)) reasons.push(rc);
    }
  }

  return {
    lineagePackId,
    requestId: input.requestId,
    traceId: input.traceId,
    targetedEntities: input.targetedEntities,
    targetedFieldFamilies: input.targetedFieldFamilies,
    survivingEnvelopeIds: surviving,
    suppressedEnvelopeIds: suppressed,
    dedupedEnvelopeIds: deduped,
    correctedEnvelopeIds: corrected,
    replayIsolatedEnvelopeIds: replayIsolated,
    rejectedEnvelopeIds: rejected,
    blindSpotTraceIds: input.blindSpotTraces.map(bs => bs.blindSpotTraceId),
    routeTraceIds: input.routeTraceIds,
    supportingRawPayloadRefs: rawRefs,
    supportingNormalizedArtifactRefs: normRefs,
    canonicalEntityTargets: Array.from(canonicalTargets),
    reasonCodes: reasons,
    createdAt: now,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PACK STORE
// ═══════════════════════════════════════════════════════════════════════════════

const packStore = new Map<string, LineagePack>();

export function storeLineagePack(pack: LineagePack): void {
  packStore.set(pack.lineagePackId, pack);
}

export function getLineagePack(lineagePackId: string): LineagePack | undefined {
  return packStore.get(lineagePackId);
}

export function getLineagePackByTrace(traceId: string): LineagePack | undefined {
  for (const pack of packStore.values()) {
    if (pack.traceId === traceId) return pack;
  }
  return undefined;
}

export function getAllLineagePacks(): LineagePack[] {
  return Array.from(packStore.values());
}

export function resetLineagePackStore(): void {
  packStore.clear();
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANTI-FAKE: REQUEST LINEAGE HONESTY
// ═══════════════════════════════════════════════════════════════════════════════

export function verifyLineagePackHonesty(
  pack: LineagePack,
  envelopeTraces: EnvelopeTrace[],
  blindSpotTraces: BlindSpotTrace[],
): string[] {
  const violations: string[] = [];

  const survivorTraceIds = new Set(pack.survivingEnvelopeIds);
  for (const et of envelopeTraces) {
    if (et.survivedIntoLineagePack && !survivorTraceIds.has(et.envelopeTraceId)) {
      violations.push(`SURVIVOR_MISSING_FROM_PACK: ${et.envelopeTraceId}`);
    }
  }

  for (const et of envelopeTraces) {
    if (et.ingressDisposition === 'DEDUPED' && survivorTraceIds.has(et.envelopeTraceId)) {
      violations.push(`DEDUPED_TREATED_AS_SURVIVOR: ${et.envelopeTraceId}`);
    }
    if (et.ingressDisposition === 'REJECTED' && survivorTraceIds.has(et.envelopeTraceId)) {
      violations.push(`REJECTED_TREATED_AS_SURVIVOR: ${et.envelopeTraceId}`);
    }
  }

  const packBsIds = new Set(pack.blindSpotTraceIds);
  for (const bs of blindSpotTraces) {
    if (!packBsIds.has(bs.blindSpotTraceId)) {
      violations.push(`BLIND_SPOT_MISSING_FROM_PACK: ${bs.blindSpotTraceId}`);
    }
  }

  if (pack.survivingEnvelopeIds.length > 0 && pack.supportingRawPayloadRefs.length === 0) {
    violations.push('SURVIVORS_WITHOUT_RAW_PAYLOAD_REFS');
  }

  return violations;
}
