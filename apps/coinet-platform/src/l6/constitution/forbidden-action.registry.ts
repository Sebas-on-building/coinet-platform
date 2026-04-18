/**
 * L6.1 — Forbidden Action Registry (Runtime)
 *
 * §6.1.6.6 — Runtime enforcement of forbidden actions.
 * §6.1.3.5 — ForbiddenSemanticPatternRegistry.
 */

import { L6ForbiddenAction, ALL_FORBIDDEN_ACTIONS } from '../contracts/l6-constitutional-types';
import { FORBIDDEN_ACTION_DEFINITIONS, getAllCriticalForbiddenActions } from '../contracts/l6-forbidden-actions';
import { containsForbiddenNaming, checkForbiddenSemantics } from '../contracts/l6-boundary';
import { L6BoundaryViolationCode, L6ConstitutionalError } from '../contracts/l6-violation-codes';

export interface ForbiddenActionCheckRequest {
  readonly proposedName?: string;
  readonly proposedDependency?: string;
  readonly proposedAction?: L6ForbiddenAction;
  readonly context: string;
}

export interface ForbiddenActionCheckResult {
  readonly violations: readonly ForbiddenActionViolation[];
  readonly clean: boolean;
}

export interface ForbiddenActionViolation {
  readonly action: L6ForbiddenAction | null;
  readonly violationCode: L6BoundaryViolationCode;
  readonly detail: string;
}

export function checkForForbiddenActions(req: ForbiddenActionCheckRequest): ForbiddenActionCheckResult {
  const violations: ForbiddenActionViolation[] = [];

  if (req.proposedName) {
    const semanticCheck = checkForbiddenSemantics(req.proposedName);
    if (semanticCheck.forbidden) {
      violations.push({
        action: L6ForbiddenAction.JUDGMENT_LANGUAGE_LEAK,
        violationCode: L6BoundaryViolationCode.FORBIDDEN_JUDGMENT_SEMANTICS,
        detail: `Name "${req.proposedName}" matches forbidden pattern: ${semanticCheck.matchedPattern}`,
      });
    }
  }

  if (req.proposedAction && ALL_FORBIDDEN_ACTIONS.includes(req.proposedAction)) {
    const def = FORBIDDEN_ACTION_DEFINITIONS.find(d => d.action === req.proposedAction);
    violations.push({
      action: req.proposedAction,
      violationCode: L6BoundaryViolationCode.ILLEGAL_CAPABILITY_CLAIM,
      detail: `Forbidden action: ${def?.description ?? req.proposedAction}`,
    });
  }

  return { violations, clean: violations.length === 0 };
}

export function assertNoForbiddenActions(req: ForbiddenActionCheckRequest): void {
  const result = checkForForbiddenActions(req);
  if (!result.clean) {
    const first = result.violations[0];
    throw new L6ConstitutionalError(
      first.violationCode,
      first.detail,
      { context: req.context, violations: result.violations.length },
    );
  }
}

export function checkPrimitiveNameLegality(name: string): {
  legal: boolean;
  violations: readonly string[];
} {
  const issues: string[] = [];

  if (!name || name.length === 0) issues.push('Name is empty');
  if (!/^[a-z][a-z0-9_]*$/.test(name)) issues.push('Name must be lowercase snake_case');
  if (containsForbiddenNaming(name)) issues.push('Name contains forbidden judgment semantics');

  return { legal: issues.length === 0, violations: issues };
}

export function getRegisteredForbiddenActionCount(): number {
  return FORBIDDEN_ACTION_DEFINITIONS.length;
}

export function getCriticalForbiddenActionCount(): number {
  return getAllCriticalForbiddenActions().length;
}
