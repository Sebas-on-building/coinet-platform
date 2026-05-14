/**
 * L12.3 — Universal Scenario Contracts & Output Law
 * Certification Test Suite (§12.3.22)
 *
 * 5 Bands:
 *   A — Subject and input contract law
 *   B — Scenario set and path contract law
 *   C — Condition, trigger, invalidation, confidence law
 *   D — Readiness, cleanliness, restriction, evidence law
 *   E — Compatibility, audit, invariants
 */

import {
  buildCanonicalL12ConditionContract,
  buildCanonicalL12EvidencePack,
  buildCanonicalL12InvalidationContract,
  buildCanonicalL12PathConfidenceContract,
  buildCanonicalL12PathContract,
  buildCanonicalL12ReplayIdentity,
  buildCanonicalL12RestrictionContract,
  buildCanonicalL12SetContract,
  buildCanonicalL12ShiftContract,
  buildCanonicalL12SubjectContract,
  buildCanonicalL12TriggerContract,
  checkAllL12_3Invariants,
} from '../l12/invariants/l12_3-invariants';

import {
  ALL_L12_SCENARIO_CONTRACT_COMPATIBILITY_CLASSES,
  ALL_L12_SCENARIO_CONTRACT_SURFACES,
  ALL_L12_SCENARIO_OUTPUT_READINESS_CLASSES,
  classifyL12ContractDelta,
  deriveL12ScenarioOutputReadiness,
  L12_DEFAULT_SCORE_CONTEXT_POLICY,
  L12ConditionContract,
  L12ConfidenceCapPosture,
  L12InvalidationContract,
  L12PathConfidenceContract,
  L12RestrictionContract,
  L12ScenarioContractCompatibilityClass,
  L12ScenarioContractSurface,
  L12ScenarioEvidencePackContract,
  L12ScenarioOutputReadinessClass,
  L12ScenarioOutputReadinessInputs,
  L12ScenarioPathContract,
  L12ScenarioReplayIdentity,
  L12ScenarioSetContract,
  L12ScenarioSpreadClass,
  L12ScenarioSubjectContract,
  L12ShiftConditionContract,
  L12TriggerContract,
} from '../l12/contracts';
import {
  L12InvalidationStatus,
} from '../l12/contracts/scenario-invalidation';
import {
  L12TriggerStatus,
} from '../l12/contracts/scenario-trigger';
import {
  L12ScenarioBlockedUse,
} from '../l12/contracts/scenario-restriction-profile';

import {
  ALL_L12_CONTRACT_VIOLATION_CODES,
  L12ContractViolationCode,
  validateL12ConditionContract,
  validateL12ContractDelta,
  validateL12EvidencePackContract,
  validateL12InvalidationContract,
  validateL12PathConfidenceContract,
  validateL12ReplayIdentity,
  validateL12RestrictionContract,
  validateL12ScenarioCleanliness,
  validateL12ScenarioOutputReadiness,
  validateL12ScenarioPathContract,
  validateL12ScenarioSetContract,
  validateL12ScenarioSubjectContract,
  validateL12ShiftConditionContract,
  validateL12TriggerContract,
} from '../l12/validation';

import {
  emitL12ContractAuditRecords,
  getL12ContractAuditLog,
  getL12ContractCriticalViolations,
  getL12ContractViolationsByCode,
  getL12ContractViolationsBySubjectClass,
  L12ContractAuditSubjectClass,
  resetL12ContractAuditLog,
  severityForL12ContractViolationCode,
} from '../l12/constitution';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function ok(name: string, cond: boolean): void {
  if (cond) {
    passed += 1;
  } else {
    failed += 1;
    failures.push(name);
  }
}

function clone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x)) as T;
}

resetL12ContractAuditLog();

/* ───────────────────── BAND A: subject and inputs ───────────────────── */
console.log('═══ BAND A: Subject and Input Contract Law ═══');

