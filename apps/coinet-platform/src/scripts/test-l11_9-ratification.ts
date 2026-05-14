/**
 * L11.9 — Final Ratification, Closure, and Rollout Governance
 * Certification Test Suite (§11.9.12)
 *
 * 10 Bands (A–J). This suite tests the L11.9 closure machinery in
 * isolation against crafted synthetic inputs. The full cross-layer
 * regression (Band H) and master ratification artifact production
 * (Band J) are exercised end-to-end by `test-l11_master.ts`.
 *
 * §11.9.2 Non-duplication law: this suite never re-implements
 * L11.1–L11.8 logic. It only validates closure contracts,
 * certification substrate, rollout governance, audit, and invariants.
 */

import {
  // L11.9 closure contracts
  L11_FINAL_LAYER_DEFINITION,
  L11_FINAL_LAYER_SENTENCE,
  ALL_L11_PRODUCED_SURFACE_TAGS,
  ALL_L11_NON_PRODUCTION_SURFACE_TAGS,
  L11ProducedSurfaceTag,
  L11NonProductionSurfaceTag,

  L11SublayerId,
  ALL_L11_SUBLAYER_IDS,
  L11_REQUIRED_SUBLAYERS_FOR_RATIFICATION,
  L11_LAYER_INVENTORY,
  L11FinalOutputSurface,
  ALL_L11_FINAL_OUTPUT_SURFACES,

  L11CompletionClause,
  ALL_L11_COMPLETION_CLAUSES,
  L11_COMPLETION_CLAUSE_TO_SUBLAYER,
  buildL11CompletionStandardReport,
  makeL11CompletionClauseStatus,

  L11_FREEZE_POLICY_V1,
  L11FreezeStatus,
  L11AllowedPostFreezeChange,
  L11ProhibitedPostFreezeChange,
  ALL_L11_ALLOWED_POST_FREEZE_CHANGES,
  ALL_L11_PROHIBITED_POST_FREEZE_CHANGES,
  isL11ChangeProhibitedAfterFreeze,
  L11RatificationRequiredSurface,

  L11ExtensionClassification,
  ALL_L11_EXTENSION_CLASSIFICATIONS,
  L11ExtensionSurface,
  ALL_L11_EXTENSION_SURFACES,
  L11ExtensionAssessment,
  L11ExtensionAssessmentViolationCode,
  validateL11ExtensionAssessment,

  L11DownstreamConsumer,
  ALL_L11_DOWNSTREAM_CONSUMERS,
  L11ForbiddenDownstreamConsumptionPattern,
  ALL_L11_FORBIDDEN_DOWNSTREAM_CONSUMPTION_PATTERNS,
  L11_SCORE_CONTEXT_BUNDLE_REQUIREMENT,
  buildL11DownstreamDependencyContract,
  isL11DownstreamDependencyContractValid,

  L11LayerRatificationArtifact,
  L11CertificationLevel,
  ALL_L11_CERTIFICATION_LEVELS,
  L11_CERTIFICATION_LEVEL_RANK,
  computeL11ArtifactFingerprint,
  L11SublayerCertificationSummary,
  L11CertificationBandResult,
} from '../l11/contracts';

import {
  L11CertificationBand,
  ALL_L11_CERTIFICATION_BANDS,
  describeL11Band,
  L11_CERTIFICATION_BAND_REGISTRY,
  deriveL11CertificationLevel,
  makeL11SublayerSummary,
  makeL11BandResult,
  makeL11InvariantResult,
  makeL11RegressionResult,
  buildL11SublayerGreenMap,
  buildL11BandGreenMap,
  isL11SublayerSummaryGreen,
  runL11Bands,
  runL11MasterCertification,
  l11ArtifactIsProductionGreen,
} from '../l11/certification';

import {
  L11RolloutPhase,
  ALL_L11_ROLLOUT_PHASES,
  L11_ROLLOUT_PHASE_ORDER,
  L11_ROLLOUT_PHASE_MIN_CERT_LEVEL,
  L11RolloutPhaseFlag,
  L11_ROLLOUT_PHASE_REQUIREMENTS,
  evaluateL11RolloutGate,

  L11EnableDisableSubject,
  L11EnableDisableAction,
  L11EnableDisableViolationCode,
  validateL11EnableDisableRequest,

  L11RollbackMode,
  ALL_L11_ROLLBACK_MODES,
  L11RollbackViolationCode,
  validateL11RollbackRequest,

  L11FailurePlaybookId,
  ALL_L11_FAILURE_PLAYBOOK_IDS,
  L11_FAILURE_PLAYBOOK_REGISTRY,
  L11PlaybookImmediateAction,
  buildL11FailurePlaybookCoverageReport,
  getL11FailurePlaybook,
} from '../l11/rollout';

import {
  L11FinalAuditSubjectClass,
  ALL_L11_FINAL_AUDIT_SUBJECT_CLASSES,
  L11FinalAuditSeverity,
  L11FinalAuditCode,
  ALL_L11_FINAL_AUDIT_CODES,
  severityForL11FinalAuditCode,
  makeL11FinalAuditRecord,
  emitL11FinalAuditRecords,
} from '../l11/constitution/l11-final-audit';

import {
  invariantL11_9_A_completionCoverage,
  invariantL11_9_B_nonDuplication,
  invariantL11_9_C_productionGreenGate,
  invariantL11_9_D_freeze,
  invariantL11_9_E_l12DependencySafety,
  invariantL11_9_F_noJudgmentLeakage,
  invariantL11_9_G_replayRepairClosure,
  invariantL11_9_H_artifactFingerprint,
  runAllL11_9Invariants,
} from '../l11/invariants/l11_9-invariants';

import {
  invariantL11_A_meaningClaim,
  invariantL11_B_determinism,
  invariantL11_C_attribution,
  invariantL11_D_missingData,
  invariantL11_E_modifierBoundary,
  invariantL11_F_calibration,
  invariantL11_G_driftGovernance,
  invariantL11_H_nonJudgment,
  runAllL11MasterInvariants,
} from '../l11/invariants/l11-master-invariants';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(cond: boolean, label: string): void {
  if (cond) { passed++; }
  else { failed++; failures.push(label); console.error(`  ✗ FAIL: ${label}`); }
}

const T0 = '2026-05-08T00:00:00Z';

// ─────────────────────────────────────────────────────────────────
// Builders for synthetic ratification inputs
// ─────────────────────────────────────────────────────────────────

function allGreenSummaries():
  readonly L11SublayerCertificationSummary[] {
  return ALL_L11_SUBLAYER_IDS.map((sublayer, i) =>
    makeL11SublayerSummary({
      sublayer,
      suite_id: `test-${sublayer.toLowerCase()}`,
      assertions_passed: 100 + i,
      assertions_failed: 0,
      invariants_held: 8,
      invariants_failed: 0,
    }));
}

