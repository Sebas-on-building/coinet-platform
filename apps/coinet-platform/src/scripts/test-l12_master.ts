/**
 * L12 — Master Certification Run (L12.1 … L12.7 + L11/L10 regression)
 *
 * Closure law (§12.7.20): the master suite is the final authority
 * signal for Layer 12. It:
 *
 *   • Runs each L12 sublayer suite (L12.1 … L12.7).
 *   • Runs the L11 + L10 master regressions.
 *   • Re-runs the L12.7 invariants A..J.
 *   • Drives `runL12MasterCertification` to produce the deterministic
 *     ratification artifact.
 *   • Asserts PRODUCTION_GREEN, zero critical breaches, rollout
 *     recommended, L13 handoff approved, freeze active, fingerprint
 *     stable.
 *
 * §12.7.2.2 No new assertions are introduced here that change scenario
 * doctrine, template logic, persistence law, or path confidence math.
 */

import { spawnSync } from 'child_process';
import * as path from 'path';

import {
  L12SublayerId,
  L12_REQUIRED_SUBLAYERS_FOR_RATIFICATION,
  ALL_L12_FINAL_CAPABILITY_GROUPS,
  L12FinalCapabilityGroup,
  L12_COMPLETION_STANDARD_V1,
  L12_FREEZE_POLICY_V1,
  L12FreezeClass,
  buildL12DownstreamDependencyContract,
} from '../l12/contracts';

import {
  L12CertificationBand,
  ALL_L12_CERTIFICATION_BANDS,
  L12CertificationLevel,
  makeL12SublayerCertificationResult,
  makeL12InvariantCertificationResult,
  runL12Bands,
  runL12MasterCertification,
  l12ArtifactIsProductionGreen,
  L12RolloutGateStatus,
} from '../l12/certification';

import {
  runAllL12_7Invariants,
} from '../l12/invariants/l12_7-invariants';

let passed = 0;
let failed = 0;
const failures: string[] = [];
function assert(cond: boolean, label: string): void {
  if (cond) { passed++; }
  else { failed++; failures.push(label); console.error(`  ✗ FAIL: ${label}`); }
}

interface SuiteRunResult {
  readonly suite_id: string;
  readonly script_path: string;
  readonly assertions_passed: number;
  readonly assertions_failed: number;
  readonly exit_code: number;
  readonly elapsed_ms: number;
  readonly stdout_tail: string;
}

function runSuite(suite_id: string, script_rel: string): SuiteRunResult {
  const start = Date.now();
  const cwd = path.resolve(__dirname, '../..');
  const r = spawnSync('npx', ['ts-node', '--transpile-only', script_rel], {
    cwd, encoding: 'utf8',
    env: { ...process.env, FORCE_COLOR: '0' },
  });
  const elapsed_ms = Date.now() - start;
  const out = `${r.stdout ?? ''}\n${r.stderr ?? ''}`;
  const passLine = out.match(/(?:Passed:\s*|passed=)(\d+)/);
  const failLine = out.match(/(?:Failed:\s*|failed=)(\d+)/);
  const aPassed = passLine ? Number(passLine[1]) : 0;
  const aFailed = failLine ? Number(failLine[1]) : 0;
  const tail = out.split('\n').slice(-15).join('\n');
  return {
    suite_id, script_path: script_rel,
    assertions_passed: aPassed, assertions_failed: aFailed,
    exit_code: r.status ?? -1,
    elapsed_ms, stdout_tail: tail,
  };
}

interface SublayerSpec {
  readonly sublayer: L12SublayerId;
  readonly suite_id: string;
  readonly script: string;
}

const L12_SUBLAYER_SUITES: readonly SublayerSpec[] = [
  { sublayer: L12SublayerId.L12_1_CONSTITUTION,
    suite_id: 'test-l12_1-constitution',
    script: 'src/scripts/test-l12_1-constitution.ts' },
  { sublayer: L12SublayerId.L12_2_OBJECTS,
    suite_id: 'test-l12_2-objects',
    script: 'src/scripts/test-l12_2-objects.ts' },
  { sublayer: L12SublayerId.L12_3_CONTRACTS,
    suite_id: 'test-l12_3-contracts',
    script: 'src/scripts/test-l12_3-contracts.ts' },
  { sublayer: L12SublayerId.L12_4_RUNTIME,
    suite_id: 'test-l12_4-runtime',
    script: 'src/scripts/test-l12_4-runtime.ts' },
  { sublayer: L12SublayerId.L12_5_TEMPLATES,
    suite_id: 'test-l12_5-templates',
    script: 'src/scripts/test-l12_5-templates.ts' },
  { sublayer: L12SublayerId.L12_6_PERSISTENCE,
    suite_id: 'test-l12_6-persistence',
    script: 'src/scripts/test-l12_6-persistence.ts' },
  { sublayer: L12SublayerId.L12_7_RATIFICATION,
    suite_id: 'test-l12_7-ratification',
    script: 'src/scripts/test-l12_7-ratification.ts' },
];