(function bandA() {
  const canon = buildCanonicalL12SubjectContract();
  ok('A.01 canon subject contract is clean', validateL12ScenarioSubjectContract(canon).length === 0);

  const noScorePolicy: L12ScenarioSubjectContract = {
    ...canon,
    l11_score_context_policy: undefined as unknown as L12ScenarioSubjectContract['l11_score_context_policy'],
  };
  ok(
    'A.02 missing score-context policy rejects',
    validateL12ScenarioSubjectContract(noScorePolicy).some(
      e => e.code === L12ContractViolationCode.L12K_SCORE_CONTEXT_POLICY_MISSING,
    ),
  );

  const weakened: L12ScenarioSubjectContract = {
    ...canon,
    l11_score_context_policy: {
      ...L12_DEFAULT_SCORE_CONTEXT_POLICY,
      requires_attribution: false as unknown as true,
    },
  };
  ok(
    'A.03 weakened score-context policy rejects',
    validateL12ScenarioSubjectContract(weakened).some(
      e => e.code === L12ContractViolationCode.L12K_SCORE_CONTEXT_POLICY_WEAKENED,
    ),
  );

  const noTriggerPolicy: L12ScenarioSubjectContract = {
    ...canon,
    trigger_requirement_policy: undefined as unknown as L12ScenarioSubjectContract['trigger_requirement_policy'],
  };
  ok(
    'A.04 missing trigger policy rejects',
    validateL12ScenarioSubjectContract(noTriggerPolicy).some(
      e => e.code === L12ContractViolationCode.L12K_TRIGGER_POLICY_MISSING,
    ),
  );

  const noInvalidationPolicy: L12ScenarioSubjectContract = {
    ...canon,
    invalidation_requirement_policy: undefined as unknown as L12ScenarioSubjectContract['invalidation_requirement_policy'],
  };
  ok(
    'A.05 missing invalidation policy rejects',
    validateL12ScenarioSubjectContract(noInvalidationPolicy).some(
      e => e.code === L12ContractViolationCode.L12K_INVALIDATION_POLICY_MISSING,
    ),
  );

  const noEvidencePolicy: L12ScenarioSubjectContract = {
    ...canon,
    evidence_pack_policy: undefined as unknown as L12ScenarioSubjectContract['evidence_pack_policy'],
  };
  ok(
    'A.06 missing evidence policy rejects',
    validateL12ScenarioSubjectContract(noEvidencePolicy).some(
      e => e.code === L12ContractViolationCode.L12K_EVIDENCE_POLICY_MISSING,
    ),
  );

  const noLineage: L12ScenarioSubjectContract = {
    ...canon,
    lineage_policy: undefined as unknown as L12ScenarioSubjectContract['lineage_policy'],
  };
  ok(
    'A.07 missing lineage policy rejects',
    validateL12ScenarioSubjectContract(noLineage).some(
      e => e.code === L12ContractViolationCode.L12K_LINEAGE_POLICY_MISSING,
    ),
  );

  const noReplay: L12ScenarioSubjectContract = { ...canon, replay_hash: '' };
  ok(
    'A.08 missing replay hash rejects',
    validateL12ScenarioSubjectContract(noReplay).some(
      e => e.code === L12ContractViolationCode.L12K_REPLAY_HASH_MISSING,
    ),
  );

  const tradeIntent: L12ScenarioSubjectContract = {
    ...canon,
    scope_id: 'btc_buy_signal',
  };
  ok(
    'A.09 trade intent in subject rejects',
    validateL12ScenarioSubjectContract(tradeIntent).some(
      e => e.code === L12ContractViolationCode.L12K_SUBJECT_TRADE_INTENT,
    ),
  );

  const allowed = canon.allowed_scenario_families;
  ok('A.10 allowed_scenario_families is non-empty', allowed.length > 0);

  const empty: L12ScenarioSubjectContract = { ...canon, allowed_scenario_families: [] };
  ok(
    'A.11 empty allowed_scenario_families rejects',
    validateL12ScenarioSubjectContract(empty).some(
      e => e.code === L12ContractViolationCode.L12K_ALLOWED_FAMILIES_MISSING,
    ),
  );

  const inputs = canon.required_validation_inputs;
  ok('A.12 required validation inputs present', inputs.length > 0);

  ok('A.13 required score-context inputs present', canon.required_score_context_inputs.length > 0);
  ok(
    'A.14 score-context policy strict requires drift status',
    canon.l11_score_context_policy.requires_drift_status === true,
  );
})();

/* ───────────────────── BAND B: set and path contracts ───────────────────── */
console.log('\n═══ BAND B: Set and Path Contract Law ═══');

