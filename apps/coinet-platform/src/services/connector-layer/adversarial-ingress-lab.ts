/**
 * Layer 2 — Adversarial Ingress Lab
 *
 * Red-team harness for Layer 2. Tests ingress under hostile and
 * pathological conditions: reconnect storms, duplicate bursts,
 * schema drift, stale-but-live sources, correction ambiguity,
 * replay/live contamination, narrative spam, and trace truncation.
 *
 * Every scenario has an expected outcome. Anti-fake suites must pass
 * under fault injection. No silent ingress corruption survives.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// SCENARIO TAXONOMY
// ═══════════════════════════════════════════════════════════════════════════════

export type AdversarialScenario =
  | 'RECONNECT_STORM'
  | 'DUPLICATE_BURST'
  | 'STALE_BUT_LIVE'
  | 'SILENT_SCHEMA_DRIFT'
  | 'CROSS_ROUTE_SEMANTIC_DUPLICATE'
  | 'CORRECTION_CHAIN_AMBIGUITY'
  | 'REPLAY_LIVE_CONTAMINATION'
  | 'NARRATIVE_SPAM_WEAK_CONFIRMATION'
  | 'LINEAGE_TRUNCATION'
  | 'ROUTE_PROBATION_OSCILLATION'
  | 'SAME_VALUE_DIFFERENT_TIME_FLOOD'
  | 'SEQUENCE_GAP_INJECTION';

export type ExpectedOutcome =
  | 'DUPLICATES_ABSORBED'
  | 'BLIND_SPOT_EMITTED'
  | 'CORRECTION_NOT_COLLAPSED'
  | 'REPLAY_ISOLATED'
  | 'LIVE_STATE_PROTECTED'
  | 'FRESHNESS_DEGRADED'
  | 'ROUTE_DEGRADED'
  | 'TRACE_INCOMPLETE_FLAGGED'
  | 'SEQUENCE_INTEGRITY_PRESERVED'
  | 'SCHEMA_DRIFT_DETECTED'
  | 'DEDUP_CORRECT'
  | 'PROBATION_STABLE';

// ═══════════════════════════════════════════════════════════════════════════════
// SCENARIO DEFINITION
// ═══════════════════════════════════════════════════════════════════════════════

export interface ScenarioDefinition {
  id: string;
  scenario: AdversarialScenario;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  expectedOutcomes: ExpectedOutcome[];
  fieldFamilies: string[];
  injectionParams: Record<string, unknown>;
}

export const ADVERSARIAL_SCENARIOS: ScenarioDefinition[] = [
  {
    id: 'ADV-01', scenario: 'RECONNECT_STORM',
    description: 'Rapid websocket reconnect with duplicate event replay',
    severity: 'HIGH',
    expectedOutcomes: ['DUPLICATES_ABSORBED', 'SEQUENCE_INTEGRITY_PRESERVED', 'BLIND_SPOT_EMITTED'],
    fieldFamilies: ['derivatives.funding.aggregate', 'derivatives.liquidation.orderflow'],
    injectionParams: { reconnectCount: 10, intervalMs: 200, duplicateRate: 0.6 },
  },
  {
    id: 'ADV-02', scenario: 'DUPLICATE_BURST',
    description: 'Rapid at-least-once delivery burst',
    severity: 'MEDIUM',
    expectedOutcomes: ['DUPLICATES_ABSORBED', 'LIVE_STATE_PROTECTED'],
    fieldFamilies: ['price.spot.canonical'],
    injectionParams: { burstSize: 50, uniquePayloads: 5 },
  },
  {
    id: 'ADV-03', scenario: 'STALE_BUT_LIVE',
    description: 'Provider returning old observations through a live route',
    severity: 'HIGH',
    expectedOutcomes: ['FRESHNESS_DEGRADED', 'BLIND_SPOT_EMITTED'],
    fieldFamilies: ['derivatives.funding.aggregate'],
    injectionParams: { staleOffsetMs: 300_000, routeMode: 'REALTIME' },
  },
  {
    id: 'ADV-04', scenario: 'SILENT_SCHEMA_DRIFT',
    description: 'Provider changes response shape without version bump',
    severity: 'CRITICAL',
    expectedOutcomes: ['SCHEMA_DRIFT_DETECTED', 'BLIND_SPOT_EMITTED', 'TRACE_INCOMPLETE_FLAGGED'],
    fieldFamilies: ['protocol.tvl.usd', 'security.token.flags'],
    injectionParams: { removedFields: ['value', 'timestamp'], addedFields: ['newMetric'] },
  },
  {
    id: 'ADV-05', scenario: 'CROSS_ROUTE_SEMANTIC_DUPLICATE',
    description: 'Same observation arriving through realtime and scheduled routes',
    severity: 'MEDIUM',
    expectedOutcomes: ['DEDUP_CORRECT', 'LIVE_STATE_PROTECTED'],
    fieldFamilies: ['price.spot.canonical'],
    injectionParams: { routes: ['REALTIME', 'SCHEDULED'], delayMs: 5000 },
  },
  {
    id: 'ADV-06', scenario: 'CORRECTION_CHAIN_AMBIGUITY',
    description: 'Correction and duplicate arriving near-simultaneously',
    severity: 'HIGH',
    expectedOutcomes: ['CORRECTION_NOT_COLLAPSED', 'LIVE_STATE_PROTECTED'],
    fieldFamilies: ['entity.wallet.labels'],
    injectionParams: { correctionDelayMs: 100, valueDelta: 0.01 },
  },
  {
    id: 'ADV-07', scenario: 'REPLAY_LIVE_CONTAMINATION',
    description: 'Replay-generation artifact injected into live pipeline',
    severity: 'CRITICAL',
    expectedOutcomes: ['REPLAY_ISOLATED', 'LIVE_STATE_PROTECTED'],
    fieldFamilies: ['derivatives.funding.aggregate'],
    injectionParams: { replayGeneration: 3, liveGeneration: 0 },
  },
  {
    id: 'ADV-08', scenario: 'NARRATIVE_SPAM_WEAK_CONFIRMATION',
    description: 'Burst of narrative events with no strong event confirmation',
    severity: 'HIGH',
    expectedOutcomes: ['BLIND_SPOT_EMITTED', 'FRESHNESS_DEGRADED'],
    fieldFamilies: ['narrative.news.velocity', 'narrative.social.velocity'],
    injectionParams: { spamCount: 100, confirmationRate: 0.02 },
  },
  {
    id: 'ADV-09', scenario: 'LINEAGE_TRUNCATION',
    description: 'Raw payload archive fails mid-ingress',
    severity: 'CRITICAL',
    expectedOutcomes: ['TRACE_INCOMPLETE_FLAGGED', 'BLIND_SPOT_EMITTED'],
    fieldFamilies: ['onchain.transfers.evm'],
    injectionParams: { failurePoint: 'RAW_ARCHIVE', failureRate: 1.0 },
  },
  {
    id: 'ADV-10', scenario: 'ROUTE_PROBATION_OSCILLATION',
    description: 'Route flapping between degraded and restored states',
    severity: 'HIGH',
    expectedOutcomes: ['PROBATION_STABLE', 'ROUTE_DEGRADED', 'BLIND_SPOT_EMITTED'],
    fieldFamilies: ['derivatives.funding.aggregate'],
    injectionParams: { oscillationCount: 8, intervalMs: 500 },
  },
  {
    id: 'ADV-11', scenario: 'SAME_VALUE_DIFFERENT_TIME_FLOOD',
    description: 'Identical values at different observation times',
    severity: 'MEDIUM',
    expectedOutcomes: ['DEDUP_CORRECT', 'SEQUENCE_INTEGRITY_PRESERVED'],
    fieldFamilies: ['protocol.tvl.usd'],
    injectionParams: { identicalValue: 1_000_000, observationCount: 20, intervalMs: 60_000 },
  },
  {
    id: 'ADV-12', scenario: 'SEQUENCE_GAP_INJECTION',
    description: 'Missing sequence numbers in ordered event stream',
    severity: 'HIGH',
    expectedOutcomes: ['SEQUENCE_INTEGRITY_PRESERVED', 'BLIND_SPOT_EMITTED'],
    fieldFamilies: ['onchain.transfers.evm', 'derivatives.liquidation.orderflow'],
    injectionParams: { gapPositions: [3, 7, 12], totalEvents: 20 },
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SCENARIO RUN
// ═══════════════════════════════════════════════════════════════════════════════

export interface ScenarioRunResult {
  runId: string;
  scenarioId: string;
  scenario: AdversarialScenario;
  startedAt: string;
  completedAt: string;
  expectedOutcomes: ExpectedOutcome[];
  observedOutcomes: ExpectedOutcome[];
  passed: boolean;
  missingOutcomes: ExpectedOutcome[];
  unexpectedBehaviors: string[];
  detail: string;
}

const scenarioHistory: ScenarioRunResult[] = [];
let nextRunId = 1;

export function recordScenarioRun(
  scenarioId: string,
  observedOutcomes: ExpectedOutcome[],
  unexpectedBehaviors: string[],
  detail: string,
): ScenarioRunResult {
  const def = ADVERSARIAL_SCENARIOS.find(s => s.id === scenarioId);
  if (!def) throw new Error(`Unknown scenario: ${scenarioId}`);

  const missing = def.expectedOutcomes.filter(eo => !observedOutcomes.includes(eo));

  const result: ScenarioRunResult = {
    runId: `adv-run-${nextRunId++}`,
    scenarioId,
    scenario: def.scenario,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    expectedOutcomes: def.expectedOutcomes,
    observedOutcomes,
    passed: missing.length === 0 && unexpectedBehaviors.length === 0,
    missingOutcomes: missing,
    unexpectedBehaviors,
    detail,
  };
  scenarioHistory.push(result);
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HISTORY + SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════

export function getScenarioHistory(): ScenarioRunResult[] {
  return [...scenarioHistory];
}

export function getFailedScenarios(): ScenarioRunResult[] {
  return scenarioHistory.filter(r => !r.passed);
}

export interface AdversarialLabSummary {
  totalRuns: number;
  passed: number;
  failed: number;
  passRate: number;
  scenariosCovered: number;
  totalScenarios: number;
  uncoveredScenarios: string[];
  criticalFailures: number;
}

export function summarizeLab(): AdversarialLabSummary {
  const total = scenarioHistory.length;
  const passed = scenarioHistory.filter(r => r.passed).length;
  const coveredIds = new Set(scenarioHistory.map(r => r.scenarioId));
  const uncovered = ADVERSARIAL_SCENARIOS.filter(s => !coveredIds.has(s.id));

  const criticalFails = scenarioHistory.filter(r => {
    const def = ADVERSARIAL_SCENARIOS.find(s => s.id === r.scenarioId);
    return !r.passed && def?.severity === 'CRITICAL';
  }).length;

  return {
    totalRuns: total,
    passed,
    failed: total - passed,
    passRate: total > 0 ? passed / total : 1,
    scenariosCovered: coveredIds.size,
    totalScenarios: ADVERSARIAL_SCENARIOS.length,
    uncoveredScenarios: uncovered.map(s => s.id),
    criticalFailures: criticalFails,
  };
}

export function resetAdversarialLab(): void {
  scenarioHistory.length = 0;
  nextRunId = 1;
}
