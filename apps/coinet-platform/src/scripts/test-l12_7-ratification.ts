/**
 * L12.7 — Final Ratification Certification Suite (§12.7.19)
 *
 * Bands A through H plus the 10 L12.7 invariants. The suite runs
 * with no external I/O — all governance flags / sublayer green
 * markers are simulated to cover both the "production-green path" and
 * the negative "must-reject" cases.
 */

import {
  // Final definition
  L12SublayerId,
  L12_REQUIRED_SUBLAYERS_FOR_RATIFICATION,
  ALL_L12_FINAL_CAPABILITY_GROUPS,
  L12FinalCapabilityGroup,
  L12FinalForbiddenSemantic,
  ALL_L12_FINAL_FORBIDDEN_SEMANTICS,
  buildL12FinalDefinition,
  // Completion standard
  L12_COMPLETION_STANDARD_V1,
  makeL12SublayerCertificationStatus,
  // Freeze
  L12_FREEZE_POLICY_V1,
  L12FreezeClass,
  // Extension
  L12ExtensionClassification,
  L12ExtensionSurface,
  L12ExtensionRequest,
  // Downstream
  buildL12DownstreamDependencyContract,
  isL12DownstreamDependencyContractValid,
  L12ProhibitedDownstreamPattern,
  L12DownstreamDisclosureRequirement,
  ALL_L12_DOWNSTREAM_DISCLOSURE_REQUIREMENTS,
  // Ratification artifact
  L12LayerRatificationArtifact,
  computeL12CombinedLayerFingerprint,
  fingerprintL12String,
} from '../l12/contracts';

import {
  L12CertificationLevel,
  L12CertificationBand,
  ALL_L12_CERTIFICATION_BANDS,
  L12_CERTIFICATION_BAND_REGISTRY,
  deriveL12CertificationLevel,
  runL12Bands,
  buildL12RatificationArtifact,
  l12ArtifactIsProductionGreen,
  activateL12FullLayerFreeze,
  classifyL12ExtensionRequest,
  validateL12Handoff,
  runL12MasterCertification,
  L12RolloutGateStatus,
  makeL12SublayerCertificationResult,
  makeL12CertificationBandResult,
  makeL12InvariantCertificationResult,
} from '../l12/certification';

import {
  L12RolloutPhase,
  L12RolloutPhaseFlag,
  L12_ROLLOUT_PHASE_REQUIREMENTS,
  evaluateL12RolloutGate,
  L12RollbackTrigger,
  L12RollbackAction,
  L12_ROLLBACK_TRIGGER_TO_ACTION,
  validateL12RollbackRequest,
  L12_FAILURE_PLAYBOOK_REGISTRY,
  ALL_L12_FAILURE_PLAYBOOK_IDS,
  buildL12FailurePlaybookCoverageReport,
  validateL12EnableDisableRequest,
  L12EnableDisableAction,
  L12EnableDisableSubject,
} from '../l12/rollout';

import {
  validateL12CompletionStandard,
  validateL12CertificationReport,
  validateL12RatificationArtifact,
  validateL12FreezePolicy,
  validateL12ExtensionAssessment,
  validateL12RolloutGate,
  validateL12DownstreamHandoff,
  L12FinalViolationCode,
} from '../l12/validation';

import {
  L12FinalAuditSubjectClass,
  L12FinalAuditSeverity,
  severityForL12FinalViolationCode,
  emitL12FinalAuditRecords,
} from '../l12/constitution';

import {
  invariantL12_7_A_sublayerCompletion,
  invariantL12_7_B_certificationBand,
  invariantL12_7_C_triggerInvalidationClosure,
  invariantL12_7_D_nonPredictionClosure,
  invariantL12_7_E_l11ScoreContextClosure,
  invariantL12_7_F_persistenceReplayRepairClosure,
  invariantL12_7_G_downstreamNoRebuildClosure,
  invariantL12_7_H_ratificationArtifact,
  invariantL12_7_I_extensionSafety,
  invariantL12_7_J_finalDoneDefinition,
  runAllL12_7Invariants,
} from '../l12/invariants/l12_7-invariants';

let passed = 0;
let failed = 0;
const failures: string[] = [];
function assert(cond: boolean, label: string): void {
  if (cond) { passed++; }
  else {
    failed++; failures.push(label);
    console.error(`  ✗ FAIL: ${label}`);
  }
}

const T_RUN = '2026-05-09T00:00:00.000Z';

console.log('=================================================================');
console.log('L12.7 — Final Ratification Certification Suite');
console.log('=================================================================');

// ─── Build canonical green inputs once ──────────────────────────────

const allSublayersGreen: Partial<Record<L12SublayerId, boolean>> = {};
for (const s of [
  ...L12_REQUIRED_SUBLAYERS_FOR_RATIFICATION,
  L12SublayerId.L12_7_RATIFICATION,
]) allSublayersGreen[s] = true;

const allBandsGreen: Partial<Record<L12CertificationBand, boolean>> = {};
for (const b of ALL_L12_CERTIFICATION_BANDS) allBandsGreen[b] = true;

const dependencyContract = buildL12DownstreamDependencyContract();

const sublayerResults = [
  ...L12_REQUIRED_SUBLAYERS_FOR_RATIFICATION,
  L12SublayerId.L12_7_RATIFICATION,
].map((s, i) => makeL12SublayerCertificationResult({
  sublayer: s,
  suite_id: `test-${s.toLowerCase()}`,
  assertions_passed: 100 + i,
  assertions_failed: 0,
  invariants_held: 8,
  invariants_failed: 0,
}));

