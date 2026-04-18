/**
 * L8.1 — Forbidden Action Registry (Runtime)
 *
 * §8.1.5.6 — Runtime enforcement of forbidden actions.
 * §8.1.2.4 — Forbidden semantic pattern registry (names, descriptions,
 * output classes, engine claims, materialization intents).
 */

import {
  L8ForbiddenAction,
  ALL_L8_FORBIDDEN_ACTIONS,
} from '../contracts/l8-constitutional-types';
import {
  L8_FORBIDDEN_ACTION_DEFINITIONS,
  getAllL8CriticalForbiddenActions,
} from '../contracts/l8-forbidden-actions';
import {
  containsL8ForbiddenNaming,
  checkL8ForbiddenSemantics,
} from '../contracts/l8-boundary';
import { isL8ForbiddenOutputClass } from '../contracts/l8-mission';
import {
  L8ConstitutionalError,
  L8ConstitutionalViolationCode,
} from '../contracts/l8-violation-codes';

export interface L8ForbiddenActionCheckRequest {
  readonly proposedName?: string;
  readonly proposedDescription?: string;
  readonly proposedOutputClass?: string;
  readonly proposedAction?: L8ForbiddenAction;
  readonly context: string;
}

export interface L8ForbiddenActionViolation {
  readonly action: L8ForbiddenAction | null;
  readonly violationCode: L8ConstitutionalViolationCode;
  readonly detail: string;
}

export interface L8ForbiddenActionCheckResult {
  readonly violations: readonly L8ForbiddenActionViolation[];
  readonly clean: boolean;
}

export function checkForL8ForbiddenActions(
  req: L8ForbiddenActionCheckRequest,
): L8ForbiddenActionCheckResult {
  const violations: L8ForbiddenActionViolation[] = [];

  if (req.proposedName) {
    const semanticCheck = checkL8ForbiddenSemantics(req.proposedName);
    if (semanticCheck.forbidden) {
      const upper = req.proposedName.toUpperCase();
      let action = L8ForbiddenAction.RECOMMENDATION_LANGUAGE_LEAK;
      let code = L8ConstitutionalViolationCode.FORBIDDEN_RECOMMENDATION_SEMANTICS;
      if (upper.includes('SCENARIO')) {
        action = L8ForbiddenAction.FINAL_SCENARIO_LEAK;
        code = L8ConstitutionalViolationCode.FORBIDDEN_SCENARIO_SEMANTICS;
      } else if (
        upper.includes('JUDGMENT') ||
        upper.includes('THESIS') ||
        upper.includes('CONVICTION') ||
        upper.includes('ATTRACTIVE') ||
        upper.includes('AVOID_REGIME') ||
        upper.includes('BEST_REGIME') ||
        upper.includes('REGIME_WINNER')
      ) {
        action = L8ForbiddenAction.FINAL_JUDGMENT_LEAK;
        code = L8ConstitutionalViolationCode.FORBIDDEN_JUDGMENT_SEMANTICS;
      } else if (
        upper.includes('BUY_READY') ||
        upper.includes('RISK_ON_BUY') ||
        upper.includes('RISK_OFF_AVOID') ||
        upper.includes('BULLISH_CONFIRMED') ||
        upper.includes('BEARISH_CONFIRMED')
      ) {
        action = L8ForbiddenAction.ACTION_BIAS_IN_REGIME_NAME;
        code = L8ConstitutionalViolationCode.FORBIDDEN_ACTION_BIAS;
      } else if (upper.includes('OVERRIDE') || upper.includes('RE_VALIDATE') || upper.includes('REVALIDATE')) {
        action = L8ForbiddenAction.VALIDATION_TRUTH_REDEFINITION;
        code = L8ConstitutionalViolationCode.VALIDATION_TRUTH_REDEFINITION;
      }
      violations.push({
        action,
        violationCode: code,
        detail: `Name "${req.proposedName}" matches forbidden pattern: ${semanticCheck.matchedPattern}`,
      });
    }
  }

  if (req.proposedDescription && containsL8ForbiddenNaming(req.proposedDescription)) {
    violations.push({
      action: L8ForbiddenAction.RECOMMENDATION_LANGUAGE_LEAK,
      violationCode: L8ConstitutionalViolationCode.FORBIDDEN_RECOMMENDATION_SEMANTICS,
      detail: 'Description contains forbidden judgment/recommendation semantics',
    });
  }

  if (req.proposedOutputClass && isL8ForbiddenOutputClass(req.proposedOutputClass)) {
    const upper = req.proposedOutputClass.toUpperCase();
    const scenario = upper.includes('SCENARIO');
    const judgment =
      upper.includes('JUDGMENT') ||
      upper.includes('THESIS') ||
      upper.includes('CONVICTION');
    violations.push({
      action: scenario
        ? L8ForbiddenAction.FINAL_SCENARIO_LEAK
        : judgment
          ? L8ForbiddenAction.FINAL_JUDGMENT_LEAK
          : L8ForbiddenAction.RECOMMENDATION_LANGUAGE_LEAK,
      violationCode: scenario
        ? L8ConstitutionalViolationCode.FORBIDDEN_SCENARIO_SEMANTICS
        : judgment
          ? L8ConstitutionalViolationCode.FORBIDDEN_JUDGMENT_SEMANTICS
          : L8ConstitutionalViolationCode.ILLEGAL_OUTPUT_CLASS,
      detail: `Output class "${req.proposedOutputClass}" is forbidden at Layer 8`,
    });
  }

  if (req.proposedAction && ALL_L8_FORBIDDEN_ACTIONS.includes(req.proposedAction)) {
    const def = L8_FORBIDDEN_ACTION_DEFINITIONS.find(d => d.action === req.proposedAction);
    violations.push({
      action: req.proposedAction,
      violationCode: L8ConstitutionalViolationCode.ILLEGAL_CAPABILITY_CLAIM,
      detail: `Forbidden action: ${def?.description ?? req.proposedAction}`,
    });
  }

  return { violations, clean: violations.length === 0 };
}

export function assertNoL8ForbiddenActions(req: L8ForbiddenActionCheckRequest): void {
  const result = checkForL8ForbiddenActions(req);
  if (!result.clean) {
    const first = result.violations[0];
    throw new L8ConstitutionalError(first.violationCode, first.detail, {
      context: req.context,
      violations: result.violations.length,
    });
  }
}

export function checkL8ComponentNameLegality(name: string): {
  legal: boolean;
  violations: readonly string[];
} {
  const issues: string[] = [];

  if (!name || name.length === 0) issues.push('Name is empty');
  if (!/^[a-z][a-z0-9_]*$/.test(name)) issues.push('Name must be lowercase snake_case');
  if (containsL8ForbiddenNaming(name)) {
    issues.push('Name contains forbidden judgment/scenario/recommendation/action-biased semantics');
  }

  return { legal: issues.length === 0, violations: issues };
}

export function getL8RegisteredForbiddenActionCount(): number {
  return L8_FORBIDDEN_ACTION_DEFINITIONS.length;
}

export function getL8CriticalForbiddenActionCount(): number {
  return getAllL8CriticalForbiddenActions().length;
}
