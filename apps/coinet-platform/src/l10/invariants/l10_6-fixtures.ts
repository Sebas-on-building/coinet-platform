/**
 * L10.6 — Family / Template Fixtures
 *
 * §10.6.14 / §10.6.15.2 — Canonical green-pipeline inputs used by the
 * L10.6 invariants. A "green" input is one where every family /
 * template / rollout / state validator must return `ok: true`.
 *
 * Every invariant reuses the exact same green fixture as its baseline
 * (INV-10.6 "green-pipeline" predicate) and then perturbs a single
 * surface to assert that a specific violation code fires.
 */

import {
  GENUINE_EARLY_ACCUMULATION_TEMPLATE,
} from '../templates/genuine-early-accumulation.template';
import {
  L10HypothesisFamilyRolloutEntry,
  L10RolloutLifecycleStage,
} from '../contracts/hypothesis-family-rollout';
import {
  L10HypothesisFamilyId,
  L10_PRODUCTION_FAMILY_ROLLOUT_PHASE,
  ALL_L10_HYPOTHESIS_FAMILY_IDS,
  L10HypothesisRolloutPhase,
} from '../contracts/hypothesis-template-policy';
import {
  L10_PRODUCTION_FAMILY_DEFINITIONS,
} from '../families';
import { ALL_L10_PRODUCTION_TEMPLATES } from '../templates';
import type { L10HypothesisFamilyDefinition } from '../contracts/hypothesis-family-definition';
import type { L10HypothesisTemplateDefinition } from '../contracts/hypothesis-template-definition';
import { L10TemplateStateInput } from '../validation/l10-template-state-legality.validator';

/**
 * §10.6.15.2 — Green fixture for a single template (the Phase-1 core
 * Genuine Early Accumulation template). Used by INV-10.6-D for the
 * state-legality runtime predicate.
 */
export interface GreenL10_6TemplateStateFixture {
  readonly template: L10HypothesisTemplateDefinition;
  readonly state: L10TemplateStateInput;
}

export function buildGreenL10_6TemplateStateFixture():
  GreenL10_6TemplateStateFixture {
  const tpl = GENUINE_EARLY_ACCUMULATION_TEMPLATE;
  const state: L10TemplateStateInput = {
    template: tpl,
    is_production_enabled: true,
    primary_support_strength: 0.8,
    support_domains_present: 3,
    active_blocking_contradiction_domains: [],
    active_narrowing_contradiction_domains: [],
    present_confirmation_refs: new Set<string>(
      tpl.required_confirmations.map(c => c.confirmation_ref),
    ),
    active_invalidation_refs: new Set<string>(),
    observed_regime_class: tpl.regime_posture.required_regime_classes[0] ?? null,
    observed_sequence_class:
      tpl.sequence_posture.required_sequence_classes[0] ?? null,
    competition_live: true,
    confirmation_coverage: 1.0,
    candidate_stability_score: 0.85,
  };
  return { template: tpl, state };
}

/**
 * §10.6.15.2 — Green fixture for the full family / template roster.
 * Used by INV-10.6-A/B/C/E/G: family-level and template-definition
 * invariants operate over the canonical production rosters, not over
 * a synthetic minimal set.
 */
export interface GreenL10_6DefinitionFixture {
  readonly families: readonly L10HypothesisFamilyDefinition[];
  readonly templates: readonly L10HypothesisTemplateDefinition[];
  readonly families_by_id: ReadonlyMap<
    L10HypothesisFamilyId,
    L10HypothesisFamilyDefinition
  >;
}

export function buildGreenL10_6DefinitionFixture():
  GreenL10_6DefinitionFixture {
  const map = new Map<L10HypothesisFamilyId, L10HypothesisFamilyDefinition>();
  for (const f of L10_PRODUCTION_FAMILY_DEFINITIONS) {
    map.set(f.family_id, f);
  }
  return {
    families: L10_PRODUCTION_FAMILY_DEFINITIONS,
    templates: ALL_L10_PRODUCTION_TEMPLATES,
    families_by_id: map,
  };
}

/**
 * §10.6.15.2 / INV-10.6-F — Green rollout fixture. All canonical
 * families are declared ENABLED with every gate green and their
 * predecessor chain satisfied.
 */
export interface GreenL10_6RolloutFixture {
  readonly entries: readonly L10HypothesisFamilyRolloutEntry[];
  readonly certified_families: ReadonlySet<L10HypothesisFamilyId>;
}

export function buildGreenL10_6RolloutFixture(): GreenL10_6RolloutFixture {
  const entries: L10HypothesisFamilyRolloutEntry[] =
    ALL_L10_HYPOTHESIS_FAMILY_IDS.map(fid => ({
      family_id: fid,
      rollout_phase: L10_PRODUCTION_FAMILY_ROLLOUT_PHASE[fid],
      lifecycle_stage: L10RolloutLifecycleStage.ENABLED,
      rollout_version: '1.0.0',
      gate_flags: {
        family_definition_valid: true,
        all_templates_valid: true,
        has_owned_templates: true,
        support_contradiction_coverage_complete: true,
        confirmation_invalidation_complete: true,
        regime_sequence_dependencies_complete: true,
        restriction_defaults_complete: true,
        no_family_template_drift: true,
        certification_green: true,
      },
      required_predecessors: predecessorsFor(
        L10_PRODUCTION_FAMILY_ROLLOUT_PHASE[fid],
      ),
      rollout_notes: [],
    }));
  return {
    entries,
    certified_families: new Set(ALL_L10_HYPOTHESIS_FAMILY_IDS),
  };
}

function predecessorsFor(
  phase: L10HypothesisRolloutPhase,
): readonly L10HypothesisFamilyId[] {
  const out: L10HypothesisFamilyId[] = [];
  for (const fid of ALL_L10_HYPOTHESIS_FAMILY_IDS) {
    const p = L10_PRODUCTION_FAMILY_ROLLOUT_PHASE[fid];
    if (rolloutPhaseRank(p) < rolloutPhaseRank(phase)) {
      out.push(fid);
    }
  }
  return out;
}

function rolloutPhaseRank(phase: L10HypothesisRolloutPhase): number {
  switch (phase) {
    case L10HypothesisRolloutPhase.P1_CORE: return 1;
    case L10HypothesisRolloutPhase.P2_STRUCTURAL_COMPETITION: return 2;
    case L10HypothesisRolloutPhase.P3_COMPLEX_INTERPRETATION: return 3;
    case L10HypothesisRolloutPhase.P4_ADVERSARIAL_EXPLANATION: return 4;
    case L10HypothesisRolloutPhase.P5_RELATIONAL_EXPLANATION: return 5;
    default: return 99;
  }
}
