/**
 * L13.2 — Input Package Invariants
 *
 * §13.2.22 — INV-13.2-A through INV-13.2-J. Each invariant exercises
 * the Phase B/C/D engines against synthetic green and offender
 * inputs to prove the law mechanically.
 *
 *   INV-13.2-A : Package completeness law
 *   INV-13.2-B : Governed context law (no raw lower-layer bypass)
 *   INV-13.2-C : L11 score-context law
 *   INV-13.2-D : L12 scenario-context law
 *   INV-13.2-E : Contradiction preservation law
 *   INV-13.2-F : Uncertainty disclosure law
 *   INV-13.2-G : Restriction binding law
 *   INV-13.2-H : Context priority and compression law
 *   INV-13.2-I : Intent-specific context law
 *   INV-13.2-J : Replay determinism law
 */

import {
  L13ScoreContextCompletenessClass,
  type L13CanonicalEntitySummary,
  type L13ContradictionSummary,
  type L13HypothesisSummary,
  type L13RegimeSummary,
  type L13ScenarioSummary,
  type L13ScoreSummary,
  type L13SequenceSummary,
  type L13ValidationSummary,
  L13ContradictionEffectClass,
} from '../contracts/ai-context-summary';
import {
  L13InputPackageCompletenessClass,
  L13InputPackageReadinessClass,
} from '../contracts/ai-input-package';
import {
  L13ContextCompressionStrategy,
} from '../contracts/context-compression';
import { L13ContextClass } from '../contracts/context-priority';
import { L13EvidenceRole } from '../contracts/evidence-digest';
import { L13DependencyLayer } from '../contracts/l13-constitutional-types';
import {
  L13AnswerMode,
} from '../contracts/explanation-restriction-profile';
import {
  L13UserIntentClass,
} from '../contracts/user-intent-binding';

import {
  buildL13AIInputPackage,
} from '../context/ai-input-package-builder';
import { buildL13ConfidenceBreakdown } from '../context/confidence-breakdown-builder';
import { compressL13Context } from '../context/context-compression-engine';
import { classifyL13Context } from '../context/context-priority-engine';
import {
  evaluateL13ContradictionPreservation,
} from '../context/contradiction-preservation-engine';
import {
  buildL13EvidenceDigest,
} from '../context/evidence-digest-builder';
import {
  buildL13ExplanationRestrictionProfile,
} from '../context/restriction-binding-engine';
import {
  buildL13UncertaintyProfile,
} from '../context/uncertainty-profile-builder';

import {
  validateL13AIInputPackage,
} from '../validation/ai-input-package.validator';
import {
  validateL13ContextCompression,
} from '../validation/context-compression.validator';
import {
  validateL13ContradictionPreservation,
} from '../validation/contradiction-preservation.validator';
import {
  validateL13RestrictionBinding,
} from '../validation/restriction-binding.validator';
import {
  validateL13UncertaintyProfile,
} from '../validation/uncertainty-profile.validator';
import { L13InputPackageViolationCode } from '../validation/l13-input-package-violation-codes';

const POLICY_V = 'l13.input-package.v1';

export interface L13_2InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

// ── Synthetic green fixture ────────────────────────────────────────

function greenEntity(): L13CanonicalEntitySummary {
  return {
    entity_summary_id: 'l13.entity.green.1',
    entity_id: 'asset.btc',
    canonical_symbol: 'BTC',
    canonical_name: 'Bitcoin',
    asset_type: 'CRYPTO',
    chain_refs: ['chain.bitcoin'],
    ecosystem_refs: ['eco.bitcoin'],
    sector_refs: ['sector.layer1'],
    relevant_aliases: ['Bitcoin', 'BTC'],
    scope_type: 'asset',
    scope_id: 'asset.btc',
    scope_granularity: 'asset',
    identity_confidence_score: 0.95,
    identity_confidence_band: 'VERY_HIGH',
    entity_restrictions: [],
    evidence_refs: ['l3.evidence.canonical.btc'],
    lineage_refs: ['l3.lineage.canonical.btc'],
    policy_version: POLICY_V,
  };
}

