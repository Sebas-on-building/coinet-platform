/**
 * L1.4 — Source Health Scorer for BTC Quantum Loop
 *
 * Composes all 5 health dimensions into a single governed usability score.
 * This score controls what the system is allowed to believe, not decoration.
 *
 * Dimensions:
 *   1. Availability   — is the source reachable?
 *   2. Freshness      — is the data current enough for this field?
 *   3. Payload validity — is the data structurally and semantically valid?
 *   4. Historical reliability — has this source been trustworthy over time?
 *   5. Trust class    — what epistemic role does this source play?
 */

import type {
  TrustClass,
  HealthBand,
  SourceHealthRecord,
  SourceHealthDiagnostics,
} from './source-health-types';
import { L14_QR_VERSION } from './source-health-types';
import { computeFreshnessScore } from './freshness-policies';
import { validatePayload } from './payload-validators';
import { getReliabilitySnapshot, recordReliabilityEvent } from './reliability-tracker';

// ═══════════════════════════════════════════════════════════════════════════════
// TRUST CLASS MODIFIERS
// ═══════════════════════════════════════════════════════════════════════════════

const TRUST_CLASS_MODIFIERS: Record<TrustClass, number> = {
  verified_chain_data: 1.00,
  official_protocol_evidence: 0.97,
  trusted_external_analytics: 0.92,
  verified_cached_snapshot: 0.88,
  modeled_estimate: 0.70,
  heuristic_inference: 0.55,
  narrative_claim: 0.20,
  llm_generated: 0.00,
};

// ═══════════════════════════════════════════════════════════════════════════════
// HEALTH BAND DERIVATION
// ═══════════════════════════════════════════════════════════════════════════════

