/**
 * L7.8 — Master Certification Suite (Layer 7 end-to-end)
 *
 * The master run is the final authority signal for Layer 7. It:
 *
 *   • Executes all ten L7 certification bands through the master
 *     orchestrator (§7.8.2.4, §7.8.8.4).
 *   • Aggregates L7.1 + L7.8 invariants and asserts they hold.
 *   • Emits a durable, fingerprinted `L7CertificationArtifact`.
 *   • Verifies the artifact advances the production rollout gate.
 *   • Verifies the production enablement sequence and phase graph are
 *     internally consistent.
 *
 * This test does not duplicate L7.1–L7.7 implementation tests; it
 * exercises their certification surface via L7.8. If this suite is
 * green, Layer 7 is production-ready as far as assurance is concerned.
 */

import {
  L7CertificationBand,
  L7CertificationLevel,
  L7_PRODUCTION_BANDS,
  runL7MasterCertification,
  canonicalizeL7Artifact,
  fingerprintL7,
  clearL7CertificationArtifacts,
  getLatestL7CertificationArtifact,
  listL7CertificationArtifacts,
} from '../l7/certification';
import {
  L7RolloutPhase,
  L7_ROLLOUT_PHASE_SPECS,
  L7ProductionEnablementStep,
  L7_PRODUCTION_ENABLEMENT_ORDER,
  evaluateL7RolloutGate,
  L7_FAILURE_PLAYBOOKS,
} from '../l7/rollout';
import { generateL7ObservabilityReport } from '../l7/ops';
import { checkAllL7_8Invariants } from '../l7/invariants/l7_8-invariants';

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
  console.log('L7 — Master Certification Run (L7.1 … L7.8)');
  console.log('================================================================');

  clearL7CertificationArtifacts();

  // ── Step 1 — Run master orchestrator ─────────────────────────────────
  console.log('\n[M.1] Master certification orchestrator');
  const artifact = await runL7MasterCertification({
    certification_run_id: 'cert-l7-master',
    layer_version_set: {
      'L7.1': '1.0.0', 'L7.2': '1.0.0', 'L7.3': '1.0.0', 'L7.4': '1.0.0',
      'L7.5': '1.0.0', 'L7.6': '1.0.0', 'L7.7': '1.0.0', 'L7.8': '1.0.0',
    },
  });

  assert(artifact.certification_run_id === 'cert-l7-master',
    'M.1.01 artifact run id preserved');
  assert(artifact.level === L7CertificationLevel.PRODUCTION_GREEN,
    `M.1.02 production-green (got ${artifact.level}): ` +
    `${artifact.blocking_violations.join('|')}`);
  assert(artifact.rollout_recommended, 'M.1.03 rollout recommended');
  assert(artifact.blocking_violations.length === 0, 'M.1.04 no blocking violations');
  assert(artifact.critical_breach_count === 0, 'M.1.05 no critical breaches');

  // ── Step 2 — Band coverage ───────────────────────────────────────────
  console.log('\n[M.2] Band coverage');
  assert(artifact.bands.length === 10, 'M.2.01 ten band outcomes');
  for (const b of L7_PRODUCTION_BANDS) {
    const outcome = artifact.bands.find(o => o.band === b);
    assert(outcome !== undefined, `M.2.band.${b}.present`);
    assert(outcome?.ok === true,
      `M.2.band.${b}.ok (${outcome?.blocking_violations.join('|')})`);
  }
  const bandNames = new Set(artifact.bands.map(b => b.band));
  for (const b of Object.values(L7CertificationBand)) {
    assert(bandNames.has(b), `M.2.band.${b}.in_artifact`);
  }

  // ── Step 3 — Invariant aggregation ───────────────────────────────────
  console.log('\n[M.3] Invariant aggregation');
  assert(artifact.invariants.length > 0, 'M.3.01 invariants present');
  assert(artifact.invariants.every(i => i.holds), 'M.3.02 all invariants hold');
  const invIds = new Set(artifact.invariants.map(i => i.id));
  for (const id of ['INV-7.8-A', 'INV-7.8-B', 'INV-7.8-C',
                    'INV-7.8-D', 'INV-7.8-E', 'INV-7.8-F', 'INV-7.8-G']) {
    assert(invIds.has(id), `M.3.inv.${id}.present`);
  }
  // Cross-check: direct invariant sweep agrees with artifact aggregate.
  const direct = checkAllL7_8Invariants();
  assert(direct.every(i => i.holds), 'M.3.03 direct invariant sweep holds');
  for (const inv of direct) {
    const mirror = artifact.invariants.find(i => i.id === inv.id);
    assert(mirror?.holds === inv.holds,
      `M.3.mirror.${inv.id}.agrees_with_artifact`);
  }

  // ── Step 4 — Artifact fingerprint + determinism ──────────────────────
  console.log('\n[M.4] Artifact fingerprint and determinism');
  const canon = canonicalizeL7Artifact(artifact);
  const canon2 = canonicalizeL7Artifact(artifact);
  assert(canon === canon2, 'M.4.01 canonicalization deterministic');
  assert(/^[0-9a-f]{8}$/.test(artifact.artifact_fingerprint),
    'M.4.02 fingerprint is 8-char hex');
  const expectedFp = fingerprintL7(canonicalizeL7Artifact({
    ...artifact, artifact_fingerprint: '',
  }));
  assert(expectedFp === artifact.artifact_fingerprint,
    'M.4.03 fingerprint reproducible from canonical form');

  // ── Step 5 — Artifact registry ───────────────────────────────────────
  console.log('\n[M.5] Artifact registry');
  const latest = getLatestL7CertificationArtifact();
  assert(latest?.certification_run_id === 'cert-l7-master',
    'M.5.01 latest artifact matches run');
  assert(listL7CertificationArtifacts().length >= 1,
    'M.5.02 artifact log non-empty');

  // ── Step 6 — Rollout gate accepts artifact ───────────────────────────
  console.log('\n[M.6] Rollout gate accepts artifact');
  const obs = generateL7ObservabilityReport({});
  const completed = new Set([
    L7RolloutPhase.A_CERTIFICATION_SUBSTRATE,
    L7RolloutPhase.B_FIXTURE_CORPUS,
    L7RolloutPhase.C_OPERATIONAL_ASSURANCE,
    L7RolloutPhase.D_ROLLOUT_AND_ROLLBACK,
    L7RolloutPhase.E_MIGRATION_GOVERNANCE,
  ]);
  const gate = evaluateL7RolloutGate({
    target_phase: L7RolloutPhase.F_ASSURANCE_INVARIANTS_AND_MASTER,
    completed_phases: completed,
    attested: {
      deliverables_complete: true,
      exit_criteria_met: true,
      certification_bands_green_for_phase: true,
    },
    certification: artifact,
    observability: obs,
    required_level: L7CertificationLevel.PRODUCTION_GREEN,
  });
  assert(gate.advance,
    `M.6.01 rollout gate advances end-to-end (${gate.reasons.join('|')})`);

  // ── Step 7 — Production enablement and phase graph ───────────────────
  console.log('\n[M.7] Production enablement + phase graph consistency');
  assert(L7_PRODUCTION_ENABLEMENT_ORDER.length === 9,
    'M.7.01 nine production-enablement steps');
  assert(
    L7_PRODUCTION_ENABLEMENT_ORDER[
      L7_PRODUCTION_ENABLEMENT_ORDER.length - 1
    ] === L7ProductionEnablementStep.FINAL_CERTIFICATION_ARTIFACT,
    'M.7.02 enablement ends at FINAL_CERTIFICATION_ARTIFACT',
  );
  const enablementUnique = new Set(L7_PRODUCTION_ENABLEMENT_ORDER).size;
  assert(enablementUnique === L7_PRODUCTION_ENABLEMENT_ORDER.length,
    'M.7.03 enablement steps unique');

  const phaseOrder = [
    L7RolloutPhase.A_CERTIFICATION_SUBSTRATE,
    L7RolloutPhase.B_FIXTURE_CORPUS,
    L7RolloutPhase.C_OPERATIONAL_ASSURANCE,
    L7RolloutPhase.D_ROLLOUT_AND_ROLLBACK,
    L7RolloutPhase.E_MIGRATION_GOVERNANCE,
    L7RolloutPhase.F_ASSURANCE_INVARIANTS_AND_MASTER,
  ];
  for (let i = 1; i < phaseOrder.length; i++) {
    const prereqs = L7_ROLLOUT_PHASE_SPECS[phaseOrder[i]].prerequisites;
    assert(prereqs.includes(phaseOrder[i - 1]),
      `M.7.chain.${phaseOrder[i]}.depends_on.${phaseOrder[i - 1]}`);
  }
  assert(L7_FAILURE_PLAYBOOKS.length >= 6,
    `M.7.04 failure playbooks registered (${L7_FAILURE_PLAYBOOKS.length})`);

  // ── Step 8 — Observability + dependency flags ────────────────────────
  console.log('\n[M.8] Observability and dependency flags');
  assert(artifact.observability_ok, 'M.8.01 observability_ok');
  assert(artifact.replay_integrity_ok, 'M.8.02 replay_integrity_ok');
  assert(artifact.load_concurrency_ok, 'M.8.03 load_concurrency_ok');
  assert(artifact.migration_ok, 'M.8.04 migration_ok');
  assert(artifact.rollout_ok, 'M.8.05 rollout_ok');

  // ── Summary ──────────────────────────────────────────────────────────
  console.log('\n================================================================');
  console.log(`L7 Master Certification: ${passed} passed / ${failed} failed`);
  console.log(`Certification Level: ${artifact.level}`);
  console.log(`Artifact Fingerprint: ${artifact.artifact_fingerprint}`);
  console.log(`Rollout Recommended: ${artifact.rollout_recommended}`);
  console.log('================================================================');
  if (failed > 0) {
    console.log('\nFailures:');
    for (const f of failures) console.log(`  - ${f}`);
    process.exit(1);
  } else {
    console.log('LAYER 7 IS PRODUCTION-READY');
    process.exit(0);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
