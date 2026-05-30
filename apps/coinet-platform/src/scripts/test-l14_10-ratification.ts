/**
 * L14.10 — Final Ratification Certification (Band J)
 *
 * §14.10.54 — Proves final definition/completion, certification level
 * derivation, rollout/freeze/ratification gating, extension classification,
 * architecture completion, audit + final invariants.
 */

import { L14ConstitutionalAuditSeverity } from '../l14/contracts/l14-constitutional-types';
import {
  ALL_L14_SUBLAYERS,
  L14_FINAL_FIRST_PRINCIPLE,
  L14_FINAL_MISSION,
  L14SublayerId,
} from '../l14/contracts/l14-final-definition';
import {
  ALL_L14_CERTIFICATION_BANDS,
  ALL_L14_EXTERNAL_REGRESSION_REQUIREMENTS,
  ALL_L14_FINAL_INVARIANTS,
  L14CertificationBand,
  L14ExternalRegressionRequirement,
  L14FinalInvariantId,
  L14_REQUIRED_GREEN_SUBLAYERS,
} from '../l14/contracts/l14-completion-standard';
import {
  L14CertificationLevel,
} from '../l14/contracts/l14-certification-report';
import {
  ALL_L14_PROHIBITED_POST_FREEZE_CHANGES,
  L14ExtensionClassification,
  L14ProposedChangeClass,
} from '../l14/contracts/l14-freeze-policy';
import {
  CoinetArchitectureCompletionStatus,
} from '../l14/contracts/l14-ratification-artifact';
import {
  L14FinalFailurePlaybookClass,
  L14RollbackAction,
} from '../l14/contracts/l14-rollout-gate';
import {
  activateL14FreezePolicy,
  buildBandSnapshot,
  buildL14CertificationReport,
  buildL14CompletionStandard,
  buildL14FinalDefinition,
  buildL14FinalFailurePlaybook,
  buildL14FreezePolicy,
  buildL14RollbackPolicy,
  buildL14RolloutGateResult,
  buildSublayerSnapshot,
  classifyL14ExtensionRequest,
  deriveL14CertificationLevel,
  emitCoinetArchitectureCompletionArtifact,
  emitL14LayerRatificationArtifact,
} from '../l14/certification/l14-master-certification';
import {
  validateL14ArchitectureCompletionArtifact,
  validateL14CertificationReport,
  validateL14CompletionStandard,
  validateL14ExtensionClassification,
  validateL14FailurePlaybook,
  validateL14FinalDefinition,
  validateL14FinalInvariantResult,
  validateL14FreezePolicy,
  validateL14RatificationArtifact,
  validateL14RollbackPolicy,
  validateL14RolloutGateResult,
  validateL14SublayerSnapshot,
} from '../l14/validation/l14-final.validators';
import { L14FinalViolationCode } from '../l14/validation/l14-final-violation-codes';
import {
  L14FinalAuditSubjectClass,
  emitL14FinalAuditRecord,
  getL14FinalAuditLog,
  getL14FinalCriticalViolations,
  isL14FinalBlockingCode,
  resetL14FinalAuditLog,
  severityForL14FinalCode,
} from '../l14/constitution/l14-final-audit';
import { runAllL14FinalInvariants } from '../l14/invariants/l14-invariants';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(cond: unknown, msg: string): void {
  if (cond) { passed += 1; console.log(`  ✓ ${msg}`); }
  else { failed += 1; failures.push(msg); console.log(`  ✗ ${msg}`); }
}
function band(name: string): void { console.log(''); console.log(`── ${name} ──`); }

function allGreenSublayerSnapshots() {
  // Synthetic green snapshots: each sublayer gets 50 pass / 0 fail.
  return L14_REQUIRED_GREEN_SUBLAYERS.map(id => buildSublayerSnapshot({
    sublayer_id: id, passed_assertions: 50, failed_assertions: 0,
    certification_script_ref: `src/scripts/test-${id}.ts`,
  }));
}

