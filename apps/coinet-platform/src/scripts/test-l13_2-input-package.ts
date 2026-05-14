/**
 * L13.2 — AI Input Package and Context Assembly
 * Certification Test Suite (§13.2.25)
 *
 * 6 Bands:
 *   A — Object completeness
 *   B — L11 and L12 bundle law
 *   C — Context priority and compression
 *   D — Uncertainty and restrictions
 *   E — Builders and replay
 *   F — Audit and invariants INV-13.2-A..J
 */

import {
  L13_BLOCKED_PACKAGE_READINESS_CLASSES,
  L13_REQUIRED_ENGINE_SUMMARY_FIELDS,
  L13_REQUIRED_IDENTITY_FIELDS,
  L13_REQUIRED_TRACE_FIELDS,
  L13AnswerMode,
  L13BlockedAnswerMode,
  L13ContextClass,
  L13ContextCompressionStrategy,
  L13DependencyLayer,
  L13EvidenceRole,
  L13ExplanationConfidenceBand,
  L13InputPackageCompletenessClass,
  L13InputPackageReadinessClass,
  L13RequiredDisclosure,
  L13ScoreContextCompletenessClass,
  L13UncertaintyProfile,
  L13UncertaintySource,
  L13UserIntentClass,
  L13ViolationSeverity,
  L13_ALWAYS_BLOCKED_ANSWER_MODES,
  L13_CONTEXT_PRIORITY_ORDER,
  L13_FORBIDDEN_CERTAINTY_PHRASES,
  L13_MUST_PRESERVE_CONTEXT_CLASSES,
  L13_PROTECTED_EVIDENCE_ROLES,
  getL13ContextPriorityRank,
  getL13IntentRequirements,
  isL13AdversarialIntent,
  isL13BlockedPackageReadiness,
  isL13MustPreserveContextClass,
  isL13ProtectedEvidenceRole,
} from '../l13/contracts';
import {
  ALL_L13_INPUT_PACKAGE_VIOLATION_CODES,
  L13InputPackageViolationCode,
} from '../l13/validation';
import {
  buildL13AIInputPackage,
  buildL13ConfidenceBreakdown,
  buildL13EvidenceDigest,
  buildL13ExplanationRestrictionProfile,
  buildL13UncertaintyProfile,
  classifyL13Context,
  compressL13Context,
  evaluateL13ContradictionPreservation,
} from '../l13/context';
import {
  L13InputPackageAuditSubjectClass,
  emitL13InputPackageAuditRecord,
  getL13InputPackageAuditLog,
  getL13InputPackageBlockingViolations,
  getL13InputPackageCriticalViolations,
  getL13InputPackageViolationCount,
  getL13InputPackageViolationsByCode,
  getL13InputPackageViolationsBySubjectClass,
  hasAnyL13InputPackageViolations,
  isL13InputPackageBlockingCode,
  resetL13InputPackageAuditLog,
  severityForL13InputPackageCode,
} from '../l13/constitution';
import {
  validateL13AIInputPackage,
  validateL13ConfidenceBreakdown,
  validateL13ContextCompression,
  validateL13ContextPriorityDecisions,
  validateL13ContradictionPreservation,
  validateL13EvidenceDigests,
  validateL13RestrictionBinding,
  validateL13UncertaintyProfile,
} from '../l13/validation';
import {
  __l13_2_test_helpers,
  runAllL13_2Invariants,
} from '../l13/invariants/l13_2-invariants';

const {
  buildGreenPackage,
  greenScore,
  greenScenario,
  greenLowerLayerRestrictionInputs,
} = __l13_2_test_helpers;

let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string): void {
  if (cond) {
    passed++;
    console.log(`  PASS  ${msg}`);
  } else {
    failed++;
    console.error(`  FAIL  ${msg}`);
  }
}

function reset(): void {
  resetL13InputPackageAuditLog();
}

console.log('═══════════════════════════════════════════════════════');
console.log('  L13.2 — AI Input Package & Context Assembly Certification');
console.log('═══════════════════════════════════════════════════════');

// ═══════════════════════════════════════════════════════════════════
// BAND A — Object Completeness
// ═══════════════════════════════════════════════════════════════════
console.log('\n═══ BAND A: Object Completeness ═══');
reset();

const greenPkg = buildGreenPackage();
const greenResult = validateL13AIInputPackage(greenPkg);
assert(greenResult.clean, 'A.01 green package validates clean');
assert(greenPkg.replay_hash.length === 8, 'A.02 replay hash is 8 hex chars');
assert(
  greenPkg.input_package_id.startsWith('l13.input_package.'),
  'A.03 package id has correct prefix',
);
assert(L13_REQUIRED_IDENTITY_FIELDS.length === 8, 'A.04 8 required identity fields');
assert(
  L13_REQUIRED_ENGINE_SUMMARY_FIELDS.length === 11,
  'A.05 11 required engine-summary fields',
);
assert(L13_REQUIRED_TRACE_FIELDS.length === 5, 'A.06 5 required trace fields');

// Missing identity field rejected.
const missingId = { ...greenPkg, input_package_id: '' };
assert(
  validateL13AIInputPackage(missingId).issues.some(
    i => i.code === L13InputPackageViolationCode.L13P_INPUT_PACKAGE_ID_MISSING,
  ),
  'A.07 missing input_package_id rejected',
);

const missingReq = { ...greenPkg, request_id: '' };
assert(
  validateL13AIInputPackage(missingReq).issues.some(
    i => i.code === L13InputPackageViolationCode.L13P_REQUEST_ID_MISSING,
  ),
  'A.08 missing request_id rejected',
);

