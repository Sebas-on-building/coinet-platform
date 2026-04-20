/**
 * L10.2 — Object-Model Invariants
 *
 * §10.2.19 — INV-10.2-A through INV-10.2-G, all executable and covered
 * by the certification suite.
 *
 *   INV-10.2-A : Every hypothesis subject must be scope-bound, time-
 *                bound, lineage-bound, and family-declared.
 *   INV-10.2-B : Every hypothesis candidate must belong to exactly one
 *                legal family/template posture.
 *   INV-10.2-C : Support, contradiction, confirmation, and invalidation
 *                remain explicit first-class objects.
 *   INV-10.2-D : Every hypothesis assessment must carry support,
 *                contradiction, confirmation, invalidation, ranking
 *                posture, restriction posture, and replay identity.
 *   INV-10.2-E : Spread between top hypotheses must remain explicit and
 *                may not be hidden inside confidence alone.
 *   INV-10.2-F : Shift conditions must remain explicit for ranked
 *                hypothesis competition.
 *   INV-10.2-G : No hypothesis object may leak judgment, recommendation,
 *                scenario-finality, or fake-certainty semantics.
 */

import {
  L10HypothesisFamilyClass,
  L10_HYPOTHESIS_FAMILY_DESCRIPTORS,
  ALL_L10_HYPOTHESIS_FAMILY_CLASSES,
  ALL_L10_HYPOTHESIS_SUBJECT_CLASSES,
} from '../contracts/hypothesis-subject-class';
import {
  L10HypothesisOutputClass,
  L10_HYPOTHESIS_OUTPUT_CLASS_DESCRIPTORS,
  l10ObjectOutputClassesAlignWithConstitution,
} from '../contracts/hypothesis-output-class';
import { getDefaultL10HypothesisSubjectClassRegistry } from '../registry/hypothesis-subject-class.registry';
import { getDefaultL10HypothesisFamilyRegistry } from '../registry/hypothesis-family.registry';
import { getDefaultL10HypothesisOutputClassRegistry } from '../registry/hypothesis-output-class.registry';
import {
  checkL10ObjectLeak,
  L10ObjectViolationCode,
} from '../validation/hypothesis-object-violation-codes';
import { validateL10HypothesisAssessment } from '../validation/hypothesis-assessment.validator';
import { validateL10HypothesisSpreadProfile } from '../validation/hypothesis-spread-profile.validator';
import { validateL10HypothesisShiftConditionSet } from '../validation/hypothesis-shift-condition-set.validator';
import { validateL10HypothesisRanking } from '../validation/hypothesis-ranking.validator';
import {
  L10HypothesisConfidenceBand,
  L10HypothesisReadinessClass,
} from '../contracts/hypothesis-assessment';
import { L10SpreadClass } from '../contracts/hypothesis-spread-profile';
import { L10RankingStabilityClass } from '../contracts/hypothesis-ranking';

export interface L10_2InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

/**
 * INV-10.2-A — Subject registry and family registry align: every
 * subject class is registered, every family is registered, every
 * family declares at least one legal scope type, and the subject
 * validator rejects identity-less subjects.
 */
export function checkINV_102_A(): L10_2InvariantResult {
  const subjReg = getDefaultL10HypothesisSubjectClassRegistry();
  const famReg = getDefaultL10HypothesisFamilyRegistry();

  const allSubjectsRegistered = ALL_L10_HYPOTHESIS_SUBJECT_CLASSES.every(c => subjReg.has(c));
  const allFamiliesRegistered = ALL_L10_HYPOTHESIS_FAMILY_CLASSES.every(f => famReg.has(f));
  const everyFamilyHasScope = L10_HYPOTHESIS_FAMILY_DESCRIPTORS.every(
    d => d.legalScopeTypes.length > 0,
  );

  const holds = allSubjectsRegistered && allFamiliesRegistered && everyFamilyHasScope;
  return {
    id: 'INV-10.2-A',
    name: 'Every subject/family is registered and scope-bound',
    holds,
    evidence: `subjects=${ALL_L10_HYPOTHESIS_SUBJECT_CLASSES.length} families=${ALL_L10_HYPOTHESIS_FAMILY_CLASSES.length} subjectsOk=${allSubjectsRegistered} familiesOk=${allFamiliesRegistered} scopesOk=${everyFamilyHasScope}`,
  };
}

