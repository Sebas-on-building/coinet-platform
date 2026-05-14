/**
 * L11.3 — Formula Input Surface (§11.3.2 / §11.3.4 / §11.3.7)
 *
 * Every formula input must reference one of the L11.1 registered
 * dependency surface classes from L3–L10. An input may be required,
 * optional, or evidence-only — and may declare a posture/usability
 * requirement. Unknown surface classes are rejected at registration
 * time by `score-formula.validator.ts`.
 */

import {
  L11DependencySurfaceClass,
  L11DependencyUsability,
} from './l11-constitutional-types';

/**
 * §11.3.7 — Whether a missing input should block, cap, penalize,
 * lower confidence, or merely be omitted (for optional inputs).
 */
export interface L11FormulaInputSurface {
  readonly surface_class: L11DependencySurfaceClass;
  /** Optional posture-of-use restriction enforced by the dependency
   * registry from L11.1. */
  readonly required_posture?: L11DependencyUsability;
  /** True for evidence-only inputs (§11.3.7.3): may inform attribution
   * but may NOT be a decisive component. */
  readonly evidence_only?: boolean;
  /** Optional human-readable label for audit / attribution. */
  readonly label?: string;
}

export function isL11FormulaInputSurfaceEvidenceOnly(
  s: L11FormulaInputSurface,
): boolean {
  return s.evidence_only === true;
}
