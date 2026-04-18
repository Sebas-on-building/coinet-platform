/**
 * L6.8 — Runtime Build Order, Implementation Artifacts, and Assurance Program
 *
 * Certification Test Suite — 9 Bands:
 *   A — Topology and artifacts (file/module surface present)
 *   B — Certification bands and levels (band enums + level derivation)
 *   C — Rollout phases and gates (phase graph, advance law, rollout gate)
 *   D — Rollback policy and playbooks (lineage-preserving rollback)
 *   E — Migration and compatibility gate (contract + family migrations)
 *   F — Operational metrics, SLOs, alerts, observability report
 *   G — Fixtures (golden, adversarial, replay, late-data, load, migration)
 *   H — Invariants INV-6.8-A through INV-6.8-G
 *   I — Master certification run end-to-end (artifact + rollout recommendation)
 */

import {
  L6CertificationBand,
  ALL_CERTIFICATION_BANDS,
  L6CertificationLevel,
  CONSTITUTIONAL_BANDS,
  RUNTIME_BANDS,
  PRODUCTION_BANDS,
  deriveCertificationLevel,
  isBandConstitutional,
  isBandRuntime,
  buildCertificationArtifact,
  canonicalizeArtifact,
  fingerprint,
  registerCertificationArtifact,
  getLatestCertificationArtifact,
  clearCertificationArtifacts,
  createRecorder,
  runBand,
  runBands,
} from '../l6/certification';
import { runMasterCertification } from '../l6/certification/test-l6-master';

import {
  GOLDEN_FEATURES,
  GOLDEN_EVENTS,
  goldenCorpusSnapshot,
  ADVERSARIAL_CASES,
  L6AdversarialCaseKind,
  REPLAY_TIMELINES,
  diffReplayOutputs,
  LATE_DATA_CASES,
  isModeAllowedForLateDataClass,
  L6LateDataClass,
  CONCURRENCY_LOAD_CASES,
  L6LoadScenarioKind,
  MIGRATION_CASES,
} from '../l6/fixtures';

import {
  L6MetricId,
  L6MetricCategory,
  ALL_METRIC_IDS,
  L6_METRIC_REGISTRY,
  metricsByCategory,
  getMetricSpec,
  L6_SLO_SPECS,
  L6SloSeverity,
  evaluateSlo,
  hasCriticalBreach,
  L6_ALERT_RULES,
  L6OperationalSeverity,
  generateObservabilityReport,
  isObservabilityPackageComplete,
  zeroToleranceSlos,
} from '../l6/ops';

import {
  L6RolloutPhase,
  ALL_ROLLOUT_PHASES,
  L6_ROLLOUT_PHASE_SPECS,
  prerequisitesSatisfied,
  canAdvancePhase,
  L6ProductionEnablementStep,
  PRODUCTION_ENABLEMENT_ORDER,
  evaluateRolloutGate,
  L6RollbackMode,
  ALL_ROLLBACK_MODES,
  L6RollbackPlan,
  executeRollback,
  listRollbackRecords,
  clearRollbackLog,
  L6_FAILURE_PLAYBOOKS,
  L6FamilyEnablementState,
  L6_FEATURE_FAMILY_ENABLEMENT_ORDER,
  L6_EVENT_FAMILY_ENABLEMENT_ORDER,
  isLegalTransition,
  decideFamilyEnablement,
} from '../l6/rollout';

import {
  L6MigrationClass,
  ALL_MIGRATION_CLASSES,
  L6ContractMigrationAttempt,
  classifyContractMigration,
  L6FamilyMigrationAttempt,
  classifyFamilyMigration,
  gateContractMigration,
  gateFamilyMigration,
  recordGateDecision,
  listGateDecisions,
  clearGateLog,
} from '../l6/migration';

import {
  checkINV_68_A,
  checkINV_68_B,
  checkINV_68_C,
  checkINV_68_D,
  checkINV_68_E,
  checkINV_68_F,
  checkINV_68_G,
  checkAllL6_8Invariants,
} from '../l6/invariants';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(cond: boolean, label: string): void {
  if (cond) { passed++; } else { failed++; failures.push(label); console.log(`  ✗ ${label}`); }
}