(function bandB() {
  const set = buildCanonicalL12SetContract();
  ok('B.01 canon set contract is clean', validateL12ScenarioSetContract(set).length === 0);

  const noBase: L12ScenarioSetContract = { ...set, base_case_ref: '' };
  ok(
    'B.02 missing base_case_ref rejects',
    validateL12ScenarioSetContract(noBase).some(
      e => e.code === L12ContractViolationCode.L12K_BASE_CASE_ABSENT,
    ),
  );

  const single: L12ScenarioSetContract = {
    ...set,
    scenario_refs: ['scen.base'],
    scenario_count: 1,
    scenario_spread_class: L12ScenarioSpreadClass.MODERATE_PRIMARY,
  };
  ok(
    'B.03 single path without INSUFFICIENT_SCENARIO_COMPETITION rejects',
    validateL12ScenarioSetContract(single).some(
      e => e.code === L12ContractViolationCode.L12K_ALTERNATIVE_PATH_ABSENT,
    ),
  );

  const singleInsuf: L12ScenarioSetContract = {
    ...set,
    scenario_refs: ['scen.base'],
    scenario_count: 1,
    scenario_spread_class: L12ScenarioSpreadClass.INSUFFICIENT_SCENARIO_COMPETITION,
  };
  ok(
    'B.04 single path with INSUFFICIENT_SCENARIO_COMPETITION accepted',
    !validateL12ScenarioSetContract(singleInsuf).some(
      e => e.code === L12ContractViolationCode.L12K_ALTERNATIVE_PATH_ABSENT,
    ),
  );

  const noTrig: L12ScenarioSetContract = { ...set, trigger_profile_refs: [] };
  ok(
    'B.05 missing trigger profile rejects',
    validateL12ScenarioSetContract(noTrig).some(
      e => e.code === L12ContractViolationCode.L12K_TRIGGER_PROFILE_ABSENT,
    ),
  );

  const noInv: L12ScenarioSetContract = { ...set, invalidation_profile_refs: [] };
  ok(
    'B.06 missing invalidation profile rejects',
    validateL12ScenarioSetContract(noInv).some(
      e => e.code === L12ContractViolationCode.L12K_INVALIDATION_ABSENT,
    ),
  );

  const noEv: L12ScenarioSetContract = { ...set, evidence_pack_ref: '' };
  ok(
    'B.07 missing evidence_pack_ref rejects',
    validateL12ScenarioSetContract(noEv).some(
      e => e.code === L12ContractViolationCode.L12K_EVIDENCE_REFS_ABSENT,
    ),
  );

  const noLin: L12ScenarioSetContract = { ...set, lineage_refs: [] };
  ok(
    'B.08 missing lineage refs rejects',
    validateL12ScenarioSetContract(noLin).some(
      e => e.code === L12ContractViolationCode.L12K_LINEAGE_REFS_ABSENT,
    ),
  );

  const noReplay: L12ScenarioSetContract = { ...set, replay_hash: '' };
  ok(
    'B.09 missing replay hash rejects',
    validateL12ScenarioSetContract(noReplay).some(
      e => e.code === L12ContractViolationCode.L12K_REPLAY_HASH_MISSING,
    ),
  );

  const guarBase: L12ScenarioSetContract = { ...set, base_case_ref: 'guaranteed_path_btc' };
  ok(
    'B.10 base case described as guaranteed rejects',
    validateL12ScenarioSetContract(guarBase).some(
      e => e.code === L12ContractViolationCode.L12K_BASE_CASE_GUARANTEED_OUTCOME,
    ),
  );

  const finalWinner: L12ScenarioSetContract = { ...set, primary_scenario_ref: 'scenario_winner_btc' };
  ok(
    'B.11 primary as final winner rejects',
    validateL12ScenarioSetContract(finalWinner).some(
      e => e.code === L12ContractViolationCode.L12K_PRIMARY_FINAL_WINNER,
    ),
  );

  const path = buildCanonicalL12PathContract();
  ok('B.12 canon path contract is clean', validateL12ScenarioPathContract(path).length === 0);

  const decl: L12ScenarioPathContract = { ...path, path_claim: 'price will go higher' };
  ok(
    'B.13 declarative path claim rejects',
    validateL12ScenarioPathContract(decl).some(
      e => e.code === L12ContractViolationCode.L12K_PATH_CLAIM_NOT_CONDITIONAL,
    ),
  );

  const cert: L12ScenarioPathContract = {
    ...path,
    path_claim: 'continuation is guaranteed if spot improves',
  };
  ok(
    'B.14 certainty in path claim rejects',
    validateL12ScenarioPathContract(cert).some(
      e => e.code === L12ContractViolationCode.L12K_CERTAINTY_LANGUAGE,
    ),
  );

  const noTrigPath: L12ScenarioPathContract = { ...path, trigger_refs: [] };
  ok(
    'B.15 path missing triggers rejects',
    validateL12ScenarioPathContract(noTrigPath).some(
      e => e.code === L12ContractViolationCode.L12K_TRIGGER_REFS_ABSENT,
    ),
  );

  const noInvPath: L12ScenarioPathContract = { ...path, invalidation_refs: [] };
  ok(
    'B.16 path missing invalidations rejects',
    validateL12ScenarioPathContract(noInvPath).some(
      e => e.code === L12ContractViolationCode.L12K_INVALIDATION_REFS_ABSENT,
    ),
  );

  const noCondPath: L12ScenarioPathContract = { ...path, required_condition_refs: [] };
  ok(
    'B.17 path missing required conditions rejects',
    validateL12ScenarioPathContract(noCondPath).some(
      e => e.code === L12ContractViolationCode.L12K_REQUIRED_CONDITIONS_ABSENT,
    ),
  );

  const noEvPath: L12ScenarioPathContract = { ...path, supporting_evidence_refs: [] };
  ok(
    'B.18 path missing evidence rejects',
    validateL12ScenarioPathContract(noEvPath).some(
      e => e.code === L12ContractViolationCode.L12K_PATH_EVIDENCE_REFS_ABSENT,
    ),
  );

  const noLinPath: L12ScenarioPathContract = { ...path, lineage_refs: [] };
  ok(
    'B.19 path missing lineage rejects',
    validateL12ScenarioPathContract(noLinPath).some(
      e => e.code === L12ContractViolationCode.L12K_LINEAGE_REFS_ABSENT,
    ),
  );

  const noReplayPath: L12ScenarioPathContract = { ...path, replay_hash: '' };
  ok(
    'B.20 path missing replay hash rejects',
    validateL12ScenarioPathContract(noReplayPath).some(
      e => e.code === L12ContractViolationCode.L12K_REPLAY_HASH_MISSING,
    ),
  );
})();

/* ───────────────────── BAND C: condition / trigger / inv / confidence ───────────────────── */
console.log('\n═══ BAND C: Condition, Trigger, Invalidation, Confidence Law ═══');