function allGreenBandSnapshots() {
  return ALL_L14_CERTIFICATION_BANDS.map(b => buildBandSnapshot({
    band: b, passed_assertions: 20, failed_assertions: 0,
    linked_sublayers: [L14SublayerId.L14_10_FINAL_RATIFICATION],
  }));
}

function allGreenInvariantResults() {
  return ALL_L14_FINAL_INVARIANTS.map(id => ({
    invariant_id: id, holds: true, blocking: true,
    violation_codes: [], subject_refs: [], lineage_refs: ['l14.final.lineage'],
  }));
}

function allGreenExternalRegressions() {
  return ALL_L14_EXTERNAL_REGRESSION_REQUIREMENTS.map(r => ({
    requirement: r, satisfied: true, fingerprint_ref: `l14.fp.upstream.${r}`,
  }));
}

console.log('L14.10 — Final Ratification Certification');

// ── J.1 : Final definition and completion standard ───────────────
band('BAND J.1 — final definition + completion standard');

{
  const def = buildL14FinalDefinition();
  assert(validateL14FinalDefinition(def).clean, 'J.1.1 final definition validator clean');
  assert(def.canonical_mission === L14_FINAL_MISSION, 'J.1.2 canonical mission frozen');
  assert(def.first_principle === L14_FINAL_FIRST_PRINCIPLE, 'J.1.3 first principle frozen');
  assert(def.canonical_sublayers.length === 10, `J.1.4 ten sublayers declared (got ${def.canonical_sublayers.length})`);
  assert(def.canonical_sublayers.length === ALL_L14_SUBLAYERS.length, 'J.1.5 all sublayers present in definition');
  assert(def.lower_layer_rebuild_allowed === false, 'J.1.6 lower_layer_rebuild_allowed=false');
  assert(def.engagement_as_truth_allowed === false, 'J.1.7 engagement_as_truth_allowed=false');
  assert(def.silent_auto_mutation_allowed === false, 'J.1.8 silent_auto_mutation_allowed=false');
  assert(def.calibration_auto_apply_allowed === false, 'J.1.9 calibration_auto_apply_allowed=false');
  // Honesty pin adversarial.
  const forged = { ...def, lower_layer_rebuild_allowed: true } as any;
  assert(!validateL14FinalDefinition(forged).clean, 'J.1.10 forged rebuild flag rejected');
  // Completion standard.
  const std = buildL14CompletionStandard();
  assert(validateL14CompletionStandard(std).clean, 'J.1.11 completion standard validator clean');
  assert(std.required_green_sublayers.length === 10, 'J.1.12 standard requires 10 green sublayers');
  assert(std.required_certification_bands.length === 10, 'J.1.13 standard requires 10 cert bands (A..J)');
  assert(std.required_final_invariants.length === 12, 'J.1.14 standard requires 12 final invariants');
  assert(std.required_external_regressions.length === 4, 'J.1.15 standard requires 4 external regressions');
}

// ── J.2 : Certification level derivation ─────────────────────────
band('BAND J.2 — certification level derivation');