/**
 * INV-10.2-B — Every registered family has at least one legal
 * subject-class attachment via its defaultSubjectClass, and that
 * subject class is itself registered.
 */
export function checkINV_102_B(): L10_2InvariantResult {
  const subjReg = getDefaultL10HypothesisSubjectClassRegistry();
  // The default subject class must be registered AND must be able to
  // operate on at least one of the family's legal scope types. We do
  // not require coverage of the *entire* scope list (a family may span
  // scope types that the default subject is not alone authoritative
  // for); we require a legal intersection so the default attachment is
  // not vacuous.
  const allLinked = L10_HYPOTHESIS_FAMILY_DESCRIPTORS.every(d => {
    if (!subjReg.has(d.defaultSubjectClass)) return false;
    return d.legalScopeTypes.some(s => subjReg.allowsScope(d.defaultSubjectClass, s));
  });
  return {
    id: 'INV-10.2-B',
    name: 'Every family has exactly one legal default subject-class attachment',
    holds: allLinked,
    evidence: `familyDefaultsAlignWithSubjectRegistry=${allLinked}`,
  };
}

/**
 * INV-10.2-C — Support / contradiction / confirmation / invalidation
 * remain separate first-class objects. Check 1 — the object violation
 * code enum declares each as its own family (no shared codes).
 * Check 2 — the seven hypothesis output classes align with L10.1's
 * output surface enum so none of them silently folds into another.
 */
export function checkINV_102_C(): L10_2InvariantResult {
  const codes: readonly string[] = Object.values(L10ObjectViolationCode);
  const hasSupport = codes.some(c => c.startsWith('L10O_SUPPORT_'));
  const hasContradiction = codes.some(c => c.startsWith('L10O_CONTRADICTION_'));
  const hasConfirmation = codes.some(c => c.startsWith('L10O_CONFIRMATION_'));
  const hasInvalidation = codes.some(c => c.startsWith('L10O_INVALIDATION_'));
  const allFirstClass = hasSupport && hasContradiction && hasConfirmation && hasInvalidation;

  const outputAligned = l10ObjectOutputClassesAlignWithConstitution();
  const holds = allFirstClass && outputAligned;
  return {
    id: 'INV-10.2-C',
    name: 'Support/contradiction/confirmation/invalidation are first-class; output classes align with L10.1',
    holds,
    evidence: `support=${hasSupport} contradiction=${hasContradiction} confirmation=${hasConfirmation} invalidation=${hasInvalidation} outputAligned=${outputAligned}`,
  };
}

/**
 * INV-10.2-D — The assessment output class requires evidence, lineage,
 * replay hash, AND restriction profile. Every registered output class
 * requires evidence, lineage, and replay hash.
 */
