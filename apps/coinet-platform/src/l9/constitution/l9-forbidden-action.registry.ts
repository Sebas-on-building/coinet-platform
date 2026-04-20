/**
 * L9.1 — Forbidden Action Registry (Runtime)
 *
 * §9.1.6 — Runtime enforcement of forbidden actions.
 * §9.1.3.4 / §9.1.6.4 — Forbidden semantic pattern registry (names,
 * descriptions, output classes, engine claims, materialization
 * intents).
 */

import {
  L9ForbiddenAction,
  ALL_L9_FORBIDDEN_ACTIONS,
} from '../contracts/l9-constitutional-types';
import {
  L9_FORBIDDEN_ACTION_DEFINITIONS,
  getAllL9CriticalForbiddenActions,
} from '../contracts/l9-forbidden-actions';
import {
  containsL9ForbiddenNaming,
  checkL9ForbiddenSemantics,
} from '../contracts/l9-boundary';
import { isL9ForbiddenOutputClass } from '../contracts/l9-mission';
import {
  L9ConstitutionalError,
  L9ConstitutionalViolationCode,
} from '../contracts/l9-violation-codes';

export interface L9ForbiddenActionCheckRequest {
  readonly proposedName?: string;
  readonly proposedDescription?: string;
  readonly proposedOutputClass?: string;
  readonly proposedAction?: L9ForbiddenAction;
  readonly context: string;
}

export interface L9ForbiddenActionViolation {
  readonly action: L9ForbiddenAction | null;
  readonly violationCode: L9ConstitutionalViolationCode;
  readonly detail: string;
}

export interface L9ForbiddenActionCheckResult {
  readonly violations: readonly L9ForbiddenActionViolation[];
  readonly clean: boolean;
}