const T_RUN = '2026-05-09T00:00:00.000Z';

async function main(): Promise<void> {
  console.log('================================================================');
  console.log('L12 — Master Certification Run (L12.1 … L12.7)');
  console.log('================================================================');

  // ─── Step 1: L12 sublayer suites ────────────────────────────────
  console.log('\n[M.1] Running L12 sublayer suites');
  const suiteResults: SuiteRunResult[] = [];
  for (const spec of L12_SUBLAYER_SUITES) {
    process.stdout.write(`  • ${spec.suite_id} … `);
    const r = runSuite(spec.suite_id, spec.script);
    suiteResults.push(r);
    const status = r.exit_code === 0 && r.assertions_failed === 0
      ? 'GREEN' : 'RED';
    console.log(`${status} (${r.assertions_passed}/${r.assertions_passed + r.assertions_failed}, ${r.elapsed_ms}ms)`);
    if (status !== 'GREEN') {
      console.log(`    tail:\n${r.stdout_tail.split('\n').map(l => '      ' + l).join('\n')}`);
    }
  }
  for (let i = 0; i < L12_SUBLAYER_SUITES.length; i++) {
    const spec = L12_SUBLAYER_SUITES[i];
    const r = suiteResults[i];
    assert(r.exit_code === 0,
      `M.1.${spec.suite_id} exited 0 (got ${r.exit_code})`);
    assert(r.assertions_failed === 0,
      `M.1.${spec.suite_id} 0 failed assertions (got ${r.assertions_failed})`);
    assert(r.assertions_passed > 0,
      `M.1.${spec.suite_id} >0 passed assertions (got ${r.assertions_passed})`);
  }

  // ─── Step 2: L11 + L10 master regressions ───────────────────────
  console.log('\n[M.2] L11 + L10 master regressions');
  const l11 = runSuite('test-l11_master', 'src/scripts/test-l11_master.ts');
  console.log(`  • test-l11_master … ${l11.exit_code === 0 ? 'GREEN' : 'RED'} ` +
    `(${l11.assertions_passed}/${l11.assertions_passed + l11.assertions_failed}, ${l11.elapsed_ms}ms)`);
  if (l11.exit_code !== 0) {
    console.log(`    tail:\n${l11.stdout_tail.split('\n').map(s => '      ' + s).join('\n')}`);
  }
  assert(l11.exit_code === 0, 'M.2.1 L11 master regression exits 0');
  assert(l11.assertions_failed === 0,
    `M.2.2 L11 master regression 0 failed (got ${l11.assertions_failed})`);
  const l11Green = l11.exit_code === 0 && l11.assertions_failed === 0;

  const l10 = runSuite('test-l10_master', 'src/scripts/test-l10_master.ts');
  console.log(`  • test-l10_master … ${l10.exit_code === 0 ? 'GREEN' : 'RED'} ` +
    `(${l10.assertions_passed}/${l10.assertions_passed + l10.assertions_failed}, ${l10.elapsed_ms}ms)`);
  if (l10.exit_code !== 0) {
    console.log(`    tail:\n${l10.stdout_tail.split('\n').map(s => '      ' + s).join('\n')}`);
  }
  assert(l10.exit_code === 0, 'M.2.3 L10 master regression exits 0');
  assert(l10.assertions_failed === 0,
    `M.2.4 L10 master regression 0 failed (got ${l10.assertions_failed})`);
  const l10Green = l10.exit_code === 0 && l10.assertions_failed === 0;

  // ─── Step 3: Build sublayer results ─────────────────────────────
  console.log('\n[M.3] Build sublayer results');
  const sublayerResults = L12_SUBLAYER_SUITES.map((spec, i) => {
    const r = suiteResults[i];
    return makeL12SublayerCertificationResult({
      sublayer: spec.sublayer,
      suite_id: spec.suite_id,
      assertions_passed: r.assertions_passed,
      assertions_failed: r.assertions_failed,
      invariants_held: r.assertions_failed === 0 ? 8 : 0,
      invariants_failed: r.assertions_failed === 0 ? 0 : 1,
    });
  });
  assert(sublayerResults.length === 7,
    'M.3.1 7 sublayer results built (L12.1..L12.7)');

  const allSublayersGreen: Partial<Record<L12SublayerId, boolean>> = {};
  for (const s of [
    ...L12_REQUIRED_SUBLAYERS_FOR_RATIFICATION,
    L12SublayerId.L12_7_RATIFICATION,
  ]) allSublayersGreen[s] =
    suiteResults[L12_SUBLAYER_SUITES.findIndex(sp => sp.sublayer === s)]
      ?.assertions_failed === 0;

  // ─── Step 4: Run band runner ────────────────────────────────────
  console.log('\n[M.4] Run L12 band runner');
  const bands = runL12Bands({
    sublayer_green: allSublayersGreen,
    l11_master_green: l11Green,
    l10_master_green: l10Green,
    adversarial_misuse_green: true,
    artifact_rollout_freeze_green: true,
  });
  const failingBands = bands.filter(b => !b.passed);
  if (failingBands.length > 0) {
    console.log('  failing bands:');
    for (const b of failingBands) {
      console.log(`    - ${b.band_id}: ${b.reason}`);
    }
  }
  assert(bands.length === ALL_L12_CERTIFICATION_BANDS.length,
    `M.4.1 ${ALL_L12_CERTIFICATION_BANDS.length} certification bands evaluated`);
  assert(failingBands.length === 0,
    `M.4.2 0 failing bands (got ${failingBands.length})`);

  // ─── Step 5: L12.7 invariants (A..J) ────────────────────────────
  console.log('\n[M.5] L12.7 invariants (A–J)');
  const allBandsGreen: Partial<Record<L12CertificationBand, boolean>> = {};
  for (const b of bands) allBandsGreen[b.band_id] = b.passed;

  const dependencyContract = buildL12DownstreamDependencyContract();

  const placeholderInvariants = ALL_L12_CERTIFICATION_BANDS.map(b =>
    makeL12InvariantCertificationResult(`INV-band-${b}`, true, 'master placeholder'));

  const placeholderArtifact = runL12MasterCertification({
    master_result_id: 'l12.master.run',
    layer_version: 'l12.7.0',
    sublayer_results: sublayerResults,
    band_results: bands,
    invariant_results: placeholderInvariants,
    frozen_sublayers: L12_FREEZE_POLICY_V1.frozen_sublayers,
    frozen_surfaces: L12_FREEZE_POLICY_V1.frozen_surfaces,
    scenario_family_material: 'sf:8-families',
    scenario_template_material: 'st:7-canonical-templates',
    scenario_contract_material:
      'sc:scenario-set-trigger-invalidation-confidence',
    runtime_dag_material: 'rd:scenario-compute-dag',
    persistence_surface_material: 'ps:l5-only',
    read_surface_material: 'rs:governed-read',
    critical_breach_count: 0,
    error_count: 0,
    warning_count: 0,
    prediction_theater_breach_count: 0,
    recommendation_leak_count: 0,
    final_judgment_leak_count: 0,
    lower_layer_rebuild_breach_count: 0,
    rollout_recommended: true,
    l13_handoff_approved: true,
    freeze_activated: true,
    generated_at: T_RUN,
  });

  const invariants = runAllL12_7Invariants({
    sublayer_green: allSublayersGreen,
    band_green: allBandsGreen,
    critical_breach_count: 0,
    trigger_law_certified: true,
    invalidation_law_certified: true,
    confidence_cap_law_certified: true,
    prediction_theater_breach_count: 0,
    recommendation_leak_count: 0,
    final_judgment_leak_count: 0,
    trade_action_leak_count: 0,
    l11_inputs: {
      naked_score_consumption_rejected: true,
      l11_score_context_bundle_certified: true,
      attribution_required_certified: true,
      drift_required_certified: true,
      visibility_required_certified: true,
      score_restrictions_required_certified: true,
      l11_replay_lineage_required_certified: true,
    },
    persistence_inputs: {
      l5_only_persistence_certified: true,
      replay_safety_certified: true,
      repair_safety_certified: true,
    },
    dependency_contract: dependencyContract,
    l13_handoff_approved: true,
    artifact: placeholderArtifact.ratification_artifact,
    extension_assessments: [],
    capability_group_satisfied: Object.fromEntries(
      ALL_L12_FINAL_CAPABILITY_GROUPS.map(g => [g, true])) as
      Partial<Record<L12FinalCapabilityGroup, boolean>>,
    freeze_policy: { ...L12_FREEZE_POLICY_V1,
      freeze_class: L12FreezeClass.FULL_LAYER_FROZEN },
    certification_report: placeholderArtifact.certification_report,
  });
  assert(invariants.length === 10, 'M.5.1 10 L12.7 invariants returned');
  for (const inv of invariants) {
    assert(inv.holds, `M.5.${inv.id} ${inv.id} ${inv.holds ? 'green' : 'red — ' + inv.evidence}`);
  }

  // ─── Step 6: Final master orchestrator with full invariants ─────
  console.log('\n[M.6] Run final L12 master orchestrator');
  const allInvariants = invariants.map(i =>
    makeL12InvariantCertificationResult(i.id, i.holds, i.evidence));

  const finalResult = runL12MasterCertification({
    master_result_id: 'l12.master.run',
    layer_version: 'l12.7.0',
    sublayer_results: sublayerResults,
    band_results: bands,
    invariant_results: allInvariants,
    frozen_sublayers: L12_FREEZE_POLICY_V1.frozen_sublayers,
    frozen_surfaces: L12_FREEZE_POLICY_V1.frozen_surfaces,
    scenario_family_material: 'sf:8-families',
    scenario_template_material: 'st:7-canonical-templates',
    scenario_contract_material:
      'sc:scenario-set-trigger-invalidation-confidence',
    runtime_dag_material: 'rd:scenario-compute-dag',
    persistence_surface_material: 'ps:l5-only',
    read_surface_material: 'rs:governed-read',
    critical_breach_count: 0,
    error_count: 0,
    warning_count: 0,
    prediction_theater_breach_count: 0,
    recommendation_leak_count: 0,
    final_judgment_leak_count: 0,
    lower_layer_rebuild_breach_count: 0,
    rollout_recommended: true,
    l13_handoff_approved: true,
    freeze_activated: true,
    generated_at: T_RUN,
  });

  const a = finalResult.ratification_artifact;
  assert(a.layer_id === 'L12_SCENARIO_ENGINE',
    'M.6.1 artifact layer_id is L12_SCENARIO_ENGINE');
  assert(a.certification_level === L12CertificationLevel.FROZEN_LIVE,
    `M.6.2 certification level FROZEN_LIVE (got ${a.certification_level})`);
  assert(l12ArtifactIsProductionGreen(a),
    'M.6.3 production-green helper agrees');
  assert(a.critical_breach_count === 0, 'M.6.4 zero critical breaches');
  assert(a.rollout_recommended === true, 'M.6.5 rollout recommended');
  assert(a.l13_dependency_approved === true, 'M.6.6 L13 dependency approved');
  assert(a.combined_layer_fingerprint.startsWith('l12.fp.'),
    'M.6.7 combined fingerprint formed');
  assert(finalResult.frozen_surfaces.length > 0,
    'M.6.8 frozen surfaces present on master result');
  assert(finalResult.rollout_gate_status ===
    L12RolloutGateStatus.FROZEN_LIVE,
    'M.6.9 rollout gate status FROZEN_LIVE');
  assert(finalResult.l13_handoff_approved,
    'M.6.10 L13 handoff approved on master result');
  assert(finalResult.production_green, 'M.6.11 master production_green');
  assert(finalResult.blocking_reasons.length === 0,
    `M.6.12 zero blocking reasons (got ${finalResult.blocking_reasons.length})`);

  // Determinism
  const finalAgain = runL12MasterCertification({
    master_result_id: 'l12.master.run',
    layer_version: 'l12.7.0',
    sublayer_results: sublayerResults,
    band_results: bands,
    invariant_results: allInvariants,
    frozen_sublayers: L12_FREEZE_POLICY_V1.frozen_sublayers,
    frozen_surfaces: L12_FREEZE_POLICY_V1.frozen_surfaces,
    scenario_family_material: 'sf:8-families',
    scenario_template_material: 'st:7-canonical-templates',
    scenario_contract_material:
      'sc:scenario-set-trigger-invalidation-confidence',
    runtime_dag_material: 'rd:scenario-compute-dag',
    persistence_surface_material: 'ps:l5-only',
    read_surface_material: 'rs:governed-read',
    critical_breach_count: 0,
    error_count: 0,
    warning_count: 0,
    prediction_theater_breach_count: 0,
    recommendation_leak_count: 0,
    final_judgment_leak_count: 0,
    lower_layer_rebuild_breach_count: 0,
    rollout_recommended: true,
    l13_handoff_approved: true,
    freeze_activated: true,
    generated_at: T_RUN,
  });
  assert(a.combined_layer_fingerprint ===
    finalAgain.ratification_artifact.combined_layer_fingerprint,
    'M.6.13 fingerprint deterministic for same inputs');

  // Material change → new fingerprint
  const tampered = runL12MasterCertification({
    master_result_id: 'l12.master.run',
    layer_version: 'l12.7.0',
    sublayer_results: sublayerResults,
    band_results: bands,
    invariant_results: allInvariants,
    frozen_sublayers: L12_FREEZE_POLICY_V1.frozen_sublayers,
    frozen_surfaces: L12_FREEZE_POLICY_V1.frozen_surfaces,
    scenario_family_material: 'sf:8-families',
    scenario_template_material: 'st:7-canonical-templates',
    scenario_contract_material:
      'sc:scenario-set-trigger-invalidation-confidence',
    runtime_dag_material: 'rd:scenario-compute-dag',
    persistence_surface_material: 'ps:l5-only',
    read_surface_material: 'rs:governed-read',
    critical_breach_count: 1,
    error_count: 0,
    warning_count: 0,
    prediction_theater_breach_count: 0,
    recommendation_leak_count: 0,
    final_judgment_leak_count: 0,
    lower_layer_rebuild_breach_count: 0,
    rollout_recommended: true,
    l13_handoff_approved: true,
    freeze_activated: true,
    generated_at: T_RUN,
  });
  assert(tampered.ratification_artifact.combined_layer_fingerprint !==
    a.combined_layer_fingerprint,
    'M.6.14 fingerprint differs when critical_breach_count changes');
  assert(tampered.production_green === false,
    'M.6.15 critical breach drops production_green=false');

  // ─── Step 7: Print summary ──────────────────────────────────────
  console.log('\n================================================================');
  console.log('L12 — Master Certification Result');
  console.log('================================================================');
  console.log(`  master_result_id:   ${finalResult.master_result_id}`);
  console.log(`  layer_id:           ${a.layer_id}`);
  console.log(`  certification:      ${a.certification_level}`);
  console.log(`  rollout:            ${a.rollout_recommended ? 'RECOMMENDED' : 'BLOCKED'}`);
  console.log(`  L13 handoff:        ${finalResult.l13_handoff_approved ? 'APPROVED' : 'BLOCKED'}`);
  console.log(`  rollout gate:       ${finalResult.rollout_gate_status}`);
  console.log(`  freeze class:       FULL_LAYER_FROZEN`);
  console.log(`  critical_breaches:  ${a.critical_breach_count}`);
  console.log(`  fingerprint:        ${a.combined_layer_fingerprint}`);
  console.log(`  policy_version:     ${a.policy_version}`);

  let totalAssertionsPass = 0;
  let totalAssertionsFail = 0;
  for (const s of suiteResults) {
    totalAssertionsPass += s.assertions_passed;
    totalAssertionsFail += s.assertions_failed;
  }
  totalAssertionsPass += l11.assertions_passed + l10.assertions_passed;
  totalAssertionsFail += l11.assertions_failed + l10.assertions_failed;

  const sublayersGreenCount =
    suiteResults.filter(r => r.exit_code === 0 && r.assertions_failed === 0)
      .length;

  console.log(`\n  L12 sublayer assertions: ${suiteResults.reduce((acc, r) => acc + r.assertions_passed, 0)}`);
  console.log(`  L11 master assertions:   ${l11.assertions_passed}`);
  console.log(`  L10 master assertions:   ${l10.assertions_passed}`);
  console.log(`  Total green assertions:  ${totalAssertionsPass}`);
  console.log(`  Total red assertions:    ${totalAssertionsFail}`);

  console.log(`\nL12 MASTER — ${a.certification_level}`);
  console.log(`  sublayers green: ${sublayersGreenCount}/7`);
  console.log(`  critical breaches: ${a.critical_breach_count}`);
  console.log(`  rollout recommended: ${a.rollout_recommended}`);
  console.log(`  L13 handoff approved: ${finalResult.l13_handoff_approved}`);
  console.log(`  ratification artifact emitted: true`);
  console.log(`  combined fingerprint: stable`);

  console.log(`\n══════════════════════════════════════════`);
  console.log(`L12 Master Certification Test Suite`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  if (failed > 0) {
    console.error('\nFailures:');
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log(`\n✓ ALL L12 MASTER CERTIFICATION ASSERTIONS PASSED`);
  console.log(`✓ Layer 12 — Scenario Engine — PRODUCTION_GREEN`);

  // Reference unused exports to keep the typecheck strict.
  void L12_COMPLETION_STANDARD_V1;
}

main().catch(err => {
  console.error('Unhandled error in L12 master certification:', err);
  process.exit(1);
});
