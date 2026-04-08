/**
 * L2.7 — Blind-Spot Engine
 *
 * The constitutional compiler that turns ingress weakness into explicit
 * downstream rights loss. Scans route outcomes, freshness outcomes,
 * envelope states, dedup/replay/correction decisions, and emits
 * typed blind-spot records.
 */

import { createHash } from 'crypto';
import type { BlindSpotType, BlindSpotSeverity } from './trace-graph';
import type {
  BlindSpotScope, BlindSpotCause, BlindSpotClaimConstraint,
  FallbackSemanticsRecord,
} from './fallback-semantics';
import { evaluateFallbackSemantics, type FallbackEvalInput } from './fallback-semantics';
import {
  computeBlindSpotFingerprint, dedupBlindSpot,
  type BlindSpotFingerprintInput,
} from './blindspot-fingerprint';

// ═══════════════════════════════════════════════════════════════════════════════
// BLIND-SPOT RECORD
// ═══════════════════════════════════════════════════════════════════════════════

export interface BlindSpotRecord {
  blindSpotId: string;
  requestId: string;
  traceId: string;

  type: BlindSpotType;
  severity: BlindSpotSeverity;
  scope: BlindSpotScope;
  cause: BlindSpotCause;

  sourceClass?: string;
  fieldFamily?: string;
  affectedFields: string[];
  affectedEntities: string[];

  relatedRouteId?: string;
  relatedEnvelopeId?: string;
  relatedFallbackRouteId?: string;

  whatWasLost: string[];
  whatRemained: string[];
  semanticLoss: string[];
  partialFields: string[];
  claimConstraints: BlindSpotClaimConstraint[];

  disclosureRequired: boolean;
  disclosureText: string;
  reasonCodes: string[];
  fingerprint: string;

  createdAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENGINE INPUT
// ═══════════════════════════════════════════════════════════════════════════════

export interface RouteOutcome {
  routeTraceId: string;
  selectedRouteMode: string;
  selectedConnector: string;
  routeState: string;
  provenanceScore: number;
  blindSpotFlags: string[];
  routeProbationState?: string;
  fallbackUsed: boolean;
  fallbackInput?: FallbackEvalInput;
}

export interface EnvelopeOutcome {
  envelopeTraceId: string;
  envelopeId: string;
  routeTraceId: string;
  providerId: string;
  sourceClass: string;
  fieldFamily?: string;
  ingressDisposition: string;
  freshnessState?: string;
  identityVerdict?: string;
  lineageComplete: boolean;
  canonicalResolutionState?: string;
  affectedEntities: string[];
  rawPayloadRef?: string;
  normalizedArtifactRef?: string;
}

export interface BlindSpotEngineInput {
  requestId: string;
  traceId: string;
  requestedFieldFamilies: string[];
  requestedEntities: string[];
  routeOutcomes: RouteOutcome[];
  envelopeOutcomes: EnvelopeOutcome[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENGINE OUTPUT
// ═══════════════════════════════════════════════════════════════════════════════

export interface BlindSpotSummary {
  totalBlindSpots: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  constrainedClaimFamilies: string[];
  blockedClaimFamilies: string[];
  disclosureCount: number;
}

export interface BlindSpotEngineResult {
  blindSpots: BlindSpotRecord[];
  fallbackSemantics: FallbackSemanticsRecord[];
  summary: BlindSpotSummary;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

export function compileBlindSpots(input: BlindSpotEngineInput): BlindSpotEngineResult {
  const blindSpots: BlindSpotRecord[] = [];
  const fallbackSemantics: FallbackSemanticsRecord[] = [];

  for (const ro of input.routeOutcomes) {
    if (ro.routeState === 'R2_DEGRADED' || ro.routeState === 'R3_PARTIAL') {
      blindSpots.push(makeBlindSpot(input, {
        type: 'ROUTE_DEGRADED',
        severity: ro.routeState === 'R3_PARTIAL' ? 'HIGH' : 'MEDIUM',
        scope: 'FIELD_FAMILY',
        cause: 'FALLBACK_ROUTE_CHANGE',
        relatedRouteId: ro.routeTraceId,
        whatWasLost: [`Route in ${ro.routeState}`],
        whatRemained: [`Connector: ${ro.selectedConnector}`],
        semanticLoss: ro.routeState === 'R3_PARTIAL' ? ['Partial consumer coverage only'] : [],
        claimConstraints: ro.routeState === 'R3_PARTIAL'
          ? ['SCORING_CONSTRAINED', 'SCENARIO_CONFIRMATION_BLOCKED']
          : ['DISPLAY_CONSTRAINED'],
      }));
    }

    if (ro.routeProbationState) {
      blindSpots.push(makeBlindSpot(input, {
        type: 'ROUTE_DEGRADED',
        severity: 'MEDIUM',
        scope: 'FIELD_FAMILY',
        cause: 'ROUTE_RESTORATION_PROBATION',
        relatedRouteId: ro.routeTraceId,
        whatWasLost: ['Full route trust'],
        whatRemained: ['Probationary route access'],
        semanticLoss: [],
        claimConstraints: ['DISPLAY_CONSTRAINED'],
      }));
    }

    if (ro.fallbackUsed && ro.fallbackInput) {
      const fbSem = evaluateFallbackSemantics(ro.fallbackInput);
      fallbackSemantics.push(fbSem);

      if (fbSem.equivalence !== 'FULLY_EQUIVALENT') {
        const severity = fbSem.equivalence === 'PROHIBITED' || fbSem.equivalence === 'NON_EQUIVALENT'
          ? 'CRITICAL'
          : fbSem.equivalence === 'PARTIAL_ONLY' ? 'HIGH' : 'MEDIUM';

        blindSpots.push(makeBlindSpot(input, {
          type: 'FALLBACK_WITH_SEMANTIC_LOSS',
          severity,
          scope: 'FIELD_FAMILY',
          cause: 'FALLBACK_ROUTE_CHANGE',
          relatedRouteId: ro.routeTraceId,
          relatedFallbackRouteId: ro.fallbackInput.fallbackRouteId,
          fieldFamily: ro.fallbackInput.fieldFamily,
          whatWasLost: fbSem.whatWasLost,
          whatRemained: fbSem.whatRemained,
          semanticLoss: fbSem.semanticLoss,
          partialFields: fbSem.partialFields,
          claimConstraints: fbSem.claimConstraints,
          disclosureText: fbSem.disclosureText,
        }));
      }
    }

    for (const bsFlag of ro.blindSpotFlags) {
      const existing = blindSpots.some(b =>
        b.relatedRouteId === ro.routeTraceId && b.type === (bsFlag as BlindSpotType));
      if (!existing) {
        blindSpots.push(makeBlindSpot(input, {
          type: bsFlag as BlindSpotType,
          severity: 'MEDIUM',
          scope: 'FIELD_FAMILY',
          cause: 'FALLBACK_ROUTE_CHANGE',
          relatedRouteId: ro.routeTraceId,
          whatWasLost: [bsFlag],
          whatRemained: [],
          semanticLoss: [],
          claimConstraints: [],
        }));
      }
    }
  }

  for (const eo of input.envelopeOutcomes) {
    if (eo.freshnessState === 'F3_STALE_AND_CONSTRAINED' || eo.freshnessState === 'F4_UNUSABLE') {
      blindSpots.push(makeBlindSpot(input, {
        type: eo.freshnessState === 'F4_UNUSABLE' ? 'NO_LEGAL_SUBSTITUTE' : 'PARTIAL_FIELD_MISSING',
        severity: eo.freshnessState === 'F4_UNUSABLE' ? 'CRITICAL' : 'HIGH',
        scope: 'FIELD_FAMILY',
        cause: 'FRESHNESS_LOSS',
        relatedEnvelopeId: eo.envelopeTraceId,
        fieldFamily: eo.fieldFamily,
        sourceClass: eo.sourceClass,
        affectedEntities: eo.affectedEntities,
        whatWasLost: ['Temporal fitness for intended use'],
        whatRemained: eo.freshnessState === 'F4_UNUSABLE' ? [] : ['Display/audit use'],
        semanticLoss: ['Freshness rights degraded'],
        claimConstraints: eo.freshnessState === 'F4_UNUSABLE'
          ? ['DIRECTIONAL_CLAIM_BLOCKED', 'SAFETY_VERDICT_BLOCKED']
          : ['SCORING_CONSTRAINED', 'SCENARIO_CONFIRMATION_BLOCKED'],
      }));
    }

    if (!eo.lineageComplete) {
      blindSpots.push(makeBlindSpot(input, {
        type: 'TRACE_INCOMPLETE',
        severity: 'HIGH',
        scope: 'TRACE',
        cause: 'TRACE_BREAK',
        relatedEnvelopeId: eo.envelopeTraceId,
        whatWasLost: ['Full forensic traceability'],
        whatRemained: ['Partial trace'],
        semanticLoss: ['Claim lineage integrity'],
        claimConstraints: ['REPLAY_ONLY'],
      }));
    }

    if (eo.identityVerdict === 'ISOLATE_REPLAY') {
      blindSpots.push(makeBlindSpot(input, {
        type: 'HISTORICAL_GAP',
        severity: 'MEDIUM',
        scope: 'FIELD_FAMILY',
        cause: 'REPLAY_ISOLATION',
        relatedEnvelopeId: eo.envelopeTraceId,
        fieldFamily: eo.fieldFamily,
        whatWasLost: ['Live ingress rights'],
        whatRemained: ['Historical replay artifact'],
        semanticLoss: [],
        claimConstraints: ['REPLAY_ONLY'],
      }));
    }

    if (eo.canonicalResolutionState === 'unresolved') {
      blindSpots.push(makeBlindSpot(input, {
        type: 'PARTIAL_FIELD_MISSING',
        severity: 'MEDIUM',
        scope: 'FIELD',
        cause: 'PARTIAL_NORMALIZATION',
        relatedEnvelopeId: eo.envelopeTraceId,
        affectedEntities: eo.affectedEntities,
        whatWasLost: ['Canonical identity resolution'],
        whatRemained: ['Unresolved observation'],
        semanticLoss: ['Entity mapping uncertain'],
        claimConstraints: ['IDENTITY_ASSERTION_BLOCKED'],
      }));
    }
  }

  const observedFamilies = new Set(input.envelopeOutcomes.map(e => e.fieldFamily).filter(Boolean));
  for (const ff of input.requestedFieldFamilies) {
    if (!observedFamilies.has(ff)) {
      blindSpots.push(makeBlindSpot(input, {
        type: 'OWNER_UNAVAILABLE',
        severity: 'CRITICAL',
        scope: 'FIELD_FAMILY',
        cause: 'OWNER_FAILURE',
        fieldFamily: ff,
        affectedEntities: input.requestedEntities,
        whatWasLost: [`Entire field family: ${ff}`],
        whatRemained: [],
        semanticLoss: ['Complete field family absence'],
        claimConstraints: ['DIRECTIONAL_CLAIM_BLOCKED', 'SAFETY_VERDICT_BLOCKED'],
      }));
    }
  }

  const deduped = deduplicateBlindSpots(blindSpots);

  return {
    blindSpots: deduped,
    fallbackSemantics,
    summary: buildSummary(deduped),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

interface MakeInput {
  type: BlindSpotType;
  severity: BlindSpotSeverity;
  scope: BlindSpotScope;
  cause: BlindSpotCause;
  sourceClass?: string;
  fieldFamily?: string;
  affectedEntities?: string[];
  relatedRouteId?: string;
  relatedEnvelopeId?: string;
  relatedFallbackRouteId?: string;
  whatWasLost: string[];
  whatRemained: string[];
  semanticLoss: string[];
  partialFields?: string[];
  claimConstraints: BlindSpotClaimConstraint[];
  disclosureText?: string;
}

function makeBlindSpot(engine: BlindSpotEngineInput, m: MakeInput): BlindSpotRecord {
  const now = new Date().toISOString();
  const blindSpotId = `bs-${createHash('sha256')
    .update(`${engine.traceId}-${m.type}-${m.cause}-${m.relatedRouteId ?? ''}-${m.relatedEnvelopeId ?? ''}-${now}`)
    .digest('hex').slice(0, 16)}`;

  const fpInput: BlindSpotFingerprintInput = {
    requestId: engine.requestId,
    traceId: engine.traceId,
    type: m.type,
    cause: m.cause,
    scope: m.scope,
    sourceClass: m.sourceClass,
    fieldFamily: m.fieldFamily,
    relatedRouteId: m.relatedRouteId,
    severity: m.severity,
  };
  const fp = computeBlindSpotFingerprint(fpInput);

  return {
    blindSpotId,
    requestId: engine.requestId,
    traceId: engine.traceId,
    type: m.type,
    severity: m.severity,
    scope: m.scope,
    cause: m.cause,
    sourceClass: m.sourceClass,
    fieldFamily: m.fieldFamily,
    affectedFields: m.partialFields ?? [],
    affectedEntities: m.affectedEntities ?? [],
    relatedRouteId: m.relatedRouteId,
    relatedEnvelopeId: m.relatedEnvelopeId,
    relatedFallbackRouteId: m.relatedFallbackRouteId,
    whatWasLost: m.whatWasLost,
    whatRemained: m.whatRemained,
    semanticLoss: m.semanticLoss,
    partialFields: m.partialFields ?? [],
    claimConstraints: m.claimConstraints,
    disclosureRequired: m.claimConstraints.length > 0,
    disclosureText: m.disclosureText ?? (m.whatWasLost.length > 0 ? `Lost: ${m.whatWasLost.join(', ')}` : ''),
    reasonCodes: [`${m.type}_${m.cause}`],
    fingerprint: fp.fingerprint,
    createdAt: now,
  };
}

function deduplicateBlindSpots(spots: BlindSpotRecord[]): BlindSpotRecord[] {
  const seen = new Set<string>();
  const result: BlindSpotRecord[] = [];
  for (const s of spots) {
    const dedup = dedupBlindSpot(s.blindSpotId, { fingerprint: s.fingerprint, stableKeyParts: [] });
    if (!dedup.isDuplicate && !seen.has(s.fingerprint)) {
      seen.add(s.fingerprint);
      result.push(s);
    }
  }
  return result;
}

function buildSummary(spots: BlindSpotRecord[]): BlindSpotSummary {
  const constrained = new Set<string>();
  const blocked = new Set<string>();
  let disclosures = 0;

  for (const s of spots) {
    if (s.disclosureRequired) disclosures++;
    for (const c of s.claimConstraints) {
      if (c.includes('BLOCKED')) {
        if (s.fieldFamily) blocked.add(s.fieldFamily);
      } else if (c.includes('CONSTRAINED') || c.includes('REDUCED')) {
        if (s.fieldFamily) constrained.add(s.fieldFamily);
      }
    }
  }

  return {
    totalBlindSpots: spots.length,
    critical: spots.filter(s => s.severity === 'CRITICAL').length,
    high: spots.filter(s => s.severity === 'HIGH').length,
    medium: spots.filter(s => s.severity === 'MEDIUM').length,
    low: spots.filter(s => s.severity === 'LOW').length,
    constrainedClaimFamilies: Array.from(constrained),
    blockedClaimFamilies: Array.from(blocked),
    disclosureCount: disclosures,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEDGER
// ═══════════════════════════════════════════════════════════════════════════════

const blindSpotLedger: BlindSpotRecord[] = [];

export function recordBlindSpots(spots: BlindSpotRecord[]): void {
  blindSpotLedger.push(...spots);
}

export function getBlindSpotLedger(): BlindSpotRecord[] {
  return [...blindSpotLedger];
}

export function getBlindSpotsByRequest(requestId: string): BlindSpotRecord[] {
  return blindSpotLedger.filter(s => s.requestId === requestId);
}

export function getBlindSpotsBySeverity(severity: BlindSpotSeverity): BlindSpotRecord[] {
  return blindSpotLedger.filter(s => s.severity === severity);
}

export function resetBlindSpotLedger(): void {
  blindSpotLedger.length = 0;
}