{
  // NOT_CERTIFIED when sublayers red.
  const subRed = L14_REQUIRED_GREEN_SUBLAYERS.map((id, i) => buildSublayerSnapshot({
    sublayer_id: id, passed_assertions: i === 0 ? 0 : 50,
    failed_assertions: i === 0 ? 1 : 0,
    certification_script_ref: `src/scripts/test-${id}.ts`,
  }));
  const lvl1 = deriveL14CertificationLevel({
    sublayer_results: subRed,
    band_results: allGreenBandSnapshots(),
    invariant_results: allGreenInvariantResults(),
    external_regression_results: allGreenExternalRegressions(),
    critical_breach_count: 0,
    rollout_approved: false, freeze_activated: false, architecture_completion_approved: false,
  });
  assert(lvl1 === L14CertificationLevel.NOT_CERTIFIED || lvl1 === L14CertificationLevel.SUBLAYER_GREEN, `J.2.1 sublayer red → ${lvl1}`);
  // PRODUCTION_GREEN when bands+sublayers+invariants green, no rollout/freeze.
  const lvl2 = deriveL14CertificationLevel({
    sublayer_results: allGreenSublayerSnapshots(),
    band_results: allGreenBandSnapshots(),
    invariant_results: allGreenInvariantResults(),
    external_regression_results: allGreenExternalRegressions(),
    critical_breach_count: 0,
    rollout_approved: false, freeze_activated: false, architecture_completion_approved: false,
  });
  assert(lvl2 === L14CertificationLevel.PRODUCTION_GREEN, `J.2.2 production green path (got ${lvl2})`);
  // ROLLOUT_READY.
  const lvl3 = deriveL14CertificationLevel({
    sublayer_results: allGreenSublayerSnapshots(),
    band_results: allGreenBandSnapshots(),
    invariant_results: allGreenInvariantResults(),
    external_regression_results: allGreenExternalRegressions(),
    critical_breach_count: 0,
    rollout_approved: true, freeze_activated: false, architecture_completion_approved: false,
  });
  assert(lvl3 === L14CertificationLevel.ROLLOUT_READY, `J.2.3 rollout ready (got ${lvl3})`);
  // FROZEN_LIVE.
  const lvl4 = deriveL14CertificationLevel({
    sublayer_results: allGreenSublayerSnapshots(),
    band_results: allGreenBandSnapshots(),
    invariant_results: allGreenInvariantResults(),
    external_regression_results: allGreenExternalRegressions(),
    critical_breach_count: 0,
    rollout_approved: true, freeze_activated: true, architecture_completion_approved: false,
  });
  assert(lvl4 === L14CertificationLevel.FROZEN_LIVE, `J.2.4 frozen live (got ${lvl4})`);
  // ARCHITECTURE_COMPLETE.
  const lvl5 = deriveL14CertificationLevel({
    sublayer_results: allGreenSublayerSnapshots(),
    band_results: allGreenBandSnapshots(),
    invariant_results: allGreenInvariantResults(),
    external_regression_results: allGreenExternalRegressions(),
    critical_breach_count: 0,
    rollout_approved: true, freeze_activated: true, architecture_completion_approved: true,
  });
  assert(lvl5 === L14CertificationLevel.ARCHITECTURE_COMPLETE, `J.2.5 architecture complete (got ${lvl5})`);
}

// ── J.3 : Rollout/freeze/ratification gating ─────────────────────
band('BAND J.3 — rollout / freeze / ratification gating');