function greenValidation(): L13ValidationSummary {
  return {
    validation_summary_id: 'l13.validation.green.1',
    validation_state: 'VALIDATED',
    validation_confidence: 0.85,
    validation_confidence_band: 'HIGH',
    strongest_validated_claim_refs: ['l7.claim.btc.1'],
    validation_restriction_refs: [],
    unresolved_validation_gaps: [],
    evidence_refs: ['l7.evidence.validation.1'],
    lineage_refs: ['l7.lineage.validation.1'],
    policy_version: POLICY_V,
  };
}

function greenContradiction(): L13ContradictionSummary {
  return {
    contradiction_summary_id: 'l13.contradiction.green.1',
    active_contradiction_refs: [],
    strongest_contradiction_refs: [],
    contradiction_pressure_score: 0.1,
    contradiction_pressure_band: 'LOW',
    contradiction_effect_class: L13ContradictionEffectClass.NONE,
    must_disclose: false,
    contradiction_disclosure_codes: [],
    evidence_refs: ['l7.evidence.contradiction.green'],
    lineage_refs: ['l7.lineage.contradiction.green'],
    policy_version: POLICY_V,
  };
}

function greenRegime(): L13RegimeSummary {
  return {
    regime_summary_id: 'l13.regime.green.1',
    primary_regime: 'TREND_UP',
    regime_confidence_score: 0.8,
    regime_confidence_band: 'HIGH',
    transition_risk_score: 0.2,
    transition_risk_band: 'LOW',
    regime_restriction_refs: [],
    regime_explanation_codes: ['REGIME_TREND_UP'],
    evidence_refs: ['l8.evidence.regime'],
    lineage_refs: ['l8.lineage.regime'],
    policy_version: POLICY_V,
  };
}

function greenSequence(): L13SequenceSummary {
  return {
    sequence_summary_id: 'l13.sequence.green.1',
    primary_sequence_state: 'EXPANSION',
    phase_state: 'MID',
    phase_progression_class: 'STABLE',
    lead_lag_summary: 'BTC leads',
    decay_posture: 'HEALTHY',
    sequence_confidence_score: 0.78,
    sequence_confidence_band: 'HIGH',
    sequence_restriction_refs: [],
    sequence_explanation_codes: ['SEQ_EXPANSION_MID'],
    evidence_refs: ['l9.evidence.sequence'],
    lineage_refs: ['l9.lineage.sequence'],
    policy_version: POLICY_V,
  };
}

function greenHypothesis(): L13HypothesisSummary {
  return {
    hypothesis_summary_id: 'l13.hypothesis.green.1',
    primary_hypothesis_ref: 'l10.h.primary',
    primary_hypothesis_name: 'Continued uptrend',
    hypothesis_spread_score: 0.5,
    hypothesis_spread_class: 'MODERATE',
    support_refs: ['l10.support.1'],
    contradiction_refs: [],
    missing_confirmation_refs: [],
    invalidation_signal_refs: [],
    shift_condition_refs: [],
    hypothesis_restriction_refs: [],
    evidence_refs: ['l10.evidence.h'],
    lineage_refs: ['l10.lineage.h'],
    policy_version: POLICY_V,
  };
}

function greenScore(): L13ScoreSummary {
  return {
    score_summary_id: 'l13.score.green.1',
    score_snapshot_ref: 'l11.snapshot.1',
    active_score_refs: ['l11.opportunity.1'],
    production_score_families: ['OpportunityScore'],
    score_band_summaries: [
      {
        score_family: 'OpportunityScore',
        band: 'HIGH',
        value: 0.78,
        direction: 'POSITIVE',
      },
    ],
    top_positive_attribution_refs: ['l11.attr.pos.1'],
    top_negative_attribution_refs: ['l11.attr.neg.1'],
    score_missing_data_profile_refs: ['l11.md.1'],
    score_drift_refs: ['l11.drift.1'],
    score_restriction_refs: ['l11.restr.1'],
    score_context_completeness_class:
      L13ScoreContextCompletenessClass.COMPLETE_SCORE_CONTEXT,
    evidence_refs: ['l11.evidence.score'],
    lineage_refs: ['l11.lineage.score'],
    policy_version: POLICY_V,
  };
}

