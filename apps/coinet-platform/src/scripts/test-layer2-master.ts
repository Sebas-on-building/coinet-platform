/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║   Layer 2 Master Suite — Constitutional Verification & Certification    ║
 * ║                                                                         ║
 * ║   Runs all L2 sublayer suites (L2.1–L2.7), the control plane tests,    ║
 * ║   lineage fitness tests, and the Layer 2 honesty certification.         ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import { execSync } from 'child_process';
import * as path from 'path';

// ═══════════════════════════════════════════════════════════════════════════════
// SUBLAYER SUITES
// ═══════════════════════════════════════════════════════════════════════════════

interface SuiteResult {
  name: string;
  passed: boolean;
  output: string;
}

const suites = [
  { name: 'L2.1 Envelope', script: 'test-l21-envelope' },
  { name: 'L2.2 Freshness', script: 'test-l22-freshness' },
  { name: 'L2.3 Routing', script: 'test-l23-routing' },
  { name: 'L2.4 Dedup', script: 'test-l24-dedup' },
  { name: 'L2.5 Replay', script: 'test-l25-replay' },
  { name: 'L2.6 Traces', script: 'test-l26-traces' },
  { name: 'L2.7 Blind Spots', script: 'test-l27-blindspots' },
];

function runSuite(scriptName: string): { passed: boolean; output: string } {
  const distPath = path.join(__dirname, '..', '..', 'dist', 'scripts', `${scriptName}.js`);
  try {
    const output = execSync(`node "${distPath}"`, {
      encoding: 'utf-8',
      timeout: 30000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { passed: true, output };
  } catch (err: any) {
    const output = (err.stdout || '') + '\n' + (err.stderr || '');
    return { passed: false, output };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTROL PLANE + LINEAGE FITNESS + CONSTITUTION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

function runInlineTests(): { passed: number; failed: number; failures: string[] } {
  let passed = 0;
  let failed = 0;
  const failures: string[] = [];

  function assert(cond: boolean, label: string): void {
    if (cond) { passed++; } else { failed++; failures.push(label); }
  }

  // ── Constitution ──────────────────────────────────────────────────────
  const {
    LAYER2_CONSTITUTION_VERSION,
    captureLayer2Versions,
    validateVersionCompatibility,
    LAYER2_INVARIANTS,
    LAYER2_PROPERTIES,
    getInvariantsByCertification,
    getHardFailInvariants,
  } = require('../services/connector-layer/layer2-constitution');

  const versions = captureLayer2Versions();
  assert(typeof versions.l21_envelope === 'string' && versions.l21_envelope.length > 0,
    'Constitution: L2.1 version pinned');
  assert(typeof versions.l22_freshness === 'string' && versions.l22_freshness.length > 0,
    'Constitution: L2.2 version pinned');
  assert(typeof versions.l23_routing === 'string' && versions.l23_routing.length > 0,
    'Constitution: L2.3 version pinned');
  assert(typeof versions.l24_identity === 'string' && versions.l24_identity.length > 0,
    'Constitution: L2.4 version pinned');
  assert(typeof versions.l25_replay === 'string' && versions.l25_replay.length > 0,
    'Constitution: L2.5 version pinned');
  assert(typeof versions.l26_traceability === 'string' && versions.l26_traceability.length > 0,
    'Constitution: L2.6 version pinned');
  assert(typeof versions.l27_blindspots === 'string' && versions.l27_blindspots.length > 0,
    'Constitution: L2.7 version pinned');

  const selfCompat = validateVersionCompatibility(versions, versions);
  assert(selfCompat.compatible === true, 'Constitution: self-compatibility passes');
  assert(selfCompat.drifts.length === 0, 'Constitution: no self-drift');

  const driftedVersions = { ...versions, l21_envelope: '99.0.0' };
  const driftResult = validateVersionCompatibility(versions, driftedVersions);
  assert(driftResult.drifts.length > 0, 'Constitution: detects version drift');
  assert(driftResult.replayUnsafe === true, 'Constitution: major drift is replay-unsafe');

  assert(LAYER2_INVARIANTS.length >= 35, `Constitution: ≥35 invariants (got ${LAYER2_INVARIANTS.length})`);
  assert(LAYER2_PROPERTIES.length === 6, 'Constitution: 6 production properties');
  assert(getHardFailInvariants().length >= 30, 'Constitution: ≥30 hard-fail invariants');

  const certGroups = ['A_CONSTITUTIONAL_INTEGRITY', 'B_TEMPORAL_RIGHTS', 'C_ROUTE_ADMISSIBILITY',
    'D_IDENTITY_INTEGRITY', 'E_FORENSIC_FAITHFULNESS', 'F_REQUEST_TRACE_TRUTH', 'G_BLIND_SPOT_HONESTY'];
  for (const g of certGroups) {
    const invs = getInvariantsByCertification(g);
    assert(invs.length >= 4, `Constitution: certification ${g} has ≥4 invariants`);
  }

  // ── Ingress Ledger ────────────────────────────────────────────────────
  const {
    logIngressEvent, getLedger, getLedgerSize, getLedgerByKind,
    getLedgerByFieldFamily, summarizeLedger, resetLedger,
  } = require('../services/connector-layer/ingress-ledger');

  resetLedger();
  logIngressEvent('ENVELOPE_ACCEPTED', 'Test envelope', {
    severity: 'INFO', metadata: {}, providerId: 'coinglass', fieldFamily: 'derivatives.funding',
  });
  logIngressEvent('BLIND_SPOT_EMITTED', 'Blind spot test', {
    severity: 'WARN', metadata: {}, fieldFamily: 'derivatives.funding',
  });
  logIngressEvent('ROUTE_FAILOVER', 'Failover test', {
    severity: 'ERROR', metadata: {}, providerId: 'coingecko', fieldFamily: 'spot.price',
  });

  assert(getLedgerSize() === 3, 'Ledger: 3 events logged');
  assert(getLedgerByKind('BLIND_SPOT_EMITTED').length === 1, 'Ledger: query by kind works');
  assert(getLedgerByFieldFamily('derivatives.funding').length === 2, 'Ledger: query by field family works');

  const summary = summarizeLedger();
  assert(summary.totalEvents === 3, 'Ledger: summary total correct');
  assert(summary.blindSpotCount === 1, 'Ledger: blind spot count correct');
  assert(summary.failoverCount === 1, 'Ledger: failover count correct');
  assert(summary.topFieldFamilies.length >= 2, 'Ledger: top field families populated');
  resetLedger();

  // ── Connector Incidents ───────────────────────────────────────────────
  const {
    reportIncident, getIncidents, getIncidentsByKind, getIncidentsByProvider,
    clusterIncidents, summarizeIncidents, resetIncidents,
  } = require('../services/connector-layer/connector-incidents');

  resetIncidents();
  reportIncident('PROVIDER_FAILURE', 'HIGH', 'CoinGlass ws down', {
    providerId: 'coinglass', fieldFamily: 'derivatives.funding', routeMode: 'REALTIME',
  });
  reportIncident('FALLBACK_TRIGGERED', 'MEDIUM', 'Fallback to polling', {
    providerId: 'coinglass', fieldFamily: 'derivatives.funding', routeMode: 'REALTIME',
  });
  reportIncident('PROVIDER_FAILURE', 'CRITICAL', 'Alchemy timeout', {
    providerId: 'alchemy', fieldFamily: 'onchain.transfers', routeMode: 'REALTIME',
  });

  assert(getIncidents().length === 3, 'Incidents: 3 recorded');
  assert(getIncidentsByKind('PROVIDER_FAILURE').length === 2, 'Incidents: query by kind');
  assert(getIncidentsByProvider('coinglass').length === 2, 'Incidents: query by provider');

  const clusters = clusterIncidents();
  assert(clusters.length >= 2, 'Incidents: clustering produces groups');
  assert(clusters[0].count >= 2, 'Incidents: largest cluster has ≥2');

  const incSummary = summarizeIncidents();
  assert(incSummary.total === 3, 'Incidents: summary total correct');
  assert(incSummary.clusterCount >= 2, 'Incidents: cluster count in summary');
  resetIncidents();

  // ── Route Impact Report ───────────────────────────────────────────────
  const {
    buildRouteImpactRecord, recordRouteImpact,
    getRouteImpactRecords, summarizeRouteImpact, resetRouteImpactStore,
  } = require('../services/connector-layer/route-impact-report');

  resetRouteImpactStore();
  const impactRec = buildRouteImpactRecord({
    requestId: 'req-1', traceId: 'trace-1', fieldFamily: 'derivatives.funding',
    routeId: 'route-1', routeMode: 'REALTIME', selectedConnector: 'coinglass-ws',
    truthFidelityScore: 0.9, freshnessFitnessScore: 0.85,
    failureResilienceScore: 0.7, costDisciplineScore: 0.8,
    fallbackUsed: false, blindSpots: [], confidenceHaircut: 0,
    bestRejectedRouteMode: 'SCHEDULED', bestRejectedCompositeScore: 0.75,
  });

  assert(impactRec.compositeScore > 0, 'RouteImpact: composite score computed');
  assert(impactRec.routeRegret >= 0, 'RouteImpact: route regret computed');
  recordRouteImpact(impactRec);

  const impactRec2 = buildRouteImpactRecord({
    requestId: 'req-2', traceId: 'trace-2', fieldFamily: 'spot.price',
    routeId: 'route-2', routeMode: 'SCHEDULED', selectedConnector: 'coingecko',
    truthFidelityScore: 0.6, freshnessFitnessScore: 0.5,
    failureResilienceScore: 0.9, costDisciplineScore: 0.9,
    fallbackUsed: true, fallbackEquivalence: 'DEGRADED_EQUIVALENT',
    blindSpots: [], confidenceHaircut: 0.1,
  });
  recordRouteImpact(impactRec2);

  assert(getRouteImpactRecords().length === 2, 'RouteImpact: 2 records stored');
  const riSummary = summarizeRouteImpact();
  assert(riSummary.totalDecisions === 2, 'RouteImpact: summary total correct');
  assert(riSummary.fallbackRate === 0.5, 'RouteImpact: fallback rate correct');
  assert(riSummary.byFieldFamily.length === 2, 'RouteImpact: by field family populated');
  resetRouteImpactStore();

  // ── Lineage Fitness ───────────────────────────────────────────────────
  const {
    computeLineageFitness, recordLineageFitness,
    getLineageFitnessScores, getAverageLineageFitness,
    getLineageFitnessBelowThreshold, resetLineageFitnessStore,
  } = require('../services/connector-layer/lineage-fitness');

  resetLineageFitnessStore();

  const excellentFitness = computeLineageFitness({
    requestId: 'req-a', traceId: 'trace-a',
    requestedFieldFamilies: 3, observedFieldFamilies: 3,
    ownerPathPresent: 3, ownerPathExpected: 3,
    confirmerPresent: 2, confirmerExpected: 2,
    survivingEnvelopes: 5, totalEnvelopes: 5,
    freshnessF0F1Count: 5, freshnessF2Count: 0, freshnessF3F4Count: 0, totalFreshnessEvaluations: 5,
    routeDegraded: 0, routeTotal: 3, fallbacksUsed: 0, fallbacksEquivalent: 0,
    traceNodesComplete: 10, traceNodesExpected: 10, lineagePackPresent: true,
    blindSpots: [],
    rawPayloadRecoverable: 5, rawPayloadTotal: 5, replayPinned: true,
  });

  assert(excellentFitness.score >= 90, `Excellent fitness ≥90 (got ${excellentFitness.score})`);
  assert(excellentFitness.ownerPathCoverage === 1, 'Excellent: full owner coverage');
  assert(excellentFitness.reasonCodes[0] === 'EXCELLENT', 'Excellent: labeled EXCELLENT');
  recordLineageFitness(excellentFitness);

  const poorFitness = computeLineageFitness({
    requestId: 'req-b', traceId: 'trace-b',
    requestedFieldFamilies: 4, observedFieldFamilies: 1,
    ownerPathPresent: 1, ownerPathExpected: 4,
    confirmerPresent: 0, confirmerExpected: 2,
    survivingEnvelopes: 1, totalEnvelopes: 4,
    freshnessF0F1Count: 0, freshnessF2Count: 1, freshnessF3F4Count: 3, totalFreshnessEvaluations: 4,
    routeDegraded: 3, routeTotal: 4, fallbacksUsed: 2, fallbacksEquivalent: 0,
    traceNodesComplete: 3, traceNodesExpected: 10, lineagePackPresent: false,
    blindSpots: [
      { severity: 'CRITICAL' } as any,
      { severity: 'HIGH' } as any,
      { severity: 'HIGH' } as any,
    ],
    rawPayloadRecoverable: 1, rawPayloadTotal: 4, replayPinned: false,
  });

  assert(poorFitness.score < 50, `Poor fitness <50 (got ${poorFitness.score})`);
  assert(poorFitness.blindSpotPenalty > 0, 'Poor: blind spot penalty applied');
  assert(poorFitness.ownerPathCoverage < 0.5, 'Poor: low owner coverage');
  recordLineageFitness(poorFitness);

  assert(getLineageFitnessScores().length === 2, 'Fitness: 2 scores stored');
  assert(getAverageLineageFitness() > 0, 'Fitness: average > 0');
  assert(getLineageFitnessBelowThreshold(50).length >= 1, 'Fitness: threshold query works');
  resetLineageFitnessStore();

  // ── Lineage Fitness edge cases ────────────────────────────────────────
  const midFitness = computeLineageFitness({
    requestId: 'req-c', traceId: 'trace-c',
    requestedFieldFamilies: 2, observedFieldFamilies: 2,
    ownerPathPresent: 2, ownerPathExpected: 2,
    confirmerPresent: 1, confirmerExpected: 2,
    survivingEnvelopes: 3, totalEnvelopes: 4,
    freshnessF0F1Count: 2, freshnessF2Count: 2, freshnessF3F4Count: 0, totalFreshnessEvaluations: 4,
    routeDegraded: 1, routeTotal: 2, fallbacksUsed: 1, fallbacksEquivalent: 1,
    traceNodesComplete: 7, traceNodesExpected: 8, lineagePackPresent: true,
    blindSpots: [{ severity: 'MEDIUM' } as any],
    rawPayloadRecoverable: 3, rawPayloadTotal: 4, replayPinned: true,
  });

  assert(midFitness.score >= 50 && midFitness.score < 90, `Mid fitness 50-89 (got ${midFitness.score})`);
  assert(midFitness.blindSpotPenalty > 0, 'Mid: some blind spot penalty');

  const zeroInput = computeLineageFitness({
    requestId: 'req-d', traceId: 'trace-d',
    requestedFieldFamilies: 0, observedFieldFamilies: 0,
    ownerPathPresent: 0, ownerPathExpected: 0,
    confirmerPresent: 0, confirmerExpected: 0,
    survivingEnvelopes: 0, totalEnvelopes: 0,
    freshnessF0F1Count: 0, freshnessF2Count: 0, freshnessF3F4Count: 0, totalFreshnessEvaluations: 0,
    routeDegraded: 0, routeTotal: 0, fallbacksUsed: 0, fallbacksEquivalent: 0,
    traceNodesComplete: 0, traceNodesExpected: 0, lineagePackPresent: false,
    blindSpots: [],
    rawPayloadRecoverable: 0, rawPayloadTotal: 0, replayPinned: false,
  });

  assert(zeroInput.score >= 0 && zeroInput.score <= 100, 'Zero-input fitness in valid range');

  // ── Shadow Routing ────────────────────────────────────────────────────
  const {
    executeShadowBenchmark, recordBenchmark, getBenchmarks,
    computePlannerCorrectness, resetShadowRouting,
  } = require('../services/connector-layer/shadow-routing');

  resetShadowRouting();
  const bench1 = executeShadowBenchmark({
    requestId: 'req-sh1', fieldFamily: 'derivatives.funding',
    chosen: {
      routeId: 'r1', routeMode: 'REALTIME', connector: 'coinglass-ws',
      truthFidelityScore: 0.9, freshnessFitnessScore: 0.85,
      failureResilienceScore: 0.7, costDisciplineScore: 0.8,
      compositeScore: 0.84, blindSpotCount: 0, claimRestrictions: [], executionMs: 120,
    },
    shadow: {
      routeId: 'r2', routeMode: 'SCHEDULED', connector: 'coinglass-poll',
      truthFidelityScore: 0.7, freshnessFitnessScore: 0.6,
      failureResilienceScore: 0.9, costDisciplineScore: 0.95,
      compositeScore: 0.72, blindSpotCount: 1, blindSpotSeverityMax: 'MEDIUM',
      claimRestrictions: ['SCORING_CONSTRAINED'], executionMs: 300,
    },
    chosenFitness: 88, shadowFitness: 65,
  });
  assert(bench1.plannerDecisionCorrect === true, 'Shadow: planner correct when chosen > shadow');
  assert(bench1.regret === 0, 'Shadow: no regret when chosen is better');
  recordBenchmark(bench1);

  const bench2 = executeShadowBenchmark({
    requestId: 'req-sh2', fieldFamily: 'spot.price',
    chosen: {
      routeId: 'r3', routeMode: 'SCHEDULED', connector: 'coingecko',
      truthFidelityScore: 0.5, freshnessFitnessScore: 0.4,
      failureResilienceScore: 0.8, costDisciplineScore: 0.95,
      compositeScore: 0.55, blindSpotCount: 2, blindSpotSeverityMax: 'HIGH',
      claimRestrictions: ['DIRECTIONAL_CLAIM_BLOCKED'], executionMs: 250,
    },
    shadow: {
      routeId: 'r4', routeMode: 'REALTIME', connector: 'coingecko-ws',
      truthFidelityScore: 0.9, freshnessFitnessScore: 0.85,
      failureResilienceScore: 0.7, costDisciplineScore: 0.8,
      compositeScore: 0.84, blindSpotCount: 0, claimRestrictions: [], executionMs: 100,
    },
    chosenFitness: 50, shadowFitness: 90,
  });
  assert(bench2.plannerDecisionCorrect === false, 'Shadow: planner incorrect when shadow > chosen');
  assert(bench2.regret > 0, 'Shadow: regret when shadow was better');
  assert(bench2.avoidableBlindSpots === 2, 'Shadow: avoidable blind spots detected');
  recordBenchmark(bench2);

  const correctness = computePlannerCorrectness();
  assert(correctness.totalBenchmarks === 2, 'Shadow: 2 benchmarks recorded');
  assert(correctness.correctDecisions === 1, 'Shadow: 1 correct decision');
  assert(correctness.incorrectDecisions === 1, 'Shadow: 1 incorrect decision');
  assert(correctness.correctnessRate === 0.5, 'Shadow: 50% correctness');
  assert(correctness.byFieldFamily.length === 2, 'Shadow: by-field-family breakdown');
  resetShadowRouting();

  // ── Replay Audit Scheduler ────────────────────────────────────────────
  const {
    getSchedule, getEnabledSchedule,
    recordAuditRun, getAuditHistory, getFailedAudits, getDriftIncidents,
    summarizeAudits, resetAuditHistory,
  } = require('../services/connector-layer/replay-audit-scheduler');

  resetAuditHistory();
  assert(getSchedule().length >= 3, 'Audit: default schedule has ≥3 entries');
  assert(getEnabledSchedule().length >= 3, 'Audit: all default entries enabled');

  const cleanRun = recordAuditRun({
    scheduleEntryId: 'daily-critical', cadence: 'DAILY' as any,
    target: 'MISSION_CRITICAL_FIELD_FAMILIES' as any, targetsAudited: 3,
    checks: [
      { kind: 'ENVELOPE_REPRODUCTION' as any, passed: true, detail: 'OK', driftDetected: false },
      { kind: 'ROUTE_DECISION_REPRODUCTION' as any, passed: true, detail: 'OK', driftDetected: false },
      { kind: 'BLIND_SPOT_PRESERVATION' as any, passed: true, detail: 'OK', driftDetected: false },
    ],
  });
  assert(cleanRun.allPassed === true, 'Audit: clean run passes');
  assert(cleanRun.driftsDetected === 0, 'Audit: no drifts in clean run');

  const driftRun = recordAuditRun({
    scheduleEntryId: 'weekly-traces', cadence: 'WEEKLY' as any,
    target: 'REPRESENTATIVE_REQUEST_TRACES' as any, targetsAudited: 5,
    checks: [
      { kind: 'ENVELOPE_REPRODUCTION' as any, passed: true, detail: 'OK', driftDetected: false },
      { kind: 'VERSION_PIN_CONSISTENCY' as any, passed: false, detail: 'Version mismatch', driftDetected: true, driftSeverity: 'CRITICAL' as any },
    ],
  });
  assert(driftRun.allPassed === false, 'Audit: drift run fails');
  assert(driftRun.criticalDrifts === 1, 'Audit: 1 critical drift');

  assert(getAuditHistory().length === 2, 'Audit: 2 runs in history');
  assert(getFailedAudits().length === 1, 'Audit: 1 failed audit');
  assert(getDriftIncidents().length === 1, 'Audit: 1 drift incident');

  const auditSummary = summarizeAudits();
  assert(auditSummary.passRate === 0.5, 'Audit: 50% pass rate');
  assert(auditSummary.criticalDrifts === 1, 'Audit: summary shows 1 critical drift');
  resetAuditHistory();

  // ── Adversarial Ingress Lab ───────────────────────────────────────────
  const {
    ADVERSARIAL_SCENARIOS, recordScenarioRun, getScenarioHistory,
    getFailedScenarios, summarizeLab, resetAdversarialLab,
  } = require('../services/connector-layer/adversarial-ingress-lab');

  resetAdversarialLab();
  assert(ADVERSARIAL_SCENARIOS.length >= 12, `Adversarial: ≥12 scenarios defined (got ${ADVERSARIAL_SCENARIOS.length})`);

  const passResult = recordScenarioRun('ADV-02',
    ['DUPLICATES_ABSORBED', 'LIVE_STATE_PROTECTED'], [], 'Duplicate burst handled');
  assert(passResult.passed === true, 'Adversarial: passing scenario correct');
  assert(passResult.missingOutcomes.length === 0, 'Adversarial: no missing outcomes');

  const failResult = recordScenarioRun('ADV-07',
    ['REPLAY_ISOLATED'], ['Live state mutated'], 'Replay contamination partial');
  assert(failResult.passed === false, 'Adversarial: failing scenario correct');
  assert(failResult.missingOutcomes.includes('LIVE_STATE_PROTECTED'), 'Adversarial: identifies missing outcome');
  assert(failResult.unexpectedBehaviors.length === 1, 'Adversarial: captures unexpected behavior');

  const labSummary = summarizeLab();
  assert(labSummary.totalRuns === 2, 'Adversarial: 2 runs');
  assert(labSummary.passed === 1, 'Adversarial: 1 passed');
  assert(labSummary.failed === 1, 'Adversarial: 1 failed');
  assert(labSummary.scenariosCovered === 2, 'Adversarial: 2 scenarios covered');
  assert(labSummary.uncoveredScenarios.length === ADVERSARIAL_SCENARIOS.length - 2,
    'Adversarial: uncovered scenarios tracked');
  resetAdversarialLab();

  // ── Field-Family SLOs ─────────────────────────────────────────────────
  const {
    DEFAULT_SLOS, getSLOForFieldFamily, evaluateSLO,
    recordSLOEvaluation, getSLOViolations, buildSLODashboard, resetSLOStore,
  } = require('../services/connector-layer/field-family-slos');

  resetSLOStore();
  assert(DEFAULT_SLOS.length >= 9, `SLOs: ≥9 field families defined (got ${DEFAULT_SLOS.length})`);

  const spotSLO = getSLOForFieldFamily('price.spot.canonical');
  assert(spotSLO !== undefined, 'SLOs: spot price SLO exists');
  assert(spotSLO.validEnvelopeRate >= 0.999, 'SLOs: spot price envelope rate strict');

  const passMeasurement = {
    fieldFamily: 'price.spot.canonical',
    windowStart: '2026-04-01', windowEnd: '2026-04-02', totalRequests: 10000,
    validEnvelopes: 9996, totalEnvelopes: 10000,
    usableFreshness: 9960, totalFreshnessChecks: 10000,
    admissibleRoutes: 9995, totalRouteAttempts: 10000,
    blindSpotFreeRequests: 9910, lineageComplete: 9996,
    replayReproducible: 9995, totalReplayChecks: 10000,
    correctionsHandled: 100, totalCorrections: 100,
    tracesComplete: 9995,
  };
  const passEval = evaluateSLO(spotSLO, passMeasurement);
  assert(passEval.sloMet === true, 'SLOs: passing measurement meets SLO');
  recordSLOEvaluation(passEval);

  const failMeasurement = {
    ...passMeasurement,
    fieldFamily: 'derivatives.funding.aggregate',
    validEnvelopes: 9000, usableFreshness: 8000, blindSpotFreeRequests: 5000,
  };
  const fundingSLO = getSLOForFieldFamily('derivatives.funding.aggregate');
  const failEval = evaluateSLO(fundingSLO!, failMeasurement);
  assert(failEval.sloMet === false, 'SLOs: failing measurement violates SLO');
  assert(failEval.violations.length >= 2, 'SLOs: multiple violations detected');
  recordSLOEvaluation(failEval);

  assert(getSLOViolations().length === 1, 'SLOs: 1 violated evaluation');
  const dashboard = buildSLODashboard();
  assert(dashboard.totalEvaluations === 2, 'SLOs: dashboard shows 2 evaluations');
  assert(dashboard.violatedCount === 1, 'SLOs: dashboard shows 1 violated');
  assert(dashboard.worstFieldFamilies.length >= 1, 'SLOs: worst field families populated');
  resetSLOStore();

  // ── Layer 2 Honesty Certification (9 invariants) ──────────────────────
  // These are the meta-invariants that should never be violated.
  // We verify them structurally using the already-tested L2.7 engine.

  const { compileBlindSpots, resetBlindSpotLedger } = require('../services/connector-layer/blindspot-engine');
  const { evaluateFallbackSemantics } = require('../services/connector-layer/fallback-semantics');
  const { propagateBlindSpots, verifyPropagationHonesty } = require('../services/connector-layer/blindspot-propagation');
  const { resetFingerprintRegistry } = require('../services/connector-layer/blindspot-fingerprint');

  resetBlindSpotLedger();
  resetFingerprintRegistry();

  // H1: fallback with semantic loss has blind-spot record
  const fbSem = evaluateFallbackSemantics({
    requestId: 'h-req', traceId: 'h-trace',
    originalRouteId: 'h-orig', originalRouteMode: 'REALTIME',
    fallbackRouteId: 'h-fb', fallbackRouteMode: 'SCHEDULED',
    fieldFamily: 'derivatives.funding',
    originalConnector: 'ws', fallbackConnector: 'poll',
    originalRouteState: 'R0_PREFERRED', fallbackRouteState: 'R1_AVAILABLE',
    originalProvenanceScore: 0.95, fallbackProvenanceScore: 0.60,
    fallbackBlindSpots: [],
  });
  const h1Result = compileBlindSpots({
    requestId: 'h-req', traceId: 'h-trace',
    requestedFieldFamilies: ['derivatives.funding'], requestedEntities: ['BTC'],
    routeOutcomes: [{
      routeTraceId: 'h-rt', selectedRouteMode: 'REALTIME', selectedConnector: 'ws',
      routeState: 'R0_PREFERRED', provenanceScore: 0.95, blindSpotFlags: [],
      fallbackUsed: true,
      fallbackInput: {
        requestId: 'h-req', traceId: 'h-trace',
        originalRouteId: 'h-orig', originalRouteMode: 'REALTIME',
        fallbackRouteId: 'h-fb', fallbackRouteMode: 'SCHEDULED',
        fieldFamily: 'derivatives.funding',
        originalConnector: 'ws', fallbackConnector: 'poll',
        originalRouteState: 'R0_PREFERRED', fallbackRouteState: 'R1_AVAILABLE',
        originalProvenanceScore: 0.95, fallbackProvenanceScore: 0.60,
        fallbackBlindSpots: [],
      },
    }],
    envelopeOutcomes: [{
      envelopeTraceId: 'h-et', envelopeId: 'h-env', routeTraceId: 'h-rt',
      providerId: 'coinglass', sourceClass: 'DERIVATIVES_AGGREGATOR',
      fieldFamily: 'derivatives.funding', ingressDisposition: 'SURVIVED',
      lineageComplete: true, affectedEntities: ['BTC'],
    }],
  });
  assert(h1Result.blindSpots.some(bs => bs.type === 'FALLBACK_WITH_SEMANTIC_LOSS'),
    'H1: Semantic-loss fallback produces blind-spot record');

  // H2: route degradation has downstream restriction
  resetFingerprintRegistry();
  const h2Result = compileBlindSpots({
    requestId: 'h2-req', traceId: 'h2-trace',
    requestedFieldFamilies: ['derivatives.funding'], requestedEntities: ['BTC'],
    routeOutcomes: [{
      routeTraceId: 'h2-rt', selectedRouteMode: 'REALTIME', selectedConnector: 'ws',
      routeState: 'R3_PARTIAL', provenanceScore: 0.5, blindSpotFlags: [],
      fallbackUsed: false,
    }],
    envelopeOutcomes: [{
      envelopeTraceId: 'h2-et', envelopeId: 'h2-env', routeTraceId: 'h2-rt',
      providerId: 'coinglass', sourceClass: 'DERIVATIVES_AGGREGATOR',
      fieldFamily: 'derivatives.funding', ingressDisposition: 'SURVIVED',
      lineageComplete: true, affectedEntities: ['BTC'],
    }],
  });
  const h2Prop = propagateBlindSpots(h2Result.blindSpots, h2Result.summary);
  assert(h2Prop.effects.some(e =>
    e.target !== 'AUDIT_LOG' && e.target !== 'UI_BADGES' && e.target !== 'CHAT_SYSTEM'),
    'H2: Route degradation produces downstream restriction');

  // H3: no semantic-loss without disclosure
  for (const bs of h1Result.blindSpots.filter(b => b.type === 'FALLBACK_WITH_SEMANTIC_LOSS')) {
    assert(bs.disclosureRequired && bs.disclosureText.length > 0,
      'H3: Every semantic-loss blind spot has disclosure');
  }

  // H4: propagation honesty passes
  const h4Violations = verifyPropagationHonesty(h2Result.blindSpots, h2Prop);
  assert(h4Violations.length === 0, `H4: Propagation honesty clean (got: ${h4Violations.join('; ')})`);

  // H5: blind spots appear in lineage augmentation
  assert(h2Prop.lineageAugmentation.activeBlindSpotIds.length === h2Result.blindSpots.length,
    'H5: All blind spots in lineage augmentation');

  // H6: version compatibility self-check
  const vSelf = validateVersionCompatibility(versions, versions);
  assert(vSelf.compatible && !vSelf.replayUnsafe, 'H6: Current versions are self-compatible');

  // H7: invariant registry covers all certifications
  for (const g of certGroups) {
    assert(getInvariantsByCertification(g).length >= 4, `H7: Certification ${g} has invariants`);
  }

  // H8: SLO framework covers critical field families
  const criticalFFs = ['price.spot.canonical', 'derivatives.funding.aggregate', 'security.token.flags'];
  for (const ff of criticalFFs) {
    assert(getSLOForFieldFamily(ff) !== undefined, `H8: SLO defined for ${ff}`);
  }

  // H9: adversarial scenario set covers critical categories
  const criticalScenarios = ['RECONNECT_STORM', 'REPLAY_LIVE_CONTAMINATION', 'SILENT_SCHEMA_DRIFT'];
  for (const sc of criticalScenarios) {
    assert(ADVERSARIAL_SCENARIOS.some((s: any) => s.scenario === sc), `H9: Adversarial covers ${sc}`);
  }

  resetBlindSpotLedger();
  resetFingerprintRegistry();

  return { passed, failed, failures };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

console.log('');
console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
console.log('║   Layer 2 Master Suite — Constitutional Verification & Certification     ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════╝');
console.log('');

const results: SuiteResult[] = [];

// Run all sublayer suites
for (const suite of suites) {
  process.stdout.write(`  Running ${suite.name}...`);
  const result = runSuite(suite.script);
  results.push({ name: suite.name, passed: result.passed, output: result.output });
  console.log(result.passed ? ' ✅' : ' ❌');
}

// Run inline control plane + fitness + constitution tests
process.stdout.write('  Running Control Plane + Constitution + Fitness...');
const inlineResult = runInlineTests();
const inlinePassed = inlineResult.failed === 0;
results.push({
  name: 'Control Plane + Constitution + Fitness',
  passed: inlinePassed,
  output: inlinePassed
    ? `${inlineResult.passed} assertions passed`
    : `${inlineResult.failed} failures: ${inlineResult.failures.join('; ')}`,
});
console.log(inlinePassed ? ' ✅' : ' ❌');

// ═══════════════════════════════════════════════════════════════════════════════
// CERTIFICATION REPORT
// ═══════════════════════════════════════════════════════════════════════════════

console.log('');
console.log('════════════════════════════════════════════════════════════════════');
console.log('  LAYER 2 MASTER SUMMARY');
console.log('════════════════════════════════════════════════════════════════════');

let totalPassed = 0;
let totalFailed = 0;

for (const r of results) {
  const icon = r.passed ? '✅' : '❌';
  console.log(`  ${icon} ${r.name}`);
  if (r.passed) totalPassed++;
  else totalFailed++;
}

console.log('════════════════════════════════════════════════════════════════════');
console.log(`  Passed: ${totalPassed} / ${totalPassed + totalFailed}  Failed: ${totalFailed}`);
console.log('════════════════════════════════════════════════════════════════════');

if (totalFailed > 0) {
  console.log('');
  console.log('FAILURES:');
  for (const r of results) {
    if (!r.passed) {
      console.log(`\n── ${r.name} ──`);
      const lines = r.output.split('\n');
      const failLines = lines.filter(l => l.includes('FAIL') || l.includes('❌'));
      if (failLines.length > 0) {
        for (const fl of failLines.slice(0, 10)) console.log(`  ${fl}`);
      } else {
        for (const l of lines.slice(-10)) console.log(`  ${l}`);
      }
    }
  }
}

// Certification verdict
console.log('');
console.log('════════════════════════════════════════════════════════════════════');
if (totalFailed === 0) {
  console.log('  ✅ LAYER 2 CERTIFIED — Full production certification pass');
  console.log('');
  console.log('  Band A — Constitutional Core');
  console.log('    Property 1 — Constitutional Ingress         ✅');
  console.log('    Property 2 — Temporal Rights                ✅');
  console.log('    Property 3 — Route Legitimacy               ✅');
  console.log('    Property 4 — Identity Integrity             ✅');
  console.log('    Property 5 — Forensic Faithfulness          ✅');
  console.log('    Property 6 — Ingress Honesty                ✅');
  console.log('  Band B — Operational Control Plane            ✅');
  console.log('  Band C — Competitive Moat Extensions          ✅');
  console.log('  Honesty Certification (9 invariants)          ✅');
} else {
  console.log('  ❌ LAYER 2 CERTIFICATION FAILED');
}
console.log('════════════════════════════════════════════════════════════════════');

process.exit(totalFailed > 0 ? 1 : 0);
