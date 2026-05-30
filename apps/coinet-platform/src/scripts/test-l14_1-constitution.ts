/**
 * L14.1 — Constitution Certification
 *
 * §14.1.23 — Bands A..E prove the Layer 14 constitutional laws
 * mechanically with crafted offenders and the green baseline.
 */

import {
  L14ConstitutionalAuditSeverity,
  L14ConstitutionalAuditSubjectClass,
} from '../l14/contracts/l14-constitutional-types';
import { L14ConstitutionalViolationCode } from '../l14/contracts/l14-violation-codes';
import {
  L14_CANONICAL_MISSION,
  L14_FIRST_PRINCIPLE,
} from '../l14/contracts/l14-mission';
import {
  ALL_L14_ALLOWED_CAPABILITIES,
  L14AllowedCapability,
  L14CapabilityGroup,
} from '../l14/contracts/l14-capability-policy';
import {
  ALL_L14_FORBIDDEN_ACTIONS,
  L14ForbiddenAction,
} from '../l14/contracts/l14-forbidden-actions';
import {
  ALL_L14_DEPENDENCY_SURFACE_CLASSES,
  L14DependencySurfaceClass,
} from '../l14/contracts/l14-dependency-surfaces';
import {
  ALL_L14_OUTPUT_SURFACE_CLASSES,
  L14OutputSurfaceClass,
} from '../l14/contracts/l14-output-surfaces';
import {
  getL14CapabilitiesInGroup,
  l14CapabilityAllowed,
} from '../l14/constitution/l14-capability-policy-map';
import {
  getL14DependencySurfaceDefinition,
  getL14DependencySurfaceDefinitions,
  l14DependencySurfaceRegistered,
} from '../l14/constitution/l14-dependency-surface.registry';
import {
  getL14OutputSurfaceDefinition,
  getL14OutputSurfaceDefinitions,
  l14OutputSurfaceRegistered,
} from '../l14/constitution/l14-output-surface.registry';
import {
  validateL14BoundarySemantics,
  validateL14CapabilityClaim,
  validateL14ComponentBoundary,
  validateL14DependencyAccess,
  validateL14FeedbackSeparation,
  validateL14ForbiddenAction,
  validateL14MissionAlignment,
  validateL14NoEngagementAsTruth,
  validateL14NoSilentSelfModification,
  validateL14NoTruthReconstruction,
  validateL14OutcomeHonesty,
  validateL14OutputSurface,
} from '../l14/constitution/l14-boundary-validator';
import {
  emitL14ConstitutionalAuditRecord,
  getL14ConstitutionalAuditLog,
  getL14ConstitutionalCriticalViolations,
  isL14ConstitutionalBlockingCode,
  resetL14ConstitutionalAuditLog,
  severityForL14ConstitutionalCode,
} from '../l14/constitution/l14-constitutional-audit';
import { runAllL14_1Invariants } from '../l14/invariants/l14_1-invariants';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(cond: unknown, msg: string): void {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${msg}`);
  } else {
    failed += 1;
    failures.push(msg);
    console.log(`  ✗ ${msg}`);
  }
}

function band(title: string): void {
  console.log(`\n── ${title} ──`);
}

// ── Band A : mission and boundary legality ─────────────────────────

band('BAND A — mission and boundary legality');

{
  // Mission + first principle are non-empty and frozen.
  assert(L14_CANONICAL_MISSION.length > 0, 'A.1 canonical mission frozen');
  assert(L14_FIRST_PRINCIPLE.length > 0, 'A.2 first principle frozen');
  // Mission identifies Layer 14 as delivery/feedback/calibration layer.
  assert(/deliver|delivery/i.test(L14_CANONICAL_MISSION), 'A.3 mission references delivery');
  assert(/calibration/i.test(L14_CANONICAL_MISSION), 'A.4 mission references calibration');
  assert(/feedback|observ/i.test(L14_CANONICAL_MISSION), 'A.5 mission references feedback/observation');
  // First principle forbids engagement-driven distortion.
  assert(/engagement[-\s]driven\s+distortion/i.test(L14_FIRST_PRINCIPLE), 'A.6 first principle forbids engagement-driven distortion');
  // Mission alignment validator.
  const green = validateL14MissionAlignment(L14_CANONICAL_MISSION, L14_FIRST_PRINCIPLE);
  assert(green.clean, 'A.7 mission alignment validator clean on canonical mission');
  // Mutation rejected.
  const mutated = validateL14MissionAlignment('Layer 14 maximizes engagement metrics for product growth.', L14_FIRST_PRINCIPLE);
  assert(!mutated.clean, 'A.8 mission alignment validator rejects mutated mission');
  // Truth-rebuild semantic scan rejected.
  const rebuild = validateL14BoundarySemantics('Recompute the Opportunity Score in L14 from underlying features.');
  assert(!rebuild.clean && rebuild.issues.some(i => i.code === L14ConstitutionalViolationCode.L14C_RAW_LOWER_LAYER_REBUILD_ATTEMPT), 'A.9 truth-rebuild language detected by boundary scanner');
  // Engagement-as-truth scan rejected.
  const engage = validateL14BoundarySemantics('open rate validates hypothesis.');
  assert(!engage.clean, 'A.10 engagement-as-truth language detected by boundary scanner');
  // Self-modification scan rejected.
  const selfmod = validateL14BoundarySemantics('Auto-adjust threshold immediately.');
  assert(!selfmod.clean, 'A.11 self-modification language detected by boundary scanner');
}

// ── Band B : dependency law ─────────────────────────────────────────

band('BAND B — dependency law');

{
  const defs = getL14DependencySurfaceDefinitions();
  assert(defs.length >= 24, `B.1 ≥24 dependency surfaces registered (got ${defs.length})`);
  // Every enumerated class is registered.
  for (const cls of ALL_L14_DEPENDENCY_SURFACE_CLASSES) {
    assert(l14DependencySurfaceRegistered(cls), `B.2 ${cls} registered`);
  }
  // Source layer coverage.
  const layers = new Set(defs.map(d => d.source_layer));
  assert(layers.has('L5') && layers.has('L10') && layers.has('L11') && layers.has('L12') && layers.has('L13'), 'B.3 dependency registry covers L5/L10/L11/L12/L13');
  // Every dependency forbids raw lower-layer bypass.
  assert(defs.every(d => d.raw_lower_layer_bypass_forbidden === true), 'B.4 every dependency forbids raw lower-layer bypass');
  // Every dependency requires lineage + replay hash.
  assert(defs.every(d => d.lineage_required && d.replay_hash_required), 'B.5 every dependency requires lineage + replay hash');
  // Green dependency access.
  const greenAccess = validateL14DependencyAccess(
    L14DependencySurfaceClass.L11_CURRENT_SCORE_SET,
    false, true, true,
  );
  assert(greenAccess.clean, 'B.6 green dependency access validates');
  // Bypass attempt rejected with precise code.
  const bypass = validateL14DependencyAccess(
    L14DependencySurfaceClass.L11_CURRENT_SCORE_SET,
    true, true, true,
  );
  assert(!bypass.clean && bypass.issues.some(i => i.code === L14ConstitutionalViolationCode.L14C_RAW_LOWER_LAYER_REBUILD_ATTEMPT), 'B.7 bypass attempt rejected with raw-rebuild code');
  // Missing lineage flagged with precise code.
  const noLineage = validateL14DependencyAccess(
    L14DependencySurfaceClass.L11_CURRENT_SCORE_SET,
    false, false, true,
  );
  assert(noLineage.issues.some(i => i.code === L14ConstitutionalViolationCode.L14C_OUTPUT_SURFACE_LINEAGE_MISSING), 'B.8 missing lineage flagged');
  // Unregistered surface rejected.
  const unknown = validateL14DependencyAccess(
    'FAKE_SURFACE' as L14DependencySurfaceClass,
    false, true, true,
  );
  assert(!unknown.clean && unknown.issues.some(i => i.code === L14ConstitutionalViolationCode.L14C_UNREGISTERED_DEPENDENCY_SURFACE), 'B.9 unregistered surface rejected');
  // L13 payload surface requires restriction posture.
  const l13Def = getL14DependencySurfaceDefinition(L14DependencySurfaceClass.L13_ALERT_PAYLOAD);
  assert(l13Def?.restriction_posture_required === true, 'B.10 L13 alert payload requires restriction posture');
}

// ── Band C : capability and forbidden-action law ───────────────────

band('BAND C — capability and forbidden-action law');

{
  // All 20 allowed capabilities recognized.
  assert(ALL_L14_ALLOWED_CAPABILITIES.length >= 20, `C.1 ≥20 allowed capabilities enumerated (got ${ALL_L14_ALLOWED_CAPABILITIES.length})`);
  for (const cap of ALL_L14_ALLOWED_CAPABILITIES) {
    assert(l14CapabilityAllowed(cap), `C.2 capability ${cap} allowed`);
  }
  // Capability groups cover all 6 groups.
  const allGroups: readonly L14CapabilityGroup[] = [
    L14CapabilityGroup.LOWER_LAYER_CONSUMPTION,
    L14CapabilityGroup.DELIVERY_CONTROL,
    L14CapabilityGroup.INTERACTION_OBSERVATION,
    L14CapabilityGroup.OUTCOME_EVALUATION,
    L14CapabilityGroup.CALIBRATION_EVIDENCE,
    L14CapabilityGroup.ANALYST_AND_OPERATIONS,
  ];
  for (const g of allGroups) {
    assert(getL14CapabilitiesInGroup(g).length > 0, `C.3 capability group ${g} non-empty`);
  }
  // Green capability claim.
  const greenCap = validateL14CapabilityClaim(L14AllowedCapability.PRODUCE_CALIBRATION_EVIDENCE);
  assert(greenCap.clean, 'C.4 green capability claim validates');
  // Unrecognized capability rejected.
  const badCap = validateL14CapabilityClaim('FAKE_CAP' as L14AllowedCapability);
  assert(!badCap.clean, 'C.5 unrecognized capability rejected');
  // Forbidden actions all block.
  assert(ALL_L14_FORBIDDEN_ACTIONS.length >= 28, `C.6 ≥28 forbidden actions enumerated (got ${ALL_L14_FORBIDDEN_ACTIONS.length})`);
  for (const a of ALL_L14_FORBIDDEN_ACTIONS) {
    const v = validateL14ForbiddenAction(a);
    assert(!v.clean, `C.7 forbidden action ${a} blocked`);
  }
  // Engagement-as-truth rejected.
  const openRate = validateL14NoEngagementAsTruth({ treats_open_rate_as_correctness: true });
  assert(!openRate.clean && openRate.issues.some(i => i.code === L14ConstitutionalViolationCode.L14C_OPEN_RATE_AS_CORRECTNESS), 'C.8 open-rate-as-correctness rejected');
  const clickRate = validateL14NoEngagementAsTruth({ treats_click_rate_as_correctness: true });
  assert(!clickRate.clean && clickRate.issues.some(i => i.code === L14ConstitutionalViolationCode.L14C_CLICK_RATE_AS_CORRECTNESS), 'C.9 click-rate-as-correctness rejected');
  // Feedback-as-truth rejected.
  const fb = validateL14FeedbackSeparation({ treats_feedback_as_truth: true });
  assert(!fb.clean, 'C.10 feedback-as-truth rejected');
  // Silent self-modification rejected (covers Law 3).
  const selfmod = validateL14NoSilentSelfModification({
    mutates_l11_threshold: true,
    mutates_l13_safety_policy: true,
  });
  assert(!selfmod.clean && selfmod.issues.length >= 2, 'C.11 silent self-modification rejected (L11 threshold + L13 safety)');
  // Calibration proposal auto-apply rejected.
  const autoApply = validateL14NoSilentSelfModification({ auto_applies_calibration_proposal: true });
  assert(!autoApply.clean && autoApply.issues.some(i => i.code === L14ConstitutionalViolationCode.L14C_CALIBRATION_PROPOSAL_AUTO_APPLY), 'C.12 calibration proposal auto-apply rejected');
  // Delivery rewrite of source meaning rejected (via output surface validator).
  const rewrite = validateL14OutputSurface({
    surface_class: L14OutputSurfaceClass.DELIVERY_ROUTING_SURFACE,
    has_lineage: true, has_replay_hash: true, has_l5_route: true,
    delivery_rewrites_source_meaning: true,
  });
  assert(!rewrite.clean && rewrite.issues.some(i => i.code === L14ConstitutionalViolationCode.L14C_DELIVERY_REWRITES_SOURCE_MEANING), 'C.13 delivery rewriting source meaning rejected');
  // Outcome honesty checks (Law 4) — hidden misalignment rejected.
  const hide = validateL14OutcomeHonesty({ hides_misalignment: true });
  assert(!hide.clean && hide.issues.some(i => i.code === L14ConstitutionalViolationCode.L14C_OUTCOME_MISALIGNMENT_HIDDEN), 'C.14 hidden outcome misalignment rejected');
}

// ── Band D : output surface law ─────────────────────────────────────

band('BAND D — output surface law');

{
  const defs = getL14OutputSurfaceDefinitions();
  assert(defs.length === 12, `D.1 12 output surfaces registered (got ${defs.length})`);
  for (const cls of ALL_L14_OUTPUT_SURFACE_CLASSES) {
    assert(l14OutputSurfaceRegistered(cls), `D.2 ${cls} registered`);
  }
  // Every output surface forbids lower-layer mutation + truth claim.
  assert(defs.every(d => d.may_mutate_lower_layers === false), 'D.3 every output surface forbids lower-layer mutation');
  assert(defs.every(d => d.may_claim_truth === false), 'D.4 every output surface forbids truth claim');
  assert(defs.every(d => d.lower_layer_rebuild_forbidden === true), 'D.5 every output surface forbids lower-layer rebuild');
  assert(defs.every(d => d.engagement_as_truth_forbidden === true), 'D.6 every output surface forbids engagement-as-truth');
  // Every output surface requires lineage + replay hash + L5 route.
  assert(defs.every(d => d.lineage_required && d.replay_hash_required && d.l5_route_required), 'D.7 every output surface requires lineage + replay hash + L5 route');
  // Evaluation surfaces declare evaluation claim.
  const evalSurfaces = defs.filter(d => d.may_claim_evaluation === true);
  assert(evalSurfaces.length >= 4, `D.8 evaluation surfaces present (got ${evalSurfaces.length})`);
  // Calibration evidence surface requires lineage (validator enforces).
  const calibEvidence = getL14OutputSurfaceDefinition(L14OutputSurfaceClass.CALIBRATION_EVIDENCE_SURFACE);
  assert(calibEvidence?.may_claim_calibration_evidence === true, 'D.9 calibration evidence surface may claim calibration evidence');
  // Calibration proposal surface may generate review proposal but never auto-apply (enforced by validator).
  const calibProposal = getL14OutputSurfaceDefinition(L14OutputSurfaceClass.CALIBRATION_PROPOSAL_SURFACE);
  assert(calibProposal?.may_generate_review_proposal === true, 'D.10 calibration proposal surface may generate review proposal');
  // Analyst / operational surfaces never claim truth.
  const ops = getL14OutputSurfaceDefinition(L14OutputSurfaceClass.OPERATIONAL_HEALTH_SURFACE);
  assert(ops?.may_claim_truth === false, 'D.11 operational health surface cannot claim truth');
  // Output surfaces require L5 route via validator.
  const noRoute = validateL14OutputSurface({
    surface_class: L14OutputSurfaceClass.OUTCOME_EVALUATION_SURFACE,
    has_lineage: true, has_replay_hash: true, has_l5_route: false,
    is_evaluation_surface: true, carries_horizon_when_evaluating: true,
  });
  assert(!noRoute.clean && noRoute.issues.some(i => i.code === L14ConstitutionalViolationCode.L14C_OUTPUT_SURFACE_L5_ROUTE_MISSING), 'D.12 missing L5 route rejected');
  // Evaluation surface without horizon rejected.
  const noHorizon = validateL14OutputSurface({
    surface_class: L14OutputSurfaceClass.ALERT_EFFECTIVENESS_SURFACE,
    has_lineage: true, has_replay_hash: true, has_l5_route: true,
    is_evaluation_surface: true, carries_horizon_when_evaluating: false,
  });
  assert(!noHorizon.clean && noHorizon.issues.some(i => i.code === L14ConstitutionalViolationCode.L14C_EVALUATION_WITHOUT_HORIZON), 'D.13 evaluation surface without horizon rejected');
  // Auto-apply calibration proposal rejected.
  const autoApply = validateL14OutputSurface({
    surface_class: L14OutputSurfaceClass.CALIBRATION_PROPOSAL_SURFACE,
    has_lineage: true, has_replay_hash: true, has_l5_route: true,
    is_calibration_proposal: true, auto_applies_proposal: true,
  });
  assert(!autoApply.clean && autoApply.issues.some(i => i.code === L14ConstitutionalViolationCode.L14C_CALIBRATION_PROPOSAL_AUTO_APPLY), 'D.14 calibration proposal auto-apply rejected');
  // Component boundary green example.
  const greenComp = validateL14ComponentBoundary({
    component_id: 'l14.test.alert-router',
    description: 'Routes governed L13 alerts to channels and records delivery events.',
    capabilities: [L14AllowedCapability.ROUTE_DELIVERY_CHANNELS, L14AllowedCapability.RECORD_DELIVERY_EVENTS, L14AllowedCapability.CONSUME_GOVERNED_L13_OUTPUTS],
    dependency_surfaces: [L14DependencySurfaceClass.L13_ALERT_PAYLOAD],
    output_surfaces: [L14OutputSurfaceClass.DELIVERY_ROUTING_SURFACE, L14OutputSurfaceClass.USER_INTERACTION_EVENT_SURFACE],
  });
  assert(greenComp.clean, `D.15 green component boundary validates clean (issues=${greenComp.issues.length})`);
  // Component with rebuild-language in description rejected.
  const badComp = validateL14ComponentBoundary({
    component_id: 'l14.test.bad-rebuilder',
    description: 'Recompute the Opportunity Score in L14 from underlying features and infer a new bullish scenario from engagement.',
    capabilities: [L14AllowedCapability.PRODUCE_CALIBRATION_EVIDENCE],
    dependency_surfaces: [],
    output_surfaces: [L14OutputSurfaceClass.CALIBRATION_EVIDENCE_SURFACE],
    attempts_forbidden_actions: [L14ForbiddenAction.REBUILD_L11_SCORE],
  });
  assert(!badComp.clean, 'D.16 component attempting forbidden rebuild rejected');
}

// ── Band E : audit and invariants ───────────────────────────────────

band('BAND E — audit and invariants');

{
  resetL14ConstitutionalAuditLog();
  // Deterministic emission.
  const a = emitL14ConstitutionalAuditRecord({
    subjectClass: L14ConstitutionalAuditSubjectClass.BOUNDARY,
    subjectRef: 'l14.cert.boundary',
    violationCodes: [L14ConstitutionalViolationCode.L14C_ENGAGEMENT_AS_TRUTH],
    message: 'cert: engagement-as-truth',
  });
  const b = emitL14ConstitutionalAuditRecord({
    subjectClass: L14ConstitutionalAuditSubjectClass.BOUNDARY,
    subjectRef: 'l14.cert.boundary',
    violationCodes: [L14ConstitutionalViolationCode.L14C_ENGAGEMENT_AS_TRUTH],
    message: 'cert: engagement-as-truth',
  });
  assert(a.replay_hash === b.replay_hash, 'E.1 audit replay hash deterministic');
  assert(a.severity === L14ConstitutionalAuditSeverity.CRITICAL, 'E.2 engagement-as-truth audit is CRITICAL');
  assert(a.blocking, 'E.3 engagement-as-truth audit is blocking');
  // Severity mapping.
  assert(
    severityForL14ConstitutionalCode(L14ConstitutionalViolationCode.L14C_OUTPUT_SURFACE_LINEAGE_MISSING) === L14ConstitutionalAuditSeverity.ERROR,
    'E.4 lineage missing classified as ERROR',
  );
  assert(
    !isL14ConstitutionalBlockingCode(L14ConstitutionalViolationCode.L14C_OUTPUT_SURFACE_LINEAGE_MISSING),
    'E.5 lineage missing not blocking',
  );
  assert(
    isL14ConstitutionalBlockingCode(L14ConstitutionalViolationCode.L14C_FEEDBACK_AS_AUTOMATIC_TRUTH),
    'E.6 feedback-as-truth is blocking',
  );
  assert(getL14ConstitutionalAuditLog().length === 2, 'E.7 audit log queryable');
  assert(getL14ConstitutionalCriticalViolations().length === 2, 'E.8 critical violations queryable');
  // Run all invariants.
  const invs = runAllL14_1Invariants();
  assert(invs.length === 8, `E.9 eight invariants executed (got ${invs.length})`);
  for (const inv of invs) {
    assert(inv.holds, `E.10 ${inv.id} ${inv.name} (${inv.evidence})`);
  }
}

console.log('');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
if (failed > 0) {
  console.log('Failures:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