function greenScenario(): L13ScenarioSummary {
  return {
    scenario_summary_id: 'l13.scenario.green.1',
    scenario_set_ref: 'l12.set.1',
    base_case_ref: 'l12.base.1',
    base_case_name: 'Continued advance',
    bullish_path_refs: ['l12.bull.1'],
    bearish_path_refs: ['l12.bear.1'],
    neutral_chop_path_refs: ['l12.chop.1'],
    trigger_refs: ['l12.trigger.1'],
    invalidation_refs: ['l12.invalidation.1'],
    path_confidence_refs: ['l12.confidence.1'],
    confidence_cap_refs: ['l12.cap.1'],
    scenario_spread_ref: 'l12.spread.1',
    scenario_spread_class: 'MODERATE',
    shift_condition_refs: ['l12.shift.1'],
    scenario_readiness_class: 'READY',
    scenario_restriction_refs: ['l12.restr.1'],
    evidence_refs: ['l12.evidence.scenario'],
    lineage_refs: ['l12.lineage.scenario'],
    policy_version: POLICY_V,
  };
}

function greenLowerLayerRestrictionInputs() {
  return {
    l7_restriction_refs: ['l7.restr.1'],
    l8_restriction_refs: ['l8.restr.1'],
    l9_restriction_refs: ['l9.restr.1'],
    l10_restriction_refs: ['l10.restr.1'],
    l11_restriction_refs: ['l11.restr.1'],
    l12_restriction_refs: ['l12.restr.1'],
    l7_blocks_explanation: false,
    l11_blocks_score_explanation: false,
    l12_blocks_scenario_explanation: false,
    l11_blocks_directional_language: false,
    l12_blocks_confident_language: false,
    l11_blocks_alert: false,
    l11_blocks_report: false,
    l11_blocks_comparison: false,
  };
}

interface GreenPackageOptions {
  readonly contradictionActive?: boolean;
  readonly invalidationActive?: boolean;
  readonly missingDataActive?: boolean;
  readonly driftActive?: boolean;
  readonly intent?: L13UserIntentClass;
}

export function buildGreenL13InputPackage(opts: GreenPackageOptions = {}) {
  return buildGreenPackage(opts);
}