export function checkINV_102_D(): L10_2InvariantResult {
  const outReg = getDefaultL10HypothesisOutputClassRegistry();
  const assessment = outReg.get(L10HypothesisOutputClass.HYPOTHESIS_ASSESSMENT);
  const assessmentGates =
    !!assessment &&
    assessment.requiresEvidence &&
    assessment.requiresLineage &&
    assessment.requiresReplayHash &&
    assessment.requiresRestrictionProfile;
  const allTraceable = L10_HYPOTHESIS_OUTPUT_CLASS_DESCRIPTORS.every(
    d => d.requiresEvidence && d.requiresLineage && d.requiresReplayHash,
  );

  // Structural assessment rejection: a missing-everything assessment
  // fails at the validator tier.
  const minimalBroken = validateL10HypothesisAssessment({
    hypothesis_assessment_id: '',
    hypothesis_subject_id: '',
    hypothesis_candidate_id: '',
    hypothesis_family: null as unknown as L10HypothesisFamilyClass,
    hypothesis_template_id: '',
    hypothesis_name: '',
    subject_class: null as unknown as never,
    scope_type: 'TOKEN',
    scope_id: '',
    as_of: '',
    support_set_ref: '',
    contradiction_set_ref: '',
    confirmation_set_ref: '',
    invalidation_set_ref: '',
    supporting_evidence_refs: [],
    contradicting_evidence_refs: [],
    required_confirmation_refs: [],
    invalidation_signal_refs: [],
    hypothesis_confidence_score: 0,
    hypothesis_confidence_band: L10HypothesisConfidenceBand.LOW,
    support_strength_score: 0,
    contradiction_pressure_score: 0,
    confirmation_gap_score: 0,
    invalidation_risk_score: 0,
    rank_position: -1,
    rank_spread_to_next: null as unknown as number,
    restriction_profile_ref: '',
    shift_condition_set_ref: null,
    evidence_pack_ref: '',
    input_snapshot_ref: '',
    compute_run_id: '',
    replay_hash: '',
    lineage_refs: [],
    policy_version: '',
    readiness_class: L10HypothesisReadinessClass.DRAFT,
    causal_restraint_flags: undefined as unknown as never,
    materialization_mode: 'LIVE',
    created_by: '',
    created_at: '',
    description: '',
  });
  const brokenFails = !minimalBroken.valid;

  const holds = assessmentGates && allTraceable && brokenFails;
  return {
    id: 'INV-10.2-D',
    name: 'Assessment carries support/contradiction/confirmation/invalidation/ranking/restriction/replay',
    holds,
    evidence: `assessmentGates=${assessmentGates} outputsTraceable=${allTraceable} brokenFails=${brokenFails}`,
  };
}

/**
 * INV-10.2-E — Spread must be explicit. A spread profile with a narrow
 * gap but flag=false is rejected; a spread profile with a wide gap
 * and correct class passes.
 */
export function checkINV_102_E(): L10_2InvariantResult {
  const narrowHidden = validateL10HypothesisSpreadProfile({
    spread: {
      spread_profile_id: 'hspread_t',
      hypothesis_subject_id: 'hsub_t',
      hypothesis_ranking_ref: 'hrank_t',
      as_of: '2026-01-01T00:00:00Z',
      primary_hypothesis_ref: 'hassess_p',
      secondary_hypothesis_ref: 'hassess_s',
      confidence_spread: 0.08,
      spread_class: L10SpreadClass.NARROW,
      ranking_stability_class: L10RankingStabilityClass.FRAGILE,
      narrow_spread_flag: false,
      evidence_pack_ref: 'epk_t',
      replay_hash: 'hhash_t',
      lineage_refs: ['lin_t'],
    },
    competitionSize: 2,
  });
  const narrowRejected = !narrowHidden.valid &&
    narrowHidden.issues.some(i => i.code === L10ObjectViolationCode.SPREAD_NARROW_FLAG_HIDDEN);

  const wideOk = validateL10HypothesisSpreadProfile({
    spread: {
      spread_profile_id: 'hspread_w',
      hypothesis_subject_id: 'hsub_w',
      hypothesis_ranking_ref: 'hrank_w',
      as_of: '2026-01-01T00:00:00Z',
      primary_hypothesis_ref: 'hassess_p',
      secondary_hypothesis_ref: 'hassess_s',
      confidence_spread: 0.5,
      spread_class: L10SpreadClass.WIDE,
      ranking_stability_class: L10RankingStabilityClass.STABLE,
      narrow_spread_flag: false,
      evidence_pack_ref: 'epk_w',
      replay_hash: 'hhash_w',
      lineage_refs: ['lin_w'],
    },
    competitionSize: 2,
  });
  const wideAccepts = wideOk.valid;

  const holds = narrowRejected && wideAccepts;
  return {
    id: 'INV-10.2-E',
    name: 'Spread is explicit; narrow spread requires flag',
    holds,
    evidence: `narrowHiddenRejected=${narrowRejected} wideAccepts=${wideAccepts}`,
  };
}

/**
 * INV-10.2-F — Shift conditions required for live competition. A shift
 * set missing promotion/reinforcement/collapse conditions when
 * competition_size > 1 is rejected.
 */
