/**
 * L12.5 — Production-template / strength / confidence / spread / readiness
 * invariants (§12.5.23).
 *
 *   INV-12.5-A : production template completeness law
 *   INV-12.5-B : trigger law (≥1 monitorable trigger pattern, evidence-backed)
 *   INV-12.5-C : invalidation law (active invalidation caps confidence)
 *   INV-12.5-D : confidence cap law
 *   INV-12.5-E : spread and shift law
 *   INV-12.5-F : readiness law
 *   INV-12.5-G : interaction law (trigger never overrides blocking invalidation)
 *   INV-12.5-H : non-prediction template law
 */

import {
  L12InvalidationEffect,
  L12InvalidationStatus,
} from '../contracts/scenario-invalidation';
import {
  L12InvalidationStrengthBand,
} from '../contracts/invalidation-strength-profile';
import {
  L12PathConfidenceCapReason,
} from '../contracts/path-confidence-cap-chain';
import {
  L12_DEFAULT_PATH_CONFIDENCE_WEIGHTS,
  L12PathConfidenceFactorGroup,
} from '../contracts/path-confidence-policy';
import {
  L12ScenarioTemplateProductionStatus,
} from '../contracts/scenario-template';
import {
  L12ScenarioTemplateReadinessClass,
} from '../contracts/scenario-template-readiness';
import {
  L12TriggerEffect,
  L12TriggerStatus,
} from '../contracts/scenario-trigger';
import {
  L12TriggerInvalidationInteractionClass,
  l12ResolveInteractionClass,
} from '../contracts/trigger-invalidation-interaction';
import { L12TriggerStrengthBand } from '../contracts/trigger-strength-profile';

import { computeL12InvalidationStrengthProfile } from '../engine/invalidation-strength-engine';
import { computeL12PathConfidenceCapChain } from '../engine/path-confidence-policy-engine';
import { computeL12ScenarioSpreadProfile } from '../engine/scenario-spread-engine';
import { deriveL12ScenarioTemplateReadiness } from '../engine/scenario-readiness-engine';
import { computeL12TriggerStrengthProfile } from '../engine/trigger-strength-engine';

import { L12_DEFAULT_PATH_CONFIDENCE_POLICY } from '../registry/path-confidence-policy.registry';
import { listL12ProductionEnabledTemplates } from '../registry/scenario-template.registry';

import {
  L12_CANONICAL_PRODUCTION_TEMPLATES,
  bootstrapL12ProductionTemplateRegistry,
} from '../templates';

import { validateL12ScenarioTemplate } from '../validation/scenario-template.validator';
import { validateL12PathConfidencePolicy } from '../validation/path-confidence-policy.validator';
import { validateL12PathConfidenceCapChain } from '../validation/path-confidence-cap-chain.validator';
import { validateL12ScenarioSpreadProfile } from '../validation/scenario-spread-profile.validator';
import { validateL12ScenarioReadiness } from '../validation/scenario-readiness.validator';
import { validateL12TriggerInvalidationInteraction } from '../validation/trigger-invalidation-interaction.validator';
import { validateL12TemplateProductionReadiness } from '../validation/template-production-readiness.validator';

const POLICY = 'l12.5.invariants.v1';

export interface L12_5InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

function bootstrap(): void {
  bootstrapL12ProductionTemplateRegistry();
}

function neutralFactorScores(): Readonly<Record<L12PathConfidenceFactorGroup, number>> {
  const base: Record<L12PathConfidenceFactorGroup, number> = {} as never;
  for (const f of Object.keys(L12_DEFAULT_PATH_CONFIDENCE_WEIGHTS) as L12PathConfidenceFactorGroup[]) {
    base[f] = 0.5;
  }
  return base;
}

/* ─────────────────────────  INV-12.5-A  ───────────────────────── */

export function INV_12_5_A_production_template_completeness(): L12_5InvariantResult {
  bootstrap();
  const enabled = listL12ProductionEnabledTemplates();
  const required = L12_CANONICAL_PRODUCTION_TEMPLATES.map(t => t.template_id);
  const v = validateL12TemplateProductionReadiness({ required_template_ids: required });
  const ok = v.ok && enabled.length === L12_CANONICAL_PRODUCTION_TEMPLATES.length;
  return {
    id: 'INV-12.5-A',
    name: 'production template completeness law',
    holds: ok,
    evidence: ok
      ? `${enabled.length} production templates registered & complete`
      : `failures: ${v.issues.map(i => i.code).join(',')}`,
  };
}

