/**
 * L13.4 — Grounded Claim Contract
 *
 * §13.4.2 / §13.4.3 — Every AI-output claim must be extracted,
 * classified, matched to governed evidence, contradiction-checked,
 * and assigned a grounding class that determines whether it may
 * emit.
 *
 * Core law: a claim is legal only when it is grounded, disclosed,
 * and allowed. Unsupported or contradicted claims must be removed,
 * rewritten, or blocked.
 */

import type { L13DependencyLayer } from './l13-constitutional-types';

/**
 * §13.4.2.1 — Grounding class taxonomy.
 *
 * Hierarchy:
 *   DIRECTLY_SUPPORTED
 *   ↓ INFERRED_FROM_SUPPORTED_SURFACES
 *   ↓ UNCERTAIN_BUT_PLAUSIBLE
 *   ↓ UNSUPPORTED_BLOCKED
 *   ↓ CONTRADICTED_BLOCKED
 *
 * Only the first three may appear in user-facing output.
 */
export enum L13ClaimGroundingClass {
  DIRECTLY_SUPPORTED = 'DIRECTLY_SUPPORTED',
  INFERRED_FROM_SUPPORTED_SURFACES = 'INFERRED_FROM_SUPPORTED_SURFACES',
  UNCERTAIN_BUT_PLAUSIBLE = 'UNCERTAIN_BUT_PLAUSIBLE',
  UNSUPPORTED_BLOCKED = 'UNSUPPORTED_BLOCKED',
  CONTRADICTED_BLOCKED = 'CONTRADICTED_BLOCKED',
}

export const ALL_L13_CLAIM_GROUNDING_CLASSES:
  readonly L13ClaimGroundingClass[] =
  Object.values(L13ClaimGroundingClass);

/**
 * Grounding classes that block emission to the user.
 */
export const L13_BLOCKED_CLAIM_GROUNDING_CLASSES:
  readonly L13ClaimGroundingClass[] = [
  L13ClaimGroundingClass.UNSUPPORTED_BLOCKED,
  L13ClaimGroundingClass.CONTRADICTED_BLOCKED,
];

export function isL13BlockedGroundingClass(
  cls: L13ClaimGroundingClass,
): boolean {
  return L13_BLOCKED_CLAIM_GROUNDING_CLASSES.includes(cls);
}

/**
 * §13.4.4 — Claim type taxonomy.
 */
export enum L13ClaimType {
  OBSERVATION = 'OBSERVATION',
  INFERENCE = 'INFERENCE',
  SCENARIO_STATEMENT = 'SCENARIO_STATEMENT',
  SCORE_STATEMENT = 'SCORE_STATEMENT',
  HYPOTHESIS_STATEMENT = 'HYPOTHESIS_STATEMENT',
  REGIME_STATEMENT = 'REGIME_STATEMENT',
  SEQUENCE_STATEMENT = 'SEQUENCE_STATEMENT',
  CONTRADICTION_STATEMENT = 'CONTRADICTION_STATEMENT',
  UNCERTAINTY_STATEMENT = 'UNCERTAINTY_STATEMENT',
  USER_GUIDANCE_STATEMENT = 'USER_GUIDANCE_STATEMENT',
  RESTRICTION_STATEMENT = 'RESTRICTION_STATEMENT',
  REFUSAL_STATEMENT = 'REFUSAL_STATEMENT',
}

export const ALL_L13_CLAIM_TYPES: readonly L13ClaimType[] =
  Object.values(L13ClaimType);

/**
 * §13.4.3.2 — Claim types that may emit without supporting evidence
 * refs (they still require lineage refs).
 */
export const L13_CLAIM_TYPES_EVIDENCE_OPTIONAL:
  readonly L13ClaimType[] = [
  L13ClaimType.UNCERTAINTY_STATEMENT,
  L13ClaimType.REFUSAL_STATEMENT,
  L13ClaimType.RESTRICTION_STATEMENT,
];

export function claimTypeRequiresEvidence(
  t: L13ClaimType,
): boolean {
  return !L13_CLAIM_TYPES_EVIDENCE_OPTIONAL.includes(t);
}

/**
 * §13.4.5.1 — Claim strength classes.
 */
export enum L13ClaimStrengthClass {
  STRONG_ENGINE_STATED = 'STRONG_ENGINE_STATED',
  MODERATE_ENGINE_SUPPORTED = 'MODERATE_ENGINE_SUPPORTED',
  WEAK_DISCLOSURE_ONLY = 'WEAK_DISCLOSURE_ONLY',
  CONDITIONAL_ONLY = 'CONDITIONAL_ONLY',
  BLOCKED = 'BLOCKED',
}

export const ALL_L13_CLAIM_STRENGTH_CLASSES:
  readonly L13ClaimStrengthClass[] =
  Object.values(L13ClaimStrengthClass);

/**
 * §13.4.5.2 — Claim scope classes.
 */
