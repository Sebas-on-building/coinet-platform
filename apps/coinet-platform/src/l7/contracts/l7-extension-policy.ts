/**
 * L7.9 — Extension Policy
 *
 * §7.9.6 — Classification of future changes after ratification and the
 * re-certification rule. No extension may ship into a ratified Layer 7
 * unless it is classified and approved through the extension
 * classifier path.
 */

export enum L7ExtensionClass {
  ADDITIVE_SAFE = 'ADDITIVE_SAFE',
  BACKWARD_COMPATIBLE = 'BACKWARD_COMPATIBLE',
  MIGRATION_REQUIRED = 'MIGRATION_REQUIRED',
  BREAKING_SEMANTIC = 'BREAKING_SEMANTIC',
  PROHIBITED = 'PROHIBITED',
}

export const ALL_L7_EXTENSION_CLASSES: readonly L7ExtensionClass[] =
  Object.values(L7ExtensionClass);

export interface L7ExtensionPolicy {
  readonly version: string;
  readonly class_descriptions: Readonly<Record<L7ExtensionClass, string>>;
  readonly recertification_required_for: readonly L7ExtensionClass[];
}

export const L7_EXTENSION_POLICY_V1: L7ExtensionPolicy = Object.freeze({
  version: '1.0.0',
  class_descriptions: Object.freeze({
    [L7ExtensionClass.ADDITIVE_SAFE]:
      'additive changes that do not alter existing meaning, replay identity, ' +
      'or downstream rights (e.g., new fixtures, new non-breaking read ' +
      'helpers, new allowed families after rollout gating)',
    [L7ExtensionClass.BACKWARD_COMPATIBLE]:
      'additions to non-handoff internal artifacts that preserve ' +
      'historical interpretation and replay identity',
    [L7ExtensionClass.MIGRATION_REQUIRED]:
      'changes that preserve meaning but require governed migration ' +
      'and re-certification (e.g., template threshold changes that ' +
      'alter historical classification behaviour, confidence weight ' +
      'changes with historical comparability implications)',
    [L7ExtensionClass.BREAKING_SEMANTIC]:
      'changes that alter primary validation class meaning, ' +
      'contradiction-family meaning, or widen downstream rights ' +
      'semantics; requires a new version namespace and full ' +
      're-certification',
    [L7ExtensionClass.PROHIBITED]:
      'changes that would violate constitutional doctrine and are ' +
      'never allowed (removing contradiction preservation, allowing ' +
      'live downstream revalidation from raw L6, letting confidence ' +
      'bypass contradiction cap law, letting L7 emit final judgment)',
  }),
  recertification_required_for: Object.freeze([
    L7ExtensionClass.MIGRATION_REQUIRED,
    L7ExtensionClass.BREAKING_SEMANTIC,
  ]),
}) as L7ExtensionPolicy;

/**
 * A proposed change submitted for classification against the frozen /
 * hard-protected surfaces of L7.
 *
 * §7.9.6.3 — At minimum the following kinds of changes must pass the
 * classifier: new validation families, new contradiction templates,
 * new contradiction families, modified validation-class semantics,
 * modified confidence-factor law, modified cap-chain law, modified
 * restriction-right law, modified read surfaces, modified stable
 * handoff surfaces.
 */
export interface L7ExtensionProposal {
  readonly proposal_id: string;
  readonly title: string;
  readonly touches_frozen_surface: boolean;
  readonly touches_hard_protected_surface: boolean;

  readonly alters_validation_class_meaning: boolean;
  readonly alters_validation_modifier_meaning: boolean;
  readonly alters_contradiction_family_meaning: boolean;
  readonly alters_contradiction_template_identity: boolean;
  readonly alters_confidence_factor_law: boolean;
  readonly alters_cap_chain_law: boolean;
  readonly alters_restriction_right_law: boolean;
  readonly alters_read_surface: boolean;
  readonly alters_stable_handoff_surface: boolean;

  readonly removes_contradiction_preservation: boolean;
  readonly enables_live_raw_l6_revalidation: boolean;
  readonly bypasses_contradiction_cap: boolean;
  readonly introduces_final_judgment_semantics: boolean;

  readonly is_additive_only: boolean;
  readonly preserves_replay_hashes: boolean;
  readonly preserves_historical_meaning: boolean;
  readonly widens_downstream_rights: boolean;
  readonly notes: string;
}

export interface L7ExtensionClassification {
  readonly proposal_id: string;
  readonly classification: L7ExtensionClass;
  readonly requires_recertification: boolean;
  readonly rationale: readonly string[];
}
