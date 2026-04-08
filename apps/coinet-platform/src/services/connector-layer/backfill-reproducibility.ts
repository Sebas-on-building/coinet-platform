/**
 * L2.5 — Backfill Reproducibility
 *
 * A backfill without explicit batch constitution is not reproducible
 * and must not be treated as forensic-grade. Backfill must never
 * masquerade as historical reconstruction unless its policy, route,
 * and replay generation are explicit.
 */

import type {
  BackfillBatchConstitution, BackfillReproducibilityResult,
  IngressVersionPins, ReplayIndexRecord,
} from './replay-types';
import { detectVersionDrift } from './replay-constitution';
import { getByBatchId } from './replay-index';
import { readRawPayload } from './raw-payload-archive';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTITUTION REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

const constitutionRegistry = new Map<string, BackfillBatchConstitution>();

export function declareBackfillConstitution(constitution: BackfillBatchConstitution): void {
  if (constitutionRegistry.has(constitution.backfillBatchId)) {
    throw new Error(`BACKFILL_CONSTITUTION_ALREADY_DECLARED: ${constitution.backfillBatchId}`);
  }
  constitutionRegistry.set(constitution.backfillBatchId, constitution);
}

export function getBackfillConstitution(batchId: string): BackfillBatchConstitution | undefined {
  return constitutionRegistry.get(batchId);
}

export function getAllConstitutions(): BackfillBatchConstitution[] {
  return Array.from(constitutionRegistry.values());
}

export function resetConstitutionRegistry(): void {
  constitutionRegistry.clear();
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPRODUCIBILITY CHECK
// ═══════════════════════════════════════════════════════════════════════════════

export function checkReproducibility(batchId: string): BackfillReproducibilityResult {
  const constitution = constitutionRegistry.get(batchId);

  if (!constitution) {
    return {
      batchId,
      reproducible: false,
      constitutionDeclared: false,
      totalArtifacts: 0,
      matchedArtifacts: 0,
      divergenceReasons: ['NO_CONSTITUTION_DECLARED'],
      missingArtifacts: [],
      mismatchedVersions: [],
    };
  }

  const artifacts = getByBatchId(batchId);
  const divergenceReasons: string[] = [];
  const missingArtifacts: string[] = [];
  const mismatchedVersions: string[] = [];
  let matched = 0;

  for (const art of artifacts) {
    const rawExists = readRawPayload(art.rawPayloadRef);
    if (!rawExists) {
      missingArtifacts.push(`${art.envelopeId}: RAW_PAYLOAD_MISSING`);
      continue;
    }

    const versionDrifts = detectVersionDrift(constitution.pinnedVersions, art.versionPins);
    if (versionDrifts.length > 0) {
      for (const d of versionDrifts) {
        mismatchedVersions.push(
          `${art.envelopeId}: ${d.field} expected=${d.originalVersion} actual=${d.currentVersion}`,
        );
      }
      continue;
    }

    if (!constitution.sourceSet.includes(art.source)) {
      divergenceReasons.push(`${art.envelopeId}: SOURCE_NOT_IN_CONSTITUTION (${art.source})`);
      continue;
    }

    if (art.routeMode !== constitution.routeMode) {
      divergenceReasons.push(`${art.envelopeId}: ROUTE_MODE_MISMATCH (${art.routeMode})`);
      continue;
    }

    matched++;
  }

  const reproducible =
    artifacts.length > 0 &&
    missingArtifacts.length === 0 &&
    mismatchedVersions.length === 0 &&
    divergenceReasons.length === 0;

  return {
    batchId,
    reproducible,
    constitutionDeclared: true,
    totalArtifacts: artifacts.length,
    matchedArtifacts: matched,
    divergenceReasons,
    missingArtifacts,
    mismatchedVersions,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPARE TWO BACKFILL RUNS
// ═══════════════════════════════════════════════════════════════════════════════

export interface BackfillComparisonResult {
  batchIdA: string;
  batchIdB: string;
  equivalent: boolean;
  envelopeCountA: number;
  envelopeCountB: number;
  versionDivergences: string[];
  sourceDivergences: string[];
  orderingDivergences: string[];
}

export function compareBackfillRuns(batchIdA: string, batchIdB: string): BackfillComparisonResult {
  const constA = constitutionRegistry.get(batchIdA);
  const constB = constitutionRegistry.get(batchIdB);
  const artifactsA = getByBatchId(batchIdA);
  const artifactsB = getByBatchId(batchIdB);

  const versionDivergences: string[] = [];
  const sourceDivergences: string[] = [];
  const orderingDivergences: string[] = [];

  if (constA && constB) {
    const drifts = detectVersionDrift(constA.pinnedVersions, constB.pinnedVersions);
    for (const d of drifts) {
      versionDivergences.push(`${d.field}: ${d.originalVersion} → ${d.currentVersion}`);
    }

    const srcA = new Set(constA.sourceSet);
    const srcB = new Set(constB.sourceSet);
    for (const s of srcA) {
      if (!srcB.has(s)) sourceDivergences.push(`Source ${s} in A but not B`);
    }
    for (const s of srcB) {
      if (!srcA.has(s)) sourceDivergences.push(`Source ${s} in B but not A`);
    }

    if (constA.orderingPolicy !== constB.orderingPolicy) {
      orderingDivergences.push(`Ordering: ${constA.orderingPolicy} → ${constB.orderingPolicy}`);
    }
  } else {
    if (!constA) versionDivergences.push('CONSTITUTION_A_MISSING');
    if (!constB) versionDivergences.push('CONSTITUTION_B_MISSING');
  }

  const equivalent =
    versionDivergences.length === 0 &&
    sourceDivergences.length === 0 &&
    orderingDivergences.length === 0 &&
    artifactsA.length === artifactsB.length;

  return {
    batchIdA, batchIdB,
    equivalent,
    envelopeCountA: artifactsA.length,
    envelopeCountB: artifactsB.length,
    versionDivergences,
    sourceDivergences,
    orderingDivergences,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANTI-FAKE: BACKFILL HONESTY
// ═══════════════════════════════════════════════════════════════════════════════

export function verifyBackfillHonesty(batchId: string): string[] {
  const violations: string[] = [];

  const constitution = constitutionRegistry.get(batchId);
  if (!constitution) {
    violations.push('BACKFILL_WITHOUT_CONSTITUTION');
    return violations;
  }

  const artifacts = getByBatchId(batchId);
  for (const art of artifacts) {
    if (art.routeMode !== 'BACKFILL') {
      violations.push(`${art.envelopeId}: NON_BACKFILL_ROUTE_IN_BACKFILL_BATCH`);
    }
    if (art.replayGeneration !== constitution.replayGeneration) {
      violations.push(`${art.envelopeId}: REPLAY_GENERATION_MISMATCH`);
    }
  }

  const pv = constitution.pinnedVersions;
  if (!pv.envelopeProtocolVersion || !pv.normalizationVersion) {
    violations.push('BACKFILL_CONSTITUTION_MISSING_VERSION_PINS');
  }

  return violations;
}