/* ─────────────────────────  INV-12.5-B  ───────────────────────── */

export function INV_12_5_B_trigger_law(): L12_5InvariantResult {
  bootstrap();
  for (const t of L12_CANONICAL_PRODUCTION_TEMPLATES) {
    if (t.production_status !== L12ScenarioTemplateProductionStatus.PRODUCTION_ENABLED) continue;
    if (t.trigger_patterns.length < 1) {
      return {
        id: 'INV-12.5-B',
        name: 'trigger law',
        holds: false,
        evidence: `${t.template_id}: no trigger pattern`,
      };
    }
    const v = validateL12ScenarioTemplate(t);
    if (!v.ok) {
      return {
        id: 'INV-12.5-B',
        name: 'trigger law',
        holds: false,
        evidence: `${t.template_id}: ${v.issues.map(i => i.code).join(',')}`,
      };
    }
  }
  // Decisive trigger with weak evidence is downgraded by engine.
  const r = computeL12TriggerStrengthProfile({
    trigger_id: 'inv.b.trigger.weak',
    scenario_id: 'inv.b.scn',
    scenario_set_id: 'inv.b.set',
    trigger_status: L12TriggerStatus.ACTIVE,
    expected_effect: L12TriggerEffect.STRENGTHENS_PRIMARY,
    trigger_evidence_quality: 0.2,
    trigger_freshness_score: 0.9,
    trigger_monitorability_score: 0.9,
    trigger_materiality_score: 0.9,
    contradiction_pressure_score: 0.0,
    score_context_support_score: 0.9,
    policy_version: POLICY,
  });
  const downgraded = r.profile?.trigger_strength_band !== L12TriggerStrengthBand.DECISIVE;
  return {
    id: 'INV-12.5-B',
    name: 'trigger law',
    holds: downgraded,
    evidence: downgraded
      ? 'all production templates have triggers; weak-evidence decisive band downgraded'
      : 'decisive band emitted under weak evidence',
  };
}

/* ─────────────────────────  INV-12.5-C  ───────────────────────── */

export function INV_12_5_C_invalidation_law(): L12_5InvariantResult {
  bootstrap();
  for (const t of L12_CANONICAL_PRODUCTION_TEMPLATES) {
    if (t.production_status !== L12ScenarioTemplateProductionStatus.PRODUCTION_ENABLED) continue;
    if (t.invalidation_patterns.length < 1) {
      return {
        id: 'INV-12.5-C',
        name: 'invalidation law',
        holds: false,
        evidence: `${t.template_id}: no invalidation pattern`,
      };
    }
  }
  // Active invalidation requires confidence cap.
  const r = computeL12InvalidationStrengthProfile({
    invalidation_id: 'inv.c.active',
    scenario_id: 'inv.c.scn',
    scenario_set_id: 'inv.c.set',
    invalidation_status: L12InvalidationStatus.ACTIVE,
    expected_effect: L12InvalidationEffect.PATH_INVALIDATED,
    invalidation_evidence_quality: 0.85,
    invalidation_freshness_score: 0.9,
    invalidation_monitorability_score: 0.9,
    invalidation_materiality_score: 0.85,
    contradiction_pressure_score: 0.4,
    policy_version: POLICY,
  });
  const ok = !!r.profile?.confidence_cap_required && r.profile.is_active === true;
  return {
    id: 'INV-12.5-C',
    name: 'invalidation law',
    holds: ok,
    evidence: ok
      ? 'all production templates have invalidations; active invalidation triggers cap'
      : 'active invalidation did not require cap',
  };
}

/* ─────────────────────────  INV-12.5-D  ───────────────────────── */