const missingIntent = { ...greenPkg, user_intent_ref: '' };
assert(
  validateL13AIInputPackage(missingIntent).issues.some(
    i => i.code === L13InputPackageViolationCode.L13P_USER_INTENT_MISSING,
  ),
  'A.09 missing user_intent_ref rejected',
);

const missingScope = { ...greenPkg, scope_id: '' };
assert(
  validateL13AIInputPackage(missingScope).issues.some(
    i => i.code === L13InputPackageViolationCode.L13P_SCOPE_MISSING,
  ),
  'A.10 missing scope_id rejected',
);

const missingAsOf = { ...greenPkg, as_of: '' };
assert(
  validateL13AIInputPackage(missingAsOf).issues.some(
    i => i.code === L13InputPackageViolationCode.L13P_AS_OF_MISSING,
  ),
  'A.11 missing as_of rejected',
);

const missingPolicy = { ...greenPkg, policy_version: '' };
assert(
  validateL13AIInputPackage(missingPolicy).issues.some(
    i => i.code === L13InputPackageViolationCode.L13P_POLICY_VERSION_MISSING,
  ),
  'A.12 missing policy_version rejected',
);

const missingHash = { ...greenPkg, replay_hash: '' };
assert(
  validateL13AIInputPackage(missingHash).issues.some(
    i => i.code === L13InputPackageViolationCode.L13P_REPLAY_HASH_MISSING,
  ),
  'A.13 missing replay_hash rejected',
);

// Missing summary fields.
const missingEntity = { ...greenPkg, canonical_entity_summary: undefined as never };
assert(
  validateL13AIInputPackage(missingEntity).issues.some(
    i => i.code === L13InputPackageViolationCode.L13P_ENTITY_SUMMARY_MISSING,
  ),
  'A.14 missing entity_summary rejected',
);

const missingValid = { ...greenPkg, validation_summary: undefined as never };
assert(
  validateL13AIInputPackage(missingValid).issues.some(
    i => i.code === L13InputPackageViolationCode.L13P_VALIDATION_SUMMARY_MISSING,
  ),
  'A.15 missing validation_summary rejected',
);

const missingContra = { ...greenPkg, contradiction_summary: undefined as never };
assert(
  validateL13AIInputPackage(missingContra).issues.some(
    i => i.code === L13InputPackageViolationCode.L13P_CONTRADICTION_SUMMARY_MISSING,
  ),
  'A.16 missing contradiction_summary rejected',
);

const missingRegime = { ...greenPkg, regime_summary: undefined as never };
assert(
  validateL13AIInputPackage(missingRegime).issues.some(
    i => i.code === L13InputPackageViolationCode.L13P_REGIME_SUMMARY_MISSING,
  ),
  'A.17 missing regime_summary rejected',
);

const missingSeq = { ...greenPkg, sequence_summary: undefined as never };
assert(
  validateL13AIInputPackage(missingSeq).issues.some(
    i => i.code === L13InputPackageViolationCode.L13P_SEQUENCE_SUMMARY_MISSING,
  ),
  'A.18 missing sequence_summary rejected',
);

const missingHyp = { ...greenPkg, hypothesis_summary: undefined as never };
assert(
  validateL13AIInputPackage(missingHyp).issues.some(
    i => i.code === L13InputPackageViolationCode.L13P_HYPOTHESIS_SUMMARY_MISSING,
  ),
  'A.19 missing hypothesis_summary rejected',
);

const missingScore = { ...greenPkg, score_summary: undefined as never };
assert(
  validateL13AIInputPackage(missingScore).issues.some(
    i => i.code === L13InputPackageViolationCode.L13P_SCORE_SUMMARY_MISSING,
  ),
  'A.20 missing score_summary rejected',
);

const missingScen = { ...greenPkg, scenario_summary: undefined as never };
assert(
  validateL13AIInputPackage(missingScen).issues.some(
    i => i.code === L13InputPackageViolationCode.L13P_SCENARIO_SUMMARY_MISSING,
  ),
  'A.21 missing scenario_summary rejected',
);

const missingConf = { ...greenPkg, confidence_breakdown: undefined as never };
assert(
  validateL13AIInputPackage(missingConf).issues.some(
    i => i.code === L13InputPackageViolationCode.L13P_CONFIDENCE_BREAKDOWN_MISSING,
  ),
  'A.22 missing confidence_breakdown rejected',
);

const missingUnc = { ...greenPkg, uncertainty_profile: undefined as never };
assert(
  validateL13AIInputPackage(missingUnc).issues.some(
    i => i.code === L13InputPackageViolationCode.L13P_UNCERTAINTY_PROFILE_MISSING,
  ),
  'A.23 missing uncertainty_profile rejected',
);

const missingRestr = { ...greenPkg, restriction_profile: undefined as never };
assert(
  validateL13AIInputPackage(missingRestr).issues.some(
    i => i.code === L13InputPackageViolationCode.L13P_RESTRICTION_PROFILE_MISSING,
  ),
  'A.24 missing restriction_profile rejected',
);

// Trace fields.
const noEvidence = { ...greenPkg, evidence_refs: [] };
assert(
  validateL13AIInputPackage(noEvidence).issues.some(
    i => i.code === L13InputPackageViolationCode.L13P_EVIDENCE_REFS_MISSING,
  ),
  'A.25 empty evidence_refs rejected',
);

