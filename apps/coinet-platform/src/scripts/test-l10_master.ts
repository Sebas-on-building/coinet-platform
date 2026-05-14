/**
 * L10.9 — Master Certification Suite (Layer 10 end-to-end)
 *
 * The master run is the final authority signal for Layer 10. It:
 *
 *   • Executes all seven L10 certification bands through the master
 *     orchestrator (§10.9.10).
 *   • Aggregates L10.1–L10.9 invariants and asserts they hold.
 *   • Emits a durable, fingerprinted `L10CertificationArtifact`.
 *   • Verifies the artifact advances the production rollout gate.
 *   • Verifies the rollout phase graph and failure-playbook coverage
 *     are internally consistent.
 *
 * This test does not duplicate L10.1–L10.8 implementation tests; it
 * exercises their certification surface via L10.9. If this suite is
 * green, Layer 10 is production-ready as far as assurance is
 * concerned.
 */

import {
  L10CertificationLevel,
  L10_PRODUCTION_BANDS,
  ALL_L10_CERTIFICATION_BANDS,
  runL10MasterCertification,
  canonicalizeL10Artifact,
  fingerprintL10,
  clearL10CertificationArtifacts,
  getLatestL10CertificationArtifact,
  listL10CertificationArtifacts,
} from '../l10/certification';
import {
  L10RolloutPhase,
  L10_ROLLOUT_FORWARD_ORDER,
  L10_DOWNSTREAM_VISIBLE_PHASES,
  Layer10RolloutGate,
  L10_FAILURE_PLAYBOOKS,
  ALL_L10_FAILURE_CLASSES,
  verifyL10FailurePlaybookCoverage,
} from '../l10/rollout';
import {
  L10FreezeStatus,
} from '../l10/contracts/l10-freeze-policy';
import {
  L10CompletionState,
} from '../l10/contracts/l10-completion-standard';
import {
  clearL10RatificationArtifacts,
  getLatestL10RatificationArtifact,
} from '../l10/completion/l10-ratification-builder';
import {
  checkAllL10_9Invariants,
} from '../l10/invariants/l10_9-invariants';

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
  console.log('L10 — Master Certification Run (L10.1 … L10.9)');
  console.log('================================================================');

  clearL10CertificationArtifacts();
  clearL10RatificationArtifacts();

  // ── Step 1 — Run master orchestrator ──────────────────────────────
  console.log('\n[M.1] Master certification orchestrator');
  const artifact = await runL10MasterCertification({
    certification_run_id: 'cert-l10-master',
    layer_version_set: {
      'L10.1': '1.0.0', 'L10.2': '1.0.0', 'L10.3': '1.0.0',
      'L10.4': '1.0.0', 'L10.5': '1.0.0', 'L10.6': '1.0.0',
      'L10.7': '1.0.0', 'L10.8': '1.0.0', 'L10.9': '1.0.0',
    },
  });

  assert(artifact.certification_run_id === 'cert-l10-master',
    'M.1.01 artifact run id preserved');
  assert(artifact.level === L10CertificationLevel.PRODUCTION_GREEN,
    `M.1.02 production-green (got ${artifact.level}): ` +
      `${artifact.blocking_violations.slice(0, 5).join('|')}`);
  assert(artifact.rollout_recommended,
    'M.1.03 rollout recommended');
  assert(artifact.blocking_violations.length === 0,
    `M.1.04 no blocking violations ` +
      `(got ${artifact.blocking_violations.length})`);
  assert(artifact.critical_breach_count === 0,
    `M.1.05 no critical breaches ` +
      `(got ${artifact.critical_breach_count})`);
  assert(artifact.completion_state === 'L10_PRODUCTION_READY',
    `M.1.06 completion state recorded ` +
      `(got ${artifact.completion_state})`);
  assert(artifact.artifact_fingerprint.length === 8,
    'M.1.07 artifact fingerprint 8-char');
  assert(artifact.ratification_artifact_hash.length === 8,
    'M.1.08 ratification artifact hash 8-char');
  assert(artifact.layer_version_set['L10.9'] === '1.0.0',
    'M.1.09 version set includes L10.9');

  // ── Step 2 — Band coverage ────────────────────────────────────────
  console.log('\n[M.2] Band coverage and outcomes');
  assert(artifact.bands.length === 7,
    `M.2.01 7 band outcomes (got ${artifact.bands.length})`);
  assert(artifact.bands.length === ALL_L10_CERTIFICATION_BANDS.length,
    'M.2.02 band count matches enum');
  assert(artifact.bands.every(b => b.ok),
    `M.2.03 all bands green (failing: ${
      artifact.bands.filter(b => !b.ok).map(b => b.band).join(',')
    })`);
  for (const expected of L10_PRODUCTION_BANDS) {
    assert(
      artifact.bands.some(b => b.band === expected && b.ok),
      `M.2.04 band ${expected} present and green`,
    );
  }
  assert(
    artifact.bands.every(b => b.duration_ms >= 0),
    'M.2.05 band durations non-negative',
  );
  assert(
    artifact.bands.every(b => b.blocking_violations.length === 0),
    'M.2.06 no band carries blocking violations',
  );

  // ── Step 3 — Invariant aggregation ────────────────────────────────
  console.log('\n[M.3] Invariant aggregation across L10.1 … L10.9');
  assert(artifact.invariants.length >= 50,
    `M.3.01 aggregated ≥50 invariants ` +
      `(got ${artifact.invariants.length})`);
  const failingInv = artifact.invariants.filter(i => !i.holds);
  assert(failingInv.length === 0,
    `M.3.02 every aggregated invariant holds (failing: ${
      failingInv.map(i => i.id).join(',')})`);
  const ids = new Set(artifact.invariants.map(i => i.id));
  for (const sub of ['INV-10.1', 'INV-10.2', 'INV-10.3', 'INV-10.4',
                     'INV-10.5', 'INV-10.6', 'INV-10.7', 'INV-10.8',
                     'INV-10.9']) {
    assert(
      [...ids].some(id => id.startsWith(sub)),
      `M.3.03 invariants include ${sub}*`,
    );
  }
  // Sanity: direct L10.9 invariant check aligns with master roll-up.
  const l109 = checkAllL10_9Invariants();
  assert(l109.length === 7 && l109.every(i => i.holds),
    'M.3.04 direct L10.9 invariant check mirrors master aggregation');

  // ── Step 4 — Canonicalization and fingerprint determinism ─────────
  console.log('\n[M.4] Canonicalization and fingerprint determinism');
  const canonical1 = canonicalizeL10Artifact(artifact);
  const canonical2 = canonicalizeL10Artifact(artifact);
  assert(canonical1 === canonical2,
    'M.4.01 canonical serialization deterministic');
  assert(fingerprintL10(canonical1) === fingerprintL10(canonical1),
    'M.4.02 fingerprint deterministic');
  assert(fingerprintL10('a') !== fingerprintL10('b'),
    'M.4.03 fingerprint differs on different input');
  assert(canonical1.length > 100,
    'M.4.04 canonical string non-trivial');

  // ── Step 5 — Durable registry ─────────────────────────────────────
  console.log('\n[M.5] Durable certification registry');
  assert(listL10CertificationArtifacts().length >= 1,
    'M.5.01 master artifact registered');
  assert(
    getLatestL10CertificationArtifact()?.certification_run_id ===
      'cert-l10-master',
    'M.5.02 latest artifact is master run');
  assert(
    getLatestL10RatificationArtifact() !== null,
    'M.5.03 ratification artifact emitted alongside certification');
  const ratLatest = getLatestL10RatificationArtifact();
  assert(
    ratLatest !== null &&
      ratLatest.completion_result ===
        L10CompletionState.L10_PRODUCTION_READY,
    'M.5.04 ratification artifact PRODUCTION_READY');
  assert(
    ratLatest !== null &&
      ratLatest.blocking_violations.length === 0,
    'M.5.05 ratification artifact has no blockers');
  assert(
    ratLatest !== null &&
      ratLatest.layer_id === 'L10' &&
      ratLatest.layer_name === 'Hypothesis Engine',
    'M.5.06 ratification carries Layer 10 / Hypothesis Engine identity');
  assert(
    ratLatest !== null &&
      ratLatest.artifact_hash ===
        artifact.ratification_artifact_hash,
    'M.5.07 certification + ratification hashes align');
  assert(
    ratLatest !== null &&
      ratLatest.downstream_dependency_allowed === true,
    'M.5.08 downstream dependency allowed on master ratification');
  assert(
    ratLatest !== null &&
      ratLatest.rollout_recommended === true,
    'M.5.09 rollout recommended on master ratification');

  // ── Step 6 — Rollout gate advancement ─────────────────────────────
  console.log('\n[M.6] Rollout gate advancement under ratified artifact');
  assert(L10_ROLLOUT_FORWARD_ORDER.length === 6,
    'M.6.01 6 forward rollout phases');
  assert(L10_DOWNSTREAM_VISIBLE_PHASES.length === 4,
    'M.6.02 4 downstream-visible phases');
  const gate = new Layer10RolloutGate();

  const bootstrap = gate.decide({
    request_id: 'M.6.bootstrap',
    from_phase: L10RolloutPhase.PRE_ROLLOUT,
    to_phase: L10RolloutPhase.SHADOW,
    ratification: ratLatest,
    freeze_status: L10FreezeStatus.OPEN,
  });
  assert(bootstrap.allowed, 'M.6.03 PRE_ROLLOUT → SHADOW allowed');

  const canary = gate.decide({
    request_id: 'M.6.canary',
    from_phase: L10RolloutPhase.SHADOW,
    to_phase: L10RolloutPhase.CANARY,
    ratification: ratLatest,
    freeze_status: L10FreezeStatus.FROZEN,
  });
  assert(canary.allowed,
    `M.6.04 SHADOW → CANARY allowed under ratified+frozen artifact ` +
      `(rationale=${canary.rationale})`);

  const partial = gate.decide({
    request_id: 'M.6.partial',
    from_phase: L10RolloutPhase.CANARY,
    to_phase: L10RolloutPhase.PARTIAL_LIVE,
    ratification: ratLatest,
    freeze_status: L10FreezeStatus.FROZEN,
  });
  assert(partial.allowed, 'M.6.05 CANARY → PARTIAL_LIVE allowed');

  const full = gate.decide({
    request_id: 'M.6.full',
    from_phase: L10RolloutPhase.PARTIAL_LIVE,
    to_phase: L10RolloutPhase.FULL_LIVE,
    ratification: ratLatest,
    freeze_status: L10FreezeStatus.FROZEN,
  });
  assert(full.allowed, 'M.6.06 PARTIAL_LIVE → FULL_LIVE allowed');

  const frozenLive = gate.decide({
    request_id: 'M.6.frozen',
    from_phase: L10RolloutPhase.FULL_LIVE,
    to_phase: L10RolloutPhase.FROZEN_LIVE,
    ratification: ratLatest,
    freeze_status: L10FreezeStatus.HARD_PROTECTED,
  });
  assert(frozenLive.allowed,
    'M.6.07 FULL_LIVE → FROZEN_LIVE allowed under hard-protected');

  // ── Step 7 — Failure playbook coverage ────────────────────────────
  console.log('\n[M.7] Failure-playbook coverage');
  assert(L10_FAILURE_PLAYBOOKS.length >= ALL_L10_FAILURE_CLASSES.length,
    'M.7.01 failure playbooks ≥ failure classes');
  const coverage = verifyL10FailurePlaybookCoverage();
  assert(coverage.all_covered,
    `M.7.02 all failure classes covered ` +
      `(missing=${coverage.missing.length})`);
  assert(coverage.violations.length === 0,
    `M.7.03 no playbook violations ` +
      `(got ${coverage.violations.length})`);

  // ── Step 8 — Idempotency of master run ────────────────────────────
  console.log('\n[M.8] Master run idempotency');
  const before = listL10CertificationArtifacts().length;
  const artifact2 = await runL10MasterCertification({
    certification_run_id: 'cert-l10-master-2',
    layer_version_set: {
      'L10.1': '1.0.0', 'L10.2': '1.0.0', 'L10.3': '1.0.0',
      'L10.4': '1.0.0', 'L10.5': '1.0.0', 'L10.6': '1.0.0',
      'L10.7': '1.0.0', 'L10.8': '1.0.0', 'L10.9': '1.0.0',
    },
  });
  const after = listL10CertificationArtifacts().length;
  assert(after === before + 1,
    'M.8.01 second master run registers exactly one more artifact');
  assert(artifact2.level === L10CertificationLevel.PRODUCTION_GREEN,
    `M.8.02 second run still PRODUCTION_GREEN ` +
      `(got ${artifact2.level})`);
  assert(artifact2.artifact_fingerprint.length === 8,
    'M.8.03 second run fingerprint present');
  assert(
    artifact2.bands.every(b => b.ok) &&
      artifact2.invariants.every(i => i.holds),
    'M.8.04 second run: all bands + invariants green',
  );

  // ── Summary ───────────────────────────────────────────────────────
  console.log('\n================================================================');
  console.log(`L10 master suite: passed=${passed} failed=${failed}`);
  console.log('================================================================');
  if (failed > 0) {
    console.log('Failures:');
    for (const f of failures) console.log(`  - ${f}`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('L10 master suite crashed:', err);
  process.exit(1);
});