function allGreenBandsFromSummaries(
  sums: readonly L11SublayerCertificationSummary[],
): readonly L11CertificationBandResult[] {
  return runL11Bands({
    sublayer_green: buildL11SublayerGreenMap(sums),
    l10_master_green: true,
    rollout_governance_green: true,
    artifact_fingerprint_present: true,
  });
}

function buildGoldenArtifact(): L11LayerRatificationArtifact {
  const sums = allGreenSummaries();
  const bands = allGreenBandsFromSummaries(sums);
  return runL11MasterCertification({
    sublayer_summaries: sums,
    band_results: bands,
    invariant_results: [
      ...ALL_L11_CERTIFICATION_BANDS.map(b =>
        makeL11InvariantResult(`INV-band-${b}`, true, 'band ok')),
      makeL11InvariantResult('INV-11-A', true, 'meaning law'),
      makeL11InvariantResult('INV-11-B', true, 'determinism law'),
    ],
    regression_results: [
      makeL11RegressionResult('test-l10_master', 60, 0),
      makeL11RegressionResult('test-l11_1-constitution', 666, 0),
      makeL11RegressionResult('test-l11_8-persistence', 164, 0),
    ],
    l10_master_green: true,
    rollout_recommended: true,
    freeze_activated: true,
    dependency_contract_ref: 'l11.dependency.v1',
    freeze_policy_ref: 'l11.freeze.v1',
    extension_policy_ref: 'l11.9.extension.v1',
    critical_breach_count: 0,
    warning_count: 0,
    generated_at: T0,
  });
}

function buildExtensionAssessment(
  overrides: Partial<L11ExtensionAssessment> = {},
): L11ExtensionAssessment {
  const base: L11ExtensionAssessment = {
    extension_assessment_id: 'l11e.assess.001',
    extension_surface: L11ExtensionSurface.SCORE_FAMILY,
    requested_change_ref: 'change.0001',
    classification: L11ExtensionClassification.ADDITIVE_SAFE,
    migration_required: false,
    recalibration_required: false,
    replay_backfill_required: false,
    ratification_required: false,
    affected_sublayers: [L11SublayerId.L11_2_SCORE_DOCTRINE],
    affected_score_families: ['OPPORTUNITY'],
    affected_formula_versions: [],
    reason_codes: ['NEW_RESERVED_FAMILY'],
    lineage_refs: ['l11.lineage.ext.001'],
    policy_version: 'l11.9.extension.v1',
    replay_hash: 'l11e.h.001',
  };
  return { ...base, ...overrides };
}

// ═══════════════════════════════════════════════════════════════
// BAND A — Score doctrine and contracts (closure facets)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND A: Score doctrine and contracts (closure) ═══');

assert(L11_FINAL_LAYER_DEFINITION.layer_id === 'L11', 'A.01 final layer id is L11');
assert(L11_FINAL_LAYER_DEFINITION.layer_name === 'Deterministic Scoring Engine',
  'A.02 final layer name frozen');
assert(L11_FINAL_LAYER_SENTENCE.includes('without becoming judgment'),
  'A.03 final sentence frozen');
assert(L11_FINAL_LAYER_DEFINITION.final_sentence === L11_FINAL_LAYER_SENTENCE,
  'A.04 final sentence linked to definition');
assert(ALL_L11_PRODUCED_SURFACE_TAGS.length === 9,
  'A.05 9 produced surface tags');
assert(ALL_L11_PRODUCED_SURFACE_TAGS.includes(
  L11ProducedSurfaceTag.SCORE_ATTRIBUTION),
  'A.06 produces SCORE_ATTRIBUTION');
assert(ALL_L11_NON_PRODUCTION_SURFACE_TAGS.length === 5,
  'A.07 5 non-production tags');
assert(ALL_L11_NON_PRODUCTION_SURFACE_TAGS.includes(
  L11NonProductionSurfaceTag.FINAL_JUDGMENT),
  'A.08 explicitly does not produce FINAL_JUDGMENT');

assert(ALL_L11_SUBLAYER_IDS.length === 9, 'A.09 9 L11 sublayers enumerated');
assert(L11_REQUIRED_SUBLAYERS_FOR_RATIFICATION.length === 8,
  'A.10 8 sublayers required for ratification (L11.9 itself excluded)');
assert(!L11_REQUIRED_SUBLAYERS_FOR_RATIFICATION.includes(
  L11SublayerId.L11_9_RATIFICATION),
  'A.11 L11.9 itself is not in the required-for-ratification list');

assert(L11_LAYER_INVENTORY.layer_id === 'L11', 'A.12 layer inventory id is L11');
assert(L11_LAYER_INVENTORY.required_certification_suites.length === 10,
  'A.13 10 certification suites enumerated');
assert(L11_LAYER_INVENTORY.required_invariant_surfaces.length === 10,
  'A.14 10 invariant modules enumerated');
assert(L11_LAYER_INVENTORY.required_audit_surfaces.includes('l11-final-audit'),
  'A.15 l11-final-audit registered in inventory');
assert(L11_LAYER_INVENTORY.required_audit_surfaces.includes('l11-persistence-audit'),
  'A.16 l11-persistence-audit registered in inventory');

assert(ALL_L11_FINAL_OUTPUT_SURFACES.length === 9,
  'A.17 9 final output surfaces');
assert(ALL_L11_FINAL_OUTPUT_SURFACES.includes(L11FinalOutputSurface.SCORE_OUTPUT),
  'A.18 SCORE_OUTPUT registered');
assert(ALL_L11_FINAL_OUTPUT_SURFACES.includes(
  L11FinalOutputSurface.SCORE_LINEAGE_READ_SURFACE),
  'A.19 SCORE_LINEAGE_READ_SURFACE registered');

// ═══════════════════════════════════════════════════════════════
// BAND B — Completion standard
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND B: Completion standard ═══');

assert(ALL_L11_COMPLETION_CLAUSES.length === 9,
  'B.01 9 completion clauses');
for (const c of ALL_L11_COMPLETION_CLAUSES) {
  const sub = L11_COMPLETION_CLAUSE_TO_SUBLAYER[c];
  assert(!!sub, `B.02.${c} clause maps to a sublayer`);
}

const allClausesGreen = ALL_L11_COMPLETION_CLAUSES.map(c =>
  makeL11CompletionClauseStatus(c, true, 'ok'));
const greenReport = buildL11CompletionStandardReport(allClausesGreen);
assert(greenReport.all_satisfied, 'B.03 fully-satisfied report is green');
assert(greenReport.unsatisfied_clauses.length === 0,
  'B.04 fully-satisfied report has no unsatisfied clauses');

const partial = ALL_L11_COMPLETION_CLAUSES.map((c, i) =>
  makeL11CompletionClauseStatus(c, i !== 0, 'sometimes ok'));