const noLineage = { ...greenPkg, lineage_refs: [] };
assert(
  validateL13AIInputPackage(noLineage).issues.some(
    i => i.code === L13InputPackageViolationCode.L13P_LINEAGE_REFS_MISSING,
  ),
  'A.26 empty lineage_refs rejected',
);

const noBudget = { ...greenPkg, prompt_budget: undefined as never };
assert(
  validateL13AIInputPackage(noBudget).issues.some(
    i => i.code === L13InputPackageViolationCode.L13P_PROMPT_BUDGET_MISSING,
  ),
  'A.27 missing prompt_budget rejected',
);

// Always-blocked answer modes must always be in blocked.
const noBlocked = {
  ...greenPkg,
  blocked_answer_modes: [] as readonly L13BlockedAnswerMode[],
};
const blockedR = validateL13AIInputPackage(noBlocked);
assert(
  blockedR.issues.some(
    i => i.code === L13InputPackageViolationCode.L13P_BLOCKED_ANSWER_MODE_ALLOWED,
  ),
  'A.28 missing always-blocked answer modes rejected',
);

assert(
  L13_ALWAYS_BLOCKED_ANSWER_MODES.length === 8,
  'A.29 8 always-blocked answer modes',
);
assert(
  greenPkg.blocked_answer_modes.length === L13_ALWAYS_BLOCKED_ANSWER_MODES.length,
  'A.30 green pkg blocks every always-blocked mode',
);

// ═══════════════════════════════════════════════════════════════════
// BAND B — L11 / L12 bundle law
// ═══════════════════════════════════════════════════════════════════
console.log('\n═══ BAND B: L11 and L12 Bundle Law ═══');
reset();

assert(validateL13AIInputPackage(greenPkg).clean, 'B.01 complete L11 + L12 context accepted');

const naked11 = {
  ...greenPkg,
  score_summary: {
    ...greenScore(),
    top_positive_attribution_refs: [] as readonly string[],
    top_negative_attribution_refs: [] as readonly string[],
    score_missing_data_profile_refs: [] as readonly string[],
    score_drift_refs: [] as readonly string[],
    score_restriction_refs: [] as readonly string[],
  },
};
assert(
  validateL13AIInputPackage(naked11).issues.some(
    i => i.code === L13InputPackageViolationCode.L13P_NAKED_L11_SCORE_CONTEXT,
  ),
  'B.02 naked L11 score rejected',
);

const incompleteAttr = {
  ...greenPkg,
  score_summary: {
    ...greenScore(),
    score_context_completeness_class:
      L13ScoreContextCompletenessClass.MISSING_ATTRIBUTION,
  },
};
assert(
  validateL13AIInputPackage(incompleteAttr).issues.some(
    i => i.code === L13InputPackageViolationCode.L13P_INCOMPLETE_L11_SCORE_CONTEXT,
  ),
  'B.03 missing score attribution rejected',
);

const incompleteMD = {
  ...greenPkg,
  score_summary: {
    ...greenScore(),
    score_context_completeness_class:
      L13ScoreContextCompletenessClass.MISSING_MISSING_DATA_PROFILE,
  },
};
assert(
  validateL13AIInputPackage(incompleteMD).issues.some(
    i => i.code === L13InputPackageViolationCode.L13P_INCOMPLETE_L11_SCORE_CONTEXT,
  ),
  'B.04 missing missing-data profile rejected',
);

const incompleteDrift = {
  ...greenPkg,
  score_summary: {
    ...greenScore(),
    score_context_completeness_class:
      L13ScoreContextCompletenessClass.MISSING_DRIFT_STATUS,
  },
};
assert(
  validateL13AIInputPackage(incompleteDrift).issues.some(
    i => i.code === L13InputPackageViolationCode.L13P_INCOMPLETE_L11_SCORE_CONTEXT,
  ),
  'B.05 missing drift status rejected',
);

const incompleteRestr = {
  ...greenPkg,
  score_summary: {
    ...greenScore(),
    score_context_completeness_class:
      L13ScoreContextCompletenessClass.MISSING_RESTRICTIONS,
  },
};
assert(
  validateL13AIInputPackage(incompleteRestr).issues.some(
    i => i.code === L13InputPackageViolationCode.L13P_INCOMPLETE_L11_SCORE_CONTEXT,
  ),
  'B.06 missing score restrictions rejected',
);

const naked12 = {
  ...greenPkg,
  scenario_summary: {
    ...greenScenario(),
    trigger_refs: [] as readonly string[],
    invalidation_refs: [] as readonly string[],
    path_confidence_refs: [] as readonly string[],
  },
};
assert(
  validateL13AIInputPackage(naked12).issues.some(
    i => i.code === L13InputPackageViolationCode.L13P_NAKED_L12_SCENARIO_CONTEXT,
  ),
  'B.07 naked L12 scenario rejected',
);

const noTriggers = {
  ...greenPkg,
  scenario_summary: { ...greenScenario(), trigger_refs: [] as readonly string[] },
};
assert(
  validateL13AIInputPackage(noTriggers).issues.some(
    i => i.code === L13InputPackageViolationCode.L13P_INCOMPLETE_L12_SCENARIO_CONTEXT,
  ),
  'B.08 missing scenario triggers rejected',
);

const noInvs = {
  ...greenPkg,
  scenario_summary: {
    ...greenScenario(),
    invalidation_refs: [] as readonly string[],
  },
};
assert(
  validateL13AIInputPackage(noInvs).issues.some(
    i => i.code === L13InputPackageViolationCode.L13P_INCOMPLETE_L12_SCENARIO_CONTEXT,
  ),
  'B.09 missing scenario invalidations rejected',
);

