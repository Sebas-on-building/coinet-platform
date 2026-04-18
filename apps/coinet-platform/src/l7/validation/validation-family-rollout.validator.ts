/**
 * L7.5 — Validation Family Rollout Validator
 *
 * §7.5.7 — Blocks out-of-order production enablement, family
 * enablement without template coverage, without contradiction
 * ontology coverage, without certification, without runtime
 * integration, or without validated restriction posture.
 */

import {
  L7ValidationFamilyDefinition,
  L7ValidationFamilyId,
} from '../contracts/validation-family-definition';
import {
  L7_ROLLOUT_PHASE_ORDER,
  L7ValidationRolloutPhase,
} from '../contracts/validation-family-rollout';
import {
  L7SemanticViolation,
  L7SemanticViolationCode,
} from './l7-semantic-violation-codes';

function v(
  code: L7SemanticViolationCode,
  detail: string,
  extra: Partial<L7SemanticViolation> = {},
): L7SemanticViolation {
  return { code, detail, ...extra };
}

export interface L7RolloutValidationInput {
  readonly families: readonly L7ValidationFamilyDefinition[];
}

export interface L7RolloutValidationResult {
  readonly enabled: readonly L7ValidationFamilyId[];
  readonly violations: readonly L7SemanticViolation[];
}

export class L7ValidationFamilyRolloutValidator {
  /**
   * §7.5.7 — Validate a set of families against rollout law. Returns
   * the subset that is legally enabled and the violation list.
   */
  validate(input: L7RolloutValidationInput): L7RolloutValidationResult {
    const violations: L7SemanticViolation[] = [];
    const byId = new Map<L7ValidationFamilyId, L7ValidationFamilyDefinition>(
      input.families.map(f => [f.family_id, f]),
    );

    // Sort by rollout priority to check dependency/phase order.
    const sorted = [...input.families].sort((a, b) => a.rollout_priority - b.rollout_priority);

    // Priorities must be unique.
    const priorities = new Set<number>();
    for (const f of sorted) {
      if (priorities.has(f.rollout_priority)) {
        violations.push(
          v(
            L7SemanticViolationCode.ROLLOUT_OUT_OF_ORDER,
            `family ${f.family_id} shares rollout_priority ${f.rollout_priority}`,
            { familyId: f.family_id },
          ),
        );
      }
      priorities.add(f.rollout_priority);
    }

    // Phase ordering must be monotonic non-decreasing with priority.
    let prevPhaseOrder = -Infinity;
    for (const f of sorted) {
      const order = L7_ROLLOUT_PHASE_ORDER[f.rollout_phase];
      if (order === undefined) {
        violations.push(
          v(
            L7SemanticViolationCode.ROLLOUT_PHASE_UNKNOWN,
            `family ${f.family_id} has unknown phase ${f.rollout_phase}`,
            { familyId: f.family_id },
          ),
        );
        continue;
      }
      if (order < prevPhaseOrder) {
        violations.push(
          v(
            L7SemanticViolationCode.ROLLOUT_OUT_OF_ORDER,
            `family ${f.family_id} (phase ${f.rollout_phase}) enabled after a later-phase family (previous phase order ${prevPhaseOrder})`,
            { familyId: f.family_id },
          ),
        );
      }
      prevPhaseOrder = Math.max(prevPhaseOrder, order);
    }

    // Dependency enablement: a family may only be enabled if all declared
    // dependencies are also enabled and have an earlier-or-equal phase.
    const enabled: L7ValidationFamilyId[] = [];
    for (const f of sorted) {
      if (!f.production_enabled) continue;

      if (!f.certification_band_green) {
        violations.push(
          v(
            L7SemanticViolationCode.ROLLOUT_CERTIFICATION_MISSING,
            `family ${f.family_id} is production_enabled but certification_band_green is false`,
            { familyId: f.family_id },
          ),
        );
      }
      if (!f.runtime_integration_green) {
        violations.push(
          v(
            L7SemanticViolationCode.ROLLOUT_RUNTIME_INTEGRATION_MISSING,
            `family ${f.family_id} is production_enabled but runtime_integration_green is false`,
            { familyId: f.family_id },
          ),
        );
      }
      if (!f.restriction_posture_validated) {
        violations.push(
          v(
            L7SemanticViolationCode.ROLLOUT_RESTRICTION_POSTURE_UNVALIDATED,
            `family ${f.family_id} is production_enabled but restriction_posture_validated is false`,
            { familyId: f.family_id },
          ),
        );
      }

      for (const depId of f.depends_on) {
        const dep = byId.get(depId);
        if (!dep) {
          violations.push(
            v(
              L7SemanticViolationCode.FAMILY_UNKNOWN,
              `family ${f.family_id} depends on unknown family ${depId}`,
              { familyId: f.family_id },
            ),
          );
          continue;
        }
        if (!dep.production_enabled) {
          violations.push(
            v(
              L7SemanticViolationCode.ROLLOUT_DEPENDENCY_NOT_ENABLED,
              `family ${f.family_id} depends on ${depId} which is not production_enabled`,
              { familyId: f.family_id },
            ),
          );
          continue;
        }
        if (dep.rollout_priority >= f.rollout_priority) {
          violations.push(
            v(
              L7SemanticViolationCode.ROLLOUT_OUT_OF_ORDER,
              `family ${f.family_id} depends on ${depId} which has priority ${dep.rollout_priority} >= ${f.rollout_priority}`,
              { familyId: f.family_id },
            ),
          );
        }
      }

      enabled.push(f.family_id);
    }

    return { enabled, violations };
  }

  /**
   * §7.5.7 — Check if a family is legally enabled, given the full set.
   */
  isLegallyEnabled(
    family: L7ValidationFamilyDefinition,
    all: readonly L7ValidationFamilyDefinition[],
  ): boolean {
    const { enabled } = this.validate({ families: all });
    return enabled.includes(family.family_id);
  }
}

const defaultValidationFamilyRolloutValidator = new L7ValidationFamilyRolloutValidator();

export function getDefaultValidationFamilyRolloutValidator(): L7ValidationFamilyRolloutValidator {
  return defaultValidationFamilyRolloutValidator;
}