{
  // Rollout blocked when push law broken.
  const blockedGate = buildL14RolloutGateResult({
    all_sublayers_green: true, all_bands_green: true, all_final_invariants_green: true,
    critical_breach_count: 0,
    push_remains_reserved: false, // ← broken
    telegram_gate_valid: true, user_control_law_valid: true,
    experiment_non_corruption_valid: true, persistence_replay_repair_valid: true,
    calibration_non_auto_mutation_valid: true, upstream_regressions_green: true,
  });
  assert(!blockedGate.rollout_approved, 'J.3.1 push law broken → rollout blocked');
  assert(blockedGate.rollout_blocking_reason_codes.length > 0, 'J.3.2 blocking codes populated');
  // Rollout blocked when telegram gate invalid.
  const blockedTel = buildL14RolloutGateResult({
    all_sublayers_green: true, all_bands_green: true, all_final_invariants_green: true,
    critical_breach_count: 0,
    push_remains_reserved: true, telegram_gate_valid: false,
    user_control_law_valid: true,
    experiment_non_corruption_valid: true, persistence_replay_repair_valid: true,
    calibration_non_auto_mutation_valid: true, upstream_regressions_green: true,
  });
  assert(!blockedTel.rollout_approved, 'J.3.3 telegram gate invalid → rollout blocked');
  // Legit rollout green.
  const goodGate = buildL14RolloutGateResult({
    all_sublayers_green: true, all_bands_green: true, all_final_invariants_green: true,
    critical_breach_count: 0,
    push_remains_reserved: true, telegram_gate_valid: true,
    user_control_law_valid: true, experiment_non_corruption_valid: true,
    persistence_replay_repair_valid: true, calibration_non_auto_mutation_valid: true,
    upstream_regressions_green: true,
  });
  assert(goodGate.rollout_approved, 'J.3.4 all gates green → rollout approved');
  assert(validateL14RolloutGateResult(goodGate).clean, 'J.3.5 rollout gate validator clean');
  // Freeze blocks before rollout approved.
  const blockedFreeze = activateL14FreezePolicy({
    rollout_approved: false, all_sublayers_green: true, all_final_invariants_green: true,
    frozen_surface_refs: ['l14.surface.a'],
  });
  assert(!blockedFreeze.freeze_activated, 'J.3.6 freeze blocked before rollout approved');
  // Freeze activates legally.
  const goodFreeze = activateL14FreezePolicy({
    rollout_approved: true, all_sublayers_green: true, all_final_invariants_green: true,
    frozen_surface_refs: ['l14.surface.a'],
  });
  assert(goodFreeze.freeze_activated, 'J.3.7 freeze activates with all gates green');
  assert(validateL14FreezePolicy(goodFreeze).clean, 'J.3.8 freeze policy validator clean');
  // Ratification blocks with failed invariant.
  const stdJ = buildL14CompletionStandard();
  const reportBlocked = buildL14CertificationReport({
    sublayer_results: allGreenSublayerSnapshots(),
    band_results: allGreenBandSnapshots(),
    invariant_results: ALL_L14_FINAL_INVARIANTS.map((id, i) => ({
      invariant_id: id, holds: i !== 0, blocking: true,
      violation_codes: i === 0 ? ['L14F_FINAL_INVARIANT_FAILED'] : [],
      subject_refs: [], lineage_refs: ['l14.final.lineage'],
    })),
    external_regression_results: allGreenExternalRegressions(),
    critical_breach_count: 0, error_count: 0, warning_count: 0,
    rollout_approved: true, freeze_activated: true, architecture_completion_approved: true,
  });
  const blockedRat = emitL14LayerRatificationArtifact({
    report: reportBlocked, freeze: goodFreeze, rollout: goodGate, completion_standard: stdJ,
    upstream_dependency_fingerprints: ['l14.fp.upstream.x'],
    architecture_completion_approved: true,
  });
  assert(blockedRat.blocked && !blockedRat.artifact, 'J.3.9 ratification blocks with failed invariant');
  assert(blockedRat.blocking_reasons.includes('FINAL_INVARIANT_FAILED'), 'J.3.10 ratification reports FINAL_INVARIANT_FAILED reason');
  // Ratification succeeds with all gates green.
  const reportGood = buildL14CertificationReport({
    sublayer_results: allGreenSublayerSnapshots(),
    band_results: allGreenBandSnapshots(),
    invariant_results: allGreenInvariantResults(),
    external_regression_results: allGreenExternalRegressions(),
    critical_breach_count: 0, error_count: 0, warning_count: 0,
    rollout_approved: true, freeze_activated: true, architecture_completion_approved: true,
  });
  const goodRat = emitL14LayerRatificationArtifact({
    report: reportGood, freeze: goodFreeze, rollout: goodGate, completion_standard: stdJ,
    upstream_dependency_fingerprints: ['l14.fp.upstream.x'],
    architecture_completion_approved: true,
  });
  assert(!goodRat.blocked && !!goodRat.artifact, 'J.3.11 ratification artifact emits with green gates');
  assert(goodRat.artifact!.certification_level === L14CertificationLevel.ARCHITECTURE_COMPLETE, 'J.3.12 artifact level ARCHITECTURE_COMPLETE');
  assert(validateL14RatificationArtifact(goodRat.artifact!).clean, 'J.3.13 ratification artifact validator clean');
}

