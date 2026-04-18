/**
 * L7.8 — Assurance, Certification, and Rollout-Control Test Suite
 *
 * Certification Test Suite — 9 Bands:
 *   A — Topology and artifact surface (modules, registries, file counts)
 *   B — Certification bands and levels (band enums + level derivation)
 *   C — Rollout phases and gates (phase graph, advance law, rollout gate)
 *   D — Rollback policy and failure playbooks (lineage-preserving rollback)
 *   E — Migration and compatibility gate (surface + family migrations,
 *       contradiction ontology change forcing)
 *   F — Operational metrics, SLOs, alerts, observability report
 *   G — Fixtures (golden, adversarial, replay, concurrency, rollout)
 *   H — Invariants INV-7.8-A through INV-7.8-G
 *   I — Master certification run end-to-end (artifact + rollout
 *       recommendation)
 */

import {
  L7CertificationBand,
  ALL_L7_CERTIFICATION_BANDS,
  L7CertificationLevel,
  L7_CONSTITUTIONAL_BANDS,
  L7_RUNTIME_BANDS,
  L7_PRODUCTION_BANDS,
  deriveL7CertificationLevel,
  isBandConstitutionalL7,
  isBandRuntimeL7,
  isBandProductionL7,
  levelIsAtLeast,
  buildL7CertificationArtifact,
  canonicalizeL7Artifact,
  fingerprintL7,
  registerL7CertificationArtifact,
  getLatestL7CertificationArtifact,
  clearL7CertificationArtifacts,
  createL7Recorder,
  runL7Band,
  runL7Bands,
  runL7MasterCertification,
} from '../l7/certification';

import {
  L7_GOLDEN_VALIDATION_CASES,
  goldenCorpusSnapshotL7,
  L7_ADVERSARIAL_CASES,
  L7AdversarialCaseKind,
  ALL_L7_ADVERSARIAL_KINDS,
  L7_REPLAY_TIMELINES,
  L7ReplayMode,
  diffL7ReplayOutputs,
  replayTimelineCoversMode,
  L7_LOAD_SCENARIOS,
  L7LoadScenarioKind,
  ALL_L7_LOAD_SCENARIO_KINDS,
  L7_FAMILY_ROLLOUT_SCENARIOS,
  L7FamilyRolloutExpectation,
} from '../l7/fixtures';

import {
  L7MetricId,
  L7MetricCategory,
  ALL_L7_METRIC_IDS,
  ALL_L7_METRIC_CATEGORIES,
  L7_METRIC_REGISTRY,
  l7MetricsByCategory,
  getL7MetricSpec,
  L7_SLO_SPECS,
  L7SloSeverity,
  evaluateL7Slo,
  hasL7CriticalBreach,
  countL7CriticalBreaches,
  L7_ALERT_RULES,
  L7OperationalSeverity,
  generateL7ObservabilityReport,
  isL7ObservabilityPackageComplete,
  l7ZeroToleranceSlos,
  l7StrictSlos,
} from '../l7/ops';

import {
  L7RolloutPhase,
  ALL_L7_ROLLOUT_PHASES,
  L7_ROLLOUT_PHASE_SPECS,
  l7PrerequisitesSatisfied,
  canAdvanceL7Phase,
  L7ProductionEnablementStep,
  L7_PRODUCTION_ENABLEMENT_ORDER,
  evaluateL7RolloutGate,
  L7RollbackMode,
  ALL_L7_ROLLBACK_MODES,
  L7RollbackPlan,
  executeL7Rollback,
  listL7RollbackRecords,
  clearL7RollbackLog,
  L7FailureClass,
  ALL_L7_FAILURE_CLASSES,
  L7_FAILURE_PLAYBOOKS,
  L7FamilyEnablementState,
  L7_FAMILY_ENABLEMENT_ORDER,
  isL7FamilyTransitionLegal,
  decideL7FamilyEnablement,
} from '../l7/rollout';