function buildGreenPackage(opts: GreenPackageOptions = {}) {
  const intent = opts.intent ?? L13UserIntentClass.WHATS_HAPPENING;

  const contradictionSummary = opts.contradictionActive
    ? {
        ...greenContradiction(),
        active_contradiction_refs: ['l7.contradiction.active.1'],
        strongest_contradiction_refs: ['l7.contradiction.active.1'],
        contradiction_pressure_score: 0.6,
        contradiction_pressure_band: 'HIGH',
        contradiction_effect_class:
          L13ContradictionEffectClass.NARROWS_CONFIDENCE,
        must_disclose: true,
        contradiction_disclosure_codes: ['L7_CONTRADICTION_DISCLOSED'],
      }
    : greenContradiction();

  const scenarioSummary = opts.invalidationActive
    ? {
        ...greenScenario(),
        invalidation_refs: ['l12.invalidation.active.1'],
      }
    : greenScenario();

  const restriction = buildL13ExplanationRestrictionProfile({
    request_id: 'req.test',
    lower_layer: greenLowerLayerRestrictionInputs(),
    contradiction_present: !!opts.contradictionActive,
    active_invalidation_present: !!opts.invalidationActive,
    missing_data_present: !!opts.missingDataActive,
    drift_present: !!opts.driftActive,
    narrow_spread_present: false,
    confidence_cap_present: false,
    unresolved_trigger_present: false,
    evidence_refs: ['l13.evidence.restr'],
    lineage_refs: ['l13.lineage.restr'],
  });

  const uncertainty = buildL13UncertaintyProfile({
    request_id: 'req.test',
    active_contradiction_present: !!opts.contradictionActive,
    active_invalidation_present: !!opts.invalidationActive,
    unresolved_trigger_present: false,
    narrow_scenario_spread_present: false,
    narrow_hypothesis_spread_present: false,
    material_missing_data_present: !!opts.missingDataActive,
    material_drift_present: !!opts.driftActive,
    transition_risk_present: false,
    sequence_decay_present: false,
    confidence_cap_present: false,
    evidence_refs: ['l13.evidence.unc'],
    lineage_refs: ['l13.lineage.unc'],
  });

  const confidence = buildL13ConfidenceBreakdown({
    request_id: 'req.test',
    lower_layer_bands: {
      validation_band: 'HIGH',
      regime_band: 'HIGH',
      sequence_band: 'HIGH',
      hypothesis_band: 'HIGH',
      score_band: 'HIGH',
      scenario_band: 'HIGH',
    },
    narrowing_reasons: [],
    confidence_cap_refs: ['l11.cap.1'],
    evidence_refs: ['l13.evidence.cb'],
    lineage_refs: ['l13.lineage.cb'],
  });

  const positive = buildL13EvidenceDigest({
    source_layer: L13DependencyLayer.L11_SCORE,
    evidence_ref: 'l11.evidence.score.pos',
    role: L13EvidenceRole.PRIMARY_POSITIVE,
    strength_score: 0.8,
    summary_text: 'Net flows have turned positive',
    supports_refs: ['l11.attr.pos.1'],
    contradicts_refs: [],
    lineage_refs: ['l11.lineage.score'],
  });

  const contradictions = opts.contradictionActive
    ? [
        buildL13EvidenceDigest({
          source_layer: L13DependencyLayer.L7_VALIDATION,
          evidence_ref: 'l7.contradiction.active.1',
          role: L13EvidenceRole.PRIMARY_CONTRADICTION,
          strength_score: 0.7,
          summary_text: 'Funding rate spike opposes validated claim',
          supports_refs: [],
          contradicts_refs: ['l7.claim.btc.1'],
          lineage_refs: ['l7.lineage.contradiction'],
        }),
      ]
    : [];

  return buildL13AIInputPackage({
    request_id: 'req.test',
    user_intent_ref: 'intent.test',
    user_intent_class: intent,
    requested_answer_mode: L13AnswerMode.EXPLAIN,
    scope_type: 'asset',
    scope_id: 'asset.btc',
    as_of: '2026-05-09T00:00:00Z',
    canonical_entity_summary: greenEntity(),
    validation_summary: greenValidation(),
    contradiction_summary: contradictionSummary,
    regime_summary: greenRegime(),
    sequence_summary: greenSequence(),
    hypothesis_summary: greenHypothesis(),
    score_summary: greenScore(),
    scenario_summary: scenarioSummary,
    strongest_positive_evidence: [positive],
    strongest_contradictions: contradictions,
    confidence_breakdown: confidence,
    uncertainty_profile: uncertainty,
    restriction_profile: restriction,
    missing_data_disclosures: opts.missingDataActive
      ? [
          {
            disclosure_id: 'l13d.md.1',
            source_layer: 'L11',
            missing_data_ref: 'l11.md.1',
            affected_summary_class: 'L13ScoreSummary',
            effect_on_answer:
              // narrow but does not block
              ('NARROWS_CONFIDENCE' as never),
            required_user_facing_disclosure: true,
            disclosure_text_code: 'MISSING_DATA_GENERIC',
            evidence_refs: ['l11.evidence.md'],
            lineage_refs: ['l11.lineage.md'],
            policy_version: POLICY_V,
          },
        ]
      : [],
    drift_disclosures: opts.driftActive
      ? [
          {
            disclosure_id: 'l13d.drift.1',
            drift_ref: 'l11.drift.1',
            affected_score_or_scenario_ref: 'l11.opportunity.1',
            drift_severity: 'MEDIUM',
            drift_effect_on_answer: ('NARROWS_CONFIDENCE' as never),
            required_user_facing_disclosure: true,
            disclosure_text_code: 'DRIFT_GENERIC',
            evidence_refs: ['l11.evidence.drift'],
            lineage_refs: ['l11.lineage.drift'],
            policy_version: POLICY_V,
          },
        ]
      : [],
    prompt_budget: {
      prompt_budget_id: 'l13.budget.1',
      max_context_tokens: 4096,
      reserved_instruction_tokens: 256,
      reserved_output_tokens: 768,
      available_context_tokens: 3072,
      compression_required: false,
      compression_strategy: L13ContextCompressionStrategy.NONE,
      minimum_required_context_classes: [
        L13ContextClass.USER_INTENT,
        L13ContextClass.L12_SCENARIO_BASE_CASE,
        L13ContextClass.L11_SCORE_OUTPUT,
      ],
      dropped_context_refs: [],
      preserved_context_refs: [],
      compression_disclosure_required: false,
      policy_version: POLICY_V,
    },
    evidence_refs: [
      'l11.evidence.score',
      'l12.evidence.scenario',
      'l7.evidence.validation.1',
    ],
    lineage_refs: [
      'l11.lineage.score',
      'l12.lineage.scenario',
      'l7.lineage.validation.1',
    ],
  });
}