// ── J.4 : Extension and freeze policy ────────────────────────────
band('BAND J.4 — extension + freeze policy');

{
  // UI read surface = compatible without recertification.
  const c1 = classifyL14ExtensionRequest(L14ProposedChangeClass.ADD_UI_READ_SURFACE);
  assert(c1 === L14ExtensionClassification.COMPATIBLE_NO_RECERTIFICATION, `J.4.1 UI surface → COMPATIBLE_NO_RECERTIFICATION (got ${c1})`);
  // Channel enablement = layer-wide recert.
  const c2 = classifyL14ExtensionRequest(L14ProposedChangeClass.ENABLE_NEW_DELIVERY_CHANNEL);
  assert(c2 === L14ExtensionClassification.LAYER_WIDE_RECERTIFICATION_REQUIRED, `J.4.2 channel enablement → LAYER_WIDE (got ${c2})`);
  // Truth-boundary weakening = prohibited.
  const c3 = classifyL14ExtensionRequest(L14ProposedChangeClass.WEAKEN_TRUTH_BOUNDARY);
  assert(c3 === L14ExtensionClassification.PROHIBITED, `J.4.3 truth weaken → PROHIBITED (got ${c3})`);
  // Validator checks.
  const req = {
    extension_request_id: 'l14.ext.req.1',
    changed_surface_ref: 'l14.surface.x',
    change_summary: 'add UI read surface',
    proposed_change_class: L14ProposedChangeClass.ADD_UI_READ_SURFACE,
    expected_semantic_effects: [],
    lineage_refs: ['l14.final.lineage'], replay_hash: 'x', policy_version: 'l14.final.v1',
  };
  assert(validateL14ExtensionClassification(req, L14ExtensionClassification.COMPATIBLE_NO_RECERTIFICATION).clean, 'J.4.4 extension classification validator clean');
  assert(!validateL14ExtensionClassification(req, L14ExtensionClassification.PROHIBITED).clean, 'J.4.5 extension mis-classification rejected');
  // Freeze policy requires all prohibitions.
  const freeze = buildL14FreezePolicy({ freeze_activated: true, frozen_surface_refs: ['l14.surface.a'] });
  assert(validateL14FreezePolicy(freeze).clean, 'J.4.6 freeze policy clean with all prohibitions');
  for (const p of ALL_L14_PROHIBITED_POST_FREEZE_CHANGES) {
    assert(freeze.prohibited_post_freeze_changes.includes(p), `J.4.7 freeze prohibits ${p}`);
  }
  // Adversarial: strip prohibition.
  const stripped = { ...freeze, prohibited_post_freeze_changes: freeze.prohibited_post_freeze_changes.slice(0, 3) };
  assert(!validateL14FreezePolicy(stripped).clean, 'J.4.8 stripped prohibitions rejected');
  // Rollback policy honesty.
  const rb = buildL14RollbackPolicy();
  assert(validateL14RollbackPolicy(rb).clean, 'J.4.9 rollback policy clean');
  assert(rb.may_mutate_lower_layer_truth === false && rb.may_rewrite_history === false, 'J.4.10 rollback honesty pins');
  // Failure playbook.
  const pb = buildL14FinalFailurePlaybook({
    playbook_class: L14FinalFailurePlaybookClass.TELEGRAM_GATE_FAILURE,
    triggering_violation: 'L14L_TELEGRAM_GATE_BINDING_MISSING',
    operational_severity: 'CRITICAL',
    immediate_containment_action: L14RollbackAction.PAUSE_TELEGRAM_EXTERNAL_DELIVERY,
    rollout_impact: 'PAUSE_CHANNEL',
    required_recertification_scope: 'LAYER_WIDE',
    architecture_completion_revoked: false,
    lower_layer_review_required: false,
  });
  assert(validateL14FailurePlaybook(pb).clean, 'J.4.11 failure playbook validator clean');
}