(function bandC() {
  const cond = buildCanonicalL12ConditionContract();
  ok('C.01 canon condition contract is clean', validateL12ConditionContract(cond).length === 0);

  const incCond: L12ConditionContract = { ...cond, current_state_ref: '' };
  ok(
    'C.02 incomplete condition contract rejects',
    validateL12ConditionContract(incCond).some(
      e => e.code === L12ContractViolationCode.L12K_CONDITION_CONTRACT_INCOMPLETE,
    ),
  );

  const rawCond: L12ConditionContract = { ...cond, required_surface_ref: 'l1:tick.feed' };
  ok(
    'C.03 raw-source condition rejects',
    validateL12ConditionContract(rawCond).some(
      e => e.code === L12ContractViolationCode.L12K_CONDITION_RAW_SOURCE,
    ),
  );

  const trig = buildCanonicalL12TriggerContract();
  ok('C.04 canon trigger contract is clean', validateL12TriggerContract(trig).length === 0);

  const noMon: L12TriggerContract = {
    ...trig,
    monitoring_requirement: undefined as unknown as L12TriggerContract['monitoring_requirement'],
  };
  ok(
    'C.05 missing trigger monitoring rejects',
    validateL12TriggerContract(noMon).some(
      e => e.code === L12ContractViolationCode.L12K_TRIGGER_MONITORING_REQ_MISSING,
    ),
  );

  const unmonActive: L12TriggerContract = {
    ...trig,
    trigger_status: L12TriggerStatus.ACTIVE,
    monitoring_requirement: { ...trig.monitoring_requirement, monitorable: false },
  };
  ok(
    'C.06 unmonitorable but active trigger rejects',
    validateL12TriggerContract(unmonActive).some(
      e => e.code === L12ContractViolationCode.L12K_TRIGGER_NOT_MONITORABLE_BUT_ACTIVE,
    ),
  );

  const guaranteed: L12TriggerContract = { ...trig, trigger_name: 'guaranteed_breakout' };
  ok(
    'C.07 trigger with guaranteed naming rejects',
    validateL12TriggerContract(guaranteed).some(
      e => e.code === L12ContractViolationCode.L12K_TRIGGER_GUARANTEED_OUTCOME,
    ),
  );

  const trade: L12TriggerContract = { ...trig, trigger_name: 'btc_buy_signal' };
  ok(
    'C.08 trigger with trade-action naming rejects',
    validateL12TriggerContract(trade).some(
      e => e.code === L12ContractViolationCode.L12K_TRIGGER_TRADE_INSTRUCTION,
    ),
  );

  const inv = buildCanonicalL12InvalidationContract();
  ok('C.09 canon invalidation contract is clean', validateL12InvalidationContract(inv).length === 0);

  const unmonInv: L12InvalidationContract = {
    ...inv,
    monitoring_requirement: {
      ...inv.monitoring_requirement,
      monitorable: false,
      blocks_clean_output_if_missing: false,
    },
  };
  ok(
    'C.10 unmonitorable invalidation without blocks_clean rejects',
    validateL12InvalidationContract(unmonInv).some(
      e => e.code === L12ContractViolationCode.L12K_INVALIDATION_NOT_MONITORABLE_USED_CLEAN,
    ),
  );

  const activeInv: L12InvalidationContract = {
    ...inv,
    invalidation_status: L12InvalidationStatus.ACTIVE,
  };
  const errs = validateL12InvalidationContract(activeInv, {
    confidenceCapReasonRefs: [],
  });
  ok(
    'C.11 active invalidation not reflected in confidence rejects',
    errs.some(
      e => e.code === L12ContractViolationCode.L12K_ACTIVE_INVALIDATION_NOT_REFLECTED_IN_CONFIDENCE,
    ),
  );

  const reflected = validateL12InvalidationContract(activeInv, {
    confidenceCapReasonRefs: [activeInv.invalidation_id],
  });
  ok(
    'C.12 active invalidation reflected in confidence accepted',
    !reflected.some(
      e => e.code === L12ContractViolationCode.L12K_ACTIVE_INVALIDATION_NOT_REFLECTED_IN_CONFIDENCE,
    ),
  );

  const pcp = buildCanonicalL12PathConfidenceContract();
  ok('C.13 canon confidence contract is clean', validateL12PathConfidenceContract(pcp).length === 0);

  const oob: L12PathConfidenceContract = { ...pcp, primary_path_confidence_score: 1.5 };
  ok(
    'C.14 confidence out of range rejects',
    validateL12PathConfidenceContract(oob).some(
      e => e.code === L12ContractViolationCode.L12K_CONFIDENCE_OUT_OF_RANGE,
    ),
  );

  const mismatch: L12PathConfidenceContract = clone(pcp);
  (mismatch as { primary_path_confidence_band: typeof mismatch.primary_path_confidence_band }).primary_path_confidence_band =
    'VERY_HIGH' as typeof mismatch.primary_path_confidence_band;
  ok(
    'C.15 confidence band mismatch rejects',
    validateL12PathConfidenceContract(mismatch).some(
      e => e.code === L12ContractViolationCode.L12K_CONFIDENCE_BAND_MISMATCH,
    ),
  );

  const high: L12PathConfidenceContract = {
    ...pcp,
    primary_path_confidence_score: 0.85,
    primary_path_confidence_band: 'VERY_HIGH' as typeof pcp.primary_path_confidence_band,
  };
  const cap: L12ConfidenceCapPosture = {
    hasActiveInvalidation: true,
    contradictionUnresolved: true,
    transitionRiskHigh: false,
    decayDominant: false,
    hypothesisSpreadNarrow: false,
    missingVisibilityMaterial: true,
    driftMaterialOrCritical: true,
    requiredTriggersUnresolved: false,
    scenarioSpreadNarrow: false,
  };
  const capErrs = validateL12PathConfidenceContract(high, { cap_posture: cap });
  ok(
    'C.16 high confidence under contradiction rejects',
    capErrs.some(
      e => e.code === L12ContractViolationCode.L12K_CONFIDENCE_UNCAPPED_UNDER_CONTRADICTION,
    ),
  );
  ok(
    'C.17 high confidence under invalidation rejects',
    capErrs.some(
      e => e.code === L12ContractViolationCode.L12K_CONFIDENCE_UNCAPPED_UNDER_INVALIDATION,
    ),
  );
  ok(
    'C.18 high confidence under missing visibility rejects',
    capErrs.some(
      e => e.code === L12ContractViolationCode.L12K_CONFIDENCE_UNCAPPED_UNDER_MISSING_VISIBILITY,
    ),
  );
  ok(
    'C.19 high confidence under drift rejects',
    capErrs.some(
      e => e.code === L12ContractViolationCode.L12K_CONFIDENCE_UNCAPPED_UNDER_DRIFT,
    ),
  );
  ok(
    'C.20 cap refs missing under cap-required posture rejects',
    capErrs.some(
      e => e.code === L12ContractViolationCode.L12K_CONFIDENCE_CAP_REFS_MISSING,
    ),
  );
})();

