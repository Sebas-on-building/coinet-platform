/**
 * L9.9 — Extension Policy
 *
 * §9.9.1.4 / §9.9.4.1 INV-9.9-D — Classification of future changes
 * after ratification and the re-certification rule. No extension may
 * ship into a ratified Layer 9 unless it is classified and approved
 * through the extension classifier path.
 */

export enum L9ExtensionClass {
  ADDITIVE_SAFE = 'ADDITIVE_SAFE',
  BACKWARD_COMPATIBLE = 'BACKWARD_COMPATIBLE',
  MIGRATION_REQUIRED = 'MIGRATION_REQUIRED',
  BREAKING_SEMANTIC = 'BREAKING_SEMANTIC',
  PROHIBITED = 'PROHIBITED',
}

export const ALL_L9_EXTENSION_CLASSES: readonly L9ExtensionClass[] =
  Object.values(L9ExtensionClass);

export interface L9ExtensionPolicy {
  readonly version: string;
  readonly class_descriptions: Readonly<Record<L9ExtensionClass, string>>;
  readonly recertification_required_for: readonly L9ExtensionClass[];
}

export const L9_EXTENSION_POLICY_V1: L9ExtensionPolicy = Object.freeze({
  version: '1.0.0',
  class_descriptions: Object.freeze({
    [L9ExtensionClass.ADDITIVE_SAFE]:
      'additive changes that do not alter existing meaning, replay ' +
      'identity, or downstream rights (e.g., new fixtures, new ' +
      'non-breaking read helpers, new templates gated behind rollout)',
    [L9ExtensionClass.BACKWARD_COMPATIBLE]:
      'additions to non-handoff internal artifacts that preserve ' +
      'historical interpretation and replay identity',
    [L9ExtensionClass.MIGRATION_REQUIRED]:
      'changes that preserve meaning but require governed migration ' +
      'and re-certification (e.g., template threshold changes that ' +
      'alter historical classification behaviour, confidence weight ' +
      'changes with historical comparability implications, read ' +
      'surface shape additions, lead-lag horizon shifts)',
    [L9ExtensionClass.BREAKING_SEMANTIC]:
      'changes that alter sequence state meaning, sequence family ' +
      'ontology, lead-lag/phase/change-point/decay semantics, causal ' +
      'restraint law, or widen downstream rights; requires a new ' +
      'version namespace and full re-certification',
    [L9ExtensionClass.PROHIBITED]:
      'changes that would violate constitutional doctrine and are ' +
      'never allowed (letting L9 emit judgment/recommendation/scoring, ' +
      'turning confidence into final scores, letting Redis become ' +
      'sequence authority, allowing live raw L6/L7/L8 reconstruction, ' +
      'bypassing L5 persistence, introducing causal certainty from ' +
      'temporal adjacency)',
  }),
  recertification_required_for: Object.freeze([
    L9ExtensionClass.MIGRATION_REQUIRED,
    L9ExtensionClass.BREAKING_SEMANTIC,
  ]),
}) as L9ExtensionPolicy;

/**
 * A proposed change submitted for classification against the frozen /
 * hard-protected surfaces of L9.
 *
 * §9.9.1.4 — At minimum the following kinds of changes must pass the
 * classifier: new sequence families, new templates, modified sequence
 * state meanings, modified coexistence law, modified temporal
 * semantics, modified confidence/restriction/causal-restraint law,
 * modified read surfaces, modified stable handoff surfaces.
 */
export interface L9ExtensionProposal {
  readonly proposal_id: string;
  readonly title: string;
  readonly touches_frozen_surface: boolean;
  readonly touches_hard_protected_surface: boolean;

  readonly alters_sequence_state_meaning: boolean;
  readonly alters_sequence_family_ontology: boolean;
  readonly alters_coexistence_law: boolean;
  readonly alters_subject_contract: boolean;
  readonly alters_output_contract: boolean;
  readonly alters_lead_lag_semantics: boolean;
  readonly alters_phase_progression_law: boolean;
  readonly alters_change_point_law: boolean;
  readonly alters_decay_law: boolean;
  readonly alters_post_event_window_law: boolean;
  readonly alters_confidence_law: boolean;
  readonly alters_restriction_law: boolean;
  readonly alters_causal_restraint_law: boolean;
  readonly alters_cap_chain_law: boolean;
  readonly alters_template_semantics: boolean;
  readonly alters_read_surface: boolean;
  readonly alters_stable_handoff_surface: boolean;

  readonly introduces_judgment_semantics: boolean;
  readonly introduces_recommendation_semantics: boolean;
  readonly introduces_scoring_finality: boolean;
  readonly introduces_causal_certainty_from_adjacency: boolean;
  readonly turns_confidence_into_final_score: boolean;
  readonly enables_redis_as_authority: boolean;
  readonly enables_live_raw_lower_layer_reconstruction: boolean;
  readonly bypasses_l5_persistence: boolean;

  readonly is_additive_only: boolean;
  readonly preserves_replay_hashes: boolean;
  readonly preserves_historical_meaning: boolean;
  readonly widens_downstream_rights: boolean;
  readonly notes: string;
}

export interface L9ExtensionClassification {
  readonly proposal_id: string;
  readonly classification: L9ExtensionClass;
  readonly requires_recertification: boolean;
  readonly rationale: readonly string[];
}