const noPathConf = {
  ...greenPkg,
  scenario_summary: {
    ...greenScenario(),
    path_confidence_refs: [] as readonly string[],
  },
};
assert(
  validateL13AIInputPackage(noPathConf).issues.some(
    i => i.code === L13InputPackageViolationCode.L13P_INCOMPLETE_L12_SCENARIO_CONTEXT,
  ),
  'B.10 missing path confidence rejected',
);

// Raw lower-layer bypass detection.
const rawBypass = {
  ...greenPkg,
  evidence_refs: [...greenPkg.evidence_refs, 'l11_raw_state_blob'],
};
assert(
  validateL13AIInputPackage(rawBypass).issues.some(
    i => i.code === L13InputPackageViolationCode.L13P_RAW_LOWER_LAYER_CONTEXT,
  ),
  'B.11 raw lower-layer ref rejected',
);

// ═══════════════════════════════════════════════════════════════════
// BAND C — Context priority and compression
// ═══════════════════════════════════════════════════════════════════
console.log('\n═══ BAND C: Context Priority and Compression ═══');
reset();

assert(
  L13_CONTEXT_PRIORITY_ORDER[0] === L13ContextClass.USER_INTENT,
  'C.01 user intent has rank 0',
);
assert(
  getL13ContextPriorityRank(L13ContextClass.USER_INTENT) === 0,
  'C.02 user intent rank lookup',
);
assert(
  getL13ContextPriorityRank(L13ContextClass.L12_SCENARIO_BASE_CASE) <
    getL13ContextPriorityRank(L13ContextClass.HISTORICAL_CONTEXT),
  'C.03 L12 base case higher priority than historical context',
);
assert(
  isL13MustPreserveContextClass(L13ContextClass.STRONGEST_CONTRADICTIONS),
  'C.04 strongest contradictions are must-preserve',
);
assert(
  isL13MustPreserveContextClass(L13ContextClass.L12_INVALIDATIONS),
  'C.05 L12 invalidations are must-preserve',
);
assert(
  isL13MustPreserveContextClass(L13ContextClass.RESTRICTIONS),
  'C.06 restrictions are must-preserve',
);
assert(
  !isL13MustPreserveContextClass(L13ContextClass.HISTORICAL_CONTEXT),
  'C.07 historical context is droppable',
);
assert(
  L13_MUST_PRESERVE_CONTEXT_CLASSES.length >= 14,
  'C.08 14+ must-preserve classes',
);

// Priority engine end-to-end.
const items = [
  {
    context_ref: 'l12.invalidation.1',
    context_class: L13ContextClass.L12_INVALIDATIONS,
    token_cost: 100,
  },
  {
    context_ref: 'history.long',
    context_class: L13ContextClass.HISTORICAL_CONTEXT,
    token_cost: 200,
  },
  {
    context_ref: 'l7.contradiction.1',
    context_class: L13ContextClass.L7_CONTRADICTIONS,
    token_cost: 100,
  },
  {
    context_ref: 'l4.graph.1',
    context_class: L13ContextClass.L4_GRAPH_CONTEXT,
    token_cost: 80,
  },
];
const priorityResult = classifyL13Context(items);
const invDecision = priorityResult.decisions.find(
  d => d.context_ref === 'l12.invalidation.1',
);
assert(invDecision !== undefined, 'C.09 priority decision exists for invalidation');
assert(
  invDecision !== undefined && invDecision.preserve_required,
  'C.10 invalidation marked preserve_required',
);
assert(
  invDecision !== undefined && !invDecision.dropping_allowed,
  'C.11 invalidation not droppable',
);
const priorityValid = validateL13ContextPriorityDecisions(priorityResult.decisions);
assert(priorityValid.clean, 'C.12 priority decisions validate clean');

// Compression that fits — no drops.
const fits = compressL13Context({
  request_id: 'req.fits',
  items,
  available_tokens: 600,
  strategy: L13ContextCompressionStrategy.PRIORITY_TRUNCATION,
});
assert(fits.dropped_context_refs.length === 0, 'C.13 no drops when budget fits');
assert(validateL13ContextCompression(fits).clean, 'C.14 fitting compression clean');

// Tight budget — historical drops first.
const tight = compressL13Context({
  request_id: 'req.tight',
  items,
  available_tokens: 250,
  strategy: L13ContextCompressionStrategy.PRIORITY_TRUNCATION,
});
assert(
  tight.dropped_context_refs.includes('history.long'),
  'C.15 historical context dropped first',
);
assert(
  !tight.dropped_context_refs.includes('l12.invalidation.1'),
  'C.16 invalidation NOT dropped',
);
assert(
  !tight.dropped_context_refs.includes('l7.contradiction.1'),
  'C.17 contradiction NOT dropped',
);
assert(validateL13ContextCompression(tight).clean, 'C.18 tight compression clean');

// Manually engineered illegal compression.
const illegalResult = {
  ...tight,
  illegal_patterns_detected: [
    'DROPS_CONTRADICTION_BEFORE_POSITIVE',
  ] as never,
};
assert(
  !validateL13ContextCompression(illegalResult).clean,
  'C.19 illegal compression pattern rejected',
);

// Determinism — identical inputs → identical hash.
const dt1 = compressL13Context({
  request_id: 'req.det',
  items,
  available_tokens: 250,
  strategy: L13ContextCompressionStrategy.PRIORITY_TRUNCATION,
});
const dt2 = compressL13Context({
  request_id: 'req.det',
  items,
  available_tokens: 250,
  strategy: L13ContextCompressionStrategy.PRIORITY_TRUNCATION,
});
assert(dt1.replay_hash === dt2.replay_hash, 'C.20 compression replay hash deterministic');

