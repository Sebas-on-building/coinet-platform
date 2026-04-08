/**
 * Layer 2 — Replay Audit Scheduler
 *
 * Continuously verifies replay determinism and forensic faithfulness.
 * Replay drift is treated as a production incident. Historical blind
 * spots must be preserved in reconstruction, not erased.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT CADENCE
// ═══════════════════════════════════════════════════════════════════════════════

export type AuditCadence = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export type AuditTarget =
  | 'MISSION_CRITICAL_FIELD_FAMILIES'
  | 'REPRESENTATIVE_REQUEST_TRACES'
  | 'INCIDENT_HISTORICAL_SLICES';

export interface AuditScheduleEntry {
  id: string;
  cadence: AuditCadence;
  target: AuditTarget;
  fieldFamilies?: string[];
  traceIds?: string[];
  description: string;
  enabled: boolean;
}

const schedule: AuditScheduleEntry[] = [
  {
    id: 'daily-critical',
    cadence: 'DAILY',
    target: 'MISSION_CRITICAL_FIELD_FAMILIES',
    fieldFamilies: ['price.spot.canonical', 'derivatives.funding.aggregate', 'security.token.flags'],
    description: 'Daily replay audit for mission-critical field families',
    enabled: true,
  },
  {
    id: 'weekly-traces',
    cadence: 'WEEKLY',
    target: 'REPRESENTATIVE_REQUEST_TRACES',
    description: 'Weekly trace reconstruction for representative requests',
    enabled: true,
  },
  {
    id: 'monthly-incidents',
    cadence: 'MONTHLY',
    target: 'INCIDENT_HISTORICAL_SLICES',
    description: 'Monthly historical incident reproduction',
    enabled: true,
  },
];

export function getSchedule(): AuditScheduleEntry[] {
  return [...schedule];
}

export function getEnabledSchedule(): AuditScheduleEntry[] {
  return schedule.filter(s => s.enabled);
}

export function addScheduleEntry(entry: AuditScheduleEntry): void {
  schedule.push(entry);
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT RUN
// ═══════════════════════════════════════════════════════════════════════════════

export type AuditCheckKind =
  | 'ENVELOPE_REPRODUCTION'
  | 'ROUTE_DECISION_REPRODUCTION'
  | 'FRESHNESS_DECISION_REPRODUCTION'
  | 'IDENTITY_CLASSIFICATION_REPRODUCTION'
  | 'BLIND_SPOT_PRESERVATION'
  | 'LINEAGE_PACK_EQUIVALENCE'
  | 'VERSION_PIN_CONSISTENCY'
  | 'RAW_PAYLOAD_INTEGRITY';

export interface AuditCheck {
  kind: AuditCheckKind;
  passed: boolean;
  detail: string;
  driftDetected: boolean;
  driftSeverity?: 'MINOR' | 'MAJOR' | 'CRITICAL';
}

export interface ReplayAuditRun {
  runId: string;
  scheduleEntryId: string;
  startedAt: string;
  completedAt: string;
  cadence: AuditCadence;
  target: AuditTarget;
  targetsAudited: number;
  checks: AuditCheck[];
  allPassed: boolean;
  driftsDetected: number;
  criticalDrifts: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT EXECUTION
// ═══════════════════════════════════════════════════════════════════════════════

export interface AuditExecutionInput {
  scheduleEntryId: string;
  cadence: AuditCadence;
  target: AuditTarget;
  checks: AuditCheck[];
  targetsAudited: number;
}

let nextRunId = 1;

export function recordAuditRun(input: AuditExecutionInput): ReplayAuditRun {
  const drifts = input.checks.filter(c => c.driftDetected);
  const run: ReplayAuditRun = {
    runId: `ra-${nextRunId++}`,
    scheduleEntryId: input.scheduleEntryId,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    cadence: input.cadence,
    target: input.target,
    targetsAudited: input.targetsAudited,
    checks: input.checks,
    allPassed: input.checks.every(c => c.passed),
    driftsDetected: drifts.length,
    criticalDrifts: drifts.filter(d => d.driftSeverity === 'CRITICAL').length,
  };
  auditHistory.push(run);
  return run;
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT HISTORY
// ═══════════════════════════════════════════════════════════════════════════════

const auditHistory: ReplayAuditRun[] = [];

export function getAuditHistory(): ReplayAuditRun[] {
  return [...auditHistory];
}

export function getAuditHistoryByCadence(cadence: AuditCadence): ReplayAuditRun[] {
  return auditHistory.filter(r => r.cadence === cadence);
}

export function getFailedAudits(): ReplayAuditRun[] {
  return auditHistory.filter(r => !r.allPassed);
}

export function getDriftIncidents(): ReplayAuditRun[] {
  return auditHistory.filter(r => r.driftsDetected > 0);
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════

export interface ReplayAuditSummary {
  totalRuns: number;
  passedRuns: number;
  failedRuns: number;
  passRate: number;
  totalDrifts: number;
  criticalDrifts: number;
  byCadence: Array<{ cadence: AuditCadence; runs: number; passRate: number }>;
  byCheckKind: Array<{ kind: AuditCheckKind; total: number; passed: number; failRate: number }>;
}

export function summarizeAudits(): ReplayAuditSummary {
  const total = auditHistory.length;
  if (total === 0) {
    return {
      totalRuns: 0, passedRuns: 0, failedRuns: 0, passRate: 1,
      totalDrifts: 0, criticalDrifts: 0, byCadence: [], byCheckKind: [],
    };
  }

  const passed = auditHistory.filter(r => r.allPassed).length;
  const totalDrifts = auditHistory.reduce((s, r) => s + r.driftsDetected, 0);
  const critDrifts = auditHistory.reduce((s, r) => s + r.criticalDrifts, 0);

  const cadenceGroups = new Map<AuditCadence, ReplayAuditRun[]>();
  const checkStats = new Map<AuditCheckKind, { total: number; passed: number }>();

  for (const run of auditHistory) {
    cadenceGroups.set(run.cadence, [...(cadenceGroups.get(run.cadence) ?? []), run]);
    for (const c of run.checks) {
      const s = checkStats.get(c.kind) ?? { total: 0, passed: 0 };
      s.total++;
      if (c.passed) s.passed++;
      checkStats.set(c.kind, s);
    }
  }

  return {
    totalRuns: total,
    passedRuns: passed,
    failedRuns: total - passed,
    passRate: passed / total,
    totalDrifts,
    criticalDrifts: critDrifts,
    byCadence: Array.from(cadenceGroups).map(([c, runs]) => ({
      cadence: c,
      runs: runs.length,
      passRate: runs.filter(r => r.allPassed).length / runs.length,
    })),
    byCheckKind: Array.from(checkStats).map(([kind, s]) => ({
      kind,
      total: s.total,
      passed: s.passed,
      failRate: s.total > 0 ? 1 - (s.passed / s.total) : 0,
    })),
  };
}

export function resetAuditHistory(): void {
  auditHistory.length = 0;
  nextRunId = 1;
}