/* ───────────────────── BAND D: readiness / clean / restriction / evidence ───────────────────── */
console.log('\n═══ BAND D: Readiness, Cleanliness, Restriction, Evidence Law ═══');

(function bandD() {
  // Output readiness derivation
  const cleanInputs: L12ScenarioOutputReadinessInputs = {
    hasBaseCase: true,
    hasAlternativePath: true,
    triggersComplete: true,
    invalidationsComplete: true,
    confidenceClean: true,
    shiftConditionsCompleteWhenRequired: true,
    restrictionProfileComplete: true,
    l11ScoreContextComplete: true,
    evidencePackComplete: true,
    replayIdentityComplete: true,
    hasPredictionLeak: false,
    hasRecommendationLeak: false,
    hasJudgmentLeak: false,
    hasTradeLeak: false,
    hasActiveInvalidation: false,
    contradictionUnresolved: false,
    missingVisibilityMaterial: false,
    driftMaterial: false,
    multiPathUnresolved: false,
    disclosuresPresent: false,
    restrictionBlocksEmission: false,
  };
  ok(
    'D.01 readiness derives CLEAN_EMISSION when complete',
    deriveL12ScenarioOutputReadiness(cleanInputs) ===
      L12ScenarioOutputReadinessClass.CLEAN_EMISSION,
  );
  ok(
    'D.02 readiness derives EMISSION_WITH_DISCLOSURE when disclosure present',
    deriveL12ScenarioOutputReadiness({ ...cleanInputs, disclosuresPresent: true }) ===
      L12ScenarioOutputReadinessClass.EMISSION_WITH_DISCLOSURE,
  );
  ok(
    'D.03 readiness derives NARROWED_EMISSION under active invalidation',
    deriveL12ScenarioOutputReadiness({ ...cleanInputs, hasActiveInvalidation: true }) ===
      L12ScenarioOutputReadinessClass.NARROWED_EMISSION,
  );
  ok(
    'D.04 readiness derives MULTI_PATH_UNRESOLVED',
    deriveL12ScenarioOutputReadiness({ ...cleanInputs, multiPathUnresolved: true }) ===
      L12ScenarioOutputReadinessClass.MULTI_PATH_UNRESOLVED,
  );
  ok(
    'D.05 readiness derives BLOCKED_INSUFFICIENT_CONTRACT under missing trigger',
    deriveL12ScenarioOutputReadiness({ ...cleanInputs, triggersComplete: false }) ===
      L12ScenarioOutputReadinessClass.BLOCKED_INSUFFICIENT_CONTRACT,
  );
  ok(
    'D.06 readiness derives BLOCKED_BY_RESTRICTION',
    deriveL12ScenarioOutputReadiness({ ...cleanInputs, restrictionBlocksEmission: true }) ===
      L12ScenarioOutputReadinessClass.BLOCKED_BY_RESTRICTION,
  );
  ok(
    'D.07 readiness derives BLOCKED_BY_PREDICTION_THEATER under leak',
    deriveL12ScenarioOutputReadiness({ ...cleanInputs, hasPredictionLeak: true }) ===
      L12ScenarioOutputReadinessClass.BLOCKED_BY_PREDICTION_THEATER,
  );

  // Cleanliness law
  const v1 = validateL12ScenarioCleanliness(
    { claims_clean: true },
    { ...cleanInputs, hasActiveInvalidation: true },
  );
  ok(
    'D.08 cleanliness rejects clean-while-invalidation',
    v1.some(e => e.code === L12ContractViolationCode.L12K_OUTPUT_CLEAN_WHILE_INVALIDATION_ACTIVE),
  );

  const v2 = validateL12ScenarioCleanliness(
    { claims_clean: true },
    { ...cleanInputs, triggersComplete: false },
  );
  ok(
    'D.09 cleanliness rejects clean-while-trigger-missing',
    v2.some(e => e.code === L12ContractViolationCode.L12K_OUTPUT_CLEAN_WHILE_TRIGGER_MISSING),
  );

  const v3 = validateL12ScenarioCleanliness(
    { claims_clean: true },
    { ...cleanInputs, hasAlternativePath: false },
  );
  ok(
    'D.10 cleanliness rejects clean-while-alt-absent',
    v3.some(e => e.code === L12ContractViolationCode.L12K_OUTPUT_CLEAN_WHILE_ALT_PATH_ABSENT),
  );

  const v4 = validateL12ScenarioCleanliness(
    { claims_clean: true },
    { ...cleanInputs, l11ScoreContextComplete: false },
  );
  ok(
    'D.11 cleanliness rejects clean-while-score-incomplete',
    v4.some(e => e.code === L12ContractViolationCode.L12K_OUTPUT_CLEAN_WHILE_SCORE_CONTEXT_INCOMPLETE),
  );

  const v5 = validateL12ScenarioCleanliness(
    { claims_clean: true },
    { ...cleanInputs, hasPredictionLeak: true },
  );
  ok(
    'D.12 cleanliness rejects clean with prediction leak',
    v5.some(e => e.code === L12ContractViolationCode.L12K_OUTPUT_LEAKAGE_DETECTED),
  );

  // Output readiness validator (declared vs derived)
  const declMismatch = validateL12ScenarioOutputReadiness(
    L12ScenarioOutputReadinessClass.CLEAN_EMISSION,
    { ...cleanInputs, hasActiveInvalidation: true },
  );
  ok(
    'D.13 declared CLEAN with active invalidation triggers derivation mismatch',
    declMismatch.some(
      e => e.code === L12ContractViolationCode.L12K_OUTPUT_READINESS_DERIVATION_MISMATCH,
    ),
  );

  // Restriction
  const rest = buildCanonicalL12RestrictionContract();
  ok('D.14 canon restriction contract is clean', validateL12RestrictionContract(rest).length === 0);

  const noRec: L12RestrictionContract = {
    ...rest,
    blocked_uses: rest.blocked_uses.filter(u => u !== L12ScenarioBlockedUse.RECOMMENDATION_OUTPUT),
  };
  ok(
    'D.15 missing RECOMMENDATION_OUTPUT block rejects',
    validateL12RestrictionContract(noRec).some(
      e => e.code === L12ContractViolationCode.L12K_RESTRICTION_RECOMMENDATION_NOT_BLOCKED,
    ),
  );

  const noPred: L12RestrictionContract = {
    ...rest,
    blocked_uses: rest.blocked_uses.filter(u => u !== L12ScenarioBlockedUse.PREDICTION_OUTPUT),
  };
  ok(
    'D.16 missing PREDICTION_OUTPUT block rejects',
    validateL12RestrictionContract(noPred).some(
      e => e.code === L12ContractViolationCode.L12K_RESTRICTION_PREDICTION_NOT_BLOCKED,
    ),
  );

  const noTrade: L12RestrictionContract = {
    ...rest,
    blocked_uses: rest.blocked_uses.filter(u => u !== L12ScenarioBlockedUse.TRADE_ACTION_OUTPUT),
  };
  ok(
    'D.17 missing TRADE_ACTION_OUTPUT block rejects',
    validateL12RestrictionContract(noTrade).some(
      e => e.code === L12ContractViolationCode.L12K_RESTRICTION_TRADE_NOT_BLOCKED,
    ),
  );

  const noFJ: L12RestrictionContract = {
    ...rest,
    blocked_uses: rest.blocked_uses.filter(u => u !== L12ScenarioBlockedUse.FINAL_JUDGMENT_WITHOUT_L13),
  };
  ok(
    'D.18 missing FINAL_JUDGMENT block rejects',
    validateL12RestrictionContract(noFJ).some(
      e => e.code === L12ContractViolationCode.L12K_RESTRICTION_FINAL_JUDGMENT_NOT_BLOCKED,
    ),
  );

  const noCert: L12RestrictionContract = {
    ...rest,
    blocked_uses: rest.blocked_uses.filter(u => u !== L12ScenarioBlockedUse.CERTAINTY_CLAIM),
  };
  ok(
    'D.19 missing CERTAINTY_CLAIM block rejects',
    validateL12RestrictionContract(noCert).some(
      e => e.code === L12ContractViolationCode.L12K_RESTRICTION_CERTAINTY_NOT_BLOCKED,
    ),
  );

  // Evidence pack
  const ep = buildCanonicalL12EvidencePack();
  ok('D.20 canon evidence pack is clean', validateL12EvidencePackContract(ep).length === 0);

  const noScoreEv: L12ScenarioEvidencePackContract = { ...ep, score_evidence_refs: [] };
  ok(
    'D.21 missing score evidence rejects',
    validateL12EvidencePackContract(noScoreEv).some(
      e => e.code === L12ContractViolationCode.L12K_EVIDENCE_SCORE_REFS_MISSING,
    ),
  );

  const noSnap: L12ScenarioEvidencePackContract = { ...ep, input_snapshot_ref: '' };
  ok(
    'D.22 missing input snapshot rejects',
    validateL12EvidencePackContract(noSnap).some(
      e => e.code === L12ContractViolationCode.L12K_EVIDENCE_INPUT_SNAPSHOT_MISSING,
    ),
  );

  const noReplay: L12ScenarioEvidencePackContract = { ...ep, replay_safe_ref: '' };
  ok(
    'D.23 missing replay-safe ref rejects',
    validateL12EvidencePackContract(noReplay).some(
      e => e.code === L12ContractViolationCode.L12K_EVIDENCE_REPLAY_SAFE_REF_MISSING,
    ),
  );

  const rawRef: L12ScenarioEvidencePackContract = {
    ...ep,
    lower_layer_evidence_refs: ['l1:tick.feed'],
  };
  ok(
    'D.24 raw lower-layer evidence ref rejects',
    validateL12EvidencePackContract(rawRef).some(
      e => e.code === L12ContractViolationCode.L12K_EVIDENCE_REFS_RAW_LOWER_LAYER,
    ),
  );

  // Replay identity
  const ri = buildCanonicalL12ReplayIdentity();
  ok('D.25 canon replay identity is clean', validateL12ReplayIdentity(ri).length === 0);

  const noSubjHash: L12ScenarioReplayIdentity = { ...ri, subject_replay_hash: '' };
  ok(
    'D.26 missing subject replay hash rejects',
    validateL12ReplayIdentity(noSubjHash).some(
      e => e.code === L12ContractViolationCode.L12K_REPLAY_SUBJECT_HASH_MISSING,
    ),
  );

  const noScHash: L12ScenarioReplayIdentity = { ...ri, scenario_replay_hashes: [] };
  ok(
    'D.27 missing scenario replay hashes rejects',
    validateL12ReplayIdentity(noScHash).some(
      e => e.code === L12ContractViolationCode.L12K_REPLAY_SCENARIO_HASHES_MISSING,
    ),
  );

  const noLowerSnap: L12ScenarioReplayIdentity = { ...ri, lower_layer_snapshot_refs: [] };
  ok(
    'D.28 missing lower-layer snapshot refs rejects',
    validateL12ReplayIdentity(noLowerSnap).some(
      e => e.code === L12ContractViolationCode.L12K_REPLAY_LOWER_LAYER_SNAPSHOT_REFS_MISSING,
    ),
  );

  // Shift-condition
  const shift = buildCanonicalL12ShiftContract();
  ok('D.29 canon shift contract is clean', validateL12ShiftConditionContract(shift).length === 0);

  const tradeShift: L12ShiftConditionContract = {
    ...shift,
    conditions_that_strengthen_primary: ['btc_buy_signal_active'],
  };
  ok(
    'D.30 shift condition with trade language rejects',
    validateL12ShiftConditionContract(tradeShift).some(
      e => e.code === L12ContractViolationCode.L12K_SHIFT_TRADE_LANGUAGE,
    ),
  );

  const ungoverned: L12ShiftConditionContract = {
    ...shift,
    conditions_that_strengthen_primary: ['l1:tick.feed'],
  };
  ok(
    'D.31 shift condition referencing ungoverned input rejects',
    validateL12ShiftConditionContract(ungoverned).some(
      e => e.code === L12ContractViolationCode.L12K_SHIFT_UNGOVERNED_INPUT,
    ),
  );
})();

