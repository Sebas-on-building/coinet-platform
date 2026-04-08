/**
 * Layer 2 — Constitution
 *
 * The frozen contract of Coinet's ingress constitution. Every sublayer
 * version is pinned here. No breaking change to any L2 contract may
 * happen without an explicit version bump in this registry.
 *
 * Mission: Transform raw external observation into governed ingress
 * evidence that is temporally typed, route-legible, identity-safe,
 * replay-faithful, request-traceable, and epistemically honest under
 * failure.
 */

import { L21_PROTOCOL_VERSION } from './constitutional-envelope';
import { L22_VERSION } from './freshness-ontology';
import { L23_VERSION } from './routing-mode-types';
import { L24_VERSION } from './event-fingerprint';
import { L25_VERSION } from './replay-types';
import { L26_VERSION } from './trace-graph';
import { L27_VERSION } from './fallback-semantics';

// ═══════════════════════════════════════════════════════════════════════════════
// VERSION REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

export const LAYER2_CONSTITUTION_VERSION = '1.0.0' as const;

export interface Layer2VersionPins {
  constitutionVersion: string;
  l21_envelope: string;
  l22_freshness: string;
  l23_routing: string;
  l24_identity: string;
  l25_replay: string;
  l26_traceability: string;
  l27_blindspots: string;
}

export function captureLayer2Versions(): Layer2VersionPins {
  return {
    constitutionVersion: LAYER2_CONSTITUTION_VERSION,
    l21_envelope: L21_PROTOCOL_VERSION,
    l22_freshness: L22_VERSION,
    l23_routing: L23_VERSION,
    l24_identity: L24_VERSION,
    l25_replay: L25_VERSION,
    l26_traceability: L26_VERSION,
    l27_blindspots: L27_VERSION,
  };
}

export function validateVersionCompatibility(
  recorded: Layer2VersionPins,
  current: Layer2VersionPins,
): VersionCompatibilityResult {
  const drifts: VersionDriftEntry[] = [];

  const keys: Array<keyof Layer2VersionPins> = [
    'l21_envelope', 'l22_freshness', 'l23_routing', 'l24_identity',
    'l25_replay', 'l26_traceability', 'l27_blindspots',
  ];

  for (const k of keys) {
    if (recorded[k] !== current[k]) {
      drifts.push({
        sublayer: k,
        recordedVersion: recorded[k],
        currentVersion: current[k],
        breaking: isMajorDrift(recorded[k], current[k]),
      });
    }
  }

  return {
    compatible: drifts.every(d => !d.breaking),
    drifts,
    replayUnsafe: drifts.some(d => d.breaking),
  };
}

function isMajorDrift(a: string, b: string): boolean {
  const [aMajor] = a.split('.');
  const [bMajor] = b.split('.');
  return aMajor !== bMajor;
}

export interface VersionDriftEntry {
  sublayer: string;
  recordedVersion: string;
  currentVersion: string;
  breaking: boolean;
}