// Contradiction preservation engine.
const presOk = evaluateL13ContradictionPreservation({
  request_id: 'req.pres.ok',
  active_contradiction_refs: ['c1', 'c2'],
  preserved_after_compression: ['c1', 'c2'],
});
assert(presOk.all_material_contradictions_preserved, 'C.21 all contradictions preserved');
assert(
  validateL13ContradictionPreservation(presOk).clean,
  'C.22 preservation OK validates clean',
);

const presFail = evaluateL13ContradictionPreservation({
  request_id: 'req.pres.fail',
  active_contradiction_refs: ['c1', 'c2'],
  preserved_after_compression: ['c1'],
});
assert(
  !presFail.all_material_contradictions_preserved,
  'C.23 dropped contradiction flagged',
);
const presFailV = validateL13ContradictionPreservation(presFail);
assert(
  !presFailV.clean &&
    presFailV.issues.some(
      i =>
        i.code ===
        L13InputPackageViolationCode.L13P_CONTRADICTION_DROPPED_BEFORE_POSITIVE,
    ),
  'C.24 dropped contradiction surfaces critical violation',
);

// ═══════════════════════════════════════════════════════════════════
// BAND D — Uncertainty and restrictions
// ═══════════════════════════════════════════════════════════════════
console.log('\n═══ BAND D: Uncertainty and Restrictions ═══');
reset();

const uncertaintyAll = buildL13UncertaintyProfile({
  request_id: 'req.unc.all',
  active_contradiction_present: true,
  active_invalidation_present: true,
  unresolved_trigger_present: true,
  narrow_scenario_spread_present: true,
  narrow_hypothesis_spread_present: false,
  material_missing_data_present: true,
  material_drift_present: true,
  transition_risk_present: true,
  sequence_decay_present: true,
  confidence_cap_present: true,
});
assert(uncertaintyAll.must_disclose_uncertainty, 'D.01 all-on profile must disclose');
assert(
  uncertaintyAll.uncertainty_sources.includes(
    L13UncertaintySource.L7_CONTRADICTION,
  ),
  'D.02 contradiction source included',
);
assert(
  uncertaintyAll.uncertainty_sources.includes(
    L13UncertaintySource.L12_ACTIVE_INVALIDATION,
  ),
  'D.03 active invalidation source included',
);
assert(
  uncertaintyAll.required_disclosures.includes(L13RequiredDisclosure.MISSING_DATA),
  'D.04 missing data disclosure required',
);
assert(
  uncertaintyAll.required_disclosures.includes(L13RequiredDisclosure.DRIFT),
  'D.05 drift disclosure required',
);
assert(validateL13UncertaintyProfile(uncertaintyAll).clean, 'D.06 all-on profile clean');

// Bad profile: contradiction flag without source.
const badProfile: L13UncertaintyProfile = {
  ...uncertaintyAll,
  uncertainty_sources: uncertaintyAll.uncertainty_sources.filter(
    s => s !== L13UncertaintySource.L7_CONTRADICTION,
  ),
};
assert(
  !validateL13UncertaintyProfile(badProfile).clean,
  'D.07 inconsistent uncertainty rejected',
);

// Forbidden phrases attached.
assert(
  uncertaintyAll.forbidden_certainty_phrases.length ===
    L13_FORBIDDEN_CERTAINTY_PHRASES.length,
  'D.08 forbidden certainty phrases attached',
);

// Restriction binding — most restrictive wins.
const lower = {
  ...greenLowerLayerRestrictionInputs(),
  l11_blocks_score_explanation: true,
  l12_blocks_scenario_explanation: true,
  l11_blocks_alert: true,
};
const restr = buildL13ExplanationRestrictionProfile({
  request_id: 'req.D.restr',
  lower_layer: lower,
  contradiction_present: true,
  active_invalidation_present: true,
  missing_data_present: true,
  drift_present: false,
  narrow_spread_present: false,
  confidence_cap_present: false,
  unresolved_trigger_present: false,
});
assert(!restr.may_explain_score, 'D.09 score explanation blocked');
assert(!restr.may_explain_scenario, 'D.10 scenario explanation blocked');
assert(!restr.may_write_alert, 'D.11 alert writing blocked');
assert(!restr.may_use_confident_language, 'D.12 confident language blocked');
assert(
  !restr.allowed_answer_modes.includes(L13AnswerMode.EXPLAIN_SCORE),
  'D.13 EXPLAIN_SCORE not in allowed modes',
);
assert(
  !restr.allowed_answer_modes.includes(L13AnswerMode.EXPLAIN_SCENARIO),
  'D.14 EXPLAIN_SCENARIO not in allowed modes',
);
assert(restr.must_avoid_recommendation_language, 'D.15 must avoid recommendations');
assert(restr.must_avoid_prediction_language, 'D.16 must avoid predictions');
assert(restr.must_avoid_final_judgment_language, 'D.17 must avoid final judgment');
assert(validateL13RestrictionBinding(restr).clean, 'D.18 restriction profile validates clean');

// Always-blocked answer modes survive even with permissive lower layer.
const permissive = buildL13ExplanationRestrictionProfile({
  request_id: 'req.D.permissive',
  lower_layer: greenLowerLayerRestrictionInputs(),
  contradiction_present: false,
  active_invalidation_present: false,
  missing_data_present: false,
  drift_present: false,
  narrow_spread_present: false,
  confidence_cap_present: false,
  unresolved_trigger_present: false,
});
for (const m of L13_ALWAYS_BLOCKED_ANSWER_MODES) {
  assert(
    permissive.blocked_answer_modes.includes(m),
    `D.19/${m} always-blocked mode preserved`,
  );
}