// ── INV-13.2-A : package completeness law ──
export function checkINV_132_A(): L13_2InvariantResult {
  const pkg = buildGreenPackage();
  const v = validateL13AIInputPackage(pkg);
  return {
    id: 'INV-13.2-A',
    name: 'package completeness law',
    holds: v.clean,
    evidence: v.clean
      ? 'green package validates clean'
      : `failed: ${v.issues.map(i => i.code).join(', ')}`,
  };
}

// ── INV-13.2-B : governed context law ──
export function checkINV_132_B(): L13_2InvariantResult {
  const pkg = buildGreenPackage();
  const offender = {
    ...pkg,
    evidence_refs: [...pkg.evidence_refs, 'l11_raw_score_blob'],
  };
  const v = validateL13AIInputPackage(offender);
  const detected = v.issues.some(
    i =>
      i.code ===
      L13InputPackageViolationCode.L13P_RAW_LOWER_LAYER_CONTEXT,
  );
  return {
    id: 'INV-13.2-B',
    name: 'governed context law',
    holds: detected,
    evidence: detected
      ? 'raw lower-layer evidence ref rejected'
      : 'raw lower-layer evidence ref slipped through',
  };
}

// ── INV-13.2-C : L11 score-context law ──
export function checkINV_132_C(): L13_2InvariantResult {
  const pkg = buildGreenPackage();
  const naked = {
    ...pkg,
    score_summary: {
      ...pkg.score_summary,
      top_positive_attribution_refs: [],
      top_negative_attribution_refs: [],
      score_missing_data_profile_refs: [],
      score_drift_refs: [],
      score_restriction_refs: [],
    },
  };
  const v = validateL13AIInputPackage(naked);
  const detected = v.issues.some(
    i =>
      i.code ===
      L13InputPackageViolationCode.L13P_NAKED_L11_SCORE_CONTEXT,
  );
  return {
    id: 'INV-13.2-C',
    name: 'L11 score-context law',
    holds: detected,
    evidence: detected
      ? 'naked L11 score context rejected'
      : 'naked L11 score context not detected',
  };
}

// ── INV-13.2-D : L12 scenario-context law ──
export function checkINV_132_D(): L13_2InvariantResult {
  const pkg = buildGreenPackage();
  const naked = {
    ...pkg,
    scenario_summary: {
      ...pkg.scenario_summary,
      trigger_refs: [],
      invalidation_refs: [],
      path_confidence_refs: [],
    },
  };
  const v = validateL13AIInputPackage(naked);
  const detected = v.issues.some(
    i =>
      i.code ===
      L13InputPackageViolationCode.L13P_NAKED_L12_SCENARIO_CONTEXT,
  );
  return {
    id: 'INV-13.2-D',
    name: 'L12 scenario-context law',
    holds: detected,
    evidence: detected
      ? 'naked L12 scenario context rejected'
      : 'naked L12 scenario context not detected',
  };
}

// ── INV-13.2-E : contradiction preservation law ──
export function checkINV_132_E(): L13_2InvariantResult {
  const result = evaluateL13ContradictionPreservation({
    request_id: 'req.E',
    active_contradiction_refs: ['c1', 'c2', 'c3'],
    preserved_after_compression: ['c1', 'c3'],
  });
  const v = validateL13ContradictionPreservation(result);
  const failed = !result.all_material_contradictions_preserved && !v.clean;
  return {
    id: 'INV-13.2-E',
    name: 'contradiction preservation law',
    holds: failed,
    evidence: failed
      ? 'dropped contradiction surfaces a critical violation'
      : 'preservation engine failed to flag dropped contradiction',
  };
}