const bandResults = runL12Bands({
  sublayer_green: allSublayersGreen,
  l11_master_green: true,
  l10_master_green: true,
  adversarial_misuse_green: true,
  artifact_rollout_freeze_green: true,
});

const invariantResults = ALL_L12_CERTIFICATION_BANDS.map(b =>
  makeL12InvariantCertificationResult(`INV-band-${b}`, true, 'simulated'));

const masterResult = runL12MasterCertification({
  master_result_id: 'l12.master.v1',
  layer_version: 'l12.7.0',
  sublayer_results: sublayerResults,
  band_results: bandResults,
  invariant_results: invariantResults,
  frozen_sublayers: L12_FREEZE_POLICY_V1.frozen_sublayers,
  frozen_surfaces: L12_FREEZE_POLICY_V1.frozen_surfaces,
  scenario_family_material: 'sf:8-families',
  scenario_template_material: 'st:7-canonical-templates',
  scenario_contract_material: 'sc:scenario-set-trigger-invalidation-confidence',
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

// =============================================================
// Band A — doctrine and contracts
// =============================================================
console.log('\n[Band A] Doctrine and contracts');

{
  const def = buildL12FinalDefinition('l12.dependency.v1');
  assert(def.layer_id === 'L12_SCENARIO_ENGINE',
    'A.1 final definition layer_id is L12_SCENARIO_ENGINE');
  assert(typeof def.first_principle === 'string' &&
    def.first_principle.length > 0,
    'A.2 L12 first principle frozen');
  assert(def.required_sublayers.length === 7,
    'A.3 7 required sublayers (L12.1..L12.7)');
  assert(def.required_capability_groups.length ===
    ALL_L12_FINAL_CAPABILITY_GROUPS.length,
    'A.4 all 10 capability groups required');
  assert(def.forbidden_output_semantics.length ===
    ALL_L12_FINAL_FORBIDDEN_SEMANTICS.length,
    'A.5 all forbidden output semantics enumerated');
  assert(def.forbidden_output_semantics.includes(
    L12FinalForbiddenSemantic.PREDICTION_THEATER),
    'A.6 prediction theater forbidden');
  assert(def.forbidden_output_semantics.includes(
    L12FinalForbiddenSemantic.RECOMMENDATION),
    'A.7 recommendation forbidden');
  assert(def.forbidden_output_semantics.includes(
    L12FinalForbiddenSemantic.FINAL_JUDGMENT),
    'A.8 final judgment forbidden');
  assert(def.forbidden_output_semantics.includes(
    L12FinalForbiddenSemantic.TRADE_ACTION),
    'A.9 trade action forbidden');
  assert(def.forbidden_output_semantics.includes(
    L12FinalForbiddenSemantic.LOWER_LAYER_REBUILD_BY_DOWNSTREAM),
    'A.10 lower-layer rebuild forbidden');
}

{
  // Completion standard
  const std = L12_COMPLETION_STANDARD_V1;
  assert(std.minimum_certification_level ===
    L12CertificationLevel.PRODUCTION_GREEN,
    'A.11 completion requires PRODUCTION_GREEN minimum');
  assert(std.critical_breach_tolerance === 0,
    'A.12 critical breach tolerance = 0');
  assert(std.prediction_theater_tolerance === 0 &&
    std.recommendation_leak_tolerance === 0 &&
    std.final_judgment_leak_tolerance === 0 &&
    std.lower_layer_rebuild_tolerance === 0,
    'A.13 all semantic-leak tolerances = 0');
  assert(std.required_sublayer_certifications.length === 7,
    'A.14 7 sublayer certifications required');
  assert(std.required_invariants.length === 10,
    'A.15 10 L12.7 invariants required');
}

// =============================================================
// Band B — condition, trigger, invalidation law
// =============================================================
console.log('\n[Band B] Condition / trigger / invalidation law');

{
  const r = invariantL12_7_C_triggerInvalidationClosure({
    trigger_law_certified: true,
    invalidation_law_certified: true,
    confidence_cap_law_certified: true,
  });
  assert(r.holds, 'B.1 INV-12.7-C holds when all three laws certified');
}
{
  const r = invariantL12_7_C_triggerInvalidationClosure({
    trigger_law_certified: false,
    invalidation_law_certified: true,
    confidence_cap_law_certified: true,
  });
  assert(!r.holds, 'B.2 INV-12.7-C fails when trigger law not certified');
}
{
  const r = invariantL12_7_C_triggerInvalidationClosure({
    trigger_law_certified: true,
    invalidation_law_certified: false,
    confidence_cap_law_certified: true,
  });
  assert(!r.holds, 'B.3 INV-12.7-C fails when invalidation law not certified');
}
{
  const r = invariantL12_7_C_triggerInvalidationClosure({
    trigger_law_certified: true,
    invalidation_law_certified: true,
    confidence_cap_law_certified: false,
  });
  assert(!r.holds, 'B.4 INV-12.7-C fails when confidence cap law not certified');
}

// =============================================================
// Band C — scenario generation and ranking
// =============================================================
console.log('\n[Band C] Scenario generation and ranking');

{
  // Band C is sourced from L12.4 + L12.5 sublayers (runtime + templates).
  const r = runL12Bands({
    sublayer_green: { ...allSublayersGreen,
      [L12SublayerId.L12_4_RUNTIME]: false },
    l11_master_green: true,
    l10_master_green: true,
    adversarial_misuse_green: true,
    artifact_rollout_freeze_green: true,
  });
  const c = r.find(b =>
    b.band_id === L12CertificationBand.BAND_C_GENERATION_AND_RANKING)!;
  assert(!c.passed, 'C.1 Band C fails when L12.4 not green');
}
{
  const r = runL12Bands({
    sublayer_green: { ...allSublayersGreen,
      [L12SublayerId.L12_5_TEMPLATES]: false },
    l11_master_green: true,
    l10_master_green: true,
    adversarial_misuse_green: true,
    artifact_rollout_freeze_green: true,
  });
  const c = r.find(b =>
    b.band_id === L12CertificationBand.BAND_C_GENERATION_AND_RANKING)!;
  assert(!c.passed, 'C.2 Band C fails when L12.5 not green');
}
{
  const c = bandResults.find(b =>
    b.band_id === L12CertificationBand.BAND_C_GENERATION_AND_RANKING)!;
  assert(c.passed, 'C.3 Band C passes under all-green sublayers');
}

// =============================================================
// Band D — path confidence and restrictions
// =============================================================
console.log('\n[Band D] Path confidence and restrictions');

{
  const d = bandResults.find(b =>
    b.band_id === L12CertificationBand.BAND_D_CONFIDENCE_AND_RESTRICTIONS)!;
  assert(d.passed, 'D.1 Band D passes under L12.5 green');
}
{
  const r = runL12Bands({
    sublayer_green: { ...allSublayersGreen,
      [L12SublayerId.L12_5_TEMPLATES]: false },
    l11_master_green: true,
    l10_master_green: true,
    adversarial_misuse_green: true,
    artifact_rollout_freeze_green: true,
  });
  const d = r.find(b =>
    b.band_id === L12CertificationBand.BAND_D_CONFIDENCE_AND_RESTRICTIONS)!;
  assert(!d.passed, 'D.2 Band D fails when L12.5 not green');
}
{
  // Check completion standard rejects positive prediction-theater tolerance
  const result = validateL12CompletionStandard({
    standard: L12_COMPLETION_STANDARD_V1,
    sublayer_statuses: L12_REQUIRED_SUBLAYER_STATUSES_GREEN(),
    band_passed: allBandsGreen,
    invariants_held: invariantsHeldMap(true),
    critical_breach_count: 0,
    prediction_theater_breach_count: 1,
    recommendation_leak_count: 0,
    final_judgment_leak_count: 0,
    lower_layer_rebuild_breach_count: 0,
    l5_persistence_green: true,
    replay_green: true,
    repair_green: true,
    downstream_no_rebuild_green: true,
  });
  assert(result.issues.some(i =>
    i.code === L12FinalViolationCode.L12F_PREDICTION_THEATER_BREACH),
    'D.3 prediction-theater breach surfaces L12F_PREDICTION_THEATER_BREACH');
}

// =============================================================
// Band E — L11 score-context consumption
// =============================================================
console.log('\n[Band E] L11 score-context consumption');

{
  const r = invariantL12_7_E_l11ScoreContextClosure({
    naked_score_consumption_rejected: true,
    l11_score_context_bundle_certified: true,
    attribution_required_certified: true,
    drift_required_certified: true,
    visibility_required_certified: true,
    score_restrictions_required_certified: true,
    l11_replay_lineage_required_certified: true,
  });
  assert(r.holds, 'E.1 INV-12.7-E holds with full L11 score context');
}
{
  const r = invariantL12_7_E_l11ScoreContextClosure({
    naked_score_consumption_rejected: false,
    l11_score_context_bundle_certified: true,
    attribution_required_certified: true,
    drift_required_certified: true,
    visibility_required_certified: true,
    score_restrictions_required_certified: true,
    l11_replay_lineage_required_certified: true,
  });
  assert(!r.holds, 'E.2 INV-12.7-E fails when naked score consumption allowed');
}
{
  const r = invariantL12_7_E_l11ScoreContextClosure({
    naked_score_consumption_rejected: true,
    l11_score_context_bundle_certified: true,
    attribution_required_certified: false,
    drift_required_certified: true,
    visibility_required_certified: true,
    score_restrictions_required_certified: true,
    l11_replay_lineage_required_certified: true,
  });
  assert(!r.holds, 'E.3 INV-12.7-E fails when attribution requirement missing');
}

// L11 master green is a band-E governance flag.
{
  const r = runL12Bands({
    sublayer_green: allSublayersGreen,
    l11_master_green: false,
    l10_master_green: true,
    adversarial_misuse_green: true,
    artifact_rollout_freeze_green: true,
  });
  const e = r.find(b =>
    b.band_id === L12CertificationBand.BAND_E_L11_SCORE_CONTEXT)!;
  assert(!e.passed, 'E.4 Band E fails when L11 master regression not green');
}

// =============================================================
// Band F — persistence, replay, repair
// =============================================================
console.log('\n[Band F] Persistence / replay / repair');

{
  const r = invariantL12_7_F_persistenceReplayRepairClosure({
    l5_only_persistence_certified: true,
    replay_safety_certified: true,
    repair_safety_certified: true,
  });
  assert(r.holds, 'F.1 INV-12.7-F holds with all three certified');
}
{
  const r = invariantL12_7_F_persistenceReplayRepairClosure({
    l5_only_persistence_certified: false,
    replay_safety_certified: true,
    repair_safety_certified: true,
  });
  assert(!r.holds, 'F.2 INV-12.7-F fails without L5-only persistence');
}
{
  const r = invariantL12_7_F_persistenceReplayRepairClosure({
    l5_only_persistence_certified: true,
    replay_safety_certified: false,
    repair_safety_certified: true,
  });
  assert(!r.holds, 'F.3 INV-12.7-F fails without replay safety');
}
{
  const r = invariantL12_7_F_persistenceReplayRepairClosure({
    l5_only_persistence_certified: true,
    replay_safety_certified: true,
    repair_safety_certified: false,
  });
  assert(!r.holds, 'F.4 INV-12.7-F fails without repair safety');
}

// =============================================================
// Band G — adversarial misuse
// =============================================================
console.log('\n[Band G] Adversarial misuse');

{
  const r = invariantL12_7_D_nonPredictionClosure({
    prediction_theater_breach_count: 0,
    recommendation_leak_count: 0,
    final_judgment_leak_count: 0,
    trade_action_leak_count: 0,
  });
  assert(r.holds, 'G.1 INV-12.7-D holds under zero leakage');
}
for (const f of ['prediction_theater_breach_count',
                 'recommendation_leak_count',
                 'final_judgment_leak_count',
                 'trade_action_leak_count'] as const) {
  const inp = {
    prediction_theater_breach_count: 0,
    recommendation_leak_count: 0,
    final_judgment_leak_count: 0,
    trade_action_leak_count: 0,
    [f]: 1,
  };
  const r = invariantL12_7_D_nonPredictionClosure(inp);
  assert(!r.holds,
    `G.2.${f} INV-12.7-D fails when ${f}>0`);
}

// L13 handoff request that attempts a rebuild → must be rejected.
{
  const handoff = validateL12Handoff(dependencyContract, {
    handoff_request_id: 'l13.req.bad-rebuild',
    consumer_layer:
      dependencyContract.allowed_consumer_layers[0],
    consumed_surfaces: dependencyContract.required_consumed_surfaces,
    attempted_use:
      dependencyContract.allowed_downstream_uses[1],
    attempted_prohibited_patterns: [
      L12ProhibitedDownstreamPattern.REBUILD_SCENARIO_FROM_LOWER_LAYERS,
    ],
    disclosures_honored: [...ALL_L12_DOWNSTREAM_DISCLOSURE_REQUIREMENTS],
    respects_restrictions: true,
    shows_invalidations: true,
    shows_path_confidence: true,
    shows_evidence: true,
    shows_lineage: true,
  });
  assert(!handoff.approved,
    'G.3 L13 handoff rejected when rebuild attempted');
  assert(handoff.violation_codes.includes('L12F_LOWER_LAYER_REBUILD_ALLOWED'),
    'G.4 rebuild attempt produces L12F_LOWER_LAYER_REBUILD_ALLOWED');
}
{
  const handoff = validateL12Handoff(dependencyContract, {
    handoff_request_id: 'l13.req.recommendation',
    consumer_layer: dependencyContract.allowed_consumer_layers[0],
    consumed_surfaces: dependencyContract.required_consumed_surfaces,
    attempted_use: dependencyContract.allowed_downstream_uses[1],
    attempted_prohibited_patterns: [
      L12ProhibitedDownstreamPattern.TREAT_SCENARIO_AS_RECOMMENDATION,
    ],
    disclosures_honored: [...ALL_L12_DOWNSTREAM_DISCLOSURE_REQUIREMENTS],
    respects_restrictions: true,
    shows_invalidations: true,
    shows_path_confidence: true,
    shows_evidence: true,
    shows_lineage: true,
  });
  assert(!handoff.approved &&
    handoff.violation_codes.includes('L12F_RECOMMENDATION_LEAK'),
    'G.5 scenario-as-recommendation rejected with L12F_RECOMMENDATION_LEAK');
}
{
  const handoff = validateL12Handoff(dependencyContract, {
    handoff_request_id: 'l13.req.judgment',
    consumer_layer: dependencyContract.allowed_consumer_layers[0],
    consumed_surfaces: dependencyContract.required_consumed_surfaces,
    attempted_use: dependencyContract.allowed_downstream_uses[1],
    attempted_prohibited_patterns: [
      L12ProhibitedDownstreamPattern
        .TREAT_SCENARIO_AS_FINAL_JUDGMENT_WITHOUT_L13_LAYER,
    ],
    disclosures_honored: [...ALL_L12_DOWNSTREAM_DISCLOSURE_REQUIREMENTS],
    respects_restrictions: true,
    shows_invalidations: true,
    shows_path_confidence: true,
    shows_evidence: true,
    shows_lineage: true,
  });
  assert(!handoff.approved &&
    handoff.violation_codes.includes('L12F_FINAL_JUDGMENT_LEAK'),
    'G.6 scenario-as-final-judgment rejected with L12F_FINAL_JUDGMENT_LEAK');
}
{
  const handoff = validateL12Handoff(dependencyContract, {
    handoff_request_id: 'l13.req.trade',
    consumer_layer: dependencyContract.allowed_consumer_layers[0],
    consumed_surfaces: dependencyContract.required_consumed_surfaces,
    attempted_use: dependencyContract.allowed_downstream_uses[1],
    attempted_prohibited_patterns: [
      L12ProhibitedDownstreamPattern.TREAT_SCENARIO_AS_TRADE_INSTRUCTION,
    ],
    disclosures_honored: [...ALL_L12_DOWNSTREAM_DISCLOSURE_REQUIREMENTS],
    respects_restrictions: true,
    shows_invalidations: true,
    shows_path_confidence: true,
    shows_evidence: true,
    shows_lineage: true,
  });
  assert(!handoff.approved &&
    handoff.violation_codes.includes('L12F_PREDICTION_THEATER_BREACH'),
    'G.7 scenario-as-trade-instruction rejected with prediction-theater code');
}

// =============================================================
// Band H — artifact, rollout, freeze
// =============================================================
console.log('\n[Band H] Artifact / rollout / freeze');

{
  const a = masterResult.ratification_artifact;
  assert(a.combined_layer_fingerprint.startsWith('l12.fp.'),
    'H.1 combined fingerprint formed (l12.fp.*)');
  const reportIssues = validateL12CertificationReport(
    masterResult.certification_report);
  assert(reportIssues.length === 0,
    `H.2 certification report valid (${reportIssues.length} issues)`);
  const artIssues = validateL12RatificationArtifact(a);
  assert(artIssues.length === 0,
    `H.3 ratification artifact valid (${artIssues.length} issues)`);
  assert(a.critical_breach_count === 0, 'H.4 zero critical breaches');
  assert(a.l13_dependency_approved, 'H.5 L13 dependency approved');
  assert(a.rollout_recommended, 'H.6 rollout recommended');
  assert(l12ArtifactIsProductionGreen(a),
    'H.7 artifact is production-green');
  assert(a.frozen_contract_surfaces.length > 0 &&
    a.frozen_runtime_surfaces.length > 0 &&
    a.frozen_persistence_surfaces.length > 0 &&
    a.frozen_read_surfaces.length > 0,
    'H.8 frozen surfaces partitioned by kind');
  assert(masterResult.rollout_gate_status ===
    L12RolloutGateStatus.FROZEN_LIVE,
    'H.9 rollout gate status FROZEN_LIVE under freeze_activated=true');
}

// Determinism
{
  const a1 = masterResult.ratification_artifact;
  const same = runL12MasterCertification({
    master_result_id: 'l12.master.v1',
    layer_version: 'l12.7.0',
    sublayer_results: sublayerResults,
    band_results: bandResults,
    invariant_results: invariantResults,
    frozen_sublayers: L12_FREEZE_POLICY_V1.frozen_sublayers,
    frozen_surfaces: L12_FREEZE_POLICY_V1.frozen_surfaces,
    scenario_family_material: 'sf:8-families',
    scenario_template_material: 'st:7-canonical-templates',
    scenario_contract_material: 'sc:scenario-set-trigger-invalidation-confidence',
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
  assert(a1.combined_layer_fingerprint ===
    same.ratification_artifact.combined_layer_fingerprint,
    'H.10 fingerprint deterministic across identical inputs');
}
{
  const a1 = masterResult.ratification_artifact;
  const tampered = runL12MasterCertification({
    master_result_id: 'l12.master.v1',
    layer_version: 'l12.7.0',
    sublayer_results: sublayerResults,
    band_results: bandResults,
    invariant_results: invariantResults,
    frozen_sublayers: L12_FREEZE_POLICY_V1.frozen_sublayers,
    frozen_surfaces: L12_FREEZE_POLICY_V1.frozen_surfaces,
    scenario_family_material: 'sf:8-families',
    scenario_template_material: 'st:7-canonical-templates',
    scenario_contract_material: 'sc:scenario-set-trigger-invalidation-confidence',
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
  assert(a1.combined_layer_fingerprint !==
    tampered.ratification_artifact.combined_layer_fingerprint,
    'H.11 fingerprint differs when critical_breach_count changes');
  assert(tampered.production_green === false,
    'H.12 critical breach drops production_green to false');
}

// Freeze activation
{
  const a = masterResult.ratification_artifact;
  const r = activateL12FullLayerFreeze({
    policy: L12_FREEZE_POLICY_V1,
    artifact: a,
  });
  assert(r.activated, 'H.13 freeze activates with production-green artifact');
  assert(r.policy.freeze_class === L12FreezeClass.FULL_LAYER_FROZEN,
    'H.14 policy promoted to FULL_LAYER_FROZEN');
}
{
  // Freeze must reject if critical breach > 0
  const bad = {
    ...masterResult.ratification_artifact,
    critical_breach_count: 1,
  } as L12LayerRatificationArtifact;
  const r = activateL12FullLayerFreeze({
    policy: L12_FREEZE_POLICY_V1,
    artifact: bad,
  });
  assert(!r.activated,
    'H.15 freeze rejected under critical breach');
}
{
  const policyIssues = validateL12FreezePolicy({
    ...L12_FREEZE_POLICY_V1,
    freeze_class: L12FreezeClass.FULL_LAYER_FROZEN,
  });
  assert(policyIssues.length === 0,
    `H.16 FULL_LAYER_FROZEN policy validates clean (${policyIssues.length} issues)`);
}

// Rollout gate
{
  const dec = evaluateL12RolloutGate({
    candidate_phase: L12RolloutPhase.FROZEN_LIVE,
    certification_level: L12CertificationLevel.PRODUCTION_GREEN,
    critical_breach_count: 0,
    satisfied_flags: [...L12_ROLLOUT_PHASE_REQUIREMENTS[
      L12RolloutPhase.FROZEN_LIVE].required_flags],
  });
  assert(dec.admitted, 'H.17 FROZEN_LIVE gate admits with all flags');
}
{
  const dec = evaluateL12RolloutGate({
    candidate_phase: L12RolloutPhase.FROZEN_LIVE,
    certification_level: L12CertificationLevel.PRODUCTION_GREEN,
    critical_breach_count: 1,
    satisfied_flags: [...L12_ROLLOUT_PHASE_REQUIREMENTS[
      L12RolloutPhase.FROZEN_LIVE].required_flags],
  });
  assert(!dec.admitted, 'H.18 gate closes under critical breach');
}
{
  const dec = evaluateL12RolloutGate({
    candidate_phase: L12RolloutPhase.FULL_LIVE,
    certification_level: L12CertificationLevel.RUNTIME_GREEN,
    critical_breach_count: 0,
    satisfied_flags: [...L12_ROLLOUT_PHASE_REQUIREMENTS[
      L12RolloutPhase.FULL_LIVE].required_flags],
  });
  assert(!dec.admitted,
    'H.19 FULL_LIVE blocked when level=RUNTIME_GREEN');
}
{
  // Validator surfaces missing-flag violations.
  const dec = evaluateL12RolloutGate({
    candidate_phase: L12RolloutPhase.FULL_LIVE,
    certification_level: L12CertificationLevel.PRODUCTION_GREEN,
    critical_breach_count: 0,
    satisfied_flags: [],
  });
  const issues = validateL12RolloutGate({
    input: {
      candidate_phase: L12RolloutPhase.FULL_LIVE,
      certification_level: L12CertificationLevel.PRODUCTION_GREEN,
      critical_breach_count: 0,
      satisfied_flags: [],
    },
    decision: dec,
  });
  assert(issues.some(i =>
    i.code === L12FinalViolationCode.L12F_ROLLOUT_FLAG_MISSING),
    'H.20 missing rollout flags surface L12F_ROLLOUT_FLAG_MISSING');
}

// Extension classifier rejects prohibited
{
  const req: L12ExtensionRequest = {
    extension_request_id: 'ext.1',
    extension_surface: L12ExtensionSurface.SCENARIO_DOCTRINE,
    requested_change_ref: 'change.1',
    proposed_classification: L12ExtensionClassification.ADDITIVE_SAFE,
    migration_declared: false,
    recertification_declared: false,
    replay_backfill_declared: false,
    affected_sublayers: [L12SublayerId.L12_1_CONSTITUTION],
    weakens_trigger_law: false,
    weakens_invalidation_law: false,
    weakens_no_rebuild_law: false,
    enables_prediction_output: false,
    enables_recommendation_output: false,
    enables_final_judgment_output: false,
    bypasses_l5_persistence: false,
    removes_l11_score_context_requirement: false,
    reason_codes: [],
    lineage_refs: ['lineage.1'],
    policy_version: 'l12.7.extension.v1',
    replay_hash: 'l12.replay.test',
  };
  const a = classifyL12ExtensionRequest({ request: req });
  assert(!a.admitted, 'H.21 PROHIBITED surface rejected even if requester says ADDITIVE_SAFE');
  assert(a.final_classification === L12ExtensionClassification.PROHIBITED,
    'H.22 final classification PROHIBITED for SCENARIO_DOCTRINE');
}
{
  // Extension that weakens trigger law → rejected
  const req: L12ExtensionRequest = {
    extension_request_id: 'ext.2',
    extension_surface: L12ExtensionSurface.TRIGGER_STRENGTH_PROFILE,
    requested_change_ref: 'change.2',
    proposed_classification: L12ExtensionClassification.RECERTIFICATION_REQUIRED,
    migration_declared: false,
    recertification_declared: true,
    replay_backfill_declared: false,
    affected_sublayers: [L12SublayerId.L12_5_TEMPLATES],
    weakens_trigger_law: true,
    weakens_invalidation_law: false,
    weakens_no_rebuild_law: false,
    enables_prediction_output: false,
    enables_recommendation_output: false,
    enables_final_judgment_output: false,
    bypasses_l5_persistence: false,
    removes_l11_score_context_requirement: false,
    reason_codes: [],
    lineage_refs: ['lineage.2'],
    policy_version: 'l12.7.extension.v1',
    replay_hash: 'l12.replay.test',
  };
  const a = classifyL12ExtensionRequest({ request: req });
  assert(!a.admitted, 'H.23 trigger-law weakening rejected');
  assert(a.violation_codes.includes('L12F_WEAKENS_TRIGGER_REQUIREMENT'),
    'H.24 produces L12F_WEAKENS_TRIGGER_REQUIREMENT');
}
{
  // Additive safe (audit reason code) — admitted.
  const req: L12ExtensionRequest = {
    extension_request_id: 'ext.3',
    extension_surface: L12ExtensionSurface.AUDIT_REASON_CODE,
    requested_change_ref: 'change.3',
    proposed_classification: L12ExtensionClassification.ADDITIVE_SAFE,
    migration_declared: false,
    recertification_declared: false,
    replay_backfill_declared: false,
    affected_sublayers: [L12SublayerId.L12_1_CONSTITUTION],
    weakens_trigger_law: false,
    weakens_invalidation_law: false,
    weakens_no_rebuild_law: false,
    enables_prediction_output: false,
    enables_recommendation_output: false,
    enables_final_judgment_output: false,
    bypasses_l5_persistence: false,
    removes_l11_score_context_requirement: false,
    reason_codes: [],
    lineage_refs: ['lineage.3'],
    policy_version: 'l12.7.extension.v1',
    replay_hash: 'l12.replay.test',
  };
  const a = classifyL12ExtensionRequest({ request: req });
  assert(a.admitted, 'H.25 additive-safe audit reason code admitted');
  assert(a.final_classification === L12ExtensionClassification.ADDITIVE_SAFE,
    'H.26 final classification ADDITIVE_SAFE');
}
{
  // BREAKING_SEMANTIC requires backfill.
  const req: L12ExtensionRequest = {
    extension_request_id: 'ext.4',
    extension_surface: L12ExtensionSurface.PATH_CONFIDENCE_POLICY,
    requested_change_ref: 'change.4',
    proposed_classification: L12ExtensionClassification.BREAKING_SEMANTIC,
    migration_declared: true,
    recertification_declared: true,
    replay_backfill_declared: false,
    affected_sublayers: [L12SublayerId.L12_5_TEMPLATES],
    weakens_trigger_law: false,
    weakens_invalidation_law: false,
    weakens_no_rebuild_law: false,
    enables_prediction_output: false,
    enables_recommendation_output: false,
    enables_final_judgment_output: false,
    bypasses_l5_persistence: false,
    removes_l11_score_context_requirement: false,
    reason_codes: [],
    lineage_refs: ['lineage.4'],
    policy_version: 'l12.7.extension.v1',
    replay_hash: 'l12.replay.test',
  };
  const a = classifyL12ExtensionRequest({ request: req });
  assert(!a.admitted,
    'H.27 BREAKING_SEMANTIC without backfill rejected');
}

// L13 handoff approved only when no-rebuild law green.
{
  const handoff = validateL12Handoff(dependencyContract, {
    handoff_request_id: 'l13.req.good',
    consumer_layer: dependencyContract.allowed_consumer_layers[0],
    consumed_surfaces: dependencyContract.required_consumed_surfaces,
    attempted_use: dependencyContract.allowed_downstream_uses[1],
    attempted_prohibited_patterns: [],
    disclosures_honored: [...ALL_L12_DOWNSTREAM_DISCLOSURE_REQUIREMENTS],
    respects_restrictions: true,
    shows_invalidations: true,
    shows_path_confidence: true,
    shows_evidence: true,
    shows_lineage: true,
  });
  assert(handoff.approved,
    'H.28 well-formed L13 handoff approved');
}

// =============================================================
// L12.7 Invariants A..J — both green path & negative cases
// =============================================================
console.log('\n[Invariants] L12.7 invariants (A–J)');

const greenInvSet = runAllL12_7Invariants({
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
  artifact: masterResult.ratification_artifact,
  extension_assessments: [],
  capability_group_satisfied: Object.fromEntries(
    ALL_L12_FINAL_CAPABILITY_GROUPS.map(g => [g, true])) as
    Partial<Record<L12FinalCapabilityGroup, boolean>>,
  freeze_policy: { ...L12_FREEZE_POLICY_V1,
    freeze_class: L12FreezeClass.FULL_LAYER_FROZEN },
  certification_report: masterResult.certification_report,
});
assert(greenInvSet.length === 10, 'I.0 10 invariants returned');
for (const inv of greenInvSet) {
  assert(inv.holds, `I.${inv.id} ${inv.id} holds: ${inv.evidence}`);
}

// Negative path: any one missing sublayer breaks A
{
  const r = invariantL12_7_A_sublayerCompletion({
    sublayer_green: { ...allSublayersGreen,
      [L12SublayerId.L12_3_CONTRACTS]: false },
  });
  assert(!r.holds, 'I.A.neg L12.3 missing breaks INV-12.7-A');
}
// Negative path: critical breach breaks B
{
  const r = invariantL12_7_B_certificationBand({
    band_green: allBandsGreen,
    critical_breach_count: 3,
  });
  assert(!r.holds, 'I.B.neg critical breach breaks INV-12.7-B');
}
// Negative path: H rejects non-production-green
{
  const a = {
    ...masterResult.ratification_artifact,
    certification_level: L12CertificationLevel.PERSISTENCE_GREEN,
  } as L12LayerRatificationArtifact;
  const r = invariantL12_7_H_ratificationArtifact({ artifact: a });
  assert(!r.holds, 'I.H.neg PERSISTENCE_GREEN artifact rejected by INV-12.7-H');
}
// Negative path: I rejects PROHIBITED admitted
{
  const r = invariantL12_7_I_extensionSafety({
    assessments: [{
      extension_request_id: 'bad-ext',
      extension_surface: L12ExtensionSurface.SCENARIO_DOCTRINE,
      final_classification: L12ExtensionClassification.PROHIBITED,
      admitted: true,
      migration_required: false,
      recertification_required: false,
      replay_backfill_required: false,
      violation_codes: [],
      reason: 'forced',
      policy_version: 'l12.7.extension.v1',
    }],
  });
  assert(!r.holds, 'I.I.neg PROHIBITED admitted breaks INV-12.7-I');
}
// Negative path: G rejects contract missing required ban
{
  const badContract = {
    ...dependencyContract,
    prohibited_consumption_patterns: dependencyContract
      .prohibited_consumption_patterns.filter(p =>
        p !== L12ProhibitedDownstreamPattern.REBUILD_SCENARIO_FROM_LOWER_LAYERS),
  };
  const r = invariantL12_7_G_downstreamNoRebuildClosure({
    contract: badContract,
    l13_handoff_approved: true,
  });
  assert(!r.holds, 'I.G.neg missing rebuild ban breaks INV-12.7-G');
}
// Negative path: J rejects when capability group not satisfied
{
  const r = invariantL12_7_J_finalDoneDefinition({
    capability_group_satisfied: {
      ...Object.fromEntries(
        ALL_L12_FINAL_CAPABILITY_GROUPS.map(g => [g, true])) as
        Partial<Record<L12FinalCapabilityGroup, boolean>>,
      [L12FinalCapabilityGroup.PATH_CONFIDENCE_DERIVATION]: false,
    },
    artifact: masterResult.ratification_artifact,
    freeze_policy: { ...L12_FREEZE_POLICY_V1,
      freeze_class: L12FreezeClass.FULL_LAYER_FROZEN },
    certification_report: masterResult.certification_report,
  });
  assert(!r.holds, 'I.J.neg missing capability breaks INV-12.7-J');
}

// =============================================================
// Audit + rollback + playbooks coverage
// =============================================================
console.log('\n[Audit + rollback + playbooks]');

{
  const records = emitL12FinalAuditRecords(
    L12FinalAuditSubjectClass.RATIFICATION_ARTIFACT,
    'l12.master.v1.artifact',
    [{ code: L12FinalViolationCode.L12F_PREDICTION_THEATER_BREACH,
       message: 'prediction theater breach detected' }],
    T_RUN);
  assert(records.length === 1, 'AU.1 audit record emitted');
  assert(records[0].severity === L12FinalAuditSeverity.CRITICAL,
    'AU.2 prediction theater breach is CRITICAL');
  assert(records[0].audit_id.startsWith('l12r.audit.'),
    'AU.3 audit id under l12r.audit.* namespace');
}
{
  assert(
    severityForL12FinalViolationCode(
      L12FinalViolationCode.L12F_RECOMMENDATION_LEAK)
      === L12FinalAuditSeverity.CRITICAL,
    'AU.4 recommendation leak is CRITICAL');
  assert(
    severityForL12FinalViolationCode(
      L12FinalViolationCode.L12F_INVARIANT_FAILED)
      === L12FinalAuditSeverity.ERROR,
    'AU.5 invariant failure is ERROR');
}

// Rollback validation
{
  const r = validateL12RollbackRequest({
    rollback_request_id: 'rb.1',
    trigger: L12RollbackTrigger.PREDICTION_THEATER_BREACH,
    action: L12RollbackAction.DISABLE_LIVE_SERVING,
    reason: 'prediction theater detected in live output',
    affected_scenario_subject_ids: ['scn.1'],
    affected_template_families: [],
    deletes_historical_scenario_facts: false,
    mutates_prior_scenario_outputs: false,
    invents_evidence: false,
    hides_failure_reason: false,
    bypasses_l5_persistence: false,
    preserves_lineage: true,
    appends_rollback_record: true,
    maintains_evidence: true,
    notifies_downstream: true,
    policy_version: 'l12.7.rollback.v1',
  });
  assert(r.length === 0, `RB.1 valid rollback returns 0 issues (got ${r.length})`);
}
{
  const r = validateL12RollbackRequest({
    rollback_request_id: 'rb.2',
    trigger: L12RollbackTrigger.PREDICTION_THEATER_BREACH,
    action: L12RollbackAction.REQUIRE_REPAIR_RUN,
    reason: 'mismatched',
    affected_scenario_subject_ids: ['scn.1'],
    affected_template_families: [],
    deletes_historical_scenario_facts: false,
    mutates_prior_scenario_outputs: false,
    invents_evidence: false,
    hides_failure_reason: false,
    bypasses_l5_persistence: false,
    preserves_lineage: true,
    appends_rollback_record: true,
    maintains_evidence: true,
    notifies_downstream: true,
    policy_version: 'l12.7.rollback.v1',
  });
  assert(r.some(i => i.code === 'L12RB_TRIGGER_ACTION_MISMATCH'),
    'RB.2 trigger/action mismatch detected');
}
for (const t of Object.keys(L12_ROLLBACK_TRIGGER_TO_ACTION) as L12RollbackTrigger[]) {
  assert(L12_ROLLBACK_TRIGGER_TO_ACTION[t] !== undefined,
    `RB.3.${t} trigger maps to an action`);
}

// Playbooks coverage
{
  const cov = buildL12FailurePlaybookCoverageReport();
  assert(cov.ok, 'PB.1 all playbooks registered');
  assert(cov.registered === ALL_L12_FAILURE_PLAYBOOK_IDS.length,
    `PB.2 ${cov.registered} playbooks registered`);
  assert(cov.registered === 12, 'PB.3 12 playbooks registered (per spec)');
}

// Enable / disable disable preservation
{
  const issues = validateL12EnableDisableRequest({
    request_id: 'ed.1',
    subject_class: L12EnableDisableSubject.SCENARIO_TEMPLATE_FAMILY,
    subject_ref: 'l12.template.family.continuation',
    action: L12EnableDisableAction.DISABLE,
    reason: 'rollback',
    preserves_historical_truth: false,
    preserves_lineage: true,
    preserves_evidence: true,
    notifies_downstream: true,
    policy_version: 'l12.7.enable-disable.v1',
  });
  assert(issues.some(i =>
    i.code === 'L12ED_HISTORICAL_TRUTH_NOT_PRESERVED'),
    'ED.1 disable without historical truth preservation rejected');
}

// =============================================================
// Final summary
// =============================================================
console.log('\n══════════════════════════════════════════');
console.log('L12.7 Final Ratification Test Suite');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
if (failed > 0) {
  console.error('\nFailures:');
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('\n✓ ALL L12.7 RATIFICATION ASSERTIONS PASSED');

// ─── Helpers ────────────────────────────────────────────────────────

function L12_REQUIRED_SUBLAYER_STATUSES_GREEN() {
  return [
    ...L12_REQUIRED_SUBLAYERS_FOR_RATIFICATION,
    L12SublayerId.L12_7_RATIFICATION,
  ].map((s, i) => makeL12SublayerCertificationStatus(s,
    `test-${s.toLowerCase()}`, 100 + i, 0));
}

function invariantsHeldMap(allHeld: boolean): Record<string, boolean> {
  const m: Record<string, boolean> = {};
  for (const inv of L12_COMPLETION_STANDARD_V1.required_invariants) {
    m[inv] = allHeld;
  }
  return m;
}

// Suppress unused lint warnings on auxiliary imports
void computeL12CombinedLayerFingerprint;
void fingerprintL12String;
void buildL12RatificationArtifact;
void deriveL12CertificationLevel;
void isL12DownstreamDependencyContractValid;
void L12_FAILURE_PLAYBOOK_REGISTRY;
void L12_CERTIFICATION_BAND_REGISTRY;
void L12RolloutPhaseFlag;
void L12DownstreamDisclosureRequirement;
void makeL12CertificationBandResult;
void validateL12DownstreamHandoff;
void validateL12ExtensionAssessment;