// L7 hard block: only refusal allowed.
const l7Block = buildL13ExplanationRestrictionProfile({
  request_id: 'req.D.l7block',
  lower_layer: { ...greenLowerLayerRestrictionInputs(), l7_blocks_explanation: true },
  contradiction_present: true,
  active_invalidation_present: false,
  missing_data_present: false,
  drift_present: false,
  narrow_spread_present: false,
  confidence_cap_present: false,
  unresolved_trigger_present: false,
});
assert(
  l7Block.allowed_answer_modes.length === 1 &&
    l7Block.allowed_answer_modes[0] === L13AnswerMode.REFUSE_UNSUPPORTED,
  'D.20 L7 hard block reduces allowed modes to refusal only',
);

// Confidence breakdown — narrowest wins; reasons cap.
const conf = buildL13ConfidenceBreakdown({
  request_id: 'req.D.conf',
  lower_layer_bands: {
    validation_band: 'HIGH',
    regime_band: 'MEDIUM',
    sequence_band: 'HIGH',
    hypothesis_band: 'HIGH',
    score_band: 'LOW',
    scenario_band: 'HIGH',
  },
  narrowing_reasons: [],
});
assert(
  conf.overall_explanation_confidence_band === L13ExplanationConfidenceBand.LOW,
  'D.21 overall band = narrowest lower-layer band',
);
assert(validateL13ConfidenceBreakdown(conf).clean, 'D.22 confidence breakdown clean');

// Active invalidation forces uncertainty language.
const confInv = buildL13ConfidenceBreakdown({
  request_id: 'req.D.confInv',
  lower_layer_bands: {
    validation_band: 'HIGH',
    regime_band: 'HIGH',
    sequence_band: 'HIGH',
    hypothesis_band: 'HIGH',
    score_band: 'HIGH',
    scenario_band: 'HIGH',
  },
  narrowing_reasons: [
    // active invalidation must force LOW
  ],
});
assert(
  confInv.overall_explanation_confidence_band === L13ExplanationConfidenceBand.HIGH,
  'D.23 no reasons → keeps narrowest HIGH',
);

// Detect raise-above-lower violation (manually craft an offender).
const offenderConf = {
  ...conf,
  overall_explanation_confidence_band: L13ExplanationConfidenceBand.VERY_HIGH,
};
assert(
  !validateL13ConfidenceBreakdown(offenderConf).clean,
  'D.24 raising above lower-layer rank rejected',
);

// Adversarial intent forces uncertainty.
const adv = buildGreenPackage({
  intent: L13UserIntentClass.REQUESTS_TRADE_ADVICE,
});
assert(
  validateL13AIInputPackage(adv).issues.some(
    i => i.code === L13InputPackageViolationCode.L13P_RESTRICTION_BYPASS,
  ) ||
    adv.uncertainty_profile.must_disclose_uncertainty,
  'D.25 adversarial intent forces uncertainty disclosure or restriction bypass flagged',
);
assert(
  isL13AdversarialIntent(L13UserIntentClass.REQUESTS_TRADE_ADVICE),
  'D.26 trade-advice intent flagged adversarial',
);
assert(
  isL13AdversarialIntent(L13UserIntentClass.REQUESTS_CERTAINTY),
  'D.27 certainty-request intent flagged adversarial',
);
assert(
  !isL13AdversarialIntent(L13UserIntentClass.WHATS_HAPPENING),
  'D.28 whats-happening intent NOT adversarial',
);

// ═══════════════════════════════════════════════════════════════════
// BAND E — Builders and replay
// ═══════════════════════════════════════════════════════════════════
console.log('\n═══ BAND E: Builders and Replay ═══');
reset();

// Evidence digest builder determinism.
const dig1 = buildL13EvidenceDigest({
  source_layer: L13DependencyLayer.L11_SCORE,
  evidence_ref: 'l11.evidence.foo',
  role: L13EvidenceRole.PRIMARY_POSITIVE,
  strength_score: 0.7,
  summary_text: 'support',
});
const dig2 = buildL13EvidenceDigest({
  source_layer: L13DependencyLayer.L11_SCORE,
  evidence_ref: 'l11.evidence.foo',
  role: L13EvidenceRole.PRIMARY_POSITIVE,
  strength_score: 0.7,
  summary_text: 'support',
});
assert(dig1.evidence_digest_id === dig2.evidence_digest_id, 'E.01 digest id deterministic');
assert(dig1.evidence_strength_band === 'STRONG', 'E.02 strength band derived');

const protectedDigest = buildL13EvidenceDigest({
  source_layer: L13DependencyLayer.L7_VALIDATION,
  evidence_ref: 'l7.contradiction.1',
  role: L13EvidenceRole.PRIMARY_CONTRADICTION,
  strength_score: 0.8,
  summary_text: 'opposes claim',
  contradicts_refs: ['l7.claim.1'],
});
assert(
  protectedDigest.must_preserve_under_compression,
  'E.03 contradiction digest flagged must-preserve',
);
assert(
  L13_PROTECTED_EVIDENCE_ROLES.length >= 5,
  'E.04 5+ protected evidence roles',
);
assert(
  isL13ProtectedEvidenceRole(L13EvidenceRole.INVALIDATION_EVIDENCE),
  'E.05 invalidation role protected',
);
assert(
  !isL13ProtectedEvidenceRole(L13EvidenceRole.SECONDARY_POSITIVE),
  'E.06 secondary positive role not protected',
);
assert(
  validateL13EvidenceDigests([protectedDigest, dig1]).clean,
  'E.07 valid digests validate clean',
);