// ── J.5 : Architecture completion ────────────────────────────────
band('BAND J.5 — architecture completion');

{
  const stdJ = buildL14CompletionStandard();
  const goodGate = buildL14RolloutGateResult({
    all_sublayers_green: true, all_bands_green: true, all_final_invariants_green: true,
    critical_breach_count: 0,
    push_remains_reserved: true, telegram_gate_valid: true,
    user_control_law_valid: true, experiment_non_corruption_valid: true,
    persistence_replay_repair_valid: true, calibration_non_auto_mutation_valid: true,
    upstream_regressions_green: true,
  });
  const goodFreeze = activateL14FreezePolicy({
    rollout_approved: true, all_sublayers_green: true, all_final_invariants_green: true,
    frozen_surface_refs: ['l14.surface.a'],
  });
  const report = buildL14CertificationReport({
    sublayer_results: allGreenSublayerSnapshots(),
    band_results: allGreenBandSnapshots(),
    invariant_results: allGreenInvariantResults(),
    external_regression_results: allGreenExternalRegressions(),
    critical_breach_count: 0, error_count: 0, warning_count: 0,
    rollout_approved: true, freeze_activated: true, architecture_completion_approved: true,
  });
  const rat = emitL14LayerRatificationArtifact({
    report, freeze: goodFreeze, rollout: goodGate, completion_standard: stdJ,
    upstream_dependency_fingerprints: ['l14.fp.upstream.l13.master.x'],
    architecture_completion_approved: true,
  });
  assert(!!rat.artifact, 'J.5.1 ratification artifact emitted');
  // Architecture completion emits.
  const arch = emitCoinetArchitectureCompletionArtifact({
    ratification: rat.artifact,
    upstream_ratification_refs: ['l13.master.ratification.x'],
    upstream_fingerprints_satisfied: true,
  });
  assert(!arch.blocked && !!arch.artifact, 'J.5.2 architecture completion artifact emitted');
  assert(arch.status === CoinetArchitectureCompletionStatus.COMPLETE_14_LAYER_ARCHITECTURE, 'J.5.3 architecture status COMPLETE_14_LAYER_ARCHITECTURE');
  assert(arch.artifact!.total_layers_declared === 14, 'J.5.4 architecture declares 14 layers');
  assert(arch.artifact!.terminal_layer === 'L14', 'J.5.5 terminal layer is L14');
  assert(validateL14ArchitectureCompletionArtifact(arch.artifact!).clean, 'J.5.6 architecture artifact validator clean');
  // Combined fingerprint deterministic.
  const arch2 = emitCoinetArchitectureCompletionArtifact({
    ratification: rat.artifact,
    upstream_ratification_refs: ['l13.master.ratification.x'],
    upstream_fingerprints_satisfied: true,
  });
  assert(arch.artifact!.combined_architecture_fingerprint === arch2.artifact!.combined_architecture_fingerprint, 'J.5.7 combined architecture fingerprint deterministic');
  // Missing upstream fingerprint blocks.
  const archBlocked = emitCoinetArchitectureCompletionArtifact({
    ratification: rat.artifact,
    upstream_ratification_refs: [],
    upstream_fingerprints_satisfied: false,
  });
  assert(archBlocked.blocked, 'J.5.8 missing upstream fingerprints blocks architecture completion');
  // Blocked ratification → architecture blocked.
  const archBlocked2 = emitCoinetArchitectureCompletionArtifact({
    ratification: undefined,
    upstream_ratification_refs: ['x'],
    upstream_fingerprints_satisfied: true,
  });
  assert(archBlocked2.blocked && archBlocked2.status === CoinetArchitectureCompletionStatus.NOT_COMPLETE, 'J.5.9 missing ratification → architecture NOT_COMPLETE');
}