const partialReport = buildL11CompletionStandardReport(partial);
assert(!partialReport.all_satisfied, 'B.05 partially-satisfied report is red');
assert(partialReport.unsatisfied_clauses.length === 1,
  'B.06 reports exactly the unsatisfied clauses');

const incomplete = allClausesGreen.slice(0, 8);
const incompleteReport = buildL11CompletionStandardReport(incomplete);
assert(!incompleteReport.all_satisfied,
  'B.07 missing clause causes red report');

// ═══════════════════════════════════════════════════════════════
// BAND C — Freeze policy
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND C: Freeze policy ═══');

assert(L11_FREEZE_POLICY_V1.layer_id === 'L11', 'C.01 freeze policy is for L11');
assert(L11_FREEZE_POLICY_V1.status === L11FreezeStatus.PRE_FREEZE,
  'C.02 freeze policy starts at PRE_FREEZE');
assert(L11_FREEZE_POLICY_V1.frozen_sublayers.length === 8,
  'C.03 8 frozen sublayers (L11.1..L11.8)');
assert(L11_FREEZE_POLICY_V1.frozen_formulas.length === 8,
  'C.04 8 frozen production formulas');
assert(L11_FREEZE_POLICY_V1.frozen_threshold_policies.length === 8,
  'C.05 8 frozen threshold policies');
assert(L11_FREEZE_POLICY_V1.frozen_read_surfaces.length === 12,
  'C.06 12 frozen read surfaces');
assert(ALL_L11_ALLOWED_POST_FREEZE_CHANGES.length === 6,
  'C.07 6 allowed post-freeze change kinds');
assert(ALL_L11_PROHIBITED_POST_FREEZE_CHANGES.length === 9,
  'C.08 9 prohibited post-freeze change kinds');
assert(L11_FREEZE_POLICY_V1.requires_ratification_for.length >= 9,
  'C.09 requires ratification for ≥9 surface kinds');

assert(isL11ChangeProhibitedAfterFreeze(
  L11ProhibitedPostFreezeChange.SILENT_SCORE_MEANING_CHANGE),
  'C.10 SILENT_SCORE_MEANING_CHANGE is prohibited');
assert(isL11ChangeProhibitedAfterFreeze(
  L11ProhibitedPostFreezeChange.L5_PERSISTENCE_BYPASS),
  'C.11 L5_PERSISTENCE_BYPASS is prohibited');
assert(isL11ChangeProhibitedAfterFreeze(
  L11ProhibitedPostFreezeChange.SCORE_AS_RECOMMENDATION_LEAK),
  'C.12 SCORE_AS_RECOMMENDATION_LEAK is prohibited');
assert(!isL11ChangeProhibitedAfterFreeze(
  L11AllowedPostFreezeChange.ADD_CALIBRATION_TARGET as never),
  'C.13 ADD_CALIBRATION_TARGET is allowed (not prohibited)');

// ═══════════════════════════════════════════════════════════════
// BAND D — Extension policy
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND D: Extension policy ═══');

assert(ALL_L11_EXTENSION_CLASSIFICATIONS.length === 6,
  'D.01 6 extension classifications');
assert(ALL_L11_EXTENSION_SURFACES.length >= 18,
  `D.02 at least 18 extension surfaces (got ${ALL_L11_EXTENSION_SURFACES.length})`);

// Legal additive
const additive = buildExtensionAssessment();
const additiveIssues = validateL11ExtensionAssessment(additive);
assert(additiveIssues.length === 0,
  `D.03 additive-safe extension is legal (got ${additiveIssues.length} issues)`);

// Missing classification
assert(validateL11ExtensionAssessment(buildExtensionAssessment({
  classification: undefined as unknown as L11ExtensionClassification,
})).some(i => i.code === L11ExtensionAssessmentViolationCode.L11E_CLASSIFICATION_MISSING),
  'D.04 missing classification rejected');

// Missing affected sublayers
assert(validateL11ExtensionAssessment(buildExtensionAssessment({
  affected_sublayers: [],
})).some(i => i.code === L11ExtensionAssessmentViolationCode.L11E_AFFECTED_SUBLAYERS_MISSING),
  'D.05 empty affected_sublayers rejected');

// MIGRATION_REQUIRED without flag
assert(validateL11ExtensionAssessment(buildExtensionAssessment({
  classification: L11ExtensionClassification.MIGRATION_REQUIRED,
})).some(i => i.code ===
    L11ExtensionAssessmentViolationCode.L11E_MIGRATION_REQUIRED_BUT_NOT_DECLARED),
  'D.06 MIGRATION_REQUIRED without migration_required=true rejected');

// RECALIBRATION_REQUIRED without flag
assert(validateL11ExtensionAssessment(buildExtensionAssessment({
  classification: L11ExtensionClassification.RECALIBRATION_REQUIRED,
})).some(i => i.code ===
    L11ExtensionAssessmentViolationCode.L11E_RECALIBRATION_REQUIRED_BUT_NOT_DECLARED),
  'D.07 RECALIBRATION_REQUIRED without recalibration_required=true rejected');

// BREAKING_SEMANTIC without backfill
assert(validateL11ExtensionAssessment(buildExtensionAssessment({
  classification: L11ExtensionClassification.BREAKING_SEMANTIC,
  migration_required: true,
  recalibration_required: true,
  ratification_required: true,
  replay_backfill_required: false,
})).some(i => i.code ===
    L11ExtensionAssessmentViolationCode.L11E_BREAKING_WITHOUT_BACKFILL),
  'D.08 BREAKING_SEMANTIC without backfill rejected');

// PROHIBITED is rejected
assert(validateL11ExtensionAssessment(buildExtensionAssessment({
  classification: L11ExtensionClassification.PROHIBITED,
})).some(i => i.code ===
    L11ExtensionAssessmentViolationCode.L11E_PROHIBITED_CLASSIFICATION),
  'D.09 PROHIBITED classification rejected');

// Replay hash missing
assert(validateL11ExtensionAssessment(buildExtensionAssessment({
  replay_hash: '',
})).some(i => i.code === L11ExtensionAssessmentViolationCode.L11E_REPLAY_HASH_MISSING),
  'D.10 missing replay_hash rejected');

// Lineage refs missing
assert(validateL11ExtensionAssessment(buildExtensionAssessment({
  lineage_refs: [],
})).some(i => i.code === L11ExtensionAssessmentViolationCode.L11E_LINEAGE_REFS_MISSING),
  'D.11 empty lineage_refs rejected');

// Legal MIGRATION_REQUIRED with all flags set
const legalMigration = buildExtensionAssessment({
  classification: L11ExtensionClassification.MIGRATION_REQUIRED,
  migration_required: true,
  recalibration_required: true,
  ratification_required: true,
  replay_backfill_required: true,
});
assert(validateL11ExtensionAssessment(legalMigration).length === 0,
  'D.12 fully-declared MIGRATION_REQUIRED is legal');

// ═══════════════════════════════════════════════════════════════
// BAND E — Downstream dependency contract
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND E: Downstream dependency contract ═══');