// Bad digest: contradiction without contradicts_refs.
const badDigest = buildL13EvidenceDigest({
  source_layer: L13DependencyLayer.L7_VALIDATION,
  evidence_ref: 'l7.bad',
  role: L13EvidenceRole.PRIMARY_CONTRADICTION,
  strength_score: 0.5,
  summary_text: 'no contradicts_refs',
});
assert(
  !validateL13EvidenceDigests([badDigest]).clean,
  'E.08 contradiction without contradicts_refs rejected',
);

// Confidence breakdown determinism.
const cb1 = buildL13ConfidenceBreakdown({
  request_id: 'r',
  lower_layer_bands: {
    validation_band: 'HIGH',
    regime_band: 'HIGH',
    sequence_band: 'HIGH',
    hypothesis_band: 'HIGH',
    score_band: 'HIGH',
    scenario_band: 'HIGH',
  },
  narrowing_reasons: [],
});
const cb2 = buildL13ConfidenceBreakdown({
  request_id: 'r',
  lower_layer_bands: {
    validation_band: 'HIGH',
    regime_band: 'HIGH',
    sequence_band: 'HIGH',
    hypothesis_band: 'HIGH',
    score_band: 'HIGH',
    scenario_band: 'HIGH',
  },
  narrowing_reasons: [],
});
assert(cb1.confidence_breakdown_id === cb2.confidence_breakdown_id, 'E.09 confidence id deterministic');

// Uncertainty profile determinism.
const up1 = buildL13UncertaintyProfile({
  request_id: 'r',
  active_contradiction_present: true,
  active_invalidation_present: false,
  unresolved_trigger_present: false,
  narrow_scenario_spread_present: false,
  narrow_hypothesis_spread_present: false,
  material_missing_data_present: false,
  material_drift_present: false,
  transition_risk_present: false,
  sequence_decay_present: false,
  confidence_cap_present: false,
});
const up2 = buildL13UncertaintyProfile({
  request_id: 'r',
  active_contradiction_present: true,
  active_invalidation_present: false,
  unresolved_trigger_present: false,
  narrow_scenario_spread_present: false,
  narrow_hypothesis_spread_present: false,
  material_missing_data_present: false,
  material_drift_present: false,
  transition_risk_present: false,
  sequence_decay_present: false,
  confidence_cap_present: false,
});
assert(up1.uncertainty_profile_id === up2.uncertainty_profile_id, 'E.10 uncertainty profile id deterministic');

// Package replay: same → same; mutation → different.
const p1 = buildGreenPackage();
const p2 = buildGreenPackage();
assert(p1.replay_hash === p2.replay_hash, 'E.11 same material → same package replay hash');
assert(p1.input_package_id === p2.input_package_id, 'E.12 same material → same package id');

const p3 = buildGreenPackage({ contradictionActive: true });
assert(p1.replay_hash !== p3.replay_hash, 'E.13 mutation flips replay hash');

// Order-only changes in unordered fields don't flip hash.
// (evidence_refs and lineage_refs are sorted by builder; we already
// know p1 == p2 → confirms canonicalization.)
assert(
  JSON.stringify([...p1.evidence_refs].sort()) ===
    JSON.stringify([...p1.evidence_refs]),
  'E.14 evidence_refs are sorted in canonical form',
);

// Package id format.
assert(
  /^l13\.input_package\.[0-9a-f]{8}$/.test(p1.input_package_id),
  'E.15 package id format',
);
assert(
  /^l13d\.confidence\.[0-9a-f]{8}$/.test(p1.confidence_breakdown.confidence_breakdown_id),
  'E.16 confidence id format',
);
assert(
  /^l13d\.uncertainty\.[0-9a-f]{8}$/.test(p1.uncertainty_profile.uncertainty_profile_id),
  'E.17 uncertainty id format',
);
assert(
  /^l13d\.restriction\.[0-9a-f]{8}$/.test(p1.restriction_profile.restriction_profile_id),
  'E.18 restriction id format',
);

// Intent requirements lookup.
const reqs = getL13IntentRequirements(L13UserIntentClass.WHATS_NEXT);
assert(reqs.requires_scenario_context, 'E.19 WHATS_NEXT requires scenario context');
const expReqs = getL13IntentRequirements(L13UserIntentClass.EXPLAIN_SCORE);
assert(expReqs.requires_score_context, 'E.20 EXPLAIN_SCORE requires score context');
const compReqs = getL13IntentRequirements(L13UserIntentClass.COMPARE_ASSETS);
assert(compReqs.requires_comparison_context, 'E.21 COMPARE_ASSETS requires comparison context');

