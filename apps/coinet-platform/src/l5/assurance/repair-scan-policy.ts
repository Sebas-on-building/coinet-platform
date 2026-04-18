/**
 * L5.7 Assurance — Repair Scan Policy
 *
 * §5.7.6.4 — Repair scheduling law: what to scan and when.
 * §5.7.6.5 — Repair attempt record law.
 */

import { L5RepairClass, isRepairable, isAutomatable, type RepairAttemptRecord } from './repair-class';

export interface RepairCandidate {
  readonly manifest_id: string;
  readonly trace_id: string;
  readonly repair_class: L5RepairClass;
  readonly age_ms: number;
  readonly reason: string;
  readonly eligible_for_auto_repair: boolean;
}

export interface RepairScanResult {
  readonly scanned_at: string;
  readonly candidates: readonly RepairCandidate[];
  readonly total_candidates: number;
  readonly auto_eligible: number;
  readonly review_required: number;
  readonly fatal_non_repairable: number;
}

export interface RepairScanPolicy {
  readonly max_manifest_age_ms: number;
  readonly max_retry_attempts: number;
  readonly scan_interval_ms: number;
  readonly auto_repair_classes: readonly L5RepairClass[];
}

export const DEFAULT_REPAIR_SCAN_POLICY: RepairScanPolicy = {
  max_manifest_age_ms: 3_600_000,
  max_retry_attempts: 5,
  scan_interval_ms: 60_000,
  auto_repair_classes: [
    L5RepairClass.RP1_OPTIONAL_ACCELERATION_REPAIR,
    L5RepairClass.RP2_REQUIRED_PROJECTION_REPAIR,
    L5RepairClass.RP4_LATE_DATA_REPROJECTION,
    L5RepairClass.RP5_REPLAY_BUNDLE_REGENERATION,
  ],
};

const repairCandidateStore: RepairCandidate[] = [];
const repairAttemptLog: RepairAttemptRecord[] = [];

export function resetRepairStore(): void {
  repairCandidateStore.length = 0;
  repairAttemptLog.length = 0;
}

export function registerRepairCandidate(candidate: RepairCandidate): void {
  repairCandidateStore.push(candidate);
}

export function scanForRepairs(policy: RepairScanPolicy = DEFAULT_REPAIR_SCAN_POLICY): RepairScanResult {
  const eligible = repairCandidateStore.filter(c => isRepairable(c.repair_class));
  const autoEligible = eligible.filter(c => isAutomatable(c.repair_class));
  const fatal = repairCandidateStore.filter(c => c.repair_class === L5RepairClass.RP7_FATAL_NON_REPAIRABLE);
  const review = eligible.filter(c => c.repair_class === L5RepairClass.RP6_QUARANTINE_BOUND_REPAIR);

  return {
    scanned_at: new Date().toISOString(),
    candidates: eligible,
    total_candidates: eligible.length,
    auto_eligible: autoEligible.length,
    review_required: review.length,
    fatal_non_repairable: fatal.length,
  };
}

export function recordRepairAttempt(record: RepairAttemptRecord): void {
  repairAttemptLog.push(record);
}

export function getRepairAttempts(): readonly RepairAttemptRecord[] {
  return repairAttemptLog;
}
