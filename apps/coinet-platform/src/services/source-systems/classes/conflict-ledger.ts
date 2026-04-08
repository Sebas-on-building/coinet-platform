/**
 * L1.5 Conflict Ledger
 *
 * Every conflict and adjudication must be auditable. Not just current state,
 * but what changed, why, which law triggered it, which threshold crossed,
 * and what downstream claims were affected.
 *
 * Also builds the conflict fingerprint for downstream judgment consumption.
 */

import type {
  ConflictRecord, ConflictOutcome, ConflictSeverity, BlockerRecord,
  PreservedContradiction, ConflictDiagnostics, CrossClassContradictionPattern,
} from './conflict-types';
import { CROSS_CLASS_PATTERNS } from './conflict-constitution';

// ═══════════════════════════════════════════════════════════════════════════════
// LEDGER EVENT
// ═══════════════════════════════════════════════════════════════════════════════

export interface ConflictLedgerEvent {
  timestamp: string;
  conflictId: string;
  fieldId: string;
  providerA: string;
  providerB: string;
  outcome: ConflictOutcome;
  severity: ConflictSeverity;
  confidencePenalty: number;
  blockers: string[];
  reasonCodes: string[];
  disclosureRequired: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// IN-MEMORY LEDGER
// ═══════════════════════════════════════════════════════════════════════════════

const ledger: ConflictLedgerEvent[] = [];
const MAX_LEDGER_SIZE = 2000;

export function logConflict(record: ConflictRecord): void {
  const event: ConflictLedgerEvent = {
    timestamp: new Date().toISOString(),
    conflictId: record.conflictId,
    fieldId: record.fieldId,
    providerA: record.claimA.providerId,
    providerB: record.claimB.providerId,
    outcome: record.outcome,
    severity: record.severity,
    confidencePenalty: record.confidencePenalty,
    blockers: record.blockers.map(b => b.blockerClass),
    reasonCodes: record.reasonCodes,
    disclosureRequired: record.disclosureRequired,
  };
  ledger.push(event);
  if (ledger.length > MAX_LEDGER_SIZE) {
    ledger.splice(0, ledger.length - MAX_LEDGER_SIZE);
  }
}

export function logConflictBatch(records: ConflictRecord[]): void {
  for (const r of records) logConflict(r);
}

export function getLedger(): ConflictLedgerEvent[] {
  return [...ledger];
}

export function getLedgerSince(sinceIso: string): ConflictLedgerEvent[] {
  return ledger.filter(e => e.timestamp >= sinceIso);
}

export function clearLedger(): void {
  ledger.length = 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFLICT FINGERPRINT
// ═══════════════════════════════════════════════════════════════════════════════

export interface ConflictFingerprintEntry {
  fieldId: string;
  outcome: ConflictOutcome;
  severity: ConflictSeverity;
  confidencePenalty: number;
  providers: [string, string];
  disclosureRequired: boolean;
}

export interface ConflictFingerprint {
  timestamp: string;
  entries: ConflictFingerprintEntry[];
  preservedContradictions: number;
  activeBlockers: number;
  totalConfidencePenalty: number;
  crossClassContradictions: string[];
  overallIntegrity: number;
  version: string;
}

export function buildConflictFingerprint(
  records: ConflictRecord[],
  crossClassHits: string[],
): ConflictFingerprint {
  const entries: ConflictFingerprintEntry[] = records.map(r => ({
    fieldId: r.fieldId,
    outcome: r.outcome,
    severity: r.severity,
    confidencePenalty: r.confidencePenalty,
    providers: [r.claimA.providerId, r.claimB.providerId],
    disclosureRequired: r.disclosureRequired,
  }));

  const totalPenalty = records.reduce((s, r) => s + r.confidencePenalty, 0);
  const integrity = Math.max(0, Math.round((1 - Math.min(totalPenalty, 1)) * 100) / 100);

  return {
    timestamp: new Date().toISOString(),
    entries,
    preservedContradictions: records.filter(r => r.outcome === 'PRESERVE_CONTRADICTION').length,
    activeBlockers: records.reduce((s, r) => s + r.blockers.length, 0),
    totalConfidencePenalty: Math.round(totalPenalty * 1000) / 1000,
    crossClassContradictions: crossClassHits,
    overallIntegrity: integrity,
    version: records[0]?.version ?? '1.0.0',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CROSS-CLASS CONTRADICTION DETECTOR
// ═══════════════════════════════════════════════════════════════════════════════

export interface ActiveCondition {
  conditionId: string;
  truthClass: string;
}

export function detectCrossClassContradictions(
  activeConditions: ActiveCondition[],
): CrossClassContradictionPattern[] {
  const conditionSet = new Set(activeConditions.map(c => c.conditionId));
  return CROSS_CLASS_PATTERNS.filter(
    p => conditionSet.has(p.conditionA) && conditionSet.has(p.conditionB),
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAUNDERING DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Detect any case where the system converts real disagreement into fake
 * coherence. Returns fields where a PRESERVE_CONTRADICTION or DEGRADE_CLAIM
 * should exist but was resolved instead.
 */
export function detectLaunderingRisk(records: ConflictRecord[]): ConflictRecord[] {
  return records.filter(r => {
    if (r.severity !== 'HIGH' && r.severity !== 'CRITICAL') return false;
    if (r.outcome === 'RESOLVE_BY_AUTHORITY' || r.outcome === 'RESOLVE_BY_FUSION') {
      return true;
    }
    return false;
  });
}