const contract = buildL11DownstreamDependencyContract();
const validity = isL11DownstreamDependencyContractValid(contract);
assert(validity.ok, `E.01 dependency contract valid (${validity.reason})`);
assert(contract.contract_id === 'l11.dependency.v1', 'E.02 stable contract id');
assert(contract.allowed_consumers.length === ALL_L11_DOWNSTREAM_CONSUMERS.length,
  'E.03 all downstream consumers enumerated');
assert(contract.forbidden_consumption_patterns.length ===
       ALL_L11_FORBIDDEN_DOWNSTREAM_CONSUMPTION_PATTERNS.length,
  'E.04 all forbidden patterns enumerated');
assert(contract.forbidden_consumption_patterns.includes(
  L11ForbiddenDownstreamConsumptionPattern.LIVE_SCORE_RECOMPUTE_FROM_L6_TO_L10),
  'E.05 forbids live recompute');
assert(contract.forbidden_consumption_patterns.includes(
  L11ForbiddenDownstreamConsumptionPattern.SCORE_AS_FINAL_JUDGMENT),
  'E.06 forbids score-as-final-judgment');
assert(contract.required_context_bundle.attribution_required === true,
  'E.07 bundle requires attribution');
assert(contract.required_context_bundle.missing_data_profile_required === true,
  'E.08 bundle requires missing-data profile');
assert(contract.required_context_bundle.drift_status_required === true,
  'E.09 bundle requires drift status');
assert(contract.required_context_bundle.replay_hash_required === true,
  'E.10 bundle requires replay hash');
assert(contract.replay_hash.startsWith('l11.dep.'),
  'E.11 contract carries deterministic replay hash');

// Same contract built twice → identical replay hash
const contract2 = buildL11DownstreamDependencyContract();
assert(contract.replay_hash === contract2.replay_hash,
  'E.12 contract hash is deterministic');

// Tamper rejection
assert(!isL11DownstreamDependencyContractValid({
  ...contract, allowed_consumers: [],
}).ok, 'E.13 empty allowed_consumers rejected');
assert(!isL11DownstreamDependencyContractValid({
  ...contract,
  forbidden_consumption_patterns: [] as never,
}).ok, 'E.14 empty forbidden_consumption_patterns rejected');
assert(!isL11DownstreamDependencyContractValid({
  ...contract, replay_hash: '',
}).ok, 'E.15 missing replay_hash rejected');

// Bundle constants
assert(L11_SCORE_CONTEXT_BUNDLE_REQUIREMENT.calibration_hook_required === true,
  'E.16 bundle requires calibration hook');
assert(L11_SCORE_CONTEXT_BUNDLE_REQUIREMENT.lineage_required === true,
  'E.17 bundle requires lineage');

// ═══════════════════════════════════════════════════════════════
// BAND F — Certification substrate
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND F: Certification substrate ═══');

assert(ALL_L11_CERTIFICATION_BANDS.length === 10, 'F.01 10 certification bands');
for (const b of ALL_L11_CERTIFICATION_BANDS) {
  assert(!!L11_CERTIFICATION_BAND_REGISTRY[b],
    `F.02.${b} band registered`);
  assert(describeL11Band(b).length > 0, `F.03.${b} band has description`);
}
assert(ALL_L11_CERTIFICATION_LEVELS.length === 5,
  'F.04 5 certification levels');
assert(L11_CERTIFICATION_LEVEL_RANK[L11CertificationLevel.PRODUCTION_GREEN] >
       L11_CERTIFICATION_LEVEL_RANK[L11CertificationLevel.PERSISTENCE_GREEN],
  'F.05 PRODUCTION_GREEN ranks above PERSISTENCE_GREEN');

// All-green derivation
const sums = allGreenSummaries();
const greenMap = buildL11SublayerGreenMap(sums);
const bands = allGreenBandsFromSummaries(sums);
const bandMap = buildL11BandGreenMap(bands);
assert(bands.every(b => b.passed),
  'F.06 all 10 bands pass when all sublayers + flags green');
const levelGreen = deriveL11CertificationLevel({
  sublayer_green: greenMap,
  band_green: bandMap,
  critical_breach_count: 0,
  freeze_policy_active: true,
  rollout_recommended: true,
  artifact_fingerprint_present: true,
});
assert(levelGreen.level === L11CertificationLevel.PRODUCTION_GREEN,
  `F.07 all-green derives PRODUCTION_GREEN (got ${levelGreen.level})`);

// Critical breach blocks production-green
const levelBreach = deriveL11CertificationLevel({
  sublayer_green: greenMap, band_green: bandMap,
  critical_breach_count: 1, freeze_policy_active: true,
  rollout_recommended: true, artifact_fingerprint_present: true,
});
assert(levelBreach.level === L11CertificationLevel.NOT_CERTIFIED,
  'F.08 critical breach blocks production-green');

// L11.8 not green → PERSISTENCE_GREEN ceiling does not apply (returns RUNTIME)
const notPersGreen = { ...greenMap, [L11SublayerId.L11_8_PERSISTENCE]: false };
const levelRuntime = deriveL11CertificationLevel({
  sublayer_green: notPersGreen, band_green: bandMap,
  critical_breach_count: 0, freeze_policy_active: true,
  rollout_recommended: true, artifact_fingerprint_present: true,
});
assert(levelRuntime.level === L11CertificationLevel.RUNTIME_GREEN,
  'F.09 L11.8 missing → RUNTIME_GREEN ceiling');

// Only L11.1 green → CONSTITUTIONAL_GREEN
const constitutionalOnly: Partial<Record<L11SublayerId, boolean>> = {
  [L11SublayerId.L11_1_CONSTITUTION]: true,
};
const levelConst = deriveL11CertificationLevel({
  sublayer_green: constitutionalOnly, band_green: bandMap,
  critical_breach_count: 0, freeze_policy_active: false,
  rollout_recommended: false, artifact_fingerprint_present: true,
});
assert(levelConst.level === L11CertificationLevel.CONSTITUTIONAL_GREEN,
  'F.10 only L11.1 → CONSTITUTIONAL_GREEN');

// L11.1 not green → NOT_CERTIFIED
const noL11_1: Partial<Record<L11SublayerId, boolean>> = {};
const levelNot = deriveL11CertificationLevel({
  sublayer_green: noL11_1, band_green: bandMap,
  critical_breach_count: 0, freeze_policy_active: false,
  rollout_recommended: false, artifact_fingerprint_present: true,
});
assert(levelNot.level === L11CertificationLevel.NOT_CERTIFIED,
  'F.11 L11.1 not green → NOT_CERTIFIED');

// Sublayer summary green helper
const failedSum: L11SublayerCertificationSummary = makeL11SublayerSummary({
  sublayer: L11SublayerId.L11_1_CONSTITUTION,
  suite_id: 'test', assertions_passed: 1, assertions_failed: 1,
  invariants_held: 0, invariants_failed: 0,
});
assert(!isL11SublayerSummaryGreen(failedSum),
  'F.12 summary with failed assertions is red');

