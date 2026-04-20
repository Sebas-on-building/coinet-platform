/**
 * L9.6 — Sequence Family Definition Validator
 *
 * §9.6.3 — Validates a production family definition against family
 * law: declared taxonomy alignment, legal scopes, state ownership
 * legality, template-id registration, post-event anchor legality,
 * regime requirement presence, confidence cap range, coexistence
 * legality, and forbidden-surface leakage (§9.6.14.1 INV-9.6-G).
 */

import {
  L9FamilyStateOwnership,
  L9SequenceFamilyDefinition,
  L9StateOwnershipPosture,
} from '../contracts/sequence-family-definition';
import {
  L9ProductionFamilyId,
  ALL_L9_PRODUCTION_FAMILY_IDS,
  L9_PRODUCTION_FAMILY_ROLLOUT_PHASE,
} from '../contracts/sequence-template-policy';
import {
  ALL_L9_SEQUENCE_FAMILIES,
  ALL_L9_SEQUENCE_SCOPE_TYPES,
  L9SequenceFamily,
} from '../contracts/sequence-family';
import {
  ALL_L9_SEQUENCE_STATES,
  L9SequenceState,
} from '../contracts/sequence-state';
import {
  ALL_L9_POST_EVENT_ANCHOR_CLASSES,
} from '../contracts/l9-post-event-window-policy';
import {
  L9FamilyValidationError,
  L9FamilyViolation,
  L9FamilyViolationCode,
  L9FamilyViolationTier,
} from './l9-family-violation-codes';

/**
 * §9.6.1.3 / INV-9.6-G — free-form surfaces that must never appear in
 * a family description / invariants list (judgment, scenario,
 * recommendation, trading).
 */
const L9F_FORBIDDEN_JUDGMENT_SURFACE = /(should|buy|sell|recommend|bullish posture|target|entry|exit|trade)/i;

export interface L9SequenceFamilyDefinitionValidationInput {
  readonly definition: L9SequenceFamilyDefinition;
  /**
   * §9.6.3.3 — Template ids declared by other definitions. Used to
   * detect cross-family template duplication. Keyed by template id.
   */
  readonly external_template_owners?: ReadonlyMap<string, L9ProductionFamilyId>;
}

export interface L9SequenceFamilyDefinitionValidationResult {
  readonly ok: boolean;
  readonly violations: readonly L9FamilyViolation[];
}

function v(
  code: L9FamilyViolationCode,
  detail: string,
  refs?: readonly string[],
): L9FamilyViolation {
  return {
    code,
    tier: L9FamilyViolationTier.FAMILY,
    detail,
    ...(refs ? { offending_refs: refs } : {}),
  };
}

