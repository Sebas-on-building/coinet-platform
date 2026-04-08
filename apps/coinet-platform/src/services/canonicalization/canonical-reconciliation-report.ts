/**
 * L3.4 — Canonical Reconciliation Report
 *
 * Every reconciliation run must produce a structured, queryable,
 * auditable report. The report explains both why something won
 * and why something did not disappear.
 *
 * Reports support replay, review queues, human review, and
 * historical reconstruction.
 */

import { v4 as uuidv4 } from 'uuid';
import type { CanonicalObjectType } from './canonical-entity-types';
import type {
  ReconciliationMode,
  WinningAnchor,
  RejectedAnchor,
  UnresolvedConflictRecord,
  ClaimAdmissibilityResult,
} from './cross-provider-reconciliation';

export const L34_REPORT_VERSION = '1.0.0' as const;
export const L34_REPORT_SCHEMA_VERSION = 'v1' as const;
export const L34_REVIEW_SCHEMA_VERSION = 'v1' as const;

// ═══════════════════════════════════════════════════════════════════════════════
// REVIEW QUEUES
// ═══════════════════════════════════════════════════════════════════════════════

export type ReconciliationReviewQueueType =
  | 'CONTESTED_RECONCILIATION_QUEUE'
  | 'SPLIT_REVIEW_QUEUE'
  | 'MERGE_REVIEW_QUEUE'
  | 'ANCHOR_DISPUTE_QUEUE'
  | 'SCOPE_COLLISION_QUEUE'
  | 'HIGH_IMPACT_RECONCILIATION_QUEUE';

export type ReconciliationReviewStatus =
  | 'PENDING'
  | 'IN_REVIEW'
  | 'RESOLVED'
  | 'DEFERRED';

export interface ReconciliationReviewEntry {
  schemaVersion: string;
  entryId: string;
  queueType: ReconciliationReviewQueueType;
  reconciliationId: string;
  canonicalIds: string[];
  objectType: CanonicalObjectType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reason: string;
  blockingPrerequisites: string[];
  requiredEvidencePack: string[];
  status: ReconciliationReviewStatus;
  priority: number;
  createdAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RECONCILIATION REPORT
// ═══════════════════════════════════════════════════════════════════════════════

export interface ReconciliationReport {
  schemaVersion: string;
  reportId: string;
  reconciliationId: string;
  canonicalId: string;
  objectType: CanonicalObjectType;
  runTimestamp: string;
  isReplay: boolean;
  replayGeneration?: number;

  claimSetSummary: {
    totalClaims: number;
    activeClaims: number;
    anchorClaims: number;
    conflictClaims: number;
    enrichmentClaims: number;
    providerIds: string[];
  };

  admissibilityBreakdown: ClaimAdmissibilityResult[];

  modeSelected: ReconciliationMode;
  modeSelectionReason: string;

  winningAnchors: WinningAnchor[];
  rejectedAnchors: RejectedAnchor[];
  unresolvedConflicts: UnresolvedConflictRecord[];

  mutationPlanId?: string;
  mutationSummary?: string;

  confidenceInteraction: {
    priorConfidenceStateId?: string;
    priorBand?: string;
    reEvaluationTriggered: boolean;
    reEvaluationReason?: string;
  };

  canonicalDiff: ReconciliationDiff;

  auditRefs: string[];
  reviewerNotes: string[];