export function INV_12_5_D_confidence_cap_law(): L12_5InvariantResult {
  // Score-context incomplete must block; capped score must not exceed pre-cap.
  const policy = L12_DEFAULT_PATH_CONFIDENCE_POLICY;
  const polV = validateL12PathConfidencePolicy(policy);
  if (!polV.ok) {
    return {
      id: 'INV-12.5-D',
      name: 'confidence cap law',
      holds: false,
      evidence: `default policy invalid: ${polV.issues.map(i => i.code).join(',')}`,
    };
  }
  const factors = neutralFactorScores();
  const r = computeL12PathConfidenceCapChain({
    scenario_set_id: 'inv.d.set',
    scenario_id: 'inv.d.scn',
    policy,
    factor_scores: factors,
    active_invalidation_present: false,
    blocking_invalidation_present: false,
    contradiction_unresolved: false,
    transition_risk_high: false,
    sequence_decay_dominant: false,
    hypothesis_spread_narrow: false,
    missing_visibility_material: false,
    drift_material: false,
    unresolved_trigger: false,
    thin_liquidity_fragility: false,
    l11_score_context_incomplete: true,
    insufficient_scenario_competition: false,
    policy_version: POLICY,
  });
  if (!r.ok || !r.cap_chain) {
    return {
      id: 'INV-12.5-D',
      name: 'confidence cap law',
      holds: false,
      evidence: 'cap chain compute failed',
    };
  }
  const v = validateL12PathConfidenceCapChain(r.cap_chain);
  const blocked =
    r.cap_chain.is_blocked &&
    r.cap_chain.dominant_cap_reason === L12PathConfidenceCapReason.INCOMPLETE_L11_SCORE_CONTEXT &&
    r.cap_chain.capped_score <= r.cap_chain.pre_cap_score;
  const holds = v.ok && blocked;
  return {
    id: 'INV-12.5-D',
    name: 'confidence cap law',
    holds,
    evidence: holds
      ? 'incomplete score context blocks; capped <= pre-cap'
      : `validator issues: ${v.issues.map(i => i.code).join(',')} blocked=${blocked}`,
  };
}

/* ─────────────────────────  INV-12.5-E  ───────────────────────── */

export function INV_12_5_E_spread_and_shift_law(): L12_5InvariantResult {
  // Narrow spread must require shift conditions; clear primary under
  // active invalidation must downgrade to non-clear.
  const narrow = computeL12ScenarioSpreadProfile({
    scenario_set_id: 'inv.e.set.narrow',
    primary_scenario_ref: 'p1',
    secondary_scenario_ref: 'p2',
    primary_confidence_score: 0.6,
    secondary_confidence_score: 0.55,
    active_invalidation_present: false,
    contradiction_unresolved: false,
    policy_version: POLICY,
  });
  if (!narrow.profile || !narrow.profile.shift_conditions_required) {
    return {
      id: 'INV-12.5-E',
      name: 'spread and shift law',
      holds: false,
      evidence: 'narrow spread did not require shift conditions',
    };
  }
  const v1 = validateL12ScenarioSpreadProfile(narrow.profile);
  if (!v1.ok) {
    return {
      id: 'INV-12.5-E',
      name: 'spread and shift law',
      holds: false,
      evidence: `narrow validator failed: ${v1.issues.map(i => i.code).join(',')}`,
    };
  }
  const clearUnderInv = computeL12ScenarioSpreadProfile({
    scenario_set_id: 'inv.e.set.clear',
    primary_scenario_ref: 'p1',
    secondary_scenario_ref: 'p2',
    primary_confidence_score: 0.85,
    secondary_confidence_score: 0.20,
    active_invalidation_present: true,
    contradiction_unresolved: false,
    policy_version: POLICY,
  });
  // Engine downgrades clear → moderate; ok=false carries the rejection signal.
  const downgraded = clearUnderInv.profile?.spread_class !== ('CLEAR_PRIMARY' as never);
  return {
    id: 'INV-12.5-E',
    name: 'spread and shift law',
    holds: downgraded,
    evidence: downgraded
      ? 'narrow spread requires shift; clear primary under active invalidation downgraded'
      : 'clear primary survived under active invalidation',
  };
}

/* ─────────────────────────  INV-12.5-F  ───────────────────────── */