export function checkForL9ForbiddenActions(
  req: L9ForbiddenActionCheckRequest,
): L9ForbiddenActionCheckResult {
  const violations: L9ForbiddenActionViolation[] = [];

  if (req.proposedName) {
    const semanticCheck = checkL9ForbiddenSemantics(req.proposedName);
    if (semanticCheck.forbidden) {
      const upper = req.proposedName.toUpperCase();
      let action = L9ForbiddenAction.RECOMMENDATION_LANGUAGE_LEAK;
      let code = L9ConstitutionalViolationCode.FORBIDDEN_RECOMMENDATION_SEMANTICS;
      if (upper.includes('SCENARIO')) {
        action = L9ForbiddenAction.FINAL_SCENARIO_LEAK;
        code = L9ConstitutionalViolationCode.FORBIDDEN_SCENARIO_SEMANTICS;
      } else if (upper.includes('HYPOTHESIS')) {
        action = L9ForbiddenAction.HYPOTHESIS_LEAK;
        code = L9ConstitutionalViolationCode.FORBIDDEN_HYPOTHESIS_SEMANTICS;
      } else if (
        upper.includes('JUDGMENT') ||
        upper.includes('THESIS') ||
        upper.includes('CONVICTION') ||
        upper.includes('BEST_SEQUENCE') ||
        upper.includes('WINNING_SEQUENCE') ||
        upper.includes('IDEAL_TIMING') ||
        upper.includes('ALPHA_PHASE') ||
        upper.includes('ACTIONABLE_SETUP') ||
        upper.includes('ACTIONABLE_SEQUENCE')
      ) {
        action = L9ForbiddenAction.FINAL_JUDGMENT_LEAK;
        code = L9ConstitutionalViolationCode.FORBIDDEN_JUDGMENT_SEMANTICS;
      } else if (
        upper.includes('FINAL_SCORE') ||
        upper.includes('SCORE_OVERRIDE')
      ) {
        action = L9ForbiddenAction.FINAL_SCORE_LEAK;
        code = L9ConstitutionalViolationCode.FORBIDDEN_SCORE_SEMANTICS;
      } else if (
        upper.includes('BUY_READY') ||
        upper.includes('ENTRY_READY') ||
        upper.includes('TRADE_READY') ||
        upper.includes('RISK_ON_BUY') ||
        upper.includes('RISK_OFF_AVOID') ||
        upper.includes('BULLISH_CONFIRMED') ||
        upper.includes('BEARISH_CONFIRMED')
      ) {
        action = L9ForbiddenAction.ACTION_BIAS_IN_SEQUENCE_NAME;
        code = L9ConstitutionalViolationCode.FORBIDDEN_ACTION_BIAS;
      } else if (
        upper.includes('CAUSAL_CERTAINTY') ||
        upper.includes('PROVEN_CAUSALITY')
      ) {
        action = L9ForbiddenAction.CAUSAL_LAUNDERING;
        code = L9ConstitutionalViolationCode.CAUSAL_LAUNDERING;
      } else if (
        upper.includes('OVERRIDE') ||
        upper.includes('RE_VALIDATE') ||
        upper.includes('REVALIDATE') ||
        upper.includes('REINTERPRET_REGIME') ||
        upper.includes('REGIME_OVERRIDE')
      ) {
        action = L9ForbiddenAction.VALIDATION_TRUTH_REDEFINITION;
        code = L9ConstitutionalViolationCode.VALIDATION_TRUTH_REDEFINITION;
      }
      violations.push({
        action,
        violationCode: code,
        detail: `Name "${req.proposedName}" matches forbidden pattern: ${semanticCheck.matchedPattern}`,
      });
    }
  }

  if (req.proposedDescription && containsL9ForbiddenNaming(req.proposedDescription)) {
    violations.push({
      action: L9ForbiddenAction.RECOMMENDATION_LANGUAGE_LEAK,
      violationCode: L9ConstitutionalViolationCode.FORBIDDEN_RECOMMENDATION_SEMANTICS,
      detail: 'Description contains forbidden judgment/recommendation semantics',
    });
  }

  if (req.proposedOutputClass && isL9ForbiddenOutputClass(req.proposedOutputClass)) {
    const upper = req.proposedOutputClass.toUpperCase();
    const scenario = upper.includes('SCENARIO');
    const hypothesis = upper.includes('HYPOTHESIS');
    const judgment =
      upper.includes('JUDGMENT') ||
      upper.includes('THESIS') ||
      upper.includes('CONVICTION') ||
      upper.includes('BEST') ||
      upper.includes('WINNING') ||
      upper.includes('IDEAL') ||
      upper.includes('ALPHA') ||
      upper.includes('ACTIONABLE');
    const causal = upper.includes('CAUSAL_CERTAINTY');
    const score = upper.includes('SCORE');
    violations.push({
      action: scenario
        ? L9ForbiddenAction.FINAL_SCENARIO_LEAK
        : hypothesis
          ? L9ForbiddenAction.HYPOTHESIS_LEAK
          : causal
            ? L9ForbiddenAction.CAUSAL_LAUNDERING
            : score
              ? L9ForbiddenAction.FINAL_SCORE_LEAK
              : judgment
                ? L9ForbiddenAction.FINAL_JUDGMENT_LEAK
                : L9ForbiddenAction.RECOMMENDATION_LANGUAGE_LEAK,
      violationCode: scenario
        ? L9ConstitutionalViolationCode.FORBIDDEN_SCENARIO_SEMANTICS
        : hypothesis
          ? L9ConstitutionalViolationCode.FORBIDDEN_HYPOTHESIS_SEMANTICS
          : causal
            ? L9ConstitutionalViolationCode.CAUSAL_LAUNDERING
            : score
              ? L9ConstitutionalViolationCode.FORBIDDEN_SCORE_SEMANTICS
              : judgment
                ? L9ConstitutionalViolationCode.FORBIDDEN_JUDGMENT_SEMANTICS
                : L9ConstitutionalViolationCode.ILLEGAL_OUTPUT_CLASS,
      detail: `Output class "${req.proposedOutputClass}" is forbidden at Layer 9`,
    });
  }

  if (req.proposedAction && ALL_L9_FORBIDDEN_ACTIONS.includes(req.proposedAction)) {
    const def = L9_FORBIDDEN_ACTION_DEFINITIONS.find(d => d.action === req.proposedAction);
    violations.push({
      action: req.proposedAction,
      violationCode: L9ConstitutionalViolationCode.ILLEGAL_CAPABILITY_CLAIM,
      detail: `Forbidden action: ${def?.description ?? req.proposedAction}`,
    });
  }

  return { violations, clean: violations.length === 0 };
}

export function assertNoL9ForbiddenActions(req: L9ForbiddenActionCheckRequest): void {
  const result = checkForL9ForbiddenActions(req);
  if (!result.clean) {
    const first = result.violations[0];
    throw new L9ConstitutionalError(first.violationCode, first.detail, {
      context: req.context,
      violations: result.violations.length,
    });
  }
}

export function checkL9ComponentNameLegality(name: string): {
  legal: boolean;
  violations: readonly string[];
} {
  const issues: string[] = [];

  if (!name || name.length === 0) issues.push('Name is empty');
  if (!/^[a-z][a-z0-9_]*$/.test(name)) issues.push('Name must be lowercase snake_case');
  if (containsL9ForbiddenNaming(name)) {
    issues.push('Name contains forbidden judgment/scenario/recommendation/action-biased semantics');
  }

  return { legal: issues.length === 0, violations: issues };
}

export function getL9RegisteredForbiddenActionCount(): number {
  return L9_FORBIDDEN_ACTION_DEFINITIONS.length;
}

export function getL9CriticalForbiddenActionCount(): number {
  return getAllL9CriticalForbiddenActions().length;
}