/* ───────────────────── BAND E: compatibility, audit, invariants ───────────────────── */
console.log('\n═══ BAND E: Compatibility, Audit, Invariants ═══');

(function bandE() {
  // Compatibility
  const additive = validateL12ContractDelta(
    {
      surface: L12ScenarioContractSurface.SUBJECT_CONTRACT,
      from_version: emptyVer('1.0.0'),
      to_version: emptyVer('1.1.0'),
      weakens_required_fields: false,
      replay_material_changed_without_version_bump: false,
      weakens_invalidation_law: false,
      weakens_trigger_law: false,
      weakens_score_context_law: false,
      weakens_restriction_law: false,
      removes_prediction_theater_scan: false,
      reinterprets_old_outputs: false,
      only_added_optional_fields: true,
    },
    L12ScenarioContractCompatibilityClass.ADDITIVE_SAFE,
  );
  ok(
    'E.01 additive-safe delta classified correctly',
    additive.compatibility_class === L12ScenarioContractCompatibilityClass.ADDITIVE_SAFE,
  );
  ok('E.02 additive-safe delta has no violations', additive.violations.length === 0);

  const removed = validateL12ContractDelta({
    surface: L12ScenarioContractSurface.SET_CONTRACT,
    from_version: emptyVer('1.0.0'),
    to_version: emptyVer('1.1.0'),
    weakens_required_fields: true,
    replay_material_changed_without_version_bump: false,
    weakens_invalidation_law: false,
    weakens_trigger_law: false,
    weakens_score_context_law: false,
    weakens_restriction_law: false,
    removes_prediction_theater_scan: false,
    reinterprets_old_outputs: false,
    only_added_optional_fields: false,
  });
  ok(
    'E.03 required-field removed classified BREAKING_SEMANTIC',
    removed.compatibility_class === L12ScenarioContractCompatibilityClass.BREAKING_SEMANTIC,
  );
  ok(
    'E.04 required-field removed flagged',
    removed.violations.some(
      e => e.code === L12ContractViolationCode.L12K_REQUIRED_FIELD_REMOVED,
    ),
  );

  const replay = validateL12ContractDelta({
    surface: L12ScenarioContractSurface.SUBJECT_CONTRACT,
    from_version: emptyVer('1.0.0'),
    to_version: emptyVer('1.0.0'),
    weakens_required_fields: false,
    replay_material_changed_without_version_bump: true,
    weakens_invalidation_law: false,
    weakens_trigger_law: false,
    weakens_score_context_law: false,
    weakens_restriction_law: false,
    removes_prediction_theater_scan: false,
    reinterprets_old_outputs: false,
    only_added_optional_fields: false,
  });
  ok(
    'E.05 replay material changed without version classified PROHIBITED',
    replay.compatibility_class === L12ScenarioContractCompatibilityClass.PROHIBITED,
  );
  ok(
    'E.06 replay material changed flagged',
    replay.violations.some(
      e => e.code === L12ContractViolationCode.L12K_REPLAY_MATERIAL_CHANGED_WITHOUT_VERSION,
    ),
  );

  const trig = validateL12ContractDelta({
    surface: L12ScenarioContractSurface.TRIGGER_CONTRACT,
    from_version: emptyVer('1.0.0'),
    to_version: emptyVer('1.0.0'),
    weakens_required_fields: false,
    replay_material_changed_without_version_bump: false,
    weakens_invalidation_law: false,
    weakens_trigger_law: true,
    weakens_score_context_law: false,
    weakens_restriction_law: false,
    removes_prediction_theater_scan: false,
    reinterprets_old_outputs: false,
    only_added_optional_fields: false,
  });
  ok(
    'E.07 weakened trigger law classified PROHIBITED',
    trig.compatibility_class === L12ScenarioContractCompatibilityClass.PROHIBITED,
  );
  ok(
    'E.08 weakened trigger law flagged',
    trig.violations.some(e => e.code === L12ContractViolationCode.L12K_TRIGGER_LAW_WEAKENED),
  );

  const inv = validateL12ContractDelta({
    surface: L12ScenarioContractSurface.INVALIDATION_CONTRACT,
    from_version: emptyVer('1.0.0'),
    to_version: emptyVer('1.0.0'),
    weakens_required_fields: false,
    replay_material_changed_without_version_bump: false,
    weakens_invalidation_law: true,
    weakens_trigger_law: false,
    weakens_score_context_law: false,
    weakens_restriction_law: false,
    removes_prediction_theater_scan: false,
    reinterprets_old_outputs: false,
    only_added_optional_fields: false,
  });
  ok(
    'E.09 weakened invalidation law classified PROHIBITED',
    inv.compatibility_class === L12ScenarioContractCompatibilityClass.PROHIBITED,
  );
  ok(
    'E.10 weakened invalidation law flagged',
    inv.violations.some(e => e.code === L12ContractViolationCode.L12K_INVALIDATION_LAW_WEAKENED),
  );

  // Audit determinism
  resetL12ContractAuditLog();
  const violations = [
    {
      code: L12ContractViolationCode.L12K_INVALIDATION_ABSENT,
      subject_id: 'set.x',
      detail: 'no invalidation',
    },
    {
      code: L12ContractViolationCode.L12K_PATH_CONFIDENCE_BAND_MISMATCH,
      subject_id: 'pcp.x',
      detail: 'band mismatch',
    },
    {
      code: L12ContractViolationCode.L12K_PREDICTION_THEATER,
      subject_id: 'path.x',
      detail: 'prediction',
    },
  ];
  const recs = emitL12ContractAuditRecords(
    L12ContractAuditSubjectClass.SET_CONTRACT,
    'test',
    violations,
  );
  ok('E.11 emit produces N records', recs.length === violations.length);
  ok('E.12 audit log has N records', getL12ContractAuditLog().length === violations.length);
  ok(
    'E.13 invalidation absent flagged CRITICAL',
    severityForL12ContractViolationCode(L12ContractViolationCode.L12K_INVALIDATION_ABSENT) ===
      'CRITICAL',
  );
  ok(
    'E.14 band mismatch flagged WARNING',
    severityForL12ContractViolationCode(L12ContractViolationCode.L12K_PATH_CONFIDENCE_BAND_MISMATCH) ===
      'WARNING',
  );
  ok(
    'E.15 prediction theater flagged CRITICAL',
    severityForL12ContractViolationCode(L12ContractViolationCode.L12K_PREDICTION_THEATER) ===
      'CRITICAL',
  );
  ok(
    'E.16 critical violations are filterable',
    getL12ContractCriticalViolations().length === 2,
  );
  ok(
    'E.17 violations queryable by code',
    getL12ContractViolationsByCode(L12ContractViolationCode.L12K_INVALIDATION_ABSENT).length === 1,
  );
  ok(
    'E.18 violations queryable by subject class',
    getL12ContractViolationsBySubjectClass(L12ContractAuditSubjectClass.SET_CONTRACT).length === 3,
  );

  // Invariants
  const inv_results = checkAllL12_3Invariants();
  ok('E.19 INV-12.3-A holds', inv_results[0]!.holds);
  ok('E.20 INV-12.3-B holds', inv_results[1]!.holds);
  ok('E.21 INV-12.3-C holds', inv_results[2]!.holds);
  ok('E.22 INV-12.3-D holds', inv_results[3]!.holds);
  ok('E.23 INV-12.3-E holds', inv_results[4]!.holds);
  ok('E.24 INV-12.3-F holds', inv_results[5]!.holds);
  ok('E.25 INV-12.3-G holds', inv_results[6]!.holds);
  ok('E.26 INV-12.3-H holds', inv_results[7]!.holds);

  // Enum cardinality sanity (all enums non-empty)
  ok('E.27 readiness classes ≥ 7', ALL_L12_SCENARIO_OUTPUT_READINESS_CLASSES.length >= 7);
  ok('E.28 contract surfaces ≥ 11', ALL_L12_SCENARIO_CONTRACT_SURFACES.length >= 11);
  ok('E.29 compatibility classes ≥ 5', ALL_L12_SCENARIO_CONTRACT_COMPATIBILITY_CLASSES.length >= 5);
  ok('E.30 violation codes ≥ 80', ALL_L12_CONTRACT_VIOLATION_CODES.length >= 80);

  // classify directly
  const directly = classifyL12ContractDelta({
    surface: L12ScenarioContractSurface.SUBJECT_CONTRACT,
    from_version: emptyVer('1.0.0'),
    to_version: emptyVer('1.0.0'),
    weakens_required_fields: false,
    replay_material_changed_without_version_bump: false,
    weakens_invalidation_law: false,
    weakens_trigger_law: false,
    weakens_score_context_law: false,
    weakens_restriction_law: false,
    removes_prediction_theater_scan: false,
    reinterprets_old_outputs: false,
    only_added_optional_fields: false,
  });
  ok(
    'E.31 default delta is MIGRATION_REQUIRED',
    directly === L12ScenarioContractCompatibilityClass.MIGRATION_REQUIRED,
  );
})();

function emptyVer(v: string) {
  return {
    contract_version_id: `cv.${v}`,
    surface: L12ScenarioContractSurface.SUBJECT_CONTRACT,
    semantic_version: v,
    required_fields: [],
    optional_fields: [],
    replay_material_fields: [],
    breaking_change_surfaces: [],
    migration_required_surfaces: [],
    policy_version: 'l12.3.test.v1',
  };
}

console.log('\n═══════════════════════════════════════════════════════════');
console.log(`L12.3 — Universal Scenario Contracts & Output Law suite`);
console.log(`  Passed: ${passed}`);
console.log(`  Failed: ${failed}`);
console.log('═══════════════════════════════════════════════════════════');
if (failed > 0) {
  console.error('\nFailures:');
  for (const fl of failures) console.error(`  - ${fl}`);
  process.exit(1);
}
process.exit(0);