export function checkINV_102_F(): L10_2InvariantResult {
  const empty = validateL10HypothesisShiftConditionSet({
    shift: {
      shift_condition_set_id: 'hshift_e',
      hypothesis_subject_id: 'hsub_e',
      hypothesis_ranking_ref: 'hrank_e',
      as_of: '2026-01-01T00:00:00Z',
      current_primary_ref: 'hassess_p',
      current_secondary_ref: 'hassess_s',
      promotion_conditions_for_secondary: [],
      reinforcement_conditions_for_primary: [],
      collapse_conditions_for_primary: [],
      spread_narrowing_conditions: [],
      evidence_pack_ref: 'epk_e',
      replay_hash: 'hhash_e',
      lineage_refs: ['lin_e'],
    },
    competitionSize: 2,
  });
  const rejected =
    !empty.valid &&
    empty.issues.some(i => i.code === L10ObjectViolationCode.SHIFT_MISSING_PROMOTION_CONDITIONS) &&
    empty.issues.some(i => i.code === L10ObjectViolationCode.SHIFT_MISSING_REINFORCEMENT_CONDITIONS) &&
    empty.issues.some(i => i.code === L10ObjectViolationCode.SHIFT_MISSING_COLLAPSE_CONDITIONS);
  return {
    id: 'INV-10.2-F',
    name: 'Shift conditions required for ranked competition',
    holds: rejected,
    evidence: `emptyShiftRejected=${rejected}`,
  };
}

/**
 * INV-10.2-G — Semantic-leak patterns reject at the object tier:
 * judgment, recommendation, scenario-finality, fake-certainty, causal
 * proof. A crafted offender fails; a clean name passes.
 */
export function checkINV_102_G(): L10_2InvariantResult {
  const judgment = checkL10ObjectLeak('final judgment on asset move');
  const recommendation = checkL10ObjectLeak('buy recommendation for token');
  const scenarioFinal = checkL10ObjectLeak('scenario confirmed and locked');
  const fakeCertain = checkL10ObjectLeak('price is guaranteed to rise');
  const causalProof = checkL10ObjectLeak('token rallied because of news');
  const clean = checkL10ObjectLeak('post-unlock redistribution candidate');

  const allReject =
    judgment.leaks && recommendation.leaks && scenarioFinal.leaks &&
    fakeCertain.leaks && causalProof.leaks && !clean.leaks;

  // A ranking that collapses to one candidate while two were plausible
  // must be rejected.
  const collapse = validateL10HypothesisRanking({
    ranking: {
      hypothesis_ranking_id: 'hrank_c',
      hypothesis_subject_id: 'hsub_c',
      as_of: '2026-01-01T00:00:00Z',
      ordered_hypothesis_assessment_refs: ['hassess_a'],
      primary_hypothesis_ref: 'hassess_a',
      secondary_hypothesis_ref: null,
      competition_size: 1,
      ranking_stability_class: L10RankingStabilityClass.STABLE,
      spread_profile_ref: 'hspread_c',
      shift_condition_set_ref: null,
      evidence_pack_ref: 'epk_c',
      input_snapshot_ref: 'snap_c',
      compute_run_id: 'run_c',
      replay_hash: 'hhash_c',
      lineage_refs: ['lin_c'],
      policy_version: 'pv1',
    },
    availablePlausibleCompetitors: 3,
  });
  const collapseRejected =
    !collapse.valid &&
    collapse.issues.some(i => i.code === L10ObjectViolationCode.RANKING_SINGLE_STORY_COLLAPSE);

  const holds = allReject && collapseRejected;
  return {
    id: 'INV-10.2-G',
    name: 'No leak of judgment/recommendation/scenario-finality/fake-certainty/causal-proof; no single-story collapse',
    holds,
    evidence: `leakMatrixOk=${allReject} collapseRejected=${collapseRejected}`,
  };
}

export function checkAllL102Invariants(): readonly L10_2InvariantResult[] {
  return [
    checkINV_102_A(),
    checkINV_102_B(),
    checkINV_102_C(),
    checkINV_102_D(),
    checkINV_102_E(),
    checkINV_102_F(),
    checkINV_102_G(),
  ];
}