// L10 not green → Band H fails
const bandsNoL10 = runL11Bands({
  sublayer_green: greenMap, l10_master_green: false,
  rollout_governance_green: true, artifact_fingerprint_present: true,
});
const bandH = bandsNoL10.find(b =>
  b.band_id === L11CertificationBand.H_CROSS_LAYER_REGRESSION);
assert(!!bandH && !bandH.passed && bandH.reason.includes('L10'),
  'F.13 Band H fails when L10 master not green');

// Rollout governance not green → Band I fails
const bandsNoRollout = runL11Bands({
  sublayer_green: greenMap, l10_master_green: true,
  rollout_governance_green: false, artifact_fingerprint_present: true,
});
const bandI = bandsNoRollout.find(b =>
  b.band_id === L11CertificationBand.I_ROLLOUT_AND_ROLLBACK_GOVERNANCE);
assert(!!bandI && !bandI.passed,
  'F.14 Band I fails when rollout governance not green');

// Fingerprint missing → Band J fails
const bandsNoFp = runL11Bands({
  sublayer_green: greenMap, l10_master_green: true,
  rollout_governance_green: true, artifact_fingerprint_present: false,
});
const bandJ = bandsNoFp.find(b =>
  b.band_id === L11CertificationBand.J_MASTER_ARTIFACT);
assert(!!bandJ && !bandJ.passed,
  'F.15 Band J fails when fingerprint absent');

// ═══════════════════════════════════════════════════════════════
// BAND G — Rollout, rollback, enable/disable, playbooks
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND G: Rollout, rollback, playbooks ═══');

assert(ALL_L11_ROLLOUT_PHASES.length === 6, 'G.01 6 rollout phases');
assert(L11_ROLLOUT_PHASE_ORDER[L11RolloutPhase.FROZEN_LIVE] === 5,
  'G.02 FROZEN_LIVE is the terminal phase');
assert(L11_ROLLOUT_PHASE_MIN_CERT_LEVEL[L11RolloutPhase.FROZEN_LIVE] ===
       L11CertificationLevel.PRODUCTION_GREEN,
  'G.03 FROZEN_LIVE requires PRODUCTION_GREEN');

// Legal full-live gate transition
const fullLiveGate = evaluateL11RolloutGate({
  candidate_phase: L11RolloutPhase.FULL_LIVE,
  certification_level: L11CertificationLevel.PRODUCTION_GREEN,
  critical_breach_count: 0,
  satisfied_flags: L11_ROLLOUT_PHASE_REQUIREMENTS[L11RolloutPhase.FULL_LIVE]
    .required_flags,
});
assert(fullLiveGate.admitted, 'G.04 production-green admits FULL_LIVE');

// Critical breach blocks gate
const breachGate = evaluateL11RolloutGate({
  candidate_phase: L11RolloutPhase.FULL_LIVE,
  certification_level: L11CertificationLevel.PRODUCTION_GREEN,
  critical_breach_count: 1,
  satisfied_flags: [],
});
assert(!breachGate.admitted, 'G.05 critical breach closes gate');
assert(breachGate.reason.includes('critical breach'),
  'G.06 gate cites critical breach');

// Cert level too low blocks gate
const lowGate = evaluateL11RolloutGate({
  candidate_phase: L11RolloutPhase.FROZEN_LIVE,
  certification_level: L11CertificationLevel.RUNTIME_GREEN,
  critical_breach_count: 0,
  satisfied_flags: L11_ROLLOUT_PHASE_REQUIREMENTS[L11RolloutPhase.FROZEN_LIVE]
    .required_flags,
});
assert(!lowGate.admitted, 'G.07 RUNTIME_GREEN blocks FROZEN_LIVE gate');

// Missing flag blocks gate
const missingFlagGate = evaluateL11RolloutGate({
  candidate_phase: L11RolloutPhase.SHADOW,
  certification_level: L11CertificationLevel.CONSTITUTIONAL_GREEN,
  critical_breach_count: 0,
  satisfied_flags: [],
});
assert(!missingFlagGate.admitted &&
       missingFlagGate.missing_flags.length > 0,
  'G.08 missing rollout flag blocks gate');

// Enable/disable validation
const goodEnable = validateL11EnableDisableRequest({
  request_id: 'l11ed.001',
  subject_class: L11EnableDisableSubject.SCORE_FAMILY,
  subject_ref: 'OPPORTUNITY',
  action: L11EnableDisableAction.ENABLE,
  reason: 'enable opportunity family',
  preserves_historical_truth: true,
  preserves_lineage: true,
  preserves_evidence: true,
  notifies_downstream: true,
  policy_version: 'l11.9.enable-disable.v1',
});
assert(goodEnable.length === 0, 'G.09 legal enable has no violations');

// Disable that erases historical truth → CRITICAL violation
const badDisable = validateL11EnableDisableRequest({
  request_id: 'l11ed.002',
  subject_class: L11EnableDisableSubject.SCORE_FAMILY,
  subject_ref: 'OPPORTUNITY',
  action: L11EnableDisableAction.DISABLE,
  reason: 'silent disable',
  preserves_historical_truth: false,
  preserves_lineage: false,
  preserves_evidence: false,
  notifies_downstream: false,
  policy_version: 'l11.9.enable-disable.v1',
});
assert(badDisable.some(i => i.code ===
  L11EnableDisableViolationCode.L11ED_HISTORICAL_TRUTH_NOT_PRESERVED),
  'G.10 disable without historical preservation rejected');
assert(badDisable.some(i => i.code ===
  L11EnableDisableViolationCode.L11ED_DOWNSTREAM_NOT_NOTIFIED),
  'G.11 disable without downstream notification rejected');

// Rollback validation
assert(ALL_L11_ROLLBACK_MODES.length === 7, 'G.12 7 rollback modes');

const goodRollback = validateL11RollbackRequest({
  rollback_request_id: 'l11r.001',
  mode: L11RollbackMode.DISABLE_CURRENT_SERVING,
  reason: 'critical drift on opp family',
  affected_score_families: ['OPPORTUNITY'],
  affected_formula_versions: [],
  deletes_historical_facts: false,
  mutates_prior_score_outputs: false,
  erases_attribution: false,
  erases_drift_reports: false,
  removes_calibration_hooks: false,
  reinterprets_historical_scores: false,
  hides_failure_reason: false,
  bypasses_l5_persistence: false,
  preserves_lineage: true,
  appends_rollback_record: true,
  maintains_evidence: true,
  notifies_downstream_via_read_surface_status: true,
  policy_version: 'l11.9.rollback.v1',
});
assert(goodRollback.length === 0, 'G.13 legal rollback has no violations');