// ── INV-13.2-F : uncertainty disclosure law ──
export function checkINV_132_F(): L13_2InvariantResult {
  const profile = buildL13UncertaintyProfile({
    request_id: 'req.F',
    active_contradiction_present: true,
    active_invalidation_present: true,
    unresolved_trigger_present: true,
    narrow_scenario_spread_present: true,
    narrow_hypothesis_spread_present: false,
    material_missing_data_present: true,
    material_drift_present: true,
    transition_risk_present: false,
    sequence_decay_present: false,
    confidence_cap_present: true,
    evidence_refs: ['ev'],
    lineage_refs: ['lin'],
  });
  const v = validateL13UncertaintyProfile(profile);
  return {
    id: 'INV-13.2-F',
    name: 'uncertainty disclosure law',
    holds: v.clean && profile.must_disclose_uncertainty,
    evidence: v.clean
      ? 'all adverse states force disclosure'
      : `failed: ${v.issues.map(i => i.code).join(', ')}`,
  };
}

// ── INV-13.2-G : restriction binding law ──
export function checkINV_132_G(): L13_2InvariantResult {
  const profile = buildL13ExplanationRestrictionProfile({
    request_id: 'req.G',
    lower_layer: {
      ...greenLowerLayerRestrictionInputs(),
      l11_blocks_score_explanation: true,
      l12_blocks_scenario_explanation: true,
    },
    contradiction_present: true,
    active_invalidation_present: false,
    missing_data_present: false,
    drift_present: false,
    narrow_spread_present: false,
    confidence_cap_present: false,
    unresolved_trigger_present: false,
  });
  const v = validateL13RestrictionBinding(profile);
  const blocksScore = !profile.may_explain_score;
  const blocksScenario = !profile.may_explain_scenario;
  return {
    id: 'INV-13.2-G',
    name: 'restriction binding law',
    holds: v.clean && blocksScore && blocksScenario,
    evidence:
      v.clean && blocksScore && blocksScenario
        ? 'most-restrictive lower layer wins'
        : `failed: clean=${v.clean} blocksScore=${blocksScore} blocksScenario=${blocksScenario}`,
  };
}

// ── INV-13.2-H : context priority and compression law ──
export function checkINV_132_H(): L13_2InvariantResult {
  const items = [
    {
      context_ref: 'l12.invalidation.active.1',
      context_class: L13ContextClass.L12_INVALIDATIONS,
      token_cost: 100,
    },
    {
      context_ref: 'history.long',
      context_class: L13ContextClass.HISTORICAL_CONTEXT,
      token_cost: 200,
    },
    {
      context_ref: 'l4.graph.context.1',
      context_class: L13ContextClass.L4_GRAPH_CONTEXT,
      token_cost: 100,
    },
    {
      context_ref: 'l7.contradictions.1',
      context_class: L13ContextClass.L7_CONTRADICTIONS,
      token_cost: 100,
    },
  ];

  const priority = classifyL13Context(items);
  const invalidationDecision = priority.decisions.find(
    d => d.context_ref === 'l12.invalidation.active.1',
  );
  const historicalDecision = priority.decisions.find(
    d => d.context_ref === 'history.long',
  );
  const invalidationProtected =
    !!invalidationDecision &&
    invalidationDecision.preserve_required &&
    !invalidationDecision.dropping_allowed;
  const historicalDroppable =
    !!historicalDecision && historicalDecision.dropping_allowed;

  // Run a tight budget that forces dropping; only droppable should be
  // dropped.
  const result = compressL13Context({
    request_id: 'req.H',
    items,
    available_tokens: 250,
    strategy: L13ContextCompressionStrategy.PRIORITY_TRUNCATION,
  });
  const v = validateL13ContextCompression(result);
  const invalidationKept = result.preserved_context_refs.includes(
    'l12.invalidation.active.1',
  );
  const contradictionKept = result.preserved_context_refs.includes(
    'l7.contradictions.1',
  );

  const holds =
    invalidationProtected &&
    historicalDroppable &&
    invalidationKept &&
    contradictionKept &&
    v.clean;

  return {
    id: 'INV-13.2-H',
    name: 'context priority and compression law',
    holds,
    evidence: holds
      ? 'compression preserves protected classes; drops historical first'
      : `failed: invProtected=${invalidationProtected} histDrop=${historicalDroppable} invKept=${invalidationKept} contraKept=${contradictionKept} clean=${v.clean}`,
  };
}

