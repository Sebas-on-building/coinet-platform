/**
 * L2.5 — Replay Constitution
 *
 * Replay without policy pinning is weak. Replay without forensic
 * completeness is dangerous. Replay without drift detection is fake.
 *
 * This constitution defines what replay means, when it is legal,
 * what it must preserve, and what makes reconstruction honest.
 */

import type { IngressVersionPins, ReconstructionIntegrity } from './replay-types';
import { L21_PROTOCOL_VERSION } from './constitutional-envelope';
import { L22_VERSION } from './freshness-ontology';
import { L23_VERSION } from './routing-mode-types';
import { L24_VERSION } from './event-fingerprint';

// ═══════════════════════════════════════════════════════════════════════════════
// REPLAY DOCTRINE
// ═══════════════════════════════════════════════════════════════════════════════

export const REPLAY_DOCTRINE = {
  RULE_A: 'Replay must reproduce the exact ingress path that occurred historically',
  RULE_B: 'Replay under different policy versions must detect and disclose all drift',
  RULE_C: 'Replay must never silently overwrite live state unless explicitly promoted',
  RULE_D: 'A forensic snapshot must be sufficient to answer why any ingress decision was made',
  RULE_E: 'Reconstruction integrity must be computable for every envelope',
  RULE_F: 'Version pins are mandatory — replay without pinning is not forensic',
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// CURRENT VERSION PINS — captures the live system state
// ═══════════════════════════════════════════════════════════════════════════════

export function captureCurrentVersionPins(overrides?: Partial<IngressVersionPins>): IngressVersionPins {
  return {
    envelopeProtocolVersion: L21_PROTOCOL_VERSION,
    freshnessOntologyVersion: L22_VERSION,
    routingDoctrineVersion: L23_VERSION,
    dedupEngineVersion: L24_VERSION,
    connectorBinaryVersion: overrides?.connectorBinaryVersion ?? '1.0.0',
    normalizationVersion: overrides?.normalizationVersion ?? '1.0.0',
    authorityConstitutionVersion: overrides?.authorityConstitutionVersion,
    substitutionConstitutionVersion: overrides?.substitutionConstitutionVersion,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// VERSION PIN VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

export function validateVersionPins(pins: IngressVersionPins): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (!pins.envelopeProtocolVersion) issues.push('MISSING_ENVELOPE_PROTOCOL_VERSION');
  if (!pins.freshnessOntologyVersion) issues.push('MISSING_FRESHNESS_VERSION');
  if (!pins.routingDoctrineVersion) issues.push('MISSING_ROUTING_VERSION');
  if (!pins.dedupEngineVersion) issues.push('MISSING_DEDUP_VERSION');
  if (!pins.connectorBinaryVersion) issues.push('MISSING_CONNECTOR_VERSION');
  if (!pins.normalizationVersion) issues.push('MISSING_NORMALIZATION_VERSION');

  return { valid: issues.length === 0, issues };
}

// ═══════════════════════════════════════════════════════════════════════════════
// VERSION DRIFT DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

export interface VersionDrift {
  field: string;
  originalVersion: string;
  currentVersion: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}

export function detectVersionDrift(original: IngressVersionPins, current: IngressVersionPins): VersionDrift[] {
  const drifts: VersionDrift[] = [];

  const check = (field: string, orig: string | undefined, curr: string | undefined, severity: 'INFO' | 'WARNING' | 'CRITICAL') => {
    if (orig && curr && orig !== curr) {
      drifts.push({ field, originalVersion: orig, currentVersion: curr, severity });
    }
  };

  check('envelopeProtocolVersion', original.envelopeProtocolVersion, current.envelopeProtocolVersion, 'CRITICAL');
  check('freshnessOntologyVersion', original.freshnessOntologyVersion, current.freshnessOntologyVersion, 'WARNING');
  check('routingDoctrineVersion', original.routingDoctrineVersion, current.routingDoctrineVersion, 'WARNING');
  check('dedupEngineVersion', original.dedupEngineVersion, current.dedupEngineVersion, 'WARNING');
  check('connectorBinaryVersion', original.connectorBinaryVersion, current.connectorBinaryVersion, 'INFO');
  check('normalizationVersion', original.normalizationVersion, current.normalizationVersion, 'CRITICAL');

  return drifts;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RECONSTRUCTION INTEGRITY COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface IntegrityInput {
  hasEnvelope: boolean;
  hasFreshnessDecision: boolean;
  hasRoutingDecision: boolean;
  hasIdentityDecision: boolean;
  versionsPinned: boolean;
  lineageComplete: boolean;
  rawPayloadRefExists: boolean;
  normalizationVersionExists: boolean;
  timingComplete: boolean;
}

export function computeReconstructionIntegrity(input: IntegrityInput): ReconstructionIntegrity {
  const issues: string[] = [];

  if (!input.hasEnvelope) issues.push('ENVELOPE_MISSING');
  if (!input.hasFreshnessDecision) issues.push('FRESHNESS_DECISION_MISSING');
  if (!input.hasRoutingDecision) issues.push('ROUTING_DECISION_MISSING');
  if (!input.hasIdentityDecision) issues.push('IDENTITY_DECISION_MISSING');
  if (!input.versionsPinned) issues.push('VERSION_PINS_INCOMPLETE');
  if (!input.lineageComplete) issues.push('LINEAGE_INCOMPLETE');
  if (!input.rawPayloadRefExists) issues.push('RAW_PAYLOAD_REF_MISSING');
  if (!input.normalizationVersionExists) issues.push('NORMALIZATION_VERSION_MISSING');
  if (!input.timingComplete) issues.push('TIMING_INCOMPLETE');

  const checks = [
    input.hasEnvelope,
    input.hasFreshnessDecision,
    input.hasRoutingDecision,
    input.hasIdentityDecision,
    input.versionsPinned,
    input.lineageComplete,
    input.rawPayloadRefExists,
    input.normalizationVersionExists,
    input.timingComplete,
  ];

  const score = checks.filter(Boolean).length / checks.length;

  return {
    envelopeReconstructable: input.hasEnvelope && input.lineageComplete,
    freshnessReplayable: input.hasFreshnessDecision && input.versionsPinned,
    routingReplayable: input.hasRoutingDecision && input.versionsPinned,
    identityReplayable: input.hasIdentityDecision,
    versionsPinned: input.versionsPinned,
    lineageComplete: input.lineageComplete,
    rawPayloadRecoverable: input.rawPayloadRefExists && input.lineageComplete,
    integrityScore: Math.round(score * 1000) / 1000,
    issues,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPLAY PROMOTION RULES
// ═══════════════════════════════════════════════════════════════════════════════

export type ReplayPromotionDecision =
  | 'ALLOW_LIVE_PROMOTION'
  | 'ALLOW_DISPLAY_ONLY'
  | 'BLOCK_STALE_REPLAY'
  | 'BLOCK_VERSION_DRIFT'
  | 'BLOCK_INTEGRITY_FAILURE';

export function evaluateReplayPromotion(
  integrityScore: number,
  versionDrifts: VersionDrift[],
  freshnessState?: string,
): ReplayPromotionDecision {
  if (integrityScore < 0.6) return 'BLOCK_INTEGRITY_FAILURE';

  const criticalDrift = versionDrifts.some(d => d.severity === 'CRITICAL');
  if (criticalDrift) return 'BLOCK_VERSION_DRIFT';

  if (freshnessState === 'F4_UNUSABLE' || freshnessState === 'F5_UNKNOWN') {
    return 'BLOCK_STALE_REPLAY';
  }

  if (integrityScore < 0.8 || versionDrifts.length > 0) {
    return 'ALLOW_DISPLAY_ONLY';
  }

  return 'ALLOW_LIVE_PROMOTION';
}