// Bad rollback: deletes historical fact
const badRollback = validateL11RollbackRequest({
  rollback_request_id: 'l11r.002',
  mode: L11RollbackMode.FULL_LAYER_SAFE_MODE,
  reason: 'evil rollback',
  affected_score_families: ['OPPORTUNITY'],
  affected_formula_versions: [],
  deletes_historical_facts: true,
  mutates_prior_score_outputs: true,
  erases_attribution: true,
  erases_drift_reports: true,
  removes_calibration_hooks: true,
  reinterprets_historical_scores: true,
  hides_failure_reason: true,
  bypasses_l5_persistence: true,
  preserves_lineage: false,
  appends_rollback_record: false,
  maintains_evidence: false,
  notifies_downstream_via_read_surface_status: false,
  policy_version: 'l11.9.rollback.v1',
});
assert(badRollback.some(i => i.code ===
  L11RollbackViolationCode.L11R_DELETES_HISTORICAL_FACT),
  'G.14 deletes_historical_facts rejected');
assert(badRollback.some(i => i.code ===
  L11RollbackViolationCode.L11R_BYPASSES_L5),
  'G.15 bypasses L5 rejected');
assert(badRollback.some(i => i.code ===
  L11RollbackViolationCode.L11R_REINTERPRETS_HISTORICAL_SCORES),
  'G.16 reinterprets historical scores rejected');

// REVERT_TO_PRIOR_FORMULA_VERSION without affected formulas → rejected
const noFormula = validateL11RollbackRequest({
  rollback_request_id: 'l11r.003',
  mode: L11RollbackMode.REVERT_TO_PRIOR_FORMULA_VERSION,
  reason: 'revert formula',
  affected_score_families: ['OPPORTUNITY'],
  affected_formula_versions: [],
  deletes_historical_facts: false,
  mutates_prior_score_outputs: false,
  erases_attribution: false,
  erases_drift_reports: false,
  removes_calibration_hooks: false,
  reinterprets_historical_scores: false,
  hides_failure_reason: false,
  bypasses_l5_persistence: false,
  preserves_lineage: true,
  appends_rollback_record: true,
  maintains_evidence: true,
  notifies_downstream_via_read_surface_status: true,
  policy_version: 'l11.9.rollback.v1',
});
assert(noFormula.some(i => i.code ===
  L11RollbackViolationCode.L11R_AFFECTED_FORMULAS_MISSING),
  'G.17 REVERT_TO_PRIOR_FORMULA_VERSION without affected formulas rejected');

// Failure playbooks
const pbReport = buildL11FailurePlaybookCoverageReport();
assert(pbReport.ok, 'G.18 all 12 playbooks registered');
assert(pbReport.registered === 12, 'G.19 playbook count = 12');
assert(ALL_L11_FAILURE_PLAYBOOK_IDS.length === 12, 'G.20 12 playbook ids');

const pb1 = getL11FailurePlaybook(
  L11FailurePlaybookId.PB1_SCORE_WITHOUT_ATTRIBUTION);
assert(pb1.severity === 'CRITICAL', 'G.21 PB1 is CRITICAL');
assert(pb1.immediate_actions.includes(
  L11PlaybookImmediateAction.BLOCK_CURRENT_EMISSION),
  'G.22 PB1 blocks current emission');
assert(pb1.requires_audit && pb1.requires_persistence,
  'G.23 PB1 requires audit + persistence');

const pb8 = getL11FailurePlaybook(L11FailurePlaybookId.PB8_L5_PERSISTENCE_BYPASS);
assert(pb8.rollback_mode === L11RollbackMode.FULL_LAYER_SAFE_MODE,
  'G.24 PB8 maps to FULL_LAYER_SAFE_MODE');

// Every playbook covers at least one violation prefix
for (const id of ALL_L11_FAILURE_PLAYBOOK_IDS) {
  const pb = L11_FAILURE_PLAYBOOK_REGISTRY[id];
  assert(pb.violation_code_prefixes.length >= 1,
    `G.25.${id} has at least one violation prefix`);
}

// ═══════════════════════════════════════════════════════════════
// BAND H — Final audit surface
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND H: Final audit surface ═══');

assert(ALL_L11_FINAL_AUDIT_SUBJECT_CLASSES.length === 11,
  'H.01 11 final audit subject classes');
assert(ALL_L11_FINAL_AUDIT_CODES.length >= 14,
  `H.02 ≥14 final audit codes (got ${ALL_L11_FINAL_AUDIT_CODES.length})`);
assert(severityForL11FinalAuditCode(L11FinalAuditCode.L11R_MISSING_SUBLAYER) ===
       L11FinalAuditSeverity.CRITICAL,
  'H.03 missing sublayer is CRITICAL');
assert(severityForL11FinalAuditCode(
  L11FinalAuditCode.L11R_PRODUCTION_GREEN_WITH_FAILING_BAND) ===
       L11FinalAuditSeverity.CRITICAL,
  'H.04 PRODUCTION_GREEN with failing band is CRITICAL');
assert(severityForL11FinalAuditCode(
  L11FinalAuditCode.L11R_DOWNSTREAM_RECOMPUTE_ALLOWED) ===
       L11FinalAuditSeverity.CRITICAL,
  'H.05 downstream recompute allowed is CRITICAL');
assert(severityForL11FinalAuditCode(
  L11FinalAuditCode.L11R_FAILURE_PLAYBOOK_MISSING) ===
       L11FinalAuditSeverity.ERROR,
  'H.06 missing playbook is ERROR');

const auditIssue = {
  code: L11FinalAuditCode.L11R_MISSING_SUBLAYER,
  message: 'L11.5 missing',
  subject_ref: 'L11_5_MISSING_REGIME',
};
const rec = makeL11FinalAuditRecord(
  L11FinalAuditSubjectClass.LAYER_INVENTORY,
  'l11.layer.inventory', auditIssue, T0);
assert(rec.audit_id.startsWith('l11r.audit.'),
  'H.07 audit record has deterministic l11r.audit. id');
const rec2 = makeL11FinalAuditRecord(
  L11FinalAuditSubjectClass.LAYER_INVENTORY,
  'l11.layer.inventory', auditIssue, T0);
assert(rec.audit_id === rec2.audit_id,
  'H.08 same input → same audit_id (determinism)');

const recs = emitL11FinalAuditRecords(
  L11FinalAuditSubjectClass.RATIFICATION_ARTIFACT,
  'l11.ratification.v1', [auditIssue, auditIssue, auditIssue], T0);
assert(recs.length === 3, 'H.09 emit one record per issue');
assert(recs.every(r => r.severity === L11FinalAuditSeverity.CRITICAL),
  'H.10 all emitted records carry derived CRITICAL severity');

// ═══════════════════════════════════════════════════════════════
// BAND I — L11.9 invariants + master invariants
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND I: L11.9 + master invariants ═══');