  policyVersion: string;
  evaluatorVersion: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RECONCILIATION DIFF
// ═══════════════════════════════════════════════════════════════════════════════

export interface DiffEntry {
  field: string;
  priorValue: string;
  newValue: string;
  changeType: 'ADDED' | 'REMOVED' | 'MODIFIED' | 'UNCHANGED';
  sourceClaim?: string;
}

export interface ReconciliationDiff {
  anchorsAdded: string[];
  anchorsRemoved: string[];
  anchorsModified: string[];
  conflictsResolved: string[];
  conflictsCreated: string[];
  fieldChanges: DiffEntry[];
  structuralChange: 'NONE' | 'MERGE' | 'SPLIT' | 'RECLASSIFY';
}

// ═══════════════════════════════════════════════════════════════════════════════
// IN-MEMORY STORES
// ═══════════════════════════════════════════════════════════════════════════════

const _reports: ReconciliationReport[] = [];
const _byReconciliationId = new Map<string, ReconciliationReport>();
const _byCanonicalId = new Map<string, ReconciliationReport[]>();
const _reviewQueue: ReconciliationReviewEntry[] = [];

// ═══════════════════════════════════════════════════════════════════════════════
// REPORT BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

export interface BuildReportInput {
  reconciliationId: string;
  canonicalId: string;
  objectType: CanonicalObjectType;
  isReplay: boolean;
  replayGeneration?: number;
  claimSetSummary: ReconciliationReport['claimSetSummary'];
  admissibilityBreakdown: ClaimAdmissibilityResult[];
  modeSelected: ReconciliationMode;
  modeSelectionReason: string;
  winningAnchors: WinningAnchor[];
  rejectedAnchors: RejectedAnchor[];
  unresolvedConflicts: UnresolvedConflictRecord[];
  mutationPlanId?: string;
  mutationSummary?: string;
  confidenceInteraction: ReconciliationReport['confidenceInteraction'];
  canonicalDiff: ReconciliationDiff;
  auditRefs: string[];
}

export function buildReconciliationReport(input: BuildReportInput): ReconciliationReport {
  const report: ReconciliationReport = {
    schemaVersion: L34_REPORT_SCHEMA_VERSION,
    reportId: `rpt_${uuidv4()}`,
    ...input,
    runTimestamp: new Date().toISOString(),
    reviewerNotes: [],
    policyVersion: L34_REPORT_VERSION,
    evaluatorVersion: L34_REPORT_VERSION,
  };

  _reports.push(report);
  _byReconciliationId.set(report.reconciliationId, report);

  const existing = _byCanonicalId.get(report.canonicalId) ?? [];
  existing.push(report);
  _byCanonicalId.set(report.canonicalId, existing);

  enqueueReviewsFromReport(report);

  return report;
}

export function serializeReconciliationReport(report: ReconciliationReport): string {
  return JSON.stringify(report, null, 2);
}

export function getReconciliationDiff(report: ReconciliationReport): ReconciliationDiff {
  return report.canonicalDiff;
}

export function getReportByReconciliationId(
  reconciliationId: string,
): ReconciliationReport | undefined {
  return _byReconciliationId.get(reconciliationId);
}

export function getHistoricalReconciliationReports(
  canonicalId: string,
): ReconciliationReport[] {
  return _byCanonicalId.get(canonicalId) ?? [];
}

export function getReconciliationReportStore(): readonly ReconciliationReport[] {
  return _reports;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REVIEW QUEUE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

function enqueueReviewsFromReport(report: ReconciliationReport): void {
  if (report.modeSelected === 'CONTESTED_MERGE') {
    enqueueReview('CONTESTED_RECONCILIATION_QUEUE', report, 'HIGH',
      'Contested reconciliation requires human review');
  }
  if (report.modeSelected === 'SPLIT_REQUIRED') {
    enqueueReview('SPLIT_REVIEW_QUEUE', report, 'HIGH',
      'Split operation requires verification');
  }
  if (report.modeSelected === 'MERGE_REQUIRED') {
    enqueueReview('MERGE_REVIEW_QUEUE', report, 'HIGH',
      'Merge operation requires verification');
  }
  if (report.unresolvedConflicts.some(c => c.anchorDefining)) {
    enqueueReview('ANCHOR_DISPUTE_QUEUE', report, 'CRITICAL',
      'Anchor-defining conflict remains unresolved');
  }
  if (report.unresolvedConflicts.some(c => c.conflictClass === 'SCOPE_COLLISION')) {
    enqueueReview('SCOPE_COLLISION_QUEUE', report, 'HIGH',
      'Scope collision detected');
  }
  if (report.canonicalDiff.structuralChange !== 'NONE') {
    enqueueReview('HIGH_IMPACT_RECONCILIATION_QUEUE', report, 'CRITICAL',
      `Structural change: ${report.canonicalDiff.structuralChange}`);
  }
}

function enqueueReview(
  queueType: ReconciliationReviewQueueType,
  report: ReconciliationReport,
  severity: ReconciliationReviewEntry['severity'],
  reason: string,
): void {
  _reviewQueue.push({
    schemaVersion: L34_REVIEW_SCHEMA_VERSION,
    entryId: `rq_${uuidv4()}`,
    queueType,
    reconciliationId: report.reconciliationId,
    canonicalIds: [report.canonicalId],
    objectType: report.objectType,
    severity,
    reason,
    blockingPrerequisites: report.unresolvedConflicts.flatMap(c => c.resolutionPrerequisites),
    requiredEvidencePack: report.auditRefs,
    status: 'PENDING',
    priority: severity === 'CRITICAL' ? 1 : severity === 'HIGH' ? 2 : severity === 'MEDIUM' ? 3 : 4,
    createdAt: new Date().toISOString(),
  });
}

export function getReconciliationReviewQueue(): readonly ReconciliationReviewEntry[] {
  return _reviewQueue;
}

export function getReconciliationReviewsByType(
  queueType: ReconciliationReviewQueueType,
): ReconciliationReviewEntry[] {
  return _reviewQueue.filter(e => e.queueType === queueType);
}

export function resetReportStore(): void {
  _reports.length = 0;
  _byReconciliationId.clear();
  _byCanonicalId.clear();
  _reviewQueue.length = 0;
}