export function INV_12_5_F_readiness_law(): L12_5InvariantResult {
  // Clean readiness must be impossible under active invalidation.
  const r = deriveL12ScenarioTemplateReadiness({
    scenario_set_id: 'inv.f.set',
    l11_score_context_complete: true,
    triggers_complete: true,
    invalidations_complete: true,
    active_invalidation_present: true,
    material_drift: false,
    missing_visibility_material: false,
    contradiction_unresolved: false,
    multi_path_unresolved: false,
    blocking_restriction: false,
    disclosures_present: false,
  });
  const v = validateL12ScenarioReadiness({
    scenario_set_id: 'inv.f.set',
    readiness_class: r.readiness_class,
    active_invalidation_present: true,
    triggers_complete: true,
    invalidations_complete: true,
    material_drift: false,
    l11_score_context_complete: true,
    multi_path_unresolved: false,
    blocking_restriction: false,
  });
  const notClean = r.readiness_class !== L12ScenarioTemplateReadinessClass.READY_CLEAN;
  return {
    id: 'INV-12.5-F',
    name: 'readiness law',
    holds: notClean && v.ok,
    evidence: notClean
      ? `readiness=${r.readiness_class} under active invalidation (validator ok=${v.ok})`
      : 'clean readiness emitted under active invalidation',
  };
}

/* ─────────────────────────  INV-12.5-G  ───────────────────────── */

export function INV_12_5_G_interaction_law(): L12_5InvariantResult {
  const cls = l12ResolveInteractionClass({
    triggerBand: L12TriggerStrengthBand.DECISIVE,
    invalidationBand: L12InvalidationStrengthBand.BLOCKING,
    invalidationActive: true,
  });
  const blocked = cls === L12TriggerInvalidationInteractionClass.BLOCKED_BY_INVALIDATION;

  // Validator must reject trigger-dominant under blocking invalidation.
  const validator = validateL12TriggerInvalidationInteraction({
    interaction_record_id: 'inv.g.rec',
    scenario_set_id: 'inv.g.set',
    scenario_id: 'inv.g.scn',
    trigger_id: 'inv.g.trg',
    invalidation_id: 'inv.g.inv',
    trigger_strength_band: L12TriggerStrengthBand.DECISIVE,
    invalidation_strength_band: L12InvalidationStrengthBand.BLOCKING,
    invalidation_active: true,
    invalidation_blocking: true,
    interaction_class: L12TriggerInvalidationInteractionClass.TRIGGER_DOMINANT,
    trigger_overrides_blocked_invalidation_attempted: true,
    lineage_refs: [],
    replay_hash: 'inv.g.hash',
    policy_version: POLICY,
  });
  const rejected = !validator.ok;
  return {
    id: 'INV-12.5-G',
    name: 'interaction law',
    holds: blocked && rejected,
    evidence: blocked && rejected
      ? 'blocking invalidation dominates decisive trigger; offender validator rejects'
      : `blocked=${blocked} rejected=${rejected}`,
  };
}

/* ─────────────────────────  INV-12.5-H  ───────────────────────── */

export function INV_12_5_H_non_prediction_law(): L12_5InvariantResult {
  bootstrap();
  // The structural template validator carries the forbidden-language scan.
  for (const t of L12_CANONICAL_PRODUCTION_TEMPLATES) {
    if (t.production_status !== L12ScenarioTemplateProductionStatus.PRODUCTION_ENABLED) continue;
    const v = validateL12ScenarioTemplate(t);
    if (!v.ok) {
      return {
        id: 'INV-12.5-H',
        name: 'non-prediction template law',
        holds: false,
        evidence: `${t.template_id}: ${v.issues.map(i => i.code).join(',')}`,
      };
    }
  }
  return {
    id: 'INV-12.5-H',
    name: 'non-prediction template law',
    holds: true,
    evidence: 'no production template carries prediction/recommendation/judgment/trade language',
  };
}

/* ─────────────────────────  Aggregate  ────────────────────────── */

export function runAllL12_5Invariants(): readonly L12_5InvariantResult[] {
  return [
    INV_12_5_A_production_template_completeness(),
    INV_12_5_B_trigger_law(),
    INV_12_5_C_invalidation_law(),
    INV_12_5_D_confidence_cap_law(),
    INV_12_5_E_spread_and_shift_law(),
    INV_12_5_F_readiness_law(),
    INV_12_5_G_interaction_law(),
    INV_12_5_H_non_prediction_law(),
  ];
}