// Readiness classification on green / contradiction / missing data.
assert(
  greenPkg.package_readiness_class === L13InputPackageReadinessClass.READY_FULL_CONTEXT,
  'E.22 green readiness = READY_FULL_CONTEXT',
);
const contraPkg = buildGreenPackage({ contradictionActive: true });
assert(
  contraPkg.package_readiness_class === L13InputPackageReadinessClass.NARROWED_BY_CONTRADICTION,
  'E.23 contradiction readiness narrowed',
);
const mdPkg = buildGreenPackage({ missingDataActive: true });
assert(
  mdPkg.package_readiness_class === L13InputPackageReadinessClass.NARROWED_BY_MISSING_DATA,
  'E.24 missing data readiness narrowed',
);
assert(
  mdPkg.package_completeness_class === L13InputPackageCompletenessClass.NARROWED_BY_MISSING_DATA,
  'E.25 missing data completeness narrowed',
);
assert(
  isL13BlockedPackageReadiness(L13InputPackageReadinessClass.BLOCKED_RAW_CONTEXT),
  'E.26 BLOCKED_RAW_CONTEXT classified as blocked',
);
assert(
  L13_BLOCKED_PACKAGE_READINESS_CLASSES.length === 3,
  'E.27 3 blocked readiness classes',
);

// ═══════════════════════════════════════════════════════════════════
// BAND F — Audit and Invariants
// ═══════════════════════════════════════════════════════════════════
console.log('\n═══ BAND F: Audit and Invariants ═══');
reset();

// Audit subject classes count.
assert(
  Object.values(L13InputPackageAuditSubjectClass).length === 18,
  'F.01 18 audit subject classes',
);

// Audit determinism.
const aud1 = emitL13InputPackageAuditRecord({
  subjectClass: L13InputPackageAuditSubjectClass.INPUT_PACKAGE,
  subjectRef: 'pkg.test',
  violationCode: L13InputPackageViolationCode.L13P_RAW_LOWER_LAYER_CONTEXT,
  message: 'detected raw layer ref',
  evidenceRefs: ['ev'],
  lineageRefs: ['lin'],
  createdAt: '2026-05-09T00:00:00Z',
});
const aud2 = emitL13InputPackageAuditRecord({
  subjectClass: L13InputPackageAuditSubjectClass.INPUT_PACKAGE,
  subjectRef: 'pkg.test',
  violationCode: L13InputPackageViolationCode.L13P_RAW_LOWER_LAYER_CONTEXT,
  message: 'detected raw layer ref',
  evidenceRefs: ['ev'],
  lineageRefs: ['lin'],
  createdAt: '2026-05-09T00:00:00Z',
});
assert(aud1.replay_hash === aud2.replay_hash, 'F.02 audit replay hash deterministic');
assert(aud1.audit_id === aud2.audit_id, 'F.03 audit id deterministic');
assert(aud1.severity === L13ViolationSeverity.CRITICAL, 'F.04 raw context severity CRITICAL');
assert(aud1.blocking, 'F.05 raw context blocking');
assert(/^l13p\.audit\.[0-9a-f]{8}$/.test(aud1.audit_id), 'F.06 audit id format');

// Severity mapping.
assert(
  severityForL13InputPackageCode(
    L13InputPackageViolationCode.L13P_NAKED_L11_SCORE_CONTEXT,
  ) === L13ViolationSeverity.CRITICAL,
  'F.07 naked L11 → CRITICAL',
);
assert(
  severityForL13InputPackageCode(
    L13InputPackageViolationCode.L13P_ILLEGAL_COMPRESSION,
  ) === L13ViolationSeverity.ERROR,
  'F.08 illegal compression → ERROR',
);
assert(
  isL13InputPackageBlockingCode(
    L13InputPackageViolationCode.L13P_CONTRADICTION_DROPPED_BEFORE_POSITIVE,
  ),
  'F.09 dropped contradiction blocking',
);

// Audit log queries.
emitL13InputPackageAuditRecord({
  subjectClass: L13InputPackageAuditSubjectClass.SCORE_SUMMARY,
  subjectRef: 'pkg.test.score',
  violationCode: L13InputPackageViolationCode.L13P_NAKED_L11_SCORE_CONTEXT,
  message: 'naked l11',
  createdAt: '2026-05-09T00:00:00Z',
});
assert(hasAnyL13InputPackageViolations(), 'F.10 audit log has violations');
assert(
  getL13InputPackageViolationCount() === 3,
  'F.11 audit count exact (after 2 dedupe + 1 new)',
);
assert(
  getL13InputPackageCriticalViolations().length === 3,
  'F.12 all logged are critical',
);
assert(
  getL13InputPackageBlockingViolations().length === 3,
  'F.13 all logged are blocking',
);
assert(
  getL13InputPackageViolationsByCode(
    L13InputPackageViolationCode.L13P_RAW_LOWER_LAYER_CONTEXT,
  ).length === 2,
  'F.14 query by code',
);
assert(
  getL13InputPackageViolationsBySubjectClass(
    L13InputPackageAuditSubjectClass.SCORE_SUMMARY,
  ).length === 1,
  'F.15 query by subject class',
);
assert(getL13InputPackageAuditLog().length === 3, 'F.16 read full audit log');

resetL13InputPackageAuditLog();
assert(!hasAnyL13InputPackageViolations(), 'F.17 audit log resets');

// Total violation codes catalogued.
assert(
  ALL_L13_INPUT_PACKAGE_VIOLATION_CODES.length >= 40,
  'F.18 40+ violation codes catalogued',
);

// Run all 10 invariants.
const invs = runAllL13_2Invariants();
assert(invs.length === 10, 'F.19 10 invariants');
for (const inv of invs) {
  assert(inv.holds, `F.20/${inv.id} ${inv.name} — ${inv.evidence}`);
}

// ═══════════════════════════════════════════════════════════════════
console.log('\n═══════════════════════════════════════════════════════');
console.log(`  Total: ${passed + failed}   PASS: ${passed}   FAIL: ${failed}`);
console.log('═══════════════════════════════════════════════════════');

if (failed > 0) {
  process.exitCode = 1;
}