const golden = buildGoldenArtifact();
assert(golden.certification_level === L11CertificationLevel.PRODUCTION_GREEN,
  'I.01 golden artifact reaches PRODUCTION_GREEN');
assert(l11ArtifactIsProductionGreen(golden),
  'I.02 production-green helper agrees');
assert(golden.artifact_fingerprint.startsWith('l11.fp.'),
  'I.03 artifact fingerprint has l11.fp. prefix');

// INV-11.9-A — completion coverage
const allClauseStatuses = ALL_L11_COMPLETION_CLAUSES.map(c =>
  makeL11CompletionClauseStatus(c, true, 'ok'));
const invA = invariantL11_9_A_completionCoverage(allClauseStatuses);
assert(invA.ok, 'I.04 INV-11.9-A passes when all clauses satisfied');
const invAFail = invariantL11_9_A_completionCoverage(
  allClauseStatuses.slice(0, 8));
assert(!invAFail.ok, 'I.05 INV-11.9-A fails when a clause is missing');
const invAFail2 = invariantL11_9_A_completionCoverage(
  ALL_L11_COMPLETION_CLAUSES.map((c, i) =>
    makeL11CompletionClauseStatus(c, i !== 0, 'partial')));
assert(!invAFail2.ok, 'I.06 INV-11.9-A fails when a clause unsatisfied');

// INV-11.9-B — non-duplication
const invB = invariantL11_9_B_nonDuplication({
  l11_9_owned_modules: ['l11-final-definition', 'l11-layer-inventory'],
  l11_1_to_8_owned_modules: ['score-family', 'score-formula',
    'l11-persistence-surface'],
});
assert(invB.ok, 'I.07 INV-11.9-B passes when no duplicates');
const invBFail = invariantL11_9_B_nonDuplication({
  l11_9_owned_modules: ['score-family'],
  l11_1_to_8_owned_modules: ['score-family'],
});
assert(!invBFail.ok, 'I.08 INV-11.9-B fails on duplicate module name');

// INV-11.9-C — production-green gate
const invC = invariantL11_9_C_productionGreenGate({ artifact: golden });
assert(invC.ok, 'I.09 INV-11.9-C passes for golden artifact');
const breachArt: L11LayerRatificationArtifact = {
  ...golden, critical_breach_count: 1,
};
breachArt.artifact_fingerprint as string;
const invCFail = invariantL11_9_C_productionGreenGate({ artifact: breachArt });
assert(!invCFail.ok, 'I.10 INV-11.9-C fails on PRODUCTION_GREEN with breach');
// Non-PRODUCTION_GREEN level → invariant does not assert (passes).
const lowerArt: L11LayerRatificationArtifact = {
  ...golden, certification_level: L11CertificationLevel.RUNTIME_GREEN,
};
const invCNonProd = invariantL11_9_C_productionGreenGate({ artifact: lowerArt });
assert(invCNonProd.ok,
  'I.11 INV-11.9-C does not assert for non-PRODUCTION_GREEN artifact');

// INV-11.9-D — freeze
const invD = invariantL11_9_D_freeze({
  policy: { ...L11_FREEZE_POLICY_V1, status: L11FreezeStatus.ACTIVE },
  artifact: golden,
});
assert(invD.ok, 'I.12 INV-11.9-D passes when policy + artifact aligned');
const invDFail = invariantL11_9_D_freeze({
  policy: { ...L11_FREEZE_POLICY_V1, status: L11FreezeStatus.PRE_FREEZE },
  artifact: golden,
});
assert(!invDFail.ok,
  'I.13 INV-11.9-D fails when artifact says activated but policy is PRE_FREEZE');
const invDFail2 = invariantL11_9_D_freeze({
  policy: { ...L11_FREEZE_POLICY_V1, status: L11FreezeStatus.ACTIVE },
  artifact: { ...golden, freeze_activated: false },
});
assert(!invDFail2.ok,
  'I.14 INV-11.9-D fails when policy ACTIVE but artifact says not activated');

// INV-11.9-E — L12 dependency safety
const invE = invariantL11_9_E_l12DependencySafety(contract);
assert(invE.ok, 'I.15 INV-11.9-E passes for golden contract');
const invEFail = invariantL11_9_E_l12DependencySafety({
  ...contract,
  forbidden_consumption_patterns: contract.forbidden_consumption_patterns
    .filter(p => p !== L11ForbiddenDownstreamConsumptionPattern
      .LIVE_SCORE_RECOMPUTE_FROM_L6_TO_L10),
});
assert(!invEFail.ok,
  'I.16 INV-11.9-E fails when live-recompute not forbidden');

// INV-11.9-F — no judgment leakage
const invF = invariantL11_9_F_noJudgmentLeakage(golden);
assert(invF.ok, 'I.17 INV-11.9-F passes for golden artifact');

// INV-11.9-G — replay/repair closure
const invG = invariantL11_9_G_replayRepairClosure({
  l11_8_passed: true, replay_invariants_held: 3, repair_invariants_held: 2,
});
assert(invG.ok, 'I.18 INV-11.9-G passes for closed replay/repair');
const invGFail = invariantL11_9_G_replayRepairClosure({
  l11_8_passed: false, replay_invariants_held: 3, repair_invariants_held: 2,
});
assert(!invGFail.ok, 'I.19 INV-11.9-G fails when L11.8 not green');

// INV-11.9-H — fingerprint
const invH = invariantL11_9_H_artifactFingerprint(golden);
assert(invH.ok, 'I.20 INV-11.9-H passes (deterministic + change-sensitive)');
const tamperedFp: L11LayerRatificationArtifact = {
  ...golden, artifact_fingerprint: 'l11.fp.tampered',
};
const invHFail = invariantL11_9_H_artifactFingerprint(tamperedFp);
assert(!invHFail.ok, 'I.21 INV-11.9-H fails on tampered fingerprint');

// runAllL11_9Invariants
const all9 = runAllL11_9Invariants({
  clauseStatuses: allClauseStatuses,
  nonDuplication: {
    l11_9_owned_modules: ['l11-final-definition'],
    l11_1_to_8_owned_modules: ['score-family'],
  },
  artifact: golden,
  freezePolicy: { ...L11_FREEZE_POLICY_V1, status: L11FreezeStatus.ACTIVE },
  dependencyContract: contract,
  replayRepair: { l11_8_passed: true, replay_invariants_held: 3, repair_invariants_held: 2 },
});
assert(all9.length === 8, 'I.22 8 L11.9 invariants returned');
assert(all9.every(r => r.ok),
  'I.23 all 8 L11.9 invariants pass on golden inputs');