export enum L13ClaimScopeClass {
  ENTITY_SCOPE = 'ENTITY_SCOPE',
  ASSET_SCOPE = 'ASSET_SCOPE',
  SECTOR_SCOPE = 'SECTOR_SCOPE',
  ECOSYSTEM_SCOPE = 'ECOSYSTEM_SCOPE',
  MARKET_SCOPE = 'MARKET_SCOPE',
  COMPARISON_SCOPE = 'COMPARISON_SCOPE',
  USER_REQUEST_SCOPE = 'USER_REQUEST_SCOPE',
}

export const ALL_L13_CLAIM_SCOPE_CLASSES:
  readonly L13ClaimScopeClass[] = Object.values(L13ClaimScopeClass);

/**
 * §13.4.14 — Actions the grounding engine may take on a claim.
 */
export enum L13GroundingAction {
  ALLOW = 'ALLOW',
  ALLOW_WITH_DISCLOSURE = 'ALLOW_WITH_DISCLOSURE',
  REWRITE_AS_UNCERTAINTY = 'REWRITE_AS_UNCERTAINTY',
  REMOVE_CLAIM = 'REMOVE_CLAIM',
  BLOCK_OUTPUT = 'BLOCK_OUTPUT',
}

export const ALL_L13_GROUNDING_ACTIONS: readonly L13GroundingAction[] =
  Object.values(L13GroundingAction);

/**
 * §13.4.14 — Reason codes attached to blocked claims.
 */
export enum L13GroundingBlockReasonCode {
  NO_EVIDENCE_MATCH = 'NO_EVIDENCE_MATCH',
  ACTIVE_CONTRADICTION = 'ACTIVE_CONTRADICTION',
  INVENTED_EVIDENCE = 'INVENTED_EVIDENCE',
  INVENTED_SCORE_DRIVER = 'INVENTED_SCORE_DRIVER',
  INVENTED_SCENARIO_TRIGGER = 'INVENTED_SCENARIO_TRIGGER',
  INVENTED_SCENARIO_INVALIDATION = 'INVENTED_SCENARIO_INVALIDATION',
  INVENTED_HYPOTHESIS_SUPPORT = 'INVENTED_HYPOTHESIS_SUPPORT',
  INVENTED_CONTRADICTION_ABSENCE = 'INVENTED_CONTRADICTION_ABSENCE',
  INVENTED_CONFIDENCE = 'INVENTED_CONFIDENCE',
  INVENTED_REGIME_STATE = 'INVENTED_REGIME_STATE',
  INVENTED_SEQUENCE_STATE = 'INVENTED_SEQUENCE_STATE',
  INVENTED_DATA_COMPLETENESS = 'INVENTED_DATA_COMPLETENESS',
  INVENTED_FINANCIAL_INSTRUCTION = 'INVENTED_FINANCIAL_INSTRUCTION',
  WEAK_MATCH_USED_AS_STRONG = 'WEAK_MATCH_USED_AS_STRONG',
  RAW_LOWER_LAYER_REF = 'RAW_LOWER_LAYER_REF',
  CITATION_INCOMPLETE = 'CITATION_INCOMPLETE',
  RECOMMENDATION_LANGUAGE = 'RECOMMENDATION_LANGUAGE',
  PREDICTION_LANGUAGE = 'PREDICTION_LANGUAGE',
}

/**
 * §13.4.3 — Grounded claim object.
 */
export interface L13GroundedClaim {
  readonly claim_id: string;

  readonly output_id: string;
  readonly input_package_id: string;

  readonly claim_text: string;
  readonly normalized_claim_text: string;

  readonly claim_type: L13ClaimType;
  readonly grounding_class: L13ClaimGroundingClass;

  readonly claim_strength: L13ClaimStrengthClass;
  readonly claim_scope: L13ClaimScopeClass;

  readonly supporting_evidence_refs: readonly string[];
  readonly contradiction_refs: readonly string[];

  readonly source_layer_refs: readonly L13DependencyLayer[];
  readonly source_surface_refs: readonly string[];

  readonly section_ref: string;

  readonly inference_required: boolean;
  readonly uncertainty_required: boolean;
  readonly disclosure_required: boolean;

  readonly allowed_to_emit: boolean;

  readonly blocked_reason_codes: readonly L13GroundingBlockReasonCode[];

  readonly rewrite_required: boolean;
  readonly suggested_rewrite?: string;

  readonly grounding_action: L13GroundingAction;

  readonly citation_pack_ref?: string;

  readonly lineage_refs: readonly string[];

  readonly policy_version: string;
  readonly replay_hash: string;
}

/**
 * §13.4.3.1 — Identity fields whose absence is illegal.
 */
export const L13_REQUIRED_GROUNDED_CLAIM_FIELDS:
  readonly (keyof L13GroundedClaim)[] = [
  'claim_id',
  'output_id',
  'input_package_id',
  'claim_text',
  'claim_type',
  'grounding_class',
  'section_ref',
  'policy_version',
  'replay_hash',
];
