/**
 * L7.1 — Forbidden Action Registry (Runtime)
 *
 * §7.1.6.6 — Runtime enforcement of forbidden actions.
 * §7.1.3.5 — Forbidden semantic pattern registry (names, descriptions,
 * output classes, engine claims, materialization intents).
 */

import { L7ForbiddenAction, ALL_FORBIDDEN_ACTIONS } from '../contracts/l7-constitutional-types';
import {
  FORBIDDEN_ACTION_DEFINITIONS,
  getAllCriticalForbiddenActions,
} from '../contracts/l7-forbidden-actions';
import { containsForbiddenNaming, checkForbiddenSemantics } from '../contracts/l7-boundary';
import { isForbiddenOutputClass } from '../contracts/l7-mission';
import { L7BoundaryViolationCode, L7ConstitutionalError } from '../contracts/l7-violation-codes';

export interface ForbiddenActionCheckRequest {
  readonly proposedName?: string;
  readonly proposedDescription?: string;
  readonly proposedOutputClass?: string;
  readonly proposedAction?: L7ForbiddenAction;
  readonly context: string;
}

export interface ForbiddenActionViolation {
  readonly action: L7ForbiddenAction | null;
  readonly violationCode: L7BoundaryViolationCode;
  readonly detail: string;
}

export interface ForbiddenActionCheckResult {
  readonly violations: readonly ForbiddenActionViolation[];
  readonly clean: boolean;
}

export function checkForForbiddenActions(req: ForbiddenActionCheckRequest): ForbiddenActionCheckResult {
  const violations: ForbiddenActionViolation[] = [];

  if (req.proposedName) {
    const semanticCheck = checkForbiddenSemantics(req.proposedName);
    if (semanticCheck.forbidden) {
      violations.push({
        action: L7ForbiddenAction.RECOMMENDATION_LANGUAGE_LEAK,
        violationCode: L7BoundaryViolationCode.FORBIDDEN_JUDGMENT_SEMANTICS,
        detail: `Name "${req.proposedName}" matches forbidden pattern: ${semanticCheck.matchedPattern}`,
      });
    }
  }

  if (req.proposedDescription && containsForbiddenNaming(req.proposedDescription)) {
    violations.push({
      action: L7ForbiddenAction.RECOMMENDATION_LANGUAGE_LEAK,
      violationCode: L7BoundaryViolationCode.FORBIDDEN_RECOMMENDATION_SEMANTICS,
      detail: 'Description contains forbidden judgment/recommendation semantics',
    });
  }

  if (req.proposedOutputClass && isForbiddenOutputClass(req.proposedOutputClass)) {
    const upper = req.proposedOutputClass.toUpperCase();
    const scenario = upper.includes('SCENARIO') || upper.includes('REGIME');
    violations.push({
      action: scenario
        ? L7ForbiddenAction.FINAL_SCENARIO_LEAK
        : L7ForbiddenAction.FINAL_JUDGMENT_LEAK,
      violationCode: scenario
        ? L7BoundaryViolationCode.FORBIDDEN_SCENARIO_SEMANTICS
        : L7BoundaryViolationCode.ILLEGAL_OUTPUT_CLASS,
      detail: `Output class "${req.proposedOutputClass}" is forbidden at Layer 7`,
    });
  }

  if (req.proposedAction && ALL_FORBIDDEN_ACTIONS.includes(req.proposedAction)) {
    const def = FORBIDDEN_ACTION_DEFINITIONS.find(d => d.action === req.proposedAction);
    violations.push({
      action: req.proposedAction,
      violationCode: L7BoundaryViolationCode.ILLEGAL_CAPABILITY_CLAIM,
      detail: `Forbidden action: ${def?.description ?? req.proposedAction}`,
    });
  }

  return { violations, clean: violations.length === 0 };
}

export function assertNoForbiddenActions(req: ForbiddenActionCheckRequest): void {
  const result = checkForForbiddenActions(req);
  if (!result.clean) {
    const first = result.violations[0];
    throw new L7ConstitutionalError(first.violationCode, first.detail, {
      context: req.context,
      violations: result.violations.length,
    });
  }
}

export function checkValidationNameLegality(name: string): {
  legal: boolean;
  violations: readonly string[];
} {
  const issues: string[] = [];

  if (!name || name.length === 0) issues.push('Name is empty');
  if (!/^[a-z][a-z0-9_]*$/.test(name)) issues.push('Name must be lowercase snake_case');
  if (containsForbiddenNaming(name)) issues.push('Name contains forbidden judgment/recommendation semantics');

  return { legal: issues.length === 0, violations: issues };
}

export function getRegisteredForbiddenActionCount(): number {
  return FORBIDDEN_ACTION_DEFINITIONS.length;
}

export function getCriticalForbiddenActionCount(): number {
  return getAllCriticalForbiddenActions().length;
}