// Master invariants
const masterInput = {
  sublayer_green: greenMap,
  l10_master_green: true,
  judgment_leakage_detected: false,
};
assert(invariantL11_A_meaningClaim(masterInput).ok, 'I.24 INV-11-A green');
assert(invariantL11_B_determinism(masterInput).ok, 'I.25 INV-11-B green');
assert(invariantL11_C_attribution(masterInput).ok, 'I.26 INV-11-C green');
assert(invariantL11_D_missingData(masterInput).ok, 'I.27 INV-11-D green');
assert(invariantL11_E_modifierBoundary(masterInput).ok, 'I.28 INV-11-E green');
assert(invariantL11_F_calibration(masterInput).ok, 'I.29 INV-11-F green');
assert(invariantL11_G_driftGovernance(masterInput).ok, 'I.30 INV-11-G green');
assert(invariantL11_H_nonJudgment(masterInput).ok, 'I.31 INV-11-H green');

const all8 = runAllL11MasterInvariants(masterInput);
assert(all8.length === 8 && all8.every(r => r.ok),
  'I.32 all 8 master invariants pass on green inputs');

// INV-11-H fails on judgment leakage
const leakInput = { ...masterInput, judgment_leakage_detected: true };
assert(!invariantL11_H_nonJudgment(leakInput).ok,
  'I.33 INV-11-H fails when judgment leakage detected');

// INV-11-B requires both L11.3 and L11.8
const noPersInput = { ...masterInput,
  sublayer_green: { ...greenMap, [L11SublayerId.L11_8_PERSISTENCE]: false } };
assert(!invariantL11_B_determinism(noPersInput).ok,
  'I.34 INV-11-B fails when L11.8 not green');

// ═══════════════════════════════════════════════════════════════
// BAND J — Master orchestrator and ratification artifact
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND J: Master orchestrator + ratification artifact ═══');

const goldenAgain = buildGoldenArtifact();
assert(goldenAgain.artifact_fingerprint === golden.artifact_fingerprint,
  'J.01 fingerprint deterministic across two builds with same inputs');
assert(golden.layer_id === 'L11', 'J.02 artifact layer_id is L11');
assert(golden.policy_version === 'l11.9.ratification.v1',
  'J.03 artifact policy version pinned');
assert(golden.dependency_contract_ref === 'l11.dependency.v1',
  'J.04 dependency contract ref carried');
assert(golden.freeze_policy_ref === 'l11.freeze.v1',
  'J.05 freeze policy ref carried');
assert(golden.extension_policy_ref === 'l11.9.extension.v1',
  'J.06 extension policy ref carried');
assert(golden.rollout_recommended === true,
  'J.07 rollout recommended on golden artifact');
assert(golden.freeze_activated === true,
  'J.08 freeze activated on golden artifact');
assert(golden.critical_breach_count === 0,
  'J.09 zero critical breaches on golden artifact');
assert(Object.keys(golden.sublayer_results).length === 9,
  'J.10 9 sublayer summaries recorded');
assert(golden.certification_band_results.length === 10,
  'J.11 10 band results recorded');

// Material change → fingerprint changes
const changed = runL11MasterCertification({
  sublayer_summaries: allGreenSummaries(),
  band_results: allGreenBandsFromSummaries(allGreenSummaries()),
  invariant_results: golden.invariant_results,
  regression_results: golden.regression_results,
  l10_master_green: true,
  rollout_recommended: true,
  freeze_activated: true,
  dependency_contract_ref: 'l11.dependency.v1',
  freeze_policy_ref: 'l11.freeze.v1',
  extension_policy_ref: 'l11.9.extension.v1',
  critical_breach_count: 1,
  warning_count: 0,
  generated_at: T0,
});
assert(changed.artifact_fingerprint !== golden.artifact_fingerprint,
  'J.12 fingerprint changes when critical_breach_count differs');
assert(changed.certification_level === L11CertificationLevel.NOT_CERTIFIED,
  'J.13 critical breach drops cert level to NOT_CERTIFIED');

// Order-only change does not alter fingerprint
const reorderedSums = [...allGreenSummaries()].reverse();
const reorderedBands = [...allGreenBandsFromSummaries(reorderedSums)].reverse();
const reordered = runL11MasterCertification({
  sublayer_summaries: reorderedSums,
  band_results: reorderedBands,
  invariant_results: [...golden.invariant_results].reverse(),
  regression_results: [...golden.regression_results].reverse(),
  l10_master_green: true,
  rollout_recommended: true,
  freeze_activated: true,
  dependency_contract_ref: 'l11.dependency.v1',
  freeze_policy_ref: 'l11.freeze.v1',
  extension_policy_ref: 'l11.9.extension.v1',
  critical_breach_count: 0,
  warning_count: 0,
  generated_at: T0,
});
assert(reordered.artifact_fingerprint === golden.artifact_fingerprint,
  'J.14 fingerprint stable under order-only permutation');

// One sublayer red → not production green
const redSums = [
  makeL11SublayerSummary({
    sublayer: L11SublayerId.L11_5_MISSING_REGIME,
    suite_id: 'test-l11_5-missing-regime',
    assertions_passed: 100, assertions_failed: 1,
    invariants_held: 7, invariants_failed: 1,
  }),
  ...allGreenSummaries().filter(s =>
    s.sublayer !== L11SublayerId.L11_5_MISSING_REGIME),
];
const redBands = runL11Bands({
  sublayer_green: buildL11SublayerGreenMap(redSums),
  l10_master_green: true,
  rollout_governance_green: true,
  artifact_fingerprint_present: true,
});
const redArt = runL11MasterCertification({
  sublayer_summaries: redSums,
  band_results: redBands,
  invariant_results: golden.invariant_results,
  regression_results: golden.regression_results,
  l10_master_green: true,
  rollout_recommended: false,
  freeze_activated: false,
  dependency_contract_ref: 'l11.dependency.v1',
  freeze_policy_ref: 'l11.freeze.v1',
  extension_policy_ref: 'l11.9.extension.v1',
  critical_breach_count: 0,
  warning_count: 1,
  generated_at: T0,
});
assert(redArt.certification_level !== L11CertificationLevel.PRODUCTION_GREEN,
  'J.15 sublayer red blocks PRODUCTION_GREEN');
assert(!l11ArtifactIsProductionGreen(redArt),
  'J.16 production-green helper agrees on red artifact');

// Recompute fingerprint of golden artifact and verify it matches
const recompFp = computeL11ArtifactFingerprint({
  ...golden,
} as Omit<L11LayerRatificationArtifact, 'artifact_fingerprint'>);
assert(recompFp === golden.artifact_fingerprint,
  'J.17 standalone fingerprint computation matches orchestrator output');

// Sanity void to silence unused-import lints
void L11FinalOutputSurface;
void L11RatificationRequiredSurface;
void ALL_L11_FAILURE_PLAYBOOK_IDS;
void L11FailurePlaybookId;
void L11RolloutPhaseFlag;

// ─────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────
console.log(`\n══════════════════════════════════════════`);
console.log(`L11.9 Final Ratification Test Suite`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
if (failed > 0) {
  console.error('\nFailures:');
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`\n✓ ALL L11.9 RATIFICATION ASSERTIONS PASSED`);
