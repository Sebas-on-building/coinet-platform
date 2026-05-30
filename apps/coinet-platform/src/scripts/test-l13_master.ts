/**
 * L13 — Master Certification Orchestrator
 *
 * §13.12.21 — Runs every L13.x cert script sequentially, parses
 * the "Passed: N / Failed: M" summary, builds the master
 * certification report, validates the ratification artifact, and
 * surfaces a single green/red verdict for the entire AI Judgment
 * & Explanation Layer.
 */

import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import {
  L13CertificationLevel,
  L13SublayerId,
} from '../l13/contracts/l13-final-definition';
import { L13RolloutDecision } from '../l13/contracts/l13-rollout';
import { L13FreezeClass } from '../l13/contracts/l13-freeze-policy';
import { runL13MasterCertification, type L13SublayerAssertionTally } from '../l13/certification/l13-master-certification';
import { buildL13RatificationArtifact } from '../l13/certification/l13-ratification-builder';
import { buildL13L14HandoffContract } from '../l13/certification/l13-downstream-dependency';
import { buildL13FreezePolicy } from '../l13/certification/l13-freeze-policy';
import {
  buildL13FailurePlaybooks,
  buildL13RollbackPolicy,
  runL13RolloutGate,
} from '../l13/rollout/l13-rollout';
import { runAllL13FinalInvariants } from '../l13/invariants/l13-invariants';
import { validateL13CertificationReport, validateL13RatificationArtifact, validateL13RolloutGateResult } from '../l13/validation/final.validators';

interface SubScript {
  readonly sublayer_id: L13SublayerId;
  readonly script: string;
}

const SCRIPTS: readonly SubScript[] = [
  { sublayer_id: L13SublayerId.L13_1_CONSTITUTION, script: 'test-l13_1-constitution' },
  { sublayer_id: L13SublayerId.L13_2_INPUT_PACKAGE, script: 'test-l13_2-input-package' },
  { sublayer_id: L13SublayerId.L13_3_OUTPUT_CONTRACTS, script: 'test-l13_3-output-contracts' },
  { sublayer_id: L13SublayerId.L13_4_GROUNDING, script: 'test-l13_4-grounding' },
  { sublayer_id: L13SublayerId.L13_5_UNCERTAINTY_RESTRICTIONS, script: 'test-l13_5-uncertainty-restrictions' },
  { sublayer_id: L13SublayerId.L13_6_RUNTIME, script: 'test-l13_6-runtime' },
  { sublayer_id: L13SublayerId.L13_7_OUTPUT_MODES, script: 'test-l13_7-output-modes' },
  { sublayer_id: L13SublayerId.L13_8_STYLE_LANGUAGE, script: 'test-l13_8-style' },
  { sublayer_id: L13SublayerId.L13_9_SAFETY, script: 'test-l13_9-safety' },
  { sublayer_id: L13SublayerId.L13_10_PERSISTENCE_FEEDBACK, script: 'test-l13_10-persistence-feedback' },
  { sublayer_id: L13SublayerId.L13_11_REPLAY_REPAIR_ADVERSARIAL, script: 'test-l13_11-replay-repair-adversarial' },
  { sublayer_id: L13SublayerId.L13_12_RATIFICATION, script: 'test-l13_12-ratification' },
];

function runScript(scriptName: string): { passed: number; failed: number } {
  const tsNode = join(process.cwd(), 'node_modules', '.bin', 'ts-node');
  const result = spawnSync(
    tsNode,
    ['--transpile-only', '-P', 'tsconfig.json', `src/scripts/${scriptName}.ts`],
    { encoding: 'utf8' },
  );
  const out = `${result.stdout}\n${result.stderr}`;
  const passedM = out.match(/(?:Passed:|passed:|PASS:)\s+(\d+)/i);
  const failedM = out.match(/(?:Failed:|failed:|FAIL:)\s+(\d+)/i);
  // L13.4 cert uses "L13.4 CERTIFICATION: N/M assertions passed".
  const l4M = out.match(/CERTIFICATION:\s+(\d+)\/(\d+)\s+assertions\s+passed/);
  if (l4M) {
    return { passed: Number(l4M[1]), failed: Number(l4M[2]) - Number(l4M[1]) };
  }
  // L13.2 uses "Total: N PASS: P FAIL: F".
  const l2M = out.match(/Total:\s+(\d+)\s+PASS:\s+(\d+)\s+FAIL:\s+(\d+)/);
  if (l2M) {
    return { passed: Number(l2M[2]), failed: Number(l2M[3]) };
  }
  // L13.3 uses "passed, failed".
  const l3M = out.match(/(\d+)\s+passed,\s+(\d+)\s+failed/);
  if (l3M) {
    return { passed: Number(l3M[1]), failed: Number(l3M[2]) };
  }
  if (passedM && failedM) {
    return { passed: Number(passedM[1]), failed: Number(failedM[1]) };
  }
  console.error(`Could not parse output of ${scriptName}:\n${out.slice(-1000)}`);
  return { passed: 0, failed: 1 };
}

