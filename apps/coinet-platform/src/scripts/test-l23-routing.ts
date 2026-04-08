/**
 * L2.3 — Routing Mode Doctrine Test Suite
 *
 * Constitution · Selection · Admissibility · Failover · Restoration · Anti-fake
 */

import {
  L23_VERSION, ROUTE_STATE_RANK,
  type L23RouteMode, type AvailableRoute, type RoutePlanningInput,
} from '../services/connector-layer/routing-mode-types';
import {
  ROUTE_CONSTITUTIONS, getConstitution,
  isConsumerAllowed, isConsumerProhibited, getConsumerVerdict,
} from '../services/connector-layer/routing-constitution';
import {
  findSelectionPolicy, getAllSelectionPolicies,
  isRouteModeAdmissible, DEFAULT_ROUTE_SELECTION_POLICY,
} from '../services/connector-layer/route-selection-policy';
import {
  planRoute, verifyRouteChoiceHonesty,
  clearPlanningLedger, getPlanningLedger,
} from '../services/connector-layer/route-planner';
import {
  evaluateFailover, evaluateRestoration,
  recordRouteDegradation, recordRouteStable,
  advanceRestoration, resetRouteHealth,
  type RestorationState,
} from '../services/connector-layer/route-failover-governor';

let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string): void {
  if (cond) { passed++; return; }
  failed++;
  console.error(`  ✗ ${msg}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function mkRoute(overrides: Partial<AvailableRoute> = {}): AvailableRoute {
  return {
    routeMode: 'REALTIME',
    connector: 'conn-primary',
    routeState: 'R0_PREFERRED',
    latencyMs: 200,
    costUnits: 10,
    isOwnerPath: true,
    isConfirmerPath: false,
    recentFailureCount: 0,
    lastSuccessAt: new Date().toISOString(),
    ...overrides,
  };
}

function mkInput(overrides: Partial<RoutePlanningInput> = {}): RoutePlanningInput {
  return {
    fieldFamily: 'price.spot',
    sourceClass: 'market_data',
    claimUsage: 'LIVE_SCORING',
    criticality: 'MISSION_CRITICAL',
    intention: 'LIVE_THESIS',
    availableRoutes: [
      mkRoute(),
      mkRoute({ connector: 'conn-secondary', isOwnerPath: false, isConfirmerPath: true, costUnits: 5, latencyMs: 400 }),
    ],
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
console.log('║   L2.3 ROUTING MODE DOCTRINE — CONSTITUTIONAL TEST SUITE        ║');
console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

clearPlanningLedger();
resetRouteHealth();

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 1: Version & constitution completeness
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 1: Version & constitution completeness ──');
assert(L23_VERSION === '1.0.0', 'L23_VERSION is 1.0.0');

const modes: L23RouteMode[] = ['REALTIME', 'SCHEDULED', 'ON_DEMAND', 'BACKFILL'];
for (const m of modes) {
  const c = getConstitution(m);
  assert(c.mode === m, `${m} constitution exists`);
  assert(c.purpose.length > 20, `${m} has purpose`);
  assert(c.primaryOptimizationRight.length > 0, `${m} has primary optimization right`);
  assert(c.explicitNonGoals.length > 0, `${m} has explicit non-goals`);
  assert(c.allowedConsumers.length > 0, `${m} has allowed consumers`);
  assert(c.degradationSemantics.length > 0, `${m} has degradation semantics`);
  assert(c.possibleBlindSpots.length > 0, `${m} has blind spots`);
  assert(c.restorationRequirements.length > 0, `${m} has restoration requirements`);
  assert(c.probationSequence.length >= 3, `${m} has probation sequence`);
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 2: Optimization rights per mode
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 2: Optimization rights per mode ──');
assert(ROUTE_CONSTITUTIONS.REALTIME.primaryOptimizationRight === 'FRESHNESS_FITNESS_FIRST',
  'RT optimizes for freshness first');
assert(ROUTE_CONSTITUTIONS.SCHEDULED.primaryOptimizationRight === 'TRUTH_FIDELITY_UNDER_CADENCE',
  'SCHED optimizes for truth under cadence');
assert(ROUTE_CONSTITUTIONS.ON_DEMAND.primaryOptimizationRight === 'REQUEST_FITNESS',
  'OD optimizes for request fitness');
assert(ROUTE_CONSTITUTIONS.BACKFILL.primaryOptimizationRight === 'DETERMINISTIC_REPRODUCIBILITY',
  'BF optimizes for reproducibility');

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 3: Consumer allowlists — constitutional enforcement
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 3: Consumer allowlists ──');
assert(isConsumerAllowed('REALTIME', 'LIVE_SCORING'), 'RT allows LIVE_SCORING');
assert(isConsumerAllowed('REALTIME', 'ALERTING'), 'RT allows ALERTING');
assert(!isConsumerProhibited('REALTIME', 'LIVE_SCORING'), 'RT does not prohibit LIVE_SCORING');

assert(isConsumerProhibited('BACKFILL', 'LIVE_SCORING'), 'BF prohibits LIVE_SCORING');
assert(isConsumerProhibited('BACKFILL', 'ALERTING'), 'BF prohibits ALERTING');
assert(isConsumerAllowed('BACKFILL', 'REPLAY'), 'BF allows REPLAY');
assert(isConsumerAllowed('BACKFILL', 'AUDIT'), 'BF allows AUDIT');

assert(isConsumerProhibited('SCHEDULED', 'ALERTING'), 'SCHED prohibits ALERTING');
assert(isConsumerAllowed('SCHEDULED', 'DISPLAY'), 'SCHED allows DISPLAY');

assert(getConsumerVerdict('REALTIME', 'LIVE_SCORING') === 'ALLOWED', 'RT verdict for LIVE_SCORING = ALLOWED');
assert(getConsumerVerdict('BACKFILL', 'LIVE_SCORING') === 'PROHIBITED', 'BF verdict for LIVE_SCORING = PROHIBITED');
assert(getConsumerVerdict('SCHEDULED', 'LIVE_SCORING') === 'CONDITIONAL', 'SCHED verdict for LIVE_SCORING = CONDITIONAL');

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 4: Selection policy lookup
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 4: Selection policy lookup ──');
{
  const p = findSelectionPolicy('price.spot', 'market_data', 'LIVE_SCORING');
  assert(p.policyId === 'rsp-rt-spot-live', 'Spot live scoring → rt-spot-live policy');
  assert(p.preferredMode === 'REALTIME', 'Spot live scoring → REALTIME preferred');
  assert(p.criticality === 'MISSION_CRITICAL', 'Spot live scoring → MISSION_CRITICAL');
  assert(p.requireOwnerPath, 'Spot live scoring requires owner path');
  assert(p.costTolerance === 'TRUTH_FIRST', 'Spot live scoring → TRUTH_FIRST');
}
{
  const p = findSelectionPolicy('protocol.tvl', 'fundamentals', 'LIVE_SCORING');
  assert(p.policyId === 'rsp-sch-tvl', 'TVL scoring → sch-tvl policy');
  assert(p.preferredMode === 'SCHEDULED', 'TVL → SCHEDULED preferred');
}
{
  const p = findSelectionPolicy('unknown.field', 'unknown.class', 'DISPLAY');
  assert(p.policyId === 'rsp-default', 'Unknown → default policy');
}
assert(getAllSelectionPolicies().length >= 10, 'At least 10 selection policies');

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 5: Admissibility checks
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 5: Admissibility checks ──');
assert(isRouteModeAdmissible('price.spot', 'market_data', 'LIVE_SCORING', 'REALTIME'),
  'RT admissible for spot live scoring');
assert(!isRouteModeAdmissible('price.spot', 'market_data', 'LIVE_SCORING', 'BACKFILL'),
  'BACKFILL not admissible for spot live scoring');
assert(isRouteModeAdmissible('protocol.tvl', 'fundamentals', 'LIVE_SCORING', 'SCHEDULED'),
  'SCHEDULED admissible for TVL');
assert(!isRouteModeAdmissible('derivatives.liquidation', 'derivatives', 'LIVE_SCORING', 'SCHEDULED'),
  'SCHEDULED not admissible for liquidations live scoring');

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 6: Route planner — basic selection
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 6: Route planner — basic selection ──');
{
  const r = planRoute(mkInput());
  assert(r.routeMode === 'REALTIME', 'Planner selects REALTIME for spot live scoring');
  assert(r.selectedConnector === 'conn-primary', 'Planner selects owner-path connector');
  assert(r.truthFidelityScore > 0, 'Truth fidelity scored');
  assert(r.freshnessFitnessScore > 0, 'Freshness fitness scored');
  assert(r.failureResilienceScore > 0, 'Failure resilience scored');
  assert(r.compositeScore > 0, 'Composite scored');
  assert(r.provenanceScore > 0, 'Provenance scored');
  assert(r.selectedReasonCodes.includes('OWNER_PATH'), 'Reason includes OWNER_PATH');
  assert(r.selectedReasonCodes.includes('PREFERRED_MODE_MATCH'), 'Reason includes PREFERRED_MODE_MATCH');
  assert(r.allowedConsumers.includes('LIVE_SCORING'), 'LIVE_SCORING in allowed consumers');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 7: Planner — rejected candidates
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 7: Planner — rejected candidates ──');
{
  const r = planRoute(mkInput({
    availableRoutes: [
      mkRoute(),
      mkRoute({ routeMode: 'BACKFILL', connector: 'conn-backfill' }),
    ],
  }));
  assert(r.routeMode === 'REALTIME', 'BACKFILL rejected, REALTIME selected');
  assert(r.rejectedCandidates.length > 0, 'Backfill appears in rejected');
  assert(r.rejectedCandidates.some(rc => rc.routeMode === 'BACKFILL'), 'Backfill explicitly rejected');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 8: Planner — no admissible routes
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 8: Planner — no admissible routes ──');
{
  const r = planRoute(mkInput({
    availableRoutes: [
      mkRoute({ routeMode: 'BACKFILL', connector: 'conn-bf' }),
    ],
  }));
  assert(r.selectedConnector === 'NONE', 'No admissible → NONE');
  assert(r.routeState === 'R5_PROHIBITED', 'No admissible → R5_PROHIBITED');
  assert(r.selectedReasonCodes.includes('NO_ADMISSIBLE_ROUTE'), 'Reason = NO_ADMISSIBLE_ROUTE');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 9: Planner — owner path beats cheap confirmer
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 9: Cheap route cannot outrank truth-preserving route ──');
{
  const r = planRoute(mkInput({
    availableRoutes: [
      mkRoute({ costUnits: 100, latencyMs: 200 }),
      mkRoute({ connector: 'conn-cheap', isOwnerPath: false, isConfirmerPath: true, costUnits: 1, latencyMs: 200 }),
    ],
  }));
  assert(r.selectedConnector === 'conn-primary', 'Owner path wins despite 100x cost');
  assert(r.truthFidelityScore > 0.5, 'Winner has high truth fidelity');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 10: Planner — fallback ladder
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 10: Fallback ladder ──');
{
  const r = planRoute(mkInput({
    availableRoutes: [
      mkRoute(),
      mkRoute({ connector: 'conn-secondary', isOwnerPath: false, isConfirmerPath: true }),
      mkRoute({ connector: 'conn-scheduled', routeMode: 'SCHEDULED', isOwnerPath: false, isConfirmerPath: true }),
    ],
  }));
  assert(r.fallbackLadder.length >= 1, 'Fallback ladder has entries');
  assert(r.fallbackLadder.every(f => f.failoverOutcome !== undefined), 'Every fallback has outcome');
  assert(r.fallbackLadder.every(f => f.expectedBlindSpots !== undefined), 'Every fallback has blind spots');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 11: Planner — degraded route selection emits blind spots
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 11: Degraded route emits blind spots ──');
{
  const r = planRoute(mkInput({
    availableRoutes: [
      mkRoute({ routeState: 'R2_DEGRADED' }),
    ],
  }));
  assert(r.blindSpots.length > 0, 'Degraded route emits blind spots');
  assert(r.degradationSemantics.length > 0, 'Degraded route emits degradation semantics');
  assert(r.selectedReasonCodes.some(c => c.includes('ROUTE_STATE')), 'Reason includes route state');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 12: Planner — prohibited route filtered
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 12: Prohibited route filtered ──');
{
  const r = planRoute(mkInput({
    availableRoutes: [
      mkRoute({ routeState: 'R5_PROHIBITED' }),
      mkRoute({ connector: 'conn-secondary', isOwnerPath: false, isConfirmerPath: true }),
    ],
  }));
  assert(r.selectedConnector === 'conn-secondary', 'Prohibited route not selected');
  assert(r.rejectedCandidates.some(rc => rc.reasonCodes.includes('ROUTE_STATE_PROHIBITED')),
    'Prohibited route in rejected list');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 13: Planner — critical incident blocks route
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 13: Critical incident blocks route ──');
{
  const r = planRoute(mkInput({
    currentIncidents: [{
      routeMode: 'REALTIME',
      connector: 'conn-primary',
      incidentType: 'WEBSOCKET_DOWN',
      severity: 'CRITICAL',
      since: new Date().toISOString(),
    }],
  }));
  assert(r.selectedConnector === 'conn-secondary', 'Critical incident blocks primary');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 14: Selection — scheduled chosen for TVL
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 14: Scheduled chosen for protocol substance ──');
{
  const r = planRoute({
    fieldFamily: 'protocol.tvl',
    sourceClass: 'fundamentals',
    claimUsage: 'LIVE_SCORING',
    criticality: 'THESIS_CRITICAL',
    intention: 'LIVE_THESIS',
    availableRoutes: [
      mkRoute({ routeMode: 'SCHEDULED', connector: 'conn-sched', isOwnerPath: true, latencyMs: 5000 }),
      mkRoute({ routeMode: 'ON_DEMAND', connector: 'conn-od', isOwnerPath: false, isConfirmerPath: true }),
    ],
  });
  assert(r.routeMode === 'SCHEDULED', 'SCHEDULED chosen for TVL');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 15: Selection — backfill for replay
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 15: Backfill chosen for historical replay ──');
{
  const r = planRoute({
    fieldFamily: 'price.spot',
    sourceClass: 'market_data',
    claimUsage: 'HISTORICAL_REPLAY',
    criticality: 'CONTEXTUAL',
    intention: 'FORENSIC_REPLAY',
    availableRoutes: [
      mkRoute({ routeMode: 'BACKFILL', connector: 'conn-bf', isOwnerPath: false, isConfirmerPath: true }),
    ],
  });
  assert(r.routeMode === 'BACKFILL', 'BACKFILL chosen for historical replay');
  assert(!r.allowedConsumers.includes('LIVE_SCORING'), 'Backfill does not allow LIVE_SCORING consumer');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 16: Failover — equivalent
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 16: Failover — equivalent ──');
{
  const d = evaluateFailover({
    fieldFamily: 'price.spot',
    sourceClass: 'market_data',
    claimUsage: 'LIVE_SCORING',
    primaryRoute: mkRoute(),
    candidateRoute: mkRoute({ connector: 'conn-mirror' }),
  });
  assert(d.outcome === 'FAILOVER_ALLOWED_EQUIVALENT', 'Same mode, same path → equivalent');
  assert(!d.disclosureRequired, 'Equivalent failover needs no disclosure');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 17: Failover — degraded (mode change)
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 17: Failover — degraded (mode change) ──');
{
  const d = evaluateFailover({
    fieldFamily: 'price.spot',
    sourceClass: 'market_data',
    claimUsage: 'LIVE_SCORING',
    primaryRoute: mkRoute(),
    candidateRoute: mkRoute({ routeMode: 'SCHEDULED', connector: 'conn-sched', isOwnerPath: false, isConfirmerPath: true }),
  });
  assert(d.outcome === 'FAILOVER_ALLOWED_DEGRADED', 'Mode change → degraded failover');
  assert(d.disclosureRequired, 'Degraded failover requires disclosure');
  assert(d.reasonCodes.some(r => r.includes('MODE_CHANGE')), 'Mode change in reason codes');
  assert(d.expectedBlindSpots.length > 0, 'Degraded failover emits blind spots');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 18: Failover — prohibited (inadmissible mode)
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 18: Failover — prohibited ──');
{
  const d = evaluateFailover({
    fieldFamily: 'derivatives.liquidation',
    sourceClass: 'derivatives',
    claimUsage: 'LIVE_SCORING',
    primaryRoute: mkRoute(),
    candidateRoute: mkRoute({ routeMode: 'SCHEDULED', connector: 'conn-sched' }),
  });
  assert(d.outcome === 'FAILOVER_PROHIBITED', 'SCHED not admissible for liq live → prohibited');
  assert(d.disclosureRequired, 'Prohibited failover requires disclosure');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 19: Failover — partial (candidate degraded state)
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 19: Failover — partial ──');
{
  const d = evaluateFailover({
    fieldFamily: 'price.spot',
    sourceClass: 'market_data',
    claimUsage: 'LIVE_SCORING',
    primaryRoute: mkRoute(),
    candidateRoute: mkRoute({ connector: 'conn-partial', routeState: 'R3_PARTIAL' }),
  });
  assert(d.outcome === 'FAILOVER_PARTIAL_ONLY', 'Partial candidate → partial failover');
  assert(d.expectedDegradation.length > 0, 'Partial failover emits degradation');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 20: Failover — escalate (high failure count)
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 20: Failover — escalate ──');
{
  const d = evaluateFailover({
    fieldFamily: 'price.spot',
    sourceClass: 'market_data',
    claimUsage: 'LIVE_SCORING',
    primaryRoute: mkRoute(),
    candidateRoute: mkRoute({ connector: 'conn-flaky', recentFailureCount: 10 }),
  });
  assert(d.outcome === 'ESCALATE_ROUTE_INCIDENT', 'High failure → escalate');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 21: Restoration — probation sequence
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 21: Restoration — probation sequence ──');
{
  const NOW = Date.now();
  const state: RestorationState = {
    routeMode: 'REALTIME',
    connector: 'conn-primary',
    currentProbation: 'RECOVERING_UNVERIFIED',
    cleanWindowStartedAt: new Date(NOW - 120_000).toISOString(),
    flapCount: 1,
  };
  const d = evaluateRestoration(state, NOW);
  assert(d.newProbation === 'RECOVERING_PROBATION', 'Advances to RECOVERING_PROBATION after clean window');
  assert(d.rightsHaircut, 'Rights haircut during probation');
}
{
  const NOW = Date.now();
  const state: RestorationState = {
    routeMode: 'REALTIME',
    connector: 'conn-primary',
    currentProbation: 'RECOVERING_UNVERIFIED',
    cleanWindowStartedAt: new Date(NOW - 10_000).toISOString(),
    flapCount: 1,
  };
  const d = evaluateRestoration(state, NOW);
  assert(d.newProbation === 'RECOVERING_UNVERIFIED', 'Holds at UNVERIFIED if clean window too short');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 22: Restoration — flap guard
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 22: Restoration — flap guard ──');
{
  const NOW = Date.now();
  const state: RestorationState = {
    routeMode: 'REALTIME',
    connector: 'conn-flappy',
    currentProbation: 'RECOVERING_PROBATION',
    cleanWindowStartedAt: new Date(NOW - 300_000).toISOString(),
    flapCount: 10,
  };
  const d = evaluateRestoration(state, NOW);
  assert(d.newProbation === 'RECOVERING_UNVERIFIED', 'Flap limit → reset to UNVERIFIED');
  assert(d.newRouteState === 'R4_FALLBACK_ONLY', 'Flap limit → FALLBACK_ONLY');
  assert(d.rightsHaircut, 'Flap limit → rights haircut');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 23: Restoration — full sequence to RESTORED_PREFERRED
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 23: Full restoration sequence ──');
{
  const NOW = Date.now();
  const cleanMs = ROUTE_CONSTITUTIONS.REALTIME.restorationCleanWindowMs;

  let state: RestorationState = {
    routeMode: 'REALTIME',
    connector: 'conn-recovering',
    currentProbation: 'RECOVERING_UNVERIFIED',
    cleanWindowStartedAt: new Date(NOW - cleanMs * 2).toISOString(),
    flapCount: 0,
  };

  let d = evaluateRestoration(state, NOW);
  state.currentProbation = d.newProbation;
  assert(d.newProbation === 'RECOVERING_PROBATION', 'Step 1 → RECOVERING_PROBATION');

  state.cleanWindowStartedAt = new Date(NOW - cleanMs * 2).toISOString();
  d = evaluateRestoration(state, NOW);
  state.currentProbation = d.newProbation;
  assert(d.newProbation === 'RECOVERED_LIMITED', 'Step 2 → RECOVERED_LIMITED');

  state.cleanWindowStartedAt = new Date(NOW - cleanMs * 2).toISOString();
  d = evaluateRestoration(state, NOW);
  state.currentProbation = d.newProbation;
  assert(d.newProbation === 'RESTORED_PREFERRED', 'Step 3 → RESTORED_PREFERRED');
  assert(!d.rightsHaircut, 'Restored preferred → no rights haircut');
  assert(d.newRouteState === 'R0_PREFERRED', 'Restored preferred → R0');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 24: Route health tracker
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 24: Route health tracker ──');
{
  resetRouteHealth();
  recordRouteDegradation('REALTIME', 'conn-test');
  recordRouteStable('REALTIME', 'conn-test');

  const NOW = Date.now();
  const d = advanceRestoration('REALTIME', 'conn-test', NOW + 120_000);
  assert(d != null, 'Restoration decision returned');
  assert(d!.newProbation !== undefined, 'Probation state returned');

  const d2 = advanceRestoration('REALTIME', 'conn-nonexistent');
  assert(d2 === undefined, 'Nonexistent route returns undefined');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 25: Planning ledger
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 25: Planning ledger ──');
{
  const ledger = getPlanningLedger();
  assert(ledger.length > 5, `Planning ledger has ${ledger.length} entries`);
  assert(ledger.every(r => r.decidedAt.length > 0), 'Every record has decidedAt');
  assert(ledger.every(r => r.routeId.length > 0), 'Every record has routeId');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 26: Non-goals enforcement
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 26: Non-goals enforcement ──');
{
  const rt = getConstitution('REALTIME');
  assert(rt.explicitNonGoals.includes('CHEAPEST_TRANSPORT'), 'RT non-goal: cheapest transport');

  const bf = getConstitution('BACKFILL');
  assert(bf.explicitNonGoals.includes('FAKE_REALTIME_RECENCY'), 'BF non-goal: fake RT recency');

  const od = getConstitution('ON_DEMAND');
  assert(od.explicitNonGoals.includes('HIDDEN_ALWAYS_ON_FALLBACK'), 'OD non-goal: hidden fallback');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 27: Backfill cannot serve live scoring
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 27: Backfill blocked from live use ──');
{
  assert(!isRouteModeAdmissible('price.spot', 'market_data', 'LIVE_SCORING', 'BACKFILL'),
    'BACKFILL not admissible for spot live scoring');

  const bfConst = getConstitution('BACKFILL');
  assert(bfConst.prohibitedConsumers.includes('LIVE_SCORING'), 'BF prohibits LIVE_SCORING consumer');
  assert(bfConst.prohibitedConsumers.includes('SCENARIO_ENGINE'), 'BF prohibits SCENARIO_ENGINE consumer');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 28: Scheduled cannot silently replace RT for sequence-sensitive use
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 28: Scheduled cannot replace RT for liquidations ──');
{
  assert(!isRouteModeAdmissible('derivatives.liquidation', 'derivatives', 'LIVE_SCORING', 'SCHEDULED'),
    'SCHEDULED not admissible for liquidation live scoring');
  assert(!isRouteModeAdmissible('derivatives.liquidation', 'derivatives', 'ALERTING', 'SCHEDULED'),
    'SCHEDULED not admissible for liquidation alerting');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 29: Route state rank ordering
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 29: Route state rank ordering ──');
assert(ROUTE_STATE_RANK.R0_PREFERRED < ROUTE_STATE_RANK.R1_AVAILABLE, 'R0 < R1');
assert(ROUTE_STATE_RANK.R1_AVAILABLE < ROUTE_STATE_RANK.R2_DEGRADED, 'R1 < R2');
assert(ROUTE_STATE_RANK.R2_DEGRADED < ROUTE_STATE_RANK.R3_PARTIAL, 'R2 < R3');
assert(ROUTE_STATE_RANK.R3_PARTIAL < ROUTE_STATE_RANK.R4_FALLBACK_ONLY, 'R3 < R4');
assert(ROUTE_STATE_RANK.R4_FALLBACK_ONLY < ROUTE_STATE_RANK.R5_PROHIBITED, 'R4 < R5');

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 30: ANTI-FAKE — route-choice-honesty
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 30: ANTI-FAKE — route-choice-honesty ──');
{
  const ledger = getPlanningLedger();
  let totalViolations = 0;
  for (const record of ledger) {
    const violations = verifyRouteChoiceHonesty(record);
    if (violations.length > 0) {
      totalViolations += violations.length;
      console.error(`  Honesty violation for ${record.routeId}: ${violations.join('; ')}`);
    }
  }
  assert(totalViolations === 0,
    `Route-choice honesty: 0 violations across ${ledger.length} records (found ${totalViolations})`);
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 31: ANTI-FAKE — higher-fidelity route wins over cheaper
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 31: ANTI-FAKE — fidelity beats cost ──');
{
  const r = planRoute(mkInput({
    availableRoutes: [
      mkRoute({ costUnits: 200, latencyMs: 300 }),
      mkRoute({ connector: 'conn-cheap', isOwnerPath: false, isConfirmerPath: false, costUnits: 1, latencyMs: 100 }),
    ],
  }));
  assert(r.selectedConnector === 'conn-primary',
    'Owner-path expensive route beats non-owner cheap route');
  const violations = verifyRouteChoiceHonesty(r);
  assert(violations.length === 0, 'No honesty violations for truth-first selection');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 32: Weight system — correctness
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 32: Weight system correctness ──');
{
  for (const p of getAllSelectionPolicies()) {
    const sum = p.truthFidelityWeight + p.freshnessFitnessWeight +
                p.failureResilienceWeight + p.costDisciplineWeight;
    assert(Math.abs(sum - 1.0) < 0.01, `Policy ${p.policyId} weights sum to ~1.0 (got ${sum})`);
  }
  const defSum = DEFAULT_ROUTE_SELECTION_POLICY.truthFidelityWeight +
    DEFAULT_ROUTE_SELECTION_POLICY.freshnessFitnessWeight +
    DEFAULT_ROUTE_SELECTION_POLICY.failureResilienceWeight +
    DEFAULT_ROUTE_SELECTION_POLICY.costDisciplineWeight;
  assert(Math.abs(defSum - 1.0) < 0.01, `Default policy weights sum to ~1.0 (got ${defSum})`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// FINAL SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
if (failed === 0) {
  console.log(`║  ✅ ALL ${passed} TESTS PASSED — L2.3 Routing Mode Doctrine verified  ║`);
} else {
  console.log(`║  ❌ ${failed} FAILED / ${passed} passed                                     ║`);
}
console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

if (failed > 0) process.exit(1);