export function validateL9SequenceFamilyDefinition(
  input: L9SequenceFamilyDefinitionValidationInput,
): L9SequenceFamilyDefinitionValidationResult {
  const def = input.definition;
  const violations: L9FamilyViolation[] = [];

  if (!ALL_L9_PRODUCTION_FAMILY_IDS.includes(def.family_id)) {
    violations.push(
      v(L9FamilyViolationCode.FAM_UNREGISTERED,
        `family_id ${def.family_id} not in production registry`,
        [def.family_id]));
  }

  if (!def.primary_taxonomy_family) {
    violations.push(
      v(L9FamilyViolationCode.FAM_PRIMARY_TAXONOMY_MISSING,
        `family ${def.family_id} missing primary_taxonomy_family`));
  } else if (
    !ALL_L9_SEQUENCE_FAMILIES.includes(def.primary_taxonomy_family)
  ) {
    violations.push(
      v(L9FamilyViolationCode.FAM_PRIMARY_TAXONOMY_INVALID,
        `primary_taxonomy_family ${def.primary_taxonomy_family} not a ` +
          `registered L9.2 family`));
  }

  for (const sec of def.secondary_taxonomy_families) {
    if (!ALL_L9_SEQUENCE_FAMILIES.includes(sec)) {
      violations.push(
        v(L9FamilyViolationCode.FAM_SECONDARY_TAXONOMY_INVALID,
          `secondary_taxonomy_family ${sec} not a registered L9.2 family`,
          [sec]));
    }
  }

  if (def.legal_scope_types.length === 0) {
    violations.push(
      v(L9FamilyViolationCode.FAM_LEGAL_SCOPES_EMPTY,
        `family ${def.family_id} declares no legal scope types`));
  }
  for (const scope of def.legal_scope_types) {
    if (!ALL_L9_SEQUENCE_SCOPE_TYPES.includes(scope)) {
      violations.push(
        v(L9FamilyViolationCode.FAM_LEGAL_SCOPE_UNREGISTERED,
          `scope ${scope} not a registered L9 scope type`,
          [scope]));
    }
  }

  if (def.state_ownership.length === 0) {
    violations.push(
      v(L9FamilyViolationCode.FAM_STATE_OWNERSHIP_EMPTY,
        `family ${def.family_id} declares no state ownership`));
  }
  for (const ownership of def.state_ownership) {
    if (!ALL_L9_SEQUENCE_STATES.includes(ownership.state as L9SequenceState)) {
      violations.push(
        v(L9FamilyViolationCode.FAM_STATE_UNREGISTERED,
          `state ${ownership.state} not a registered L9 sequence state`,
          [String(ownership.state)]));
    }
  }

  if (def.template_ids.length === 0 && def.state_ownership.some(
    o => o.posture === L9StateOwnershipPosture.EXCLUSIVE,
  )) {
    violations.push(
      v(L9FamilyViolationCode.FAM_TEMPLATE_UNREGISTERED,
        `family ${def.family_id} owns states exclusively but declares ` +
          `no templates`));
  }

  if (input.external_template_owners) {
    for (const tid of def.template_ids) {
      const owner = input.external_template_owners.get(tid);
      if (owner !== undefined && owner !== def.family_id) {
        violations.push(
          v(L9FamilyViolationCode.FAM_TEMPLATE_DUPLICATE_ACROSS_FAMILIES,
            `template ${tid} already owned by ${owner}; cannot be added ` +
              `to ${def.family_id} (INV-9.6-A)`,
            [String(tid)]));
      }
    }
  }

  const requiresPostEventAnchor = anyOwnedStateRequiresPostEventAnchor(
    def.state_ownership,
  );
  if (requiresPostEventAnchor && def.legal_post_event_anchor_classes.length === 0) {
    violations.push(
      v(L9FamilyViolationCode.FAM_POST_EVENT_ANCHORS_REQUIRED_MISSING,
        `family ${def.family_id} owns states requiring post-event anchors ` +
          `but declares no legal_post_event_anchor_classes`));
  }
  for (const cls of def.legal_post_event_anchor_classes) {
    if (!ALL_L9_POST_EVENT_ANCHOR_CLASSES.includes(cls)) {
      violations.push(
        v(L9FamilyViolationCode.FAM_POST_EVENT_ANCHORS_ILLEGAL_FOR_FAMILY,
          `anchor class ${cls} not a registered L9 post-event anchor class`,
          [String(cls)]));
    }
  }

  if (!def.regime_requirement) {
    violations.push(
      v(L9FamilyViolationCode.FAM_REGIME_REQUIREMENT_MISSING,
        `family ${def.family_id} must declare a regime_requirement`));
  }

  const expectedPhase =
    L9_PRODUCTION_FAMILY_ROLLOUT_PHASE[def.family_id];
  if (expectedPhase && def.rollout_phase !== expectedPhase) {
    violations.push(
      v(L9FamilyViolationCode.FAM_ROLLOUT_PHASE_MISMATCH,
        `family ${def.family_id} rollout_phase ${def.rollout_phase} does ` +
          `not match canonical ${expectedPhase}`));
  }

  if (
    !Number.isFinite(def.default_confidence_cap) ||
    def.default_confidence_cap < 0 ||
    def.default_confidence_cap > 1
  ) {
    violations.push(
      v(L9FamilyViolationCode.FAM_CONFIDENCE_CAP_OUT_OF_RANGE,
        `family ${def.family_id} default_confidence_cap must be in [0,1]`,
        [String(def.default_confidence_cap)]));
  }

  for (const other of def.coexists_with) {
    if (other === def.family_id) {
      violations.push(
        v(L9FamilyViolationCode.FAM_COEXISTENCE_WITH_SELF,
          `family ${def.family_id} may not declare coexistence with itself`));
    }
    if (!ALL_L9_PRODUCTION_FAMILY_IDS.includes(other)) {
      violations.push(
        v(L9FamilyViolationCode.FAM_COEXISTENCE_WITH_UNKNOWN_FAMILY,
          `family ${def.family_id} coexists_with unknown family ${other}`,
          [String(other)]));
    }
  }

  const surfaceText = [
    def.description,
    ...def.family_invariants,
  ].join(' ');
  if (L9F_FORBIDDEN_JUDGMENT_SURFACE.test(surfaceText)) {
    violations.push(
      v(L9FamilyViolationCode.FAM_LEAKAGE_JUDGMENT,
        `family ${def.family_id} leaks judgment/recommendation surface ` +
          `in description or invariants (INV-9.6-G)`));
  }

  return { ok: violations.length === 0, violations };
}

/**
 * §9.6.8.4 — For a given ownership set, does any exclusive/shared
 * state require a post-event anchor? (A definition owning
 * `POST_SHOCK_DIGESTION` / `REACCUMULATION_ATTEMPT` / `RECOVERY_UNDER_DAMAGE`
 * must therefore declare legal anchors.)
 */
function anyOwnedStateRequiresPostEventAnchor(
  ownerships: readonly L9FamilyStateOwnership[],
): boolean {
  const needs: readonly L9SequenceState[] = [
    L9SequenceState.POST_SHOCK_DIGESTION,
    L9SequenceState.REACCUMULATION_ATTEMPT,
    L9SequenceState.RECOVERY_UNDER_DAMAGE,
  ];
  return ownerships.some(
    o =>
      needs.includes(o.state) &&
      o.posture !== L9StateOwnershipPosture.NEGATIVE_LATE_POSTURE,
  );
}

/**
 * §9.6.3 — Throwing variant for call sites that should reject at
 * registration time.
 */
export function assertL9SequenceFamilyDefinitionLegal(
  input: L9SequenceFamilyDefinitionValidationInput,
): void {
  const r = validateL9SequenceFamilyDefinition(input);
  if (!r.ok) throw new L9FamilyValidationError(r.violations);
}

/**
 * §9.6.3 — Hide unused L9SequenceFamily from tree-shaking warnings.
 * (L9SequenceFamily is referenced transitively via secondary
 * taxonomy families.)
 */
export type _L9SequenceFamilyBinding = L9SequenceFamily;
