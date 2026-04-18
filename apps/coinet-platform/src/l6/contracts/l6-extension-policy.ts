/**
 * L6.9 — Extension Policy
 *
 * §6.9.5.6–§6.9.5.7 — Classification of future changes after ratification
 * and the re-certification rule.
 */

export enum L6ExtensionClass {
  ADDITIVE_SAFE = 'ADDITIVE_SAFE',
  BACKWARD_COMPATIBLE_STRUCTURAL = 'BACKWARD_COMPATIBLE_STRUCTURAL',
  MIGRATION_REQUIRED = 'MIGRATION_REQUIRED',
  BREAKING_SEMANTIC = 'BREAKING_SEMANTIC',
  PROHIBITED = 'PROHIBITED',
}

export const ALL_EXTENSION_CLASSES: readonly L6ExtensionClass[] =
  Object.values(L6ExtensionClass);

export interface L6ExtensionPolicy {
  readonly version: string;
  readonly class_descriptions: Readonly<Record<L6ExtensionClass, string>>;
  readonly recertification_required_for: readonly L6ExtensionClass[];
}

export const L6_EXTENSION_POLICY_V1: L6ExtensionPolicy = Object.freeze({
  version: '1.0.0',
  class_descriptions: Object.freeze({
    [L6ExtensionClass.ADDITIVE_SAFE]:
      'new feature/event families or fixtures that add capability without altering meaning',
    [L6ExtensionClass.BACKWARD_COMPATIBLE_STRUCTURAL]:
      'structural additions that preserve historical interpretation and replay identity',
    [L6ExtensionClass.MIGRATION_REQUIRED]:
      'changes that preserve meaning but require governed migration + re-certification',
    [L6ExtensionClass.BREAKING_SEMANTIC]:
      'changes that alter primitive meaning, lifecycle semantics, authority, or replay identity',
    [L6ExtensionClass.PROHIBITED]:
      'changes that would violate constitutional doctrine and are never allowed',
  }),
  recertification_required_for: Object.freeze([
    L6ExtensionClass.MIGRATION_REQUIRED,
    L6ExtensionClass.BREAKING_SEMANTIC,
  ]),
}) as L6ExtensionPolicy;

/**
 * A proposed change submitted for classification against the frozen
 * surfaces of L6.
 */
export interface L6ExtensionProposal {
  readonly proposal_id: string;
  readonly title: string;
  readonly touches_frozen_surface: boolean;
  readonly touches_hard_protected_surface: boolean;
  readonly alters_primitive_meaning: boolean;
  readonly alters_event_lifecycle: boolean;
  readonly alters_current_state_authority: boolean;
  readonly alters_replay_identity: boolean;
  readonly alters_contract_required_fields: boolean;
  readonly alters_late_data_law: boolean;
  readonly is_additive_only: boolean;
  readonly preserves_replay_hashes: boolean;
  readonly preserves_historical_meaning: boolean;
  readonly notes: string;
}

export interface L6ExtensionClassification {
  readonly proposal_id: string;
  readonly classification: L6ExtensionClass;
  readonly requires_recertification: boolean;
  readonly rationale: readonly string[];
}