export function deriveHealthBand(usabilityScore: number): HealthBand {
  if (usabilityScore >= 0.85) return 'healthy';
  if (usabilityScore >= 0.70) return 'usable';
  if (usabilityScore >= 0.50) return 'weak';
  if (usabilityScore >= 0.25) return 'degraded';
  return 'unusable';
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORE SCORER
// ═══════════════════════════════════════════════════════════════════════════════

export interface ScoreSourceInput {
  sourceId: string;
  fieldName: string;
  trustClass: TrustClass;
  data: unknown;
  observedAt?: string;
  availabilityScore?: number;
}

export function scoreSource(input: ScoreSourceInput): SourceHealthRecord {
  const reasons: string[] = [];

  // 1. Availability
  const availability = input.availabilityScore ?? 1.0;
  if (availability < 0.80) reasons.push(`availability low: ${(availability * 100).toFixed(0)}%`);

  // 2. Freshness
  let ageMs = 0;
  if (input.observedAt) {
    ageMs = Math.max(0, Date.now() - new Date(input.observedAt).getTime());
  }
  const { score: freshnessScore, band: freshnessBand } = computeFreshnessScore(input.fieldName, ageMs);
  if (freshnessBand === 'degraded') reasons.push(`data stale: ${(ageMs / 3600000).toFixed(1)}h old`);
  if (freshnessBand === 'unresolved') reasons.push(`data expired: ${(ageMs / 86400000).toFixed(1)}d old`);

  // 3. Payload validity
  const payloadResult = validatePayload(input.fieldName, input.data);
  const payloadScore = payloadResult.score;
  if (payloadResult.issues.length > 0) {
    reasons.push(`payload: ${payloadResult.issues[0]}`);
  }

  // 4. Historical reliability
  const reliabilitySnap = getReliabilitySnapshot(input.sourceId);
  const historicalScore = reliabilitySnap.compositeReliability;
  if (historicalScore < 0.70) reasons.push(`historical reliability: ${(historicalScore * 100).toFixed(0)}%`);

  // Record this evaluation into rolling memory
  recordReliabilityEvent(input.sourceId, {
    timestamp: Date.now(),
    success: availability > 0.5 && payloadScore > 0.5,
    schemaValid: payloadScore > 0.8,
    conflicted: false,
    corrected: false,
  });

  // 5. Composite health
  const compositeHealth =
    0.25 * availability +
    0.25 * freshnessScore +
    0.25 * payloadScore +
    0.25 * historicalScore;

  // 6. Trust class modifier
  const trustMod = TRUST_CLASS_MODIFIERS[input.trustClass];
  if (trustMod < 0.90) reasons.push(`trust class "${input.trustClass}" reduces usability`);

  // 7. Final usability
  const usability = Math.max(0, Math.min(1, compositeHealth * trustMod));
  const band = deriveHealthBand(usability);

  if (band === 'unusable') reasons.push('source unusable for production truth role');
  else if (band === 'degraded') reasons.push('source degraded — fallback or claim restriction needed');
  else if (band === 'weak') reasons.push('source weak — should not act as unqualified primary');

  return {
    sourceId: input.sourceId,
    fieldName: input.fieldName,
    truthDomain: 'cryptographic_integrity',
    trustClass: input.trustClass,
    availabilityScore: round(availability),
    freshnessScore: round(freshnessScore),
    payloadValidityScore: round(payloadScore),
    historicalReliabilityScore: round(historicalScore),
    compositeHealthScore: round(compositeHealth),
    trustClassModifier: trustMod,
    sourceUsabilityScore: round(usability),
    healthBand: band,
    freshnessBand,
    observedAt: input.observedAt,
    freshnessPolicyVersion: L14_QR_VERSION,
    reasonSummary: reasons,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH SCORER — score all quantum loop fields at once
// ═══════════════════════════════════════════════════════════════════════════════

export interface QuantumFieldSource {
  sourceId: string;
  trustClass: TrustClass;
  data: unknown;
  observedAt?: string;
  availabilityScore?: number;
}

export function scoreAllQuantumSources(sources: Record<string, QuantumFieldSource | null>): {
  records: Record<string, SourceHealthRecord>;
  diagnostics: SourceHealthDiagnostics;
} {
  const records: Record<string, SourceHealthRecord> = {};
  const allRecords: SourceHealthRecord[] = [];

  for (const [fieldName, src] of Object.entries(sources)) {
    if (!src) {
      const emptyRecord: SourceHealthRecord = {
        sourceId: 'none',
        fieldName,
        truthDomain: 'cryptographic_integrity',
        trustClass: 'llm_generated',
        availabilityScore: 0,
        freshnessScore: 0,
        payloadValidityScore: 0,
        historicalReliabilityScore: 0,
        compositeHealthScore: 0,
        trustClassModifier: 0,
        sourceUsabilityScore: 0,
        healthBand: 'unusable',
        freshnessBand: 'unresolved',
        freshnessPolicyVersion: L14_QR_VERSION,
        reasonSummary: ['no source provided'],
      };
      records[fieldName] = emptyRecord;
      allRecords.push(emptyRecord);
      continue;
    }

    const record = scoreSource({ ...src, fieldName });
    records[fieldName] = record;
    allRecords.push(record);
  }

  return {
    records,
    diagnostics: buildHealthDiagnostics(allRecords),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DIAGNOSTICS
// ═══════════════════════════════════════════════════════════════════════════════

function buildHealthDiagnostics(records: SourceHealthRecord[]): SourceHealthDiagnostics {
  const counts = { healthy: 0, usable: 0, weak: 0, degraded: 0, unusable: 0 };
  for (const r of records) {
    counts[r.healthBand]++;
  }

  const usabilities = records.map(r => r.sourceUsabilityScore);
  const avg = usabilities.length > 0
    ? usabilities.reduce((a, b) => a + b, 0) / usabilities.length
    : 0;

  let lowest: { field: string; score: number } | null = null;
  for (const r of records) {
    if (!lowest || r.sourceUsabilityScore < lowest.score) {
      lowest = { field: r.fieldName, score: r.sourceUsabilityScore };
    }
  }

  const restrictions: string[] = [];
  for (const r of records) {
    if (r.healthBand === 'unusable') {
      restrictions.push(`${r.fieldName}: source unusable — claims blocked`);
    } else if (r.healthBand === 'degraded') {
      restrictions.push(`${r.fieldName}: source degraded — strong claims restricted`);
    } else if (r.healthBand === 'weak') {
      restrictions.push(`${r.fieldName}: source weak — primary authority questionable`);
    }
  }

  return {
    timestamp: new Date().toISOString(),
    records,
    totalFields: records.length,
    ...counts,
    avgUsability: round(avg),
    lowestUsability: lowest,
    claimRestrictions: restrictions,
    version: L14_QR_VERSION,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DECISION RULES — explicit enforcement
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Rule 1: payloadValidity < 0.5 → cannot be used as healthy truth
 * Rule 2: excellent historical + zero freshness → not live truth
 * Rule 3: weak trust class cannot overtake stronger primary without L1.2 permission
 * Rule 4: unusable band → must trigger fallback or unresolved per L1.3
 * Rule 5: health must surface into diagnostics and downstream confidence
 */
export function isSourceFitForPrimaryRole(record: SourceHealthRecord): boolean {
  if (record.payloadValidityScore < 0.5) return false;
  if (record.freshnessScore < 0.1) return false;
  if (record.healthBand === 'unusable' || record.healthBand === 'degraded') return false;
  if (record.trustClassModifier < 0.50) return false;
  return true;
}

export function computeConfidencePenaltyFromHealth(record: SourceHealthRecord): number {
  if (record.healthBand === 'healthy') return 0;
  if (record.healthBand === 'usable') return 0.05;
  if (record.healthBand === 'weak') return 0.15;
  if (record.healthBand === 'degraded') return 0.30;
  return 0.50;
}

function round(v: number): number {
  return Math.round(v * 1000) / 1000;
}