import {
  L7MigrationClass,
  ALL_L7_MIGRATION_CLASSES,
  L7MigrationSurface,
  ALL_L7_MIGRATION_SURFACES,
  L7MigrationAttempt,
  classifyL7Migration,
  L7FamilyMigrationAttempt,
  classifyL7FamilyMigration,
  gateL7Migration,
  gateL7FamilyMigration,
  recordL7MigrationGateDecision,
  listL7MigrationGateDecisions,
  clearL7MigrationGateLog,
} from '../l7/migration';

import {
  checkINV_78_A,
  checkINV_78_B,
  checkINV_78_C,
  checkINV_78_D,
  checkINV_78_E,
  checkINV_78_F,
  checkINV_78_G,
  checkAllL7_8Invariants,
} from '../l7/invariants/l7_8-invariants';

import { L7ValidationFamilyId } from '../l7/contracts/validation-family-definition';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(cond: boolean, label: string): void {
  if (cond) {
    passed++;
  } else {
    failed++;
    failures.push(label);
    console.log(`  ✗ ${label}`);
  }
}

async function main(): Promise<void> {
  console.log('================================================================');
  console.log('L7.8 — Assurance, Certification, Rollout Control — Certification');
  console.log('================================================================');

  // ---------------- Band A — topology / artifact surface ----------------
  console.log('\n[Band A] Topology and artifact surface');
  assert(ALL_L7_CERTIFICATION_BANDS.length === 10, 'A.01 ten certification bands');
  assert(ALL_L7_METRIC_IDS.length >= 14, `A.02 metric registry ≥ 14 (got ${ALL_L7_METRIC_IDS.length})`);
  assert(ALL_L7_METRIC_CATEGORIES.length === 4, 'A.03 four metric categories');
  assert(L7_SLO_SPECS.length >= 10, `A.04 SLO specs ≥ 10 (got ${L7_SLO_SPECS.length})`);
  assert(L7_ALERT_RULES.length >= 6, `A.05 alert rules ≥ 6 (got ${L7_ALERT_RULES.length})`);
  assert(ALL_L7_ROLLOUT_PHASES.length === 6, 'A.06 six build phases (A–F)');
  assert(L7_PRODUCTION_ENABLEMENT_ORDER.length === 9, 'A.07 nine production-enablement steps');
  assert(ALL_L7_ROLLBACK_MODES.length === 7, 'A.08 seven rollback modes');
  assert(ALL_L7_MIGRATION_CLASSES.length === 6, 'A.09 six migration classes');
  assert(ALL_L7_MIGRATION_SURFACES.length >= 13, `A.10 ≥13 migration surfaces (got ${ALL_L7_MIGRATION_SURFACES.length})`);
  assert(L7_FAILURE_PLAYBOOKS.length >= 6, `A.11 failure playbook registry ≥ 6 (got ${L7_FAILURE_PLAYBOOKS.length})`);
  assert(ALL_L7_FAILURE_CLASSES.length === L7_FAILURE_PLAYBOOKS.length ||
         ALL_L7_FAILURE_CLASSES.length >= L7_FAILURE_PLAYBOOKS.length,
         'A.12 failure classes cover registered playbooks');
  assert(L7_FAMILY_ENABLEMENT_ORDER.length === 7, 'A.13 seven validation families in enablement order');

  // ---------------- Band B — bands + level derivation ----------------
  console.log('\n[Band B] Certification bands and level derivation');
  assert(L7_CONSTITUTIONAL_BANDS.length === 3, 'B.01 constitutional bands A–C');
  assert(L7_RUNTIME_BANDS.length === 7, 'B.02 runtime bands A–G');
  assert(L7_PRODUCTION_BANDS.length === 10, 'B.03 production bands A–J');

  const constitutionalSet = new Set<L7CertificationBand>(L7_CONSTITUTIONAL_BANDS);
  assert(deriveL7CertificationLevel(constitutionalSet) === L7CertificationLevel.CONSTITUTIONAL_GREEN,
    'B.04 constitutional-green derived');
  const runtimeSet = new Set<L7CertificationBand>(L7_RUNTIME_BANDS);
  assert(deriveL7CertificationLevel(runtimeSet) === L7CertificationLevel.RUNTIME_GREEN,
    'B.05 runtime-green derived');
  const productionSet = new Set<L7CertificationBand>(L7_PRODUCTION_BANDS);
  assert(deriveL7CertificationLevel(productionSet) === L7CertificationLevel.PRODUCTION_GREEN,
    'B.06 production-green derived');
  assert(deriveL7CertificationLevel(new Set()) === L7CertificationLevel.FAILED,
    'B.07 empty set → FAILED');
  assert(isBandConstitutionalL7(L7CertificationBand.A_CONTRACT_AND_LEGALITY),
    'B.08 band A is constitutional');
  assert(isBandRuntimeL7(L7CertificationBand.G_LOAD_AND_CONCURRENCY),
    'B.09 band G is runtime');
  assert(isBandProductionL7(L7CertificationBand.J_CROSS_LAYER_DEPENDENCY_INTEGRITY),
    'B.10 band J is production');
  assert(levelIsAtLeast(L7CertificationLevel.PRODUCTION_GREEN, L7CertificationLevel.RUNTIME_GREEN),
    'B.11 level ordering monotonic');
  assert(!levelIsAtLeast(L7CertificationLevel.CONSTITUTIONAL_GREEN, L7CertificationLevel.RUNTIME_GREEN),
    'B.12 constitutional < runtime');

  const rec = createL7Recorder();
  rec.assert(true, 'ok');
  rec.assert(false, 'nope');
  assert(rec.passed === 1 && rec.failed === 1, 'B.13 recorder counts');

  const bo = await runL7Band({
    band: L7CertificationBand.A_CONTRACT_AND_LEGALITY,
    run: r => r.assert(true, 'x'),
  });
  assert(bo.ok && bo.passed === 1, 'B.14 band runner single success');
  const boFail = await runL7Band({
    band: L7CertificationBand.B_CONTRADICTION_DETECTION,
    run: r => r.assert(false, 'fail'),
  });
  assert(!boFail.ok && boFail.blocking_violations.length === 1,
    'B.15 band runner failure surfaces violation');

  const multi = await runL7Bands([
    { band: L7CertificationBand.C_VALIDATION_CLASSIFICATION, run: r => r.assert(true, 'ok') },
    { band: L7CertificationBand.D_CONFIDENCE_AND_RESTRICTION, run: r => r.assert(false, 'fail') },
  ]);
  assert(multi.length === 2 && multi[0].ok && !multi[1].ok,
    'B.16 band runner multi outcomes');

  // ---------------- Band C — phases + rollout gate ----------------
  console.log('\n[Band C] Rollout phases and gates');
  for (const p of ALL_L7_ROLLOUT_PHASES) {
    const spec = L7_ROLLOUT_PHASE_SPECS[p];
    assert(spec.deliverables.length > 0, `C.${p}.01 deliverables declared`);
    assert(spec.exit_criteria.length > 0, `C.${p}.02 exit criteria declared`);
    assert(spec.forbidden_shortcuts.length > 0, `C.${p}.03 forbidden shortcuts declared`);
  }
  assert(l7PrerequisitesSatisfied(L7RolloutPhase.A_CERTIFICATION_SUBSTRATE, new Set()),
    'C.04 phase A has no prerequisites');
  assert(!l7PrerequisitesSatisfied(L7RolloutPhase.F_ASSURANCE_INVARIANTS_AND_MASTER, new Set()),
    'C.05 phase F requires prerequisites');
  const adv = canAdvanceL7Phase(
    L7RolloutPhase.F_ASSURANCE_INVARIANTS_AND_MASTER,
    new Set<L7RolloutPhase>(
      L7_ROLLOUT_PHASE_SPECS[L7RolloutPhase.F_ASSURANCE_INVARIANTS_AND_MASTER].prerequisites,
    ),
    { deliverables_complete: true, exit_criteria_met: true,
      certification_bands_green_for_phase: true },
  );
  assert(adv.ok, `C.06 can advance F with prerequisites + attestations (${adv.reason})`);
  const advNoExit = canAdvanceL7Phase(
    L7RolloutPhase.F_ASSURANCE_INVARIANTS_AND_MASTER,
    new Set<L7RolloutPhase>(
      L7_ROLLOUT_PHASE_SPECS[L7RolloutPhase.F_ASSURANCE_INVARIANTS_AND_MASTER].prerequisites,
    ),
    { deliverables_complete: true, exit_criteria_met: false,
      certification_bands_green_for_phase: true },
  );
  assert(!advNoExit.ok, 'C.07 cannot advance F without exit criteria');

  const obs = generateL7ObservabilityReport({});
  const cert = buildL7CertificationArtifact({
    certification_run_id: 'cert-c-gate',
    layer_version_set: { L7: 'v1' },
    bands: Object.values(L7CertificationBand).map(b => ({
      band: b, passed: 1, failed: 0, duration_ms: 1, ok: true, blocking_violations: [],
    })),
    invariants: [{ id: 'self', holds: true, evidence: 'ok' }],
    golden_corpus_hash: 'h',
    replay_integrity_ok: true, load_concurrency_ok: true,
    migration_ok: true, observability_ok: true, rollout_ok: true,
  });
  const gate = evaluateL7RolloutGate({
    target_phase: L7RolloutPhase.F_ASSURANCE_INVARIANTS_AND_MASTER,
    completed_phases: new Set<L7RolloutPhase>(
      L7_ROLLOUT_PHASE_SPECS[L7RolloutPhase.F_ASSURANCE_INVARIANTS_AND_MASTER].prerequisites,
    ),
    attested: { deliverables_complete: true, exit_criteria_met: true,
      certification_bands_green_for_phase: true },
    certification: cert, observability: obs,
    required_level: L7CertificationLevel.PRODUCTION_GREEN,
  });
  assert(gate.advance, `C.08 rollout gate advances with green cert + obs (${gate.reasons.join('|')})`);
  const gateNoCert = evaluateL7RolloutGate({
    target_phase: L7RolloutPhase.F_ASSURANCE_INVARIANTS_AND_MASTER,
    completed_phases: new Set<L7RolloutPhase>(
      L7_ROLLOUT_PHASE_SPECS[L7RolloutPhase.F_ASSURANCE_INVARIANTS_AND_MASTER].prerequisites,
    ),
    attested: { deliverables_complete: true, exit_criteria_met: true,
      certification_bands_green_for_phase: true },
    certification: null, observability: obs,
    required_level: L7CertificationLevel.PRODUCTION_GREEN,
  });
  assert(!gateNoCert.advance, 'C.09 rollout gate blocks without artifact');

  // ---------------- Band D — rollback + failure playbooks ----------------
  console.log('\n[Band D] Rollback policy and failure playbooks');
  clearL7RollbackLog();
  const rb: L7RollbackPlan = {
    plan_id: 'rbk-d1', mode: L7RollbackMode.FAMILY_DISABLE,
    target_kind: 'VALIDATION_FAMILY', target_id: 'MARKET_STRENGTH_VALIDATION',
    preserves_history: true, keeps_lineage_visible: true,
    approval_required: true, notes: 'canary fail',
  };
  const rec1 = executeL7Rollback(rb, 'on-call');
  assert(rec1.lineage_preserved && rec1.historical_rows_touched === 0,
    'D.01 rollback preserves lineage');
  assert(listL7RollbackRecords().length === 1, 'D.02 rollback log records');

  let threw = false;
  try {
    executeL7Rollback({ ...rb, plan_id: 'rbk-d2',
      preserves_history: false as any } as L7RollbackPlan, 'bad');
  } catch {
    threw = true;
  }
  assert(threw, 'D.03 non-preserving rollback rejected');

  for (const pb of L7_FAILURE_PLAYBOOKS) {
    assert(pb.first_actions.length > 0, `D.pb.${pb.playbook_id}.first_actions`);
    assert(pb.verification_steps.length > 0, `D.pb.${pb.playbook_id}.verification`);
    assert(pb.escalation_path.length > 0, `D.pb.${pb.playbook_id}.escalation`);
    assert(pb.runbook_ref.length > 0, `D.pb.${pb.playbook_id}.runbook`);
  }

  assert(!isL7FamilyTransitionLegal(
    L7FamilyEnablementState.DISABLED, L7FamilyEnablementState.PRODUCTION),
    'D.04 disabled→production illegal');
  assert(isL7FamilyTransitionLegal(
    L7FamilyEnablementState.CANARY_CURRENT, L7FamilyEnablementState.PRODUCTION),
    'D.05 canary→production legal');
  const enDecision = decideL7FamilyEnablement(
    L7FamilyEnablementState.CANARY_CURRENT, L7FamilyEnablementState.PRODUCTION,
    {
      family: L7ValidationFamilyId.DERIVATIVES_CONTRADICTION_VALIDATION,
      certification_level: L7CertificationLevel.RUNTIME_GREEN,
      observability_ok: true,
      prerequisite_families_at_least: L7FamilyEnablementState.PRODUCTION,
    });
  assert(enDecision.ok, `D.06 family enablement ok when all green (${enDecision.reason})`);
  const enRed = decideL7FamilyEnablement(
    L7FamilyEnablementState.CANARY_CURRENT, L7FamilyEnablementState.PRODUCTION,
    {
      family: L7ValidationFamilyId.DERIVATIVES_CONTRADICTION_VALIDATION,
      certification_level: L7CertificationLevel.CONSTITUTIONAL_GREEN,
      observability_ok: true,
      prerequisite_families_at_least: L7FamilyEnablementState.PRODUCTION,
    });
  assert(!enRed.ok, 'D.07 family enablement blocked when cert < runtime-green');
  const enCross = decideL7FamilyEnablement(
    L7FamilyEnablementState.CANARY_CURRENT, L7FamilyEnablementState.PRODUCTION,
    {
      family: L7ValidationFamilyId.CROSS_DOMAIN_ALIGNMENT_VALIDATION,
      certification_level: L7CertificationLevel.RUNTIME_GREEN,
      observability_ok: true,
      prerequisite_families_at_least: L7FamilyEnablementState.PRODUCTION,
    });
  assert(!enCross.ok, 'D.08 CROSS_DOMAIN requires PRODUCTION_GREEN');

  // ---------------- Band E — migration gate ----------------
  console.log('\n[Band E] Migration and compatibility gate');
  clearL7MigrationGateLog();
  const additive: L7MigrationAttempt = {
    attempt_id: 'mig.e.additive',
    surface: L7MigrationSurface.CONFIDENCE_FACTOR_MODEL,
    target_id: 'cf.diversification',
    from_version: '1.0.0', to_version: '1.0.1',
    declared_class: L7MigrationClass.ADDITIVE_SAFE,
    historical_meaning_preserved: true, replay_compatible: true,
    widens_downstream_rights: false, contradiction_ontology_change: false,
    notes: 'add factor',
  };
  const addGate = gateL7Migration(additive);
  assert(addGate.gate === 'AUTO' && addGate.allowed, 'E.01 additive-safe migration AUTO-allowed');
  recordL7MigrationGateDecision(addGate);
  assert(listL7MigrationGateDecisions().length === 1, 'E.02 gate decision recorded');

  const structural: L7MigrationAttempt = {
    ...additive, attempt_id: 'mig.e.structural',
    declared_class: L7MigrationClass.BACKWARD_COMPATIBLE_STRUCTURAL,
  };
  assert(gateL7Migration(structural).gate === 'REVIEW',
    'E.03 backward-compatible structural → REVIEW');

  const breaking: L7MigrationAttempt = {
    ...additive, attempt_id: 'mig.e.breaking',
    declared_class: L7MigrationClass.BREAKING_SEMANTIC,
    to_version: '2.0.0',
  };
  assert(gateL7Migration(breaking).gate === 'BLOCK',
    'E.04 breaking semantic → BLOCK');
  const breakingResult = classifyL7Migration(breaking);
  assert(breakingResult.requires_new_version_namespace,
    'E.05 breaking semantic requires new version namespace');

  const prohibited: L7MigrationAttempt = {
    ...additive, attempt_id: 'mig.e.prohibited',
    declared_class: L7MigrationClass.PROHIBITED,
  };
  assert(gateL7Migration(prohibited).gate === 'BLOCK',
    'E.06 prohibited → BLOCK');

  const ontology: L7MigrationAttempt = {
    ...additive, attempt_id: 'mig.e.ontology',
    surface: L7MigrationSurface.CONTRADICTION_FAMILY_ONTOLOGY,
    contradiction_ontology_change: true,
  };
  const ontologyGate = gateL7Migration(ontology);
  assert(ontologyGate.gate === 'BLOCK' && !ontologyGate.allowed,
    'E.07 ontology change as additive → BLOCK (forced breaking)');

  const widensRights: L7MigrationAttempt = {
    ...additive, attempt_id: 'mig.e.widens_rights',
    widens_downstream_rights: true,
  };
  assert(!classifyL7Migration(widensRights).allowed,
    'E.08 additive that widens rights → not allowed');

  const brokenAdditive: L7MigrationAttempt = {
    ...additive, attempt_id: 'mig.e.broken_additive',
    historical_meaning_preserved: false,
  };
  assert(gateL7Migration(brokenAdditive).gate === 'BLOCK',
    'E.09 additive that breaks history → BLOCK');

  const familyMig: L7FamilyMigrationAttempt = {
    attempt_id: 'famMig.1',
    family: L7ValidationFamilyId.MARKET_STRENGTH_VALIDATION,
    from_family_version: '1.0.0', to_family_version: '1.0.1',
    declared_class: L7MigrationClass.ADDITIVE_SAFE,
    surface_migrations: [additive],
    contradiction_coverage_complete: true,
    runtime_path_green: true,
    persistence_path_green: true,
    confidence_path_green: true,
    restriction_path_green: true,
    observability_green: true,
    certification_production_green: true,
    forbidden_shortcut_reintroduced: false,
  };
  assert(gateL7FamilyMigration(familyMig).allowed, 'E.10 family migration allowed when all paths green');
  const badFamily: L7FamilyMigrationAttempt = { ...familyMig, attempt_id: 'famMig.bad',
    forbidden_shortcut_reintroduced: true };
  assert(!gateL7FamilyMigration(badFamily).allowed,
    'E.11 family migration rejects forbidden shortcut reintroduction');
  const noObs: L7FamilyMigrationAttempt = { ...familyMig, attempt_id: 'famMig.noobs',
    observability_green: false };
  assert(!gateL7FamilyMigration(noObs).allowed,
    'E.12 family migration rejects when observability red');

  // ---------------- Band F — operational observability ----------------
  console.log('\n[Band F] Operational metrics, SLOs, alerts, observability');
  for (const id of ALL_L7_METRIC_IDS) {
    const spec = getL7MetricSpec(id);
    assert(spec.description.length > 0, `F.${id}.desc`);
    assert(spec.category !== undefined, `F.${id}.category`);
  }
  for (const cat of ALL_L7_METRIC_CATEGORIES) {
    assert(l7MetricsByCategory(cat).length > 0, `F.cat.${cat}`);
  }
  for (const slo of L7_SLO_SPECS) {
    const ev = evaluateL7Slo(slo, slo.comparator === 'LE' ? slo.target : slo.target);
    assert(!ev.breached, `F.slo.${slo.slo_id}.baseline_ok`);
  }
  const breachSet = L7_SLO_SPECS.map(s =>
    evaluateL7Slo(s, s.comparator === 'LE' ? s.target + 10 : s.target - 10));
  assert(hasL7CriticalBreach(breachSet), 'F.slo.critical_breach_detected');
  assert(countL7CriticalBreaches(breachSet) > 0, 'F.slo.critical_breach_count_positive');

  const zt = l7ZeroToleranceSlos();
  assert(zt.length >= 5, `F.slo.zero_tolerance_population (${zt.length})`);
  assert(l7StrictSlos().length >= 3, 'F.slo.strict_population');

  const obsBreach = generateL7ObservabilityReport({
    [L7MetricId.REPLAY_HASH_MISMATCH_COUNT]: 5,
  });
  assert(obsBreach.critical_breach && !obsBreach.ok,
    'F.obs.replay_mismatch_critical');

  const obsClean = generateL7ObservabilityReport({});
  assert(obsClean.ok, 'F.obs.clean_sample_ok');

  assert(isL7ObservabilityPackageComplete().ok,
    'F.obs.package_complete');
  assert(L7_ALERT_RULES.some(a => a.severity === L7OperationalSeverity.PAGE),
    'F.alerts.page_level_present');

  // ---------------- Band G — fixtures ----------------
  console.log('\n[Band G] Fixtures (golden, adversarial, replay, concurrency, rollout)');
  assert(L7_GOLDEN_VALIDATION_CASES.length >= 7, 'G.01 golden cases ≥ 7');
  const snapshot = goldenCorpusSnapshotL7();
  assert(snapshot.length === L7_GOLDEN_VALIDATION_CASES.length, 'G.02 snapshot length matches corpus');
  const fp = fingerprintL7(snapshot.join('\n'));
  assert(/^[0-9a-f]{8}$/.test(fp), 'G.03 fingerprint 8-char hex');

  const advKinds = new Set(L7_ADVERSARIAL_CASES.map(c => c.kind));
  for (const k of ALL_L7_ADVERSARIAL_KINDS) {
    assert(advKinds.has(k), `G.adv.kind.${k}`);
  }
  for (const c of L7_ADVERSARIAL_CASES) {
    assert(c.must_block === true, `G.adv.${c.case_id}.must_block`);
    assert(c.expected_violation_namespace.startsWith('L7'),
      `G.adv.${c.case_id}.namespace_is_l7`);
  }

  for (const tl of L7_REPLAY_TIMELINES) {
    const observedV = new Set(L7_GOLDEN_VALIDATION_CASES.map(c => c.replay_hash));
    const observedC = new Set<string>();
    for (const other of L7_REPLAY_TIMELINES) {
      for (const h of other.expected_contradiction_hashes) observedC.add(h);
    }
    const d = diffL7ReplayOutputs(tl, observedV, observedC);
    assert(d.missing_validation_hashes.length === 0,
      `G.replay.${tl.timeline_id}.validation`);
    assert(d.missing_contradiction_hashes.length === 0,
      `G.replay.${tl.timeline_id}.contradiction`);
    assert(
      replayTimelineCoversMode(tl, L7ReplayMode.LIVE) &&
      replayTimelineCoversMode(tl, L7ReplayMode.REPLAY),
      `G.replay.${tl.timeline_id}.live_and_replay`);
  }

  assert(L7_LOAD_SCENARIOS.length >= 4, 'G.load.count');
  const loadKinds = new Set(L7_LOAD_SCENARIOS.map(s => s.kind));
  for (const k of ALL_L7_LOAD_SCENARIO_KINDS) {
    assert(loadKinds.has(k), `G.load.kind.${k}`);
  }
  for (const s of L7_LOAD_SCENARIOS) {
    assert(s.expected_max_duplicate_validations === 0,
      `G.load.${s.case_id}.no_duplicates`);
    assert(s.concurrency >= 2, `G.load.${s.case_id}.concurrency_ge_2`);
  }

  assert(L7_FAMILY_ROLLOUT_SCENARIOS.length >= 4, 'G.rollout.count');
  const rolloutExpectations = new Set(L7_FAMILY_ROLLOUT_SCENARIOS.map(s => s.expected));
  assert(rolloutExpectations.has(L7FamilyRolloutExpectation.ALLOWED),
    'G.rollout.has_ALLOWED');
  assert(rolloutExpectations.has(L7FamilyRolloutExpectation.BLOCKED),
    'G.rollout.has_BLOCKED');

  // ---------------- Band H — invariants ----------------
  console.log('\n[Band H] Invariants INV-7.8-A..G');
  const invs = [
    checkINV_78_A(), checkINV_78_B(), checkINV_78_C(),
    checkINV_78_D(), checkINV_78_E(), checkINV_78_F(), checkINV_78_G(),
  ];
  for (const iv of invs) {
    assert(iv.holds, `H.${iv.id} ${iv.holds ? 'holds' : `FAIL: ${iv.evidence}`}`);
  }
  const all = checkAllL7_8Invariants();
  assert(all.length === 7, 'H.count seven invariants');

  // ---------------- Band I — master certification ----------------
  console.log('\n[Band I] Master certification end-to-end');
  clearL7CertificationArtifacts();
  const artifact = await runL7MasterCertification({
    certification_run_id: 'cert-master-l7-test',
  });
  assert(artifact.level === L7CertificationLevel.PRODUCTION_GREEN,
    `I.01 production-green level (got ${artifact.level}): ${artifact.blocking_violations.join('|')}`);
  assert(artifact.rollout_recommended, 'I.02 rollout recommended');
  assert(artifact.blocking_violations.length === 0, 'I.03 no blocking violations');
  assert(artifact.bands.length === 10, 'I.04 ten band outcomes');
  assert(artifact.bands.every(b => b.ok),
    `I.05 all bands green (${artifact.bands.filter(b => !b.ok).map(b => b.band).join(',')})`);
  assert(artifact.invariants.length > 0 && artifact.invariants.every(i => i.holds),
    'I.06 all invariants green');
  const canon = canonicalizeL7Artifact(artifact);
  assert(canon.length > 0, 'I.07 canonical artifact non-empty');
  const canon2 = canonicalizeL7Artifact(artifact);
  assert(canon === canon2, 'I.08 canonicalization deterministic');
  assert(/^[0-9a-f]{8}$/.test(artifact.artifact_fingerprint),
    'I.09 artifact fingerprint is 8-char hex');
  const latest = getLatestL7CertificationArtifact();
  assert(latest?.certification_run_id === 'cert-master-l7-test',
    'I.10 artifact registered');
  assert(artifact.critical_breach_count === 0,
    'I.11 no critical breaches in green run');
  assert(artifact.replay_integrity_ok &&
         artifact.load_concurrency_ok &&
         artifact.migration_ok &&
         artifact.observability_ok &&
         artifact.rollout_ok,
    'I.12 all dependency flags green');

  // ---------------- Summary ----------------
  console.log('\n================================================================');
  console.log(`L7.8 Assurance Results: ${passed} passed / ${failed} failed`);
  console.log('================================================================');
  if (failed > 0) {
    console.log('\nFailures:');
    for (const f of failures) console.log(`  - ${f}`);
    process.exit(1);
  } else {
    console.log('ALL L7.8 CERTIFICATION BANDS GREEN');
    process.exit(0);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