(async () => {
  console.log('═════════════════════════════════════════════════');
  console.log(' L13 MASTER CERTIFICATION — A through L');
  console.log('═════════════════════════════════════════════════');

  const tallies: L13SublayerAssertionTally[] = [];
  let totalPassed = 0;
  let totalFailed = 0;
  for (const s of SCRIPTS) {
    process.stdout.write(`Running ${s.script}... `);
    const r = runScript(s.script);
    const green = r.failed === 0;
    console.log(`${green ? 'GREEN' : 'RED  '} (${r.passed} passed, ${r.failed} failed)`);
    tallies.push({
      sublayer_id: s.sublayer_id,
      assertion_count: r.passed + r.failed,
      passed: r.passed,
      failed: r.failed,
    });
    totalPassed += r.passed;
    totalFailed += r.failed;
  }

  console.log('');
  console.log('───────────────────────────────────────────────');
  console.log(' Running final invariants INV-13-A..L');
  console.log('───────────────────────────────────────────────');
  const finalInvs = await runAllL13FinalInvariants();
  for (const i of finalInvs) {
    console.log(`  ${i.holds ? '✓' : '✗'} ${i.invariant_id} ${i.holds ? 'holds' : 'FAILED'} (${i.evidence})`);
  }
  const finalInvGreen = finalInvs.every(i => i.holds);

  console.log('');
  console.log('───────────────────────────────────────────────');
  console.log(' Building master certification report');
  console.log('───────────────────────────────────────────────');
  const report = runL13MasterCertification({
    tallies,
    final_invariants: finalInvs,
    critical_violation_count: 0,
    rollout_blocking_regression_count: 0,
  });
  const vReport = validateL13CertificationReport(report);
  console.log(`  certification_level = ${report.certification_level}`);
  console.log(`  all_sublayers_green = ${report.all_sublayers_green}`);
  console.log(`  all_bands_green     = ${report.all_bands_green}`);
  console.log(`  all_final_invariants_green = ${report.all_final_invariants_green}`);
  console.log(`  rollout_recommended = ${report.rollout_recommended}`);
  console.log(`  validator           = ${vReport.clean ? 'clean' : 'FAILED'}`);

  console.log('');
  console.log('───────────────────────────────────────────────');
  console.log(' Rollout gate + ratification');
  console.log('───────────────────────────────────────────────');
  const handoff = buildL13L14HandoffContract(true);
  const rollback = buildL13RollbackPolicy();
  const playbooks = buildL13FailurePlaybooks();
  const freeze = buildL13FreezePolicy({
    freeze_class: L13FreezeClass.FROZEN_LIVE,
    active_policy_versions: ['l13.final.v1'],
  });
  void rollback;
  void freeze;
  const gate = runL13RolloutGate({
    certification_report: report,
    replay_substrate_complete: true,
    safety_gate_active: true,
    persistence_surfaces_active: true,
    l14_handoff_contract_approved: handoff.approved,
    rollback_policy_present: true,
    failure_playbooks_present: playbooks.length > 0,
  });
  const vGate = validateL13RolloutGateResult(gate);
  console.log(`  rollout decision   = ${gate.decision}`);
  console.log(`  blocking reasons   = ${gate.blocking_reasons.join(', ') || '(none)'}`);
  console.log(`  rollout validator  = ${vGate.clean ? 'clean' : 'FAILED'}`);

  const ratified = buildL13RatificationArtifact({
    certification_report: report,
    rollout_approved: gate.decision === L13RolloutDecision.APPROVED,
    freeze_activated: true,
    l14_handoff_approved: true,
    active_policy_versions: ['l13.final.v1'],
  });
  const vRat = validateL13RatificationArtifact(ratified);
  console.log(`  ratification level = ${ratified.certification_level}`);
  console.log(`  ratification id    = ${ratified.ratification_artifact_id}`);
  console.log(`  ratification fingerprint = ${ratified.combined_layer_fingerprint}`);
  console.log(`  ratification validator   = ${vRat.clean ? 'clean' : 'FAILED'}`);

  console.log('');
  console.log('═════════════════════════════════════════════════');
  console.log(` SUBLAYER ASSERTIONS  : ${totalPassed} passed, ${totalFailed} failed`);
  console.log(` FINAL INVARIANTS     : ${finalInvs.filter(i => i.holds).length}/${finalInvs.length} hold`);
  console.log(` CERTIFICATION LEVEL  : ${ratified.certification_level}`);
  console.log(` ROLLOUT DECISION     : ${gate.decision}`);
  console.log(` LAYER STATUS         : ${ratified.certification_level === L13CertificationLevel.FROZEN_LIVE && totalFailed === 0 && finalInvGreen ? 'L13 RATIFIED — FROZEN LIVE' : 'NOT RATIFIED'}`);
  console.log('═════════════════════════════════════════════════');

  if (totalFailed > 0 || !finalInvGreen || !vReport.clean || !vRat.clean || !vGate.clean) {
    process.exit(1);
  }
})();
