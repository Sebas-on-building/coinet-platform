/**
 * L10.9 — Extension Policy
 *
 * §10.9.6 / §10.9.13 INV-10.9-D — Classification of future changes
 * after ratification and the re-certification rule. No extension may
 * ship into a ratified Layer 10 unless it is classified and approved
 * through the extension classifier path.
 */

export enum L10ExtensionClass {
  ADDITIVE_SAFE = 'ADDITIVE_SAFE',
  BACKWARD_COMPATIBLE = 'BACKWARD_COMPATIBLE',
  MIGRATION_REQUIRED = 'MIGRATION_REQUIRED',
  BREAKING_SEMANTIC = 'BREAKING_SEMANTIC',
  PROHIBITED = 'PROHIBITED',
}

export const ALL_L10_EXTENSION_CLASSES: readonly L10ExtensionClass[] =
  Object.values(L10ExtensionClass);

export interface L10ExtensionPolicy {
  readonly version: string;
  readonly class_descriptions: Readonly<Record<L10ExtensionClass, string>>;
  readonly recertification_required_for: readonly L10ExtensionClass[];
}

export const L10_EXTENSION_POLICY_V1: L10ExtensionPolicy = Object.freeze({
  version: '1.0.0',
  class_descriptions: Object.freeze({
    [L10ExtensionClass.ADDITIVE_SAFE]:
      'additive changes that do not alter existing meaning, replay ' +
      'identity, or downstream rights (e.g., new fixtures, new ' +
      'non-breaking read helpers, new hypothesis templates gated ' +
      'behind rollout)',
    [L10ExtensionClass.BACKWARD_COMPATIBLE]:
      'additions to non-handoff internal artifacts that preserve ' +
      'historical interpretation and replay identity',
    [L10ExtensionClass.MIGRATION_REQUIRED]:
      'changes that preserve meaning but require governed migration ' +
      'and re-certification (e.g., template threshold changes that ' +
      'alter historical classification behaviour, confidence weight ' +
      'changes with historical comparability implications, read ' +
      'surface payload-shape additions, materialized-output schema ' +
      'extensions)',
    [L10ExtensionClass.BREAKING_SEMANTIC]:
      'changes that alter ranking law, spread class meaning, ' +
      'cap-chain dominance, readiness class meaning, restriction ' +
      'right meaning, existing template semantics, hypothesis ' +
      'family ontology, evidence-semantics taxonomies, or widen ' +
      'downstream rights; requires a new version namespace and ' +
      'full re-certification',
    [L10ExtensionClass.PROHIBITED]:
      'changes that would violate constitutional doctrine and are ' +
      'never allowed (letting L10 emit final judgment/scenarios/' +
      'scores/recommendations, allowing primary hypothesis to ' +
      'masquerade as final judgment, allowing later layers to ' +
      'rebuild hypotheses live from L6/L7/L8/L9, allowing Redis as ' +
      'authority, allowing single-story collapse, allowing causal ' +
      'certainty without later-layer authorization, bypassing L5 ' +
      'persistence)',
  }),
  recertification_required_for: Object.freeze([
    L10ExtensionClass.MIGRATION_REQUIRED,
    L10ExtensionClass.BREAKING_SEMANTIC,
  ]),
}) as L10ExtensionPolicy;

/**
 * A proposed change submitted for classification against the frozen /
 * hard-protected surfaces of L10.
 *
 * §10.9.6.3–§10.9.6.6 — At minimum the following kinds of changes
 * must pass the classifier: new hypothesis families, new templates,
 * modified ranking law, modified spread semantics, modified
 * cap-chain dominance, modified readiness law, modified restriction
 * rights, modified evidence semantics, modified read surfaces,
 * modified stable handoff surfaces.
 */
export interface L10ExtensionProposal {
  readonly proposal_id: string;
  readonly title: string;
  readonly touches_frozen_surface: boolean;
  readonly touches_hard_protected_surface: boolean;

  readonly alters_hypothesis_family_ontology: boolean;
  readonly alters_template_semantics: boolean;
  readonly alters_subject_contract: boolean;
  readonly alters_output_contract: boolean;
  readonly alters_ranking_law: boolean;
  readonly alters_spread_semantics: boolean;
  readonly alters_cap_chain_law: boolean;
  readonly alters_readiness_class_meaning: boolean;
  readonly alters_restriction_right_meaning: boolean;
  readonly alters_confidence_law: boolean;
  readonly alters_support_semantics: boolean;
  readonly alters_contradiction_semantics: boolean;
  readonly alters_confirmation_semantics: boolean;
  readonly alters_invalidation_semantics: boolean;
  readonly alters_shift_condition_semantics: boolean;
  readonly alters_read_surface: boolean;
  readonly alters_stable_handoff_surface: boolean;

  readonly introduces_judgment_semantics: boolean;
  readonly introduces_scenario_semantics: boolean;
  readonly introduces_scoring_finality: boolean;
  readonly introduces_recommendation_semantics: boolean;
  readonly enables_primary_as_final_judgment: boolean;
  readonly enables_single_story_collapse: boolean;
  readonly enables_live_lower_layer_rebuild: boolean;
  readonly enables_redis_as_authority: boolean;
  readonly bypasses_l5_persistence: boolean;
  readonly introduces_causal_certainty_without_authorization: boolean;

  readonly is_additive_only: boolean;
  readonly preserves_replay_hashes: boolean;
  readonly preserves_historical_meaning: boolean;
  readonly widens_downstream_rights: boolean;
  readonly notes: string;
}

export interface L10ExtensionClassification {
  readonly proposal_id: string;
  readonly classification: L10ExtensionClass;
  readonly requires_recertification: boolean;
  readonly rationale: readonly string[];
}