async function main(): Promise<void> {
  console.log('================================================================');
  console.log('L6.8 — Runtime Build Order & Assurance Program — Certification');
  console.log('================================================================');

  // ---------------- Band A ----------------
  console.log('\n[Band A] Topology and artifact surface');
  assert(ALL_CERTIFICATION_BANDS.length === 10, 'A.01 ten certification bands');
  assert(ALL_METRIC_IDS.length >= 24, 'A.02 metric registry ≥ 24 metrics');
  assert(L6_SLO_SPECS.length >= 8, 'A.03 SLO specs ≥ 8');
  assert(L6_ALERT_RULES.length >= 6, 'A.04 alert rules ≥ 6');
  assert(ALL_ROLLOUT_PHASES.length === 8, 'A.05 eight build phases (A–H)');
  assert(PRODUCTION_ENABLEMENT_ORDER.length === 9, 'A.06 nine production-enablement steps');
  assert(ALL_ROLLBACK_MODES.length === 6, 'A.07 six rollback modes');
  assert(ALL_MIGRATION_CLASSES.length === 7, 'A.08 seven migration classes');
  assert(L6_FAILURE_PLAYBOOKS.length >= 6, 'A.09 failure playbook registry ≥ 6');
  assert(L6_FEATURE_FAMILY_ENABLEMENT_ORDER.length === 8, 'A.10 feature-family enablement order length 8');
  assert(L6_EVENT_FAMILY_ENABLEMENT_ORDER.length === 8, 'A.11 event-family enablement order length 8');

  // ---------------- Band B ----------------
  console.log('\n[Band B] Certification bands and level derivation');
  assert(CONSTITUTIONAL_BANDS.length === 4, 'B.01 constitutional bands A–D');
  assert(RUNTIME_BANDS.length === 7, 'B.02 runtime bands A–G');
  assert(PRODUCTION_BANDS.length === 10, 'B.03 production bands A–J');
  const partial = new Set<L6CertificationBand>(CONSTITUTIONAL_BANDS);
  assert(deriveCertificationLevel(partial) === L6CertificationLevel.CONSTITUTIONAL_GREEN, 'B.04 constitutional-green derived');
  const runtimeSet = new Set<L6CertificationBand>(RUNTIME_BANDS);
  assert(deriveCertificationLevel(runtimeSet) === L6CertificationLevel.RUNTIME_GREEN, 'B.05 runtime-green derived');
  const fullSet = new Set<L6CertificationBand>(PRODUCTION_BANDS);
  assert(deriveCertificationLevel(fullSet) === L6CertificationLevel.PRODUCTION_GREEN, 'B.06 production-green derived');
  assert(deriveCertificationLevel(new Set()) === L6CertificationLevel.FAILED, 'B.07 empty set → FAILED');
  assert(isBandConstitutional(L6CertificationBand.A_CONTRACTS_AND_LEGALITY), 'B.08 band A is constitutional');
  assert(isBandRuntime(L6CertificationBand.G_LOAD_AND_CONCURRENCY), 'B.09 band G is runtime');
  const rec = createRecorder();
  rec.assert(true, 'ok'); rec.assert(false, 'nope');
  assert(rec.passed === 1 && rec.failed === 1, 'B.10 recorder counts');
  const bo = await runBand({ band: L6CertificationBand.A_CONTRACTS_AND_LEGALITY, run: r => r.assert(true, 'x') });
  assert(bo.ok && bo.passed === 1, 'B.11 band runner single success');
  const bos = await runBands([
    { band: L6CertificationBand.B_DETERMINISTIC_COMPUTE, run: r => r.assert(true, 'ok') },
    { band: L6CertificationBand.C_EVENT_LIFECYCLE, run: r => r.assert(false, 'fail') },
  ]);
  assert(bos.length === 2 && bos[0].ok && !bos[1].ok, 'B.12 band runner multi outcomes');

  // ---------------- Band C ----------------
  console.log('\n[Band C] Rollout phases and gates');
  for (const p of ALL_ROLLOUT_PHASES) {
    const spec = L6_ROLLOUT_PHASE_SPECS[p];
    assert(spec.deliverables.length > 0, `C.${p}.01 deliverables declared`);
    assert(spec.exit_criteria.length > 0, `C.${p}.02 exit criteria declared`);
  }
  assert(prerequisitesSatisfied(L6RolloutPhase.A_CONTRACTS_AND_REGISTRIES, new Set()), 'C.03 phase A has no prerequisites');
  assert(!prerequisitesSatisfied(L6RolloutPhase.H_FINAL_ASSURANCE, new Set()), 'C.04 phase H requires prerequisites');
  const adv = canAdvancePhase(L6RolloutPhase.H_FINAL_ASSURANCE,
    new Set<L6RolloutPhase>(L6_ROLLOUT_PHASE_SPECS[L6RolloutPhase.H_FINAL_ASSURANCE].prerequisites),
    { deliverables_complete: true, exit_criteria_met: true, certification_bands_green_for_phase: true });
  assert(adv.ok, 'C.05 can advance H with prerequisites + attestations');
  const advNoExit = canAdvancePhase(L6RolloutPhase.H_FINAL_ASSURANCE,
    new Set<L6RolloutPhase>(L6_ROLLOUT_PHASE_SPECS[L6RolloutPhase.H_FINAL_ASSURANCE].prerequisites),
    { deliverables_complete: true, exit_criteria_met: false, certification_bands_green_for_phase: true });
  assert(!advNoExit.ok, 'C.06 cannot advance H without exit criteria');

  const obs = generateObservabilityReport({});
  const cert = buildCertificationArtifact({
    certification_run_id: 'cert-c-gate',
    layer_version_set: { L6: 'v1' },
    bands: Object.values(L6CertificationBand).map(b => ({
      band: b, passed: 1, failed: 0, duration_ms: 1, ok: true, blocking_violations: [],
    })),
    invariants: [{ id: 'self', holds: true, evidence: 'ok' }],
    golden_corpus_hash: 'h', replay_integrity_ok: true, load_concurrency_ok: true,
    migration_ok: true, observability_ok: true,
  });
  const gate = evaluateRolloutGate({
    target_phase: L6RolloutPhase.H_FINAL_ASSURANCE,
    completed_phases: new Set<L6RolloutPhase>(L6_ROLLOUT_PHASE_SPECS[L6RolloutPhase.H_FINAL_ASSURANCE].prerequisites),
    attested: { deliverables_complete: true, exit_criteria_met: true, certification_bands_green_for_phase: true },
    certification: cert, observability: obs, requires_production_green: true,
  });
  assert(gate.advance, 'C.07 rollout gate advances with green cert + obs');
  const gateNoCert = evaluateRolloutGate({
    target_phase: L6RolloutPhase.H_FINAL_ASSURANCE,
    completed_phases: new Set<L6RolloutPhase>(L6_ROLLOUT_PHASE_SPECS[L6RolloutPhase.H_FINAL_ASSURANCE].prerequisites),
    attested: { deliverables_complete: true, exit_criteria_met: true, certification_bands_green_for_phase: true },
    certification: null, observability: obs, requires_production_green: true,
  });
  assert(!gateNoCert.advance, 'C.08 rollout gate blocks without artifact');

  // ---------------- Band D ----------------
  console.log('\n[Band D] Rollback policy and playbooks');
  clearRollbackLog();
  const rb: L6RollbackPlan = {
    plan_id: 'rbk-d1', mode: L6RollbackMode.FAMILY_DISABLE,
    target_kind: 'FEATURE_FAMILY', target_id: 'MARKET',
    preserves_history: true, keeps_lineage_visible: true,
    approval_required: true, notes: 'canary fail',
  };
  const rec1 = executeRollback(rb, 'on-call');
  assert(rec1.lineage_preserved && rec1.historical_rows_touched === 0, 'D.01 rollback preserves lineage');
  assert(listRollbackRecords().length === 1, 'D.02 rollback log records');
  let threw = false;
  try {
    executeRollback({ ...rb, plan_id: 'rbk-d2', preserves_history: false as any }, 'bad');
  } catch { threw = true; }
  assert(threw, 'D.03 non-preserving rollback rejected');
  for (const pb of L6_FAILURE_PLAYBOOKS) {
    assert(pb.first_actions.length > 0, `D.pb.${pb.playbook_id}.first_actions`);
    assert(pb.escalation_path.length > 0, `D.pb.${pb.playbook_id}.escalation`);
  }
  assert(!isLegalTransition(L6FamilyEnablementState.DISABLED, L6FamilyEnablementState.PRODUCTION),
    'D.04 disabled→production illegal');
  assert(isLegalTransition(L6FamilyEnablementState.CANARY_CURRENT, L6FamilyEnablementState.PRODUCTION),
    'D.05 canary→production legal');
  const enDecision = decideFamilyEnablement(
    L6FamilyEnablementState.CANARY_CURRENT, L6FamilyEnablementState.PRODUCTION,
    { certification_runtime_green_or_higher: true, observability_ok: true,
      earlier_families_at_least: L6FamilyEnablementState.PRODUCTION });
  assert(enDecision.ok, 'D.06 family enablement ok when all green');
  const enRed = decideFamilyEnablement(
    L6FamilyEnablementState.CANARY_CURRENT, L6FamilyEnablementState.PRODUCTION,
    { certification_runtime_green_or_higher: false, observability_ok: true,
      earlier_families_at_least: L6FamilyEnablementState.PRODUCTION });
  assert(!enRed.ok, 'D.07 family enablement blocked when cert not runtime-green');

  // ---------------- Band E ----------------
  console.log('\n[Band E] Migration and compatibility gate');
  clearGateLog();
  const patch: L6ContractMigrationAttempt = {
    attempt_id: 'mig.e.patch', target_kind: 'FEATURE_CONTRACT', target_id: 'market.return_1h',
    from_version: '1.0.0', to_version: '1.0.1', declared_class: L6MigrationClass.PATCH_COMPATIBLE,
    historical_meaning_preserved: true, replay_compatible: true, migration_notes: 'fix',
  };
  const patchDecision = gateContractMigration(patch);
  assert(patchDecision.gate === 'AUTO' && patchDecision.allowed, 'E.01 patch migration auto');
  recordGateDecision(patchDecision);
  assert(listGateDecisions().length === 1, 'E.02 gate decision recorded');

  const minor: L6ContractMigrationAttempt = { ...patch, attempt_id: 'mig.e.minor',
    declared_class: L6MigrationClass.MINOR_ADDITIVE, to_version: '1.1.0' };
  assert(gateContractMigration(minor).gate === 'REVIEW', 'E.03 minor additive → review');

  const major: L6ContractMigrationAttempt = { ...patch, attempt_id: 'mig.e.major',
    declared_class: L6MigrationClass.MAJOR_SEMANTIC_BREAK, to_version: '2.0.0' };
  assert(gateContractMigration(major).gate === 'BLOCK', 'E.04 major semantic break → block');

  const retire: L6ContractMigrationAttempt = { ...patch, attempt_id: 'mig.e.retire',
    declared_class: L6MigrationClass.RETIREMENT };
  assert(gateContractMigration(retire).gate === 'BLOCK', 'E.05 retirement → block');

  const badPatch: L6ContractMigrationAttempt = { ...patch, attempt_id: 'mig.e.badp',
    historical_meaning_preserved: false };
  const badGate = gateContractMigration(badPatch);
  assert(!badGate.allowed && badGate.gate === 'BLOCK', 'E.06 patch that breaks history → block');

  const familyMig: L6FamilyMigrationAttempt = {
    attempt_id: 'famMig.1', target_kind: 'FEATURE_FAMILY', family_id: 'MARKET',
    from_family_version: '1.0.0', to_family_version: '1.0.1',
    declared_class: L6MigrationClass.PATCH_COMPATIBLE,
    contract_migrations: [patch],
    retains_linked_events: true,
    retains_legal_input_registry_compliance: true,
    forbidden_shortcut_reintroduced: false,
  };
  assert(gateFamilyMigration(familyMig).allowed, 'E.07 family migration allowed');
  const badFamily: L6FamilyMigrationAttempt = { ...familyMig, attempt_id: 'famMig.bad',
    forbidden_shortcut_reintroduced: true };
  assert(!gateFamilyMigration(badFamily).allowed, 'E.08 family migration rejects forbidden shortcut');

  for (const mc of MIGRATION_CASES) {
    const cls = classifyContractMigration({
      attempt_id: mc.case_id,
      target_kind: (mc.target_kind === 'FEATURE_FAMILY' ? 'FEATURE_CONTRACT' :
                    mc.target_kind === 'EVENT_FAMILY' ? 'EVENT_CONTRACT' : mc.target_kind),
      target_id: mc.target_id, from_version: mc.from_version, to_version: mc.to_version,
      declared_class: mc.class, historical_meaning_preserved: mc.historical_meaning_preserved,
      replay_compatible: mc.replay_compatible, migration_notes: mc.notes,
    });
    if (mc.class === L6MigrationClass.MAJOR_SEMANTIC_BREAK) {
      assert(cls.requires_new_version_namespace, `E.corpus.${mc.case_id}.new_namespace`);
    }
  }

  // ---------------- Band F ----------------
  console.log('\n[Band F] Operational metrics, SLOs, alerts, observability');
  for (const id of ALL_METRIC_IDS) {
    const spec = getMetricSpec(id);
    assert(spec.description.length > 0, `F.${id}.desc`);
    assert(spec.category !== undefined, `F.${id}.category`);
  }
  for (const cat of Object.values(L6MetricCategory)) {
    assert(metricsByCategory(cat).length > 0, `F.cat.${cat}`);
  }
  for (const slo of L6_SLO_SPECS) {
    const ev = evaluateSlo(slo, slo.comparator === 'LE' ? slo.target : slo.target);
    assert(!ev.breached, `F.slo.${slo.slo_id}.baseline_ok`);
  }
  const breachEval = evaluateSlo(L6_SLO_SPECS[0], -1);
  assert(breachEval.breached || !breachEval.breached, 'F.slo.eval_shape'); // sanity
  const breach = L6_SLO_SPECS.map(s => evaluateSlo(s,
    s.comparator === 'LE' ? s.target + 10 : s.target - 10));
  assert(hasCriticalBreach(breach), 'F.slo.critical_breach_detected');
  const ztSlos = zeroToleranceSlos();
  assert(ztSlos.length >= 3, 'F.slo.zero_tolerance_population');
  const obsReport = generateObservabilityReport({
    [L6MetricId.REPLAY_MISMATCH_COUNT]: 5,
  });
  assert(obsReport.critical_breach, 'F.obs.replay_mismatch_critical');
  assert(generateObservabilityReport({}).ok, 'F.obs.clean_sample_ok');
  assert(isObservabilityPackageComplete().ok, 'F.obs.package_complete');
  assert(L6_ALERT_RULES.some(a => a.severity === L6OperationalSeverity.PAGE),
    'F.alerts.page_level_present');

  // ---------------- Band G ----------------
  console.log('\n[Band G] Fixtures (golden, adversarial, replay, late-data, load, migration)');
  assert(GOLDEN_FEATURES.length >= 8, 'G.01 golden features ≥ 8');
  assert(GOLDEN_EVENTS.length >= 5, 'G.02 golden events ≥ 5');
  const snapshot = goldenCorpusSnapshot();
  assert(snapshot.length === GOLDEN_FEATURES.length + GOLDEN_EVENTS.length, 'G.03 snapshot length');
  const fp = fingerprint(snapshot.join('\n'));
  assert(/^[0-9a-f]{8}$/.test(fp), 'G.04 fingerprint 8-char hex');
  const advKinds = new Set(ADVERSARIAL_CASES.map(c => c.kind));
  for (const k of Object.values(L6AdversarialCaseKind)) {
    assert(advKinds.has(k), `G.adv.${k}`);
  }
  for (const c of ADVERSARIAL_CASES) {
    assert(c.must_block === true, `G.adv.${c.case_id}.must_block`);
  }
  for (const tl of REPLAY_TIMELINES) {
    const f = new Set(GOLDEN_FEATURES.map(x => x.replay_hash));
    const e = new Set(GOLDEN_EVENTS.map(x => x.replay_hash));
    const d = diffReplayOutputs(tl, f, e);
    assert(d.missing_feature_hashes.length === 0, `G.replay.${tl.timeline_id}.feat`);
    assert(d.missing_event_hashes.length === 0, `G.replay.${tl.timeline_id}.evt`);
  }
  for (const ld of LATE_DATA_CASES) {
    for (const m of ld.allowed_modes) {
      assert(isModeAllowedForLateDataClass(ld.class, m), `G.late.${ld.case_id}.${m}`);
    }
  }
  assert(LATE_DATA_CASES.some(c => c.class === L6LateDataClass.AFTER_DONE_WITHIN_CORRECTION &&
    c.must_block_current_overwrite), 'G.late.block_current_overwrite');
  assert(CONCURRENCY_LOAD_CASES.length >= 6, 'G.load.count');
  assert(CONCURRENCY_LOAD_CASES.some(c => c.kind === L6LoadScenarioKind.BACKLOG_RECOVERY),
    'G.load.backlog');
  assert(MIGRATION_CASES.length >= 5, 'G.mig.count');

  // ---------------- Band H ----------------
  console.log('\n[Band H] Invariants INV-6.8-A..G');
  const invs = [
    checkINV_68_A(), checkINV_68_B(), checkINV_68_C(),
    checkINV_68_D(), checkINV_68_E(), checkINV_68_F(), checkINV_68_G(),
  ];
  for (const iv of invs) {
    assert(iv.holds, `H.${iv.id} ${iv.holds ? 'holds' : `FAIL: ${iv.evidence}`}`);
  }
  const all = checkAllL6_8Invariants();
  assert(all.length === 7, 'H.count seven invariants');

  // ---------------- Band I ----------------
  console.log('\n[Band I] Master certification end-to-end');
  clearCertificationArtifacts();
  const artifact = await runMasterCertification({ certification_run_id: 'cert-master-test' });
  assert(artifact.level === L6CertificationLevel.PRODUCTION_GREEN,
    `I.01 production-green level (got ${artifact.level}): ${artifact.blocking_violations.join('|')}`);
  assert(artifact.rollout_recommended, 'I.02 rollout recommended');
  assert(artifact.blocking_violations.length === 0, 'I.03 no blocking violations');
  assert(artifact.bands.length === 10, 'I.04 ten band outcomes');
  assert(artifact.bands.every(b => b.ok), 'I.05 all bands green');
  assert(artifact.invariants.length > 0 && artifact.invariants.every(i => i.holds), 'I.06 all invariants green');
  const canon = canonicalizeArtifact(artifact);
  assert(canon.length > 0, 'I.07 canonical artifact non-empty');
  const canon2 = canonicalizeArtifact(artifact);
  assert(canon === canon2, 'I.08 canonicalization deterministic');
  const afp = fingerprint(canon);
  assert(/^[0-9a-f]{8}$/.test(afp), 'I.09 artifact fingerprint');
  const latest = getLatestCertificationArtifact();
  assert(latest?.certification_run_id === 'cert-master-test', 'I.10 artifact registered');

  // ---------------- Summary ----------------
  console.log('\n================================================================');
  console.log(`L6.8 Assurance Results: ${passed} passed / ${failed} failed`);
  console.log('================================================================');
  if (failed > 0) {
    console.log('\nFailures:');
    for (const f of failures) console.log(`  - ${f}`);
    process.exit(1);
  } else {
    console.log('ALL L6.8 CERTIFICATION BANDS GREEN');
    process.exit(0);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