// ── INV-13.2-I : intent-specific context law ──
export function checkINV_132_I(): L13_2InvariantResult {
  const pkg = buildGreenPackage({ intent: L13UserIntentClass.WHATS_NEXT });
  const offender = {
    ...pkg,
    scenario_summary: {
      ...pkg.scenario_summary,
      base_case_ref: '',
    },
  };
  const v = validateL13AIInputPackage(offender);
  const detected = v.issues.some(
    i =>
      i.code ===
      L13InputPackageViolationCode.L13P_FORWARD_INTENT_WITHOUT_SCENARIO,
  );
  return {
    id: 'INV-13.2-I',
    name: 'intent-specific context law',
    holds: detected,
    evidence: detected
      ? 'forward intent without scenario rejected'
      : 'forward intent without scenario slipped through',
  };
}

// ── INV-13.2-J : replay determinism law ──
export function checkINV_132_J(): L13_2InvariantResult {
  const a = buildGreenPackage();
  const b = buildGreenPackage();
  const same = a.replay_hash === b.replay_hash;

  // Mutate: change scope_id → hash should differ.
  const c = buildL13AIInputPackage({
    request_id: 'req.test',
    user_intent_ref: 'intent.test',
    user_intent_class: L13UserIntentClass.WHATS_HAPPENING,
    requested_answer_mode: L13AnswerMode.EXPLAIN,
    scope_type: 'asset',
    scope_id: 'asset.eth', // different
    as_of: '2026-05-09T00:00:00Z',
    canonical_entity_summary: greenEntity(),
    validation_summary: greenValidation(),
    contradiction_summary: greenContradiction(),
    regime_summary: greenRegime(),
    sequence_summary: greenSequence(),
    hypothesis_summary: greenHypothesis(),
    score_summary: greenScore(),
    scenario_summary: greenScenario(),
    strongest_positive_evidence: a.strongest_positive_evidence,
    strongest_contradictions: a.strongest_contradictions,
    confidence_breakdown: a.confidence_breakdown,
    uncertainty_profile: a.uncertainty_profile,
    restriction_profile: a.restriction_profile,
    missing_data_disclosures: a.missing_data_disclosures,
    drift_disclosures: a.drift_disclosures,
    prompt_budget: a.prompt_budget,
    evidence_refs: a.evidence_refs,
    lineage_refs: a.lineage_refs,
  });

  const flips = a.replay_hash !== c.replay_hash;
  const holds = same && flips;
  return {
    id: 'INV-13.2-J',
    name: 'replay determinism law',
    holds,
    evidence: holds
      ? 'same material → same hash; mutation flips hash'
      : `failed: same=${same} flips=${flips}`,
  };
}

export function runAllL13_2Invariants(): readonly L13_2InvariantResult[] {
  return [
    checkINV_132_A(),
    checkINV_132_B(),
    checkINV_132_C(),
    checkINV_132_D(),
    checkINV_132_E(),
    checkINV_132_F(),
    checkINV_132_G(),
    checkINV_132_H(),
    checkINV_132_I(),
    checkINV_132_J(),
  ];
}

/**
 * Re-export the internal green-package builder so the certification
 * suite can reuse it without duplicating fixture data.
 */
export const __l13_2_test_helpers = {
  buildGreenPackage,
  greenEntity,
  greenValidation,
  greenContradiction,
  greenRegime,
  greenSequence,
  greenHypothesis,
  greenScore,
  greenScenario,
  greenLowerLayerRestrictionInputs,
};
