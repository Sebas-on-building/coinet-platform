/**
 * L8.9 — Extension Policy
 *
 * §8.9.7.4 / §8.9.7.5 — Classification of future changes after
 * ratification and the re-certification rule. No extension may ship
 * into a ratified Layer 8 unless it is classified and approved through
 * the extension classifier path.
 */

export enum L8ExtensionClass {
  ADDITIVE_SAFE = 'ADDITIVE_SAFE',
  BACKWARD_COMPATIBLE = 'BACKWARD_COMPATIBLE',
  MIGRATION_REQUIRED = 'MIGRATION_REQUIRED',
  BREAKING_SEMANTIC = 'BREAKING_SEMANTIC',
  PROHIBITED = 'PROHIBITED',
}

export const ALL_L8_EXTENSION_CLASSES: readonly L8ExtensionClass[] =
  Object.values(L8ExtensionClass);

export interface L8ExtensionPolicy {
  readonly version: string;
  readonly class_descriptions: Readonly<Record<L8ExtensionClass, string>>;
  readonly recertification_required_for: readonly L8ExtensionClass[];
}

export const L8_EXTENSION_POLICY_V1: L8ExtensionPolicy = Object.freeze({
  version: '1.0.0',
  class_descriptions: Object.freeze({
    [L8ExtensionClass.ADDITIVE_SAFE]:
      'additive changes that do not alter existing meaning, replay ' +
      'identity, or downstream rights (e.g., new fixtures, new ' +
      'non-breaking read helpers, new templates gated behind rollout)',
    [L8ExtensionClass.BACKWARD_COMPATIBLE]:
      'additions to non-handoff internal artifacts that preserve ' +
      'historical interpretation and replay identity',
    [L8ExtensionClass.MIGRATION_REQUIRED]:
      'changes that preserve meaning but require governed migration ' +
      'and re-certification (e.g., template threshold changes that ' +
      'alter historical classification behaviour, confidence weight ' +
      'changes with historical comparability implications, read ' +
      'surface shape additions)',
    [L8ExtensionClass.BREAKING_SEMANTIC]:
      'changes that alter regime class meaning, regime family ' +
      'ontology, coexistence law, or widen downstream rights; ' +
      'requires a new version namespace and full re-certification',
    [L8ExtensionClass.PROHIBITED]:
      'changes that would violate constitutional doctrine and are ' +
      'never allowed (letting L8 emit judgment/recommendation, ' +
      'turning multipliers into final scores, letting Redis become ' +
      'regime authority, allowing live raw L6/L7 re-classification)',
  }),
  recertification_required_for: Object.freeze([
    L8ExtensionClass.MIGRATION_REQUIRED,
    L8ExtensionClass.BREAKING_SEMANTIC,
  ]),
}) as L8ExtensionPolicy;

/**
 * A proposed change submitted for classification against the frozen /
 * hard-protected surfaces of L8.
 *
 * §8.9.7.4 — At minimum the following kinds of changes must pass the
 * classifier: new regime families, new regime templates, modified
 * regime class meanings, modified coexistence law, modified
 * confidence/transition/multiplier law, modified read surfaces,
 * modified stable handoff surfaces.
 */
export interface L8ExtensionProposal {
  readonly proposal_id: string;
  readonly title: string;
  readonly touches_frozen_surface: boolean;
  readonly touches_hard_protected_surface: boolean;

  readonly alters_regime_class_meaning: boolean;
  readonly alters_regime_family_ontology: boolean;
  readonly alters_coexistence_law: boolean;
  readonly alters_subject_contract: boolean;
  readonly alters_output_contract: boolean;
  readonly alters_confidence_law: boolean;
  readonly alters_transition_law: boolean;
  readonly alters_multiplier_law: boolean;
  readonly alters_cap_chain_law: boolean;
  readonly alters_input_admissibility: boolean;
  readonly alters_template_semantics: boolean;
  readonly alters_read_surface: boolean;
  readonly alters_stable_handoff_surface: boolean;

  readonly introduces_judgment_semantics: boolean;
  readonly introduces_recommendation_semantics: boolean;
  readonly introduces_scoring_finality: boolean;
  readonly turns_multiplier_into_final_score: boolean;
  readonly enables_redis_as_authority: boolean;
  readonly enables_live_raw_l6_l7_reclassification: boolean;
  readonly bypasses_l5_persistence: boolean;

  readonly is_additive_only: boolean;
  readonly preserves_replay_hashes: boolean;
  readonly preserves_historical_meaning: boolean;
  readonly widens_downstream_rights: boolean;
  readonly notes: string;
}

export interface L8ExtensionClassification {
  readonly proposal_id: string;
  readonly classification: L8ExtensionClass;
  readonly requires_recertification: boolean;
  readonly rationale: readonly string[];
}