// ── J.6 : Audit + final invariants ───────────────────────────────
band('BAND J.6 — audit + final invariants');

{
  resetL14FinalAuditLog();
  const a = emitL14FinalAuditRecord({
    subjectClass: L14FinalAuditSubjectClass.RATIFICATION_ARTIFACT,
    subjectRef: 'l14.final.ratification.J6',
    violationCodes: [L14FinalViolationCode.L14F_RATIFICATION_ARTIFACT_BLOCKED],
    message: 'cert J.6',
  });
  const b = emitL14FinalAuditRecord({
    subjectClass: L14FinalAuditSubjectClass.RATIFICATION_ARTIFACT,
    subjectRef: 'l14.final.ratification.J6',
    violationCodes: [L14FinalViolationCode.L14F_RATIFICATION_ARTIFACT_BLOCKED],
    message: 'cert J.6',
  });
  assert(a.replay_hash === b.replay_hash, 'J.6.1 final audit replay hash deterministic');
  assert(a.severity === L14ConstitutionalAuditSeverity.CRITICAL && a.blocking, 'J.6.2 ratification-blocked is CRITICAL+blocking');
  assert(severityForL14FinalCode(L14FinalViolationCode.L14F_REQUIRED_BAND_NOT_GREEN) === L14ConstitutionalAuditSeverity.ERROR, 'J.6.3 band-not-green ERROR');
  assert(!isL14FinalBlockingCode(L14FinalViolationCode.L14F_REQUIRED_BAND_NOT_GREEN), 'J.6.4 band-not-green not blocking');
  assert(isL14FinalBlockingCode(L14FinalViolationCode.L14F_FINAL_INVARIANT_FAILED), 'J.6.5 invariant-failed is blocking');
  assert(getL14FinalAuditLog().length === 2, 'J.6.6 audit log queryable');
  assert(getL14FinalCriticalViolations().length === 2, 'J.6.7 critical violations queryable');
  // INV-14-A..L
  const invs = runAllL14FinalInvariants();
  assert(invs.length === 12, `J.6.8 twelve final invariants executed (got ${invs.length})`);
  for (const i of invs) {
    assert(i.holds, `J.6.9 ${i.invariant_id} ${i.name} (${i.evidence})`);
  }
  // Crafted offender: sublayer snapshot claiming green with failures.
  const bad = buildSublayerSnapshot({
    sublayer_id: L14SublayerId.L14_1_CONSTITUTION,
    passed_assertions: 10, failed_assertions: 5,
    certification_script_ref: 'src/scripts/test-l14_1-constitution.ts',
  });
  // sublayer_green derives from failed_assertions === 0, so should be false.
  assert(!bad.sublayer_green, 'J.6.10 sublayer snapshot with failures → not green');
  assert(validateL14SublayerSnapshot(bad).clean, 'J.6.11 snapshot legality clean (failed=5, green=false)');
  // Forge green=true with failures.
  const forced = { ...bad, sublayer_green: true };
  assert(!validateL14SublayerSnapshot(forced).clean, 'J.6.12 forged sublayer_green with failures rejected');
  // Final invariant result validator.
  const irFail = { invariant_id: L14FinalInvariantId.INV_14_A, holds: false, blocking: true, violation_codes: ['X'], subject_refs: [], lineage_refs: [] };
  assert(!validateL14FinalInvariantResult(irFail).clean, 'J.6.13 failed blocking invariant rejected');
}

console.log('');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
if (failed > 0) {
  console.log('Failures:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}

// Keep symbol live.
void L14ExternalRegressionRequirement.L13_MASTER_MUST_REMAIN_FROZEN_LIVE;
void L14CertificationBand.BAND_J_FINAL_RATIFICATION;
void validateL14CertificationReport;