export interface VersionCompatibilityResult {
  compatible: boolean;
  drifts: VersionDriftEntry[];
  replayUnsafe: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INVARIANT REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

export type InvariantSeverity = 'HARD_FAIL' | 'SOFT_DEGRADE';

export interface Layer2Invariant {
  id: string;
  sublayer: string;
  severity: InvariantSeverity;
  description: string;
  certificationGroup: Layer2Certification;
}

export type Layer2Certification =
  | 'A_CONSTITUTIONAL_INTEGRITY'
  | 'B_TEMPORAL_RIGHTS'
  | 'C_ROUTE_ADMISSIBILITY'
  | 'D_IDENTITY_INTEGRITY'
  | 'E_FORENSIC_FAITHFULNESS'
  | 'F_REQUEST_TRACE_TRUTH'
  | 'G_BLIND_SPOT_HONESTY';

export const LAYER2_INVARIANTS: Layer2Invariant[] = [
  // Certification A — Constitutional integrity
  { id: 'A1', sublayer: 'L2.1', severity: 'HARD_FAIL', description: 'Every observation enters through constitutional envelope', certificationGroup: 'A_CONSTITUTIONAL_INTEGRITY' },
  { id: 'A2', sublayer: 'L2.1', severity: 'HARD_FAIL', description: 'Normalized fragment without raw lineage hard-fails', certificationGroup: 'A_CONSTITUTIONAL_INTEGRITY' },
  { id: 'A3', sublayer: 'L2.1', severity: 'HARD_FAIL', description: 'Fallback used without reason hard-fails', certificationGroup: 'A_CONSTITUTIONAL_INTEGRITY' },
  { id: 'A4', sublayer: 'L2.1', severity: 'HARD_FAIL', description: 'Ambiguous canonical candidates preserved', certificationGroup: 'A_CONSTITUTIONAL_INTEGRITY' },
  { id: 'A5', sublayer: 'L2.1', severity: 'HARD_FAIL', description: 'Route context always present in envelope', certificationGroup: 'A_CONSTITUTIONAL_INTEGRITY' },

  // Certification B — Temporal rights
  { id: 'B1', sublayer: 'L2.2', severity: 'HARD_FAIL', description: 'Same envelope valid for display but invalid for scoring', certificationGroup: 'B_TEMPORAL_RIGHTS' },
  { id: 'B2', sublayer: 'L2.2', severity: 'HARD_FAIL', description: 'Observed time dominates ingest time', certificationGroup: 'B_TEMPORAL_RIGHTS' },
  { id: 'B3', sublayer: 'L2.2', severity: 'HARD_FAIL', description: 'Fast route does not rescue old observation', certificationGroup: 'B_TEMPORAL_RIGHTS' },
  { id: 'B4', sublayer: 'L2.2', severity: 'HARD_FAIL', description: 'Historical replay valid historically but blocked live', certificationGroup: 'B_TEMPORAL_RIGHTS' },
  { id: 'B5', sublayer: 'L2.2', severity: 'SOFT_DEGRADE', description: 'Stale scheduled data usable contextually but not directionally', certificationGroup: 'B_TEMPORAL_RIGHTS' },

  // Certification C — Route admissibility
  { id: 'C1', sublayer: 'L2.3', severity: 'HARD_FAIL', description: 'Cost never makes an inadmissible route admissible', certificationGroup: 'C_ROUTE_ADMISSIBILITY' },
  { id: 'C2', sublayer: 'L2.3', severity: 'HARD_FAIL', description: 'Backfill cannot contaminate live scoring', certificationGroup: 'C_ROUTE_ADMISSIBILITY' },
  { id: 'C3', sublayer: 'L2.3', severity: 'HARD_FAIL', description: 'Realtime wins for mission-critical fast fields when admissible', certificationGroup: 'C_ROUTE_ADMISSIBILITY' },
  { id: 'C4', sublayer: 'L2.3', severity: 'HARD_FAIL', description: 'On-demand cannot silently replace systemic monitoring', certificationGroup: 'C_ROUTE_ADMISSIBILITY' },
  { id: 'C5', sublayer: 'L2.3', severity: 'SOFT_DEGRADE', description: 'Restored routes do not regain preference prematurely', certificationGroup: 'C_ROUTE_ADMISSIBILITY' },

  // Certification D — Identity integrity
  { id: 'D1', sublayer: 'L2.4', severity: 'HARD_FAIL', description: 'Retry same operation mutates once', certificationGroup: 'D_IDENTITY_INTEGRITY' },
  { id: 'D2', sublayer: 'L2.4', severity: 'HARD_FAIL', description: 'Corrections never absorbed as duplicates', certificationGroup: 'D_IDENTITY_INTEGRITY' },
  { id: 'D3', sublayer: 'L2.4', severity: 'HARD_FAIL', description: 'Replay artifact does not mutate live state', certificationGroup: 'D_IDENTITY_INTEGRITY' },
  { id: 'D4', sublayer: 'L2.4', severity: 'HARD_FAIL', description: 'Semantically identical payloads with different formatting dedup correctly', certificationGroup: 'D_IDENTITY_INTEGRITY' },
  { id: 'D5', sublayer: 'L2.4', severity: 'HARD_FAIL', description: 'Same value at different times does not over-collapse', certificationGroup: 'D_IDENTITY_INTEGRITY' },

  // Certification E — Forensic faithfulness
  { id: 'E1', sublayer: 'L2.5', severity: 'HARD_FAIL', description: 'Raw payload recovery by trace id works', certificationGroup: 'E_FORENSIC_FAITHFULNESS' },
  { id: 'E2', sublayer: 'L2.5', severity: 'HARD_FAIL', description: 'Replay under pinned versions is deterministic', certificationGroup: 'E_FORENSIC_FAITHFULNESS' },
  { id: 'E3', sublayer: 'L2.5', severity: 'HARD_FAIL', description: 'Reconstruction preserves route, freshness, and identity decisions', certificationGroup: 'E_FORENSIC_FAITHFULNESS' },
  { id: 'E4', sublayer: 'L2.5', severity: 'HARD_FAIL', description: 'Historical blind spots preserved during replay', certificationGroup: 'E_FORENSIC_FAITHFULNESS' },
  { id: 'E5', sublayer: 'L2.5', severity: 'HARD_FAIL', description: 'Backfill without batch constitution rejected as forensic-grade', certificationGroup: 'E_FORENSIC_FAITHFULNESS' },

  // Certification F — Request-trace truth
  { id: 'F1', sublayer: 'L2.6', severity: 'HARD_FAIL', description: 'Every request produces typed ingress graph', certificationGroup: 'F_REQUEST_TRACE_TRUTH' },
  { id: 'F2', sublayer: 'L2.6', severity: 'HARD_FAIL', description: 'Every route decision and rejected candidate preserved', certificationGroup: 'F_REQUEST_TRACE_TRUTH' },
  { id: 'F3', sublayer: 'L2.6', severity: 'HARD_FAIL', description: 'Every envelope outcome linked to route and request', certificationGroup: 'F_REQUEST_TRACE_TRUTH' },
  { id: 'F4', sublayer: 'L2.6', severity: 'HARD_FAIL', description: 'Every surviving artifact appears in lineage pack', certificationGroup: 'F_REQUEST_TRACE_TRUTH' },
  { id: 'F5', sublayer: 'L2.6', severity: 'HARD_FAIL', description: 'Every blind spot appears in trace and lineage pack', certificationGroup: 'F_REQUEST_TRACE_TRUTH' },

  // Certification G — Blind-spot honesty
  { id: 'G1', sublayer: 'L2.7', severity: 'HARD_FAIL', description: 'Every ingress weakness creates a typed blind-spot record', certificationGroup: 'G_BLIND_SPOT_HONESTY' },
  { id: 'G2', sublayer: 'L2.7', severity: 'HARD_FAIL', description: 'Every semantic-loss fallback emits disclosure', certificationGroup: 'G_BLIND_SPOT_HONESTY' },
  { id: 'G3', sublayer: 'L2.7', severity: 'HARD_FAIL', description: 'Every blind spot propagates into downstream behavior', certificationGroup: 'G_BLIND_SPOT_HONESTY' },
  { id: 'G4', sublayer: 'L2.7', severity: 'HARD_FAIL', description: 'No blind spot disappears between trace, lineage pack, and audit', certificationGroup: 'G_BLIND_SPOT_HONESTY' },
  { id: 'G5', sublayer: 'L2.7', severity: 'HARD_FAIL', description: 'Cheaper route chosen while better admissible existed requires override', certificationGroup: 'G_BLIND_SPOT_HONESTY' },
];

export function getInvariantsByCertification(group: Layer2Certification): Layer2Invariant[] {
  return LAYER2_INVARIANTS.filter(i => i.certificationGroup === group);
}

export function getInvariantsBySublayer(sublayer: string): Layer2Invariant[] {
  return LAYER2_INVARIANTS.filter(i => i.sublayer === sublayer);
}

export function getHardFailInvariants(): Layer2Invariant[] {
  return LAYER2_INVARIANTS.filter(i => i.severity === 'HARD_FAIL');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIX PRODUCTION PROPERTIES
// ═══════════════════════════════════════════════════════════════════════════════

export const LAYER2_PROPERTIES = [
  {
    id: 'P1',
    name: 'Constitutional Ingress',
    definition: 'Every observation enters through one governed envelope shape with timing, route, lineage, authority carry-forward, and replay metadata.',
    sublayers: ['L2.1'],
    certifications: ['A_CONSTITUTIONAL_INTEGRITY'] as Layer2Certification[],
  },
  {
    id: 'P2',
    name: 'Temporal Rights',
    definition: 'Every observation has typed freshness and usage rights, not a generic TTL.',
    sublayers: ['L2.2'],
    certifications: ['B_TEMPORAL_RIGHTS'] as Layer2Certification[],
  },
  {
    id: 'P3',
    name: 'Route Legitimacy',
    definition: 'Every route choice is admissible, explainable, and bounded by truth fidelity before cost.',
    sublayers: ['L2.3'],
    certifications: ['C_ROUTE_ADMISSIBILITY'] as Layer2Certification[],
  },
  {
    id: 'P4',
    name: 'Identity Integrity',
    definition: 'No retry, duplicate, correction, replay, or reconnect event can silently corrupt live ingress meaning.',
    sublayers: ['L2.4'],
    certifications: ['D_IDENTITY_INTEGRITY'] as Layer2Certification[],
  },
  {
    id: 'P5',
    name: 'Forensic Faithfulness',
    definition: 'Every ingress artifact is replayable, reconstructable, and historically faithful under pinned versions.',
    sublayers: ['L2.5'],
    certifications: ['E_FORENSIC_FAITHFULNESS'] as Layer2Certification[],
  },
  {
    id: 'P6',
    name: 'Ingress Honesty',
    definition: 'Every fallback, missing owner path, degraded route, stale observation, trace break, or semantic-loss path becomes an explicit blind-spot signal with downstream consequences.',
    sublayers: ['L2.6', 'L2.7'],
    certifications: ['F_REQUEST_TRACE_TRUTH', 'G_BLIND_SPOT_HONESTY'] as Layer2Certification[],
  },
] as const;
