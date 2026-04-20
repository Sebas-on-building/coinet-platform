/**
 * L10.1 — Forbidden Action Registry (Runtime)
 *
 * §10.1.5 / §10.1.6.4 — Runtime enforcement of forbidden actions and
 * forbidden semantic patterns (names, descriptions, output classes,
 * engine claims).
 */

import {
  L10ForbiddenAction,
  ALL_L10_FORBIDDEN_ACTIONS,
} from '../contracts/l10-constitutional-types';
import {
  L10_FORBIDDEN_ACTION_DEFINITIONS,
  getAllL10CriticalForbiddenActions,
} from '../contracts/l10-forbidden-actions';
import {
  containsL10ForbiddenNaming,
  checkL10ForbiddenSemantics,
} from '../contracts/l10-boundary';
import { isL10ForbiddenOutputClass } from '../contracts/l10-mission';
import {
  L10ConstitutionalError,
  L10ConstitutionalViolationCode,
} from '../contracts/l10-violation-codes';

export interface L10ForbiddenActionCheckRequest {
  readonly proposedName?: string;
  readonly proposedDescription?: string;
  readonly proposedOutputClass?: string;
  readonly proposedAction?: L10ForbiddenAction;
  readonly context: string;
}

export interface L10ForbiddenActionViolation {
  readonly action: L10ForbiddenAction | null;
  readonly violationCode: L10ConstitutionalViolationCode;
  readonly detail: string;
}

export interface L10ForbiddenActionCheckResult {
  readonly violations: readonly L10ForbiddenActionViolation[];
  readonly clean: boolean;
}

function classifyForbiddenName(name: string): {
  action: L10ForbiddenAction;
  code: L10ConstitutionalViolationCode;
} {
  const upper = name.toUpperCase();
  if (upper.includes('SCENARIO')) {
    return {
      action: L10ForbiddenAction.FINAL_SCENARIO_LEAK,
      code: L10ConstitutionalViolationCode.FORBIDDEN_SCENARIO_SEMANTICS,
    };
  }
  if (
    upper.includes('CAUSAL_CERTAINTY') ||
    upper.includes('PROVEN_CAUSE') ||
    upper.includes('PROVEN_CAUSALITY')
  ) {
    return {
      action: L10ForbiddenAction.CAUSAL_LAUNDERING,
      code: L10ConstitutionalViolationCode.CAUSAL_LAUNDERING,
    };
  }
  if (upper.includes('FINAL_SCORE') || upper.includes('SCORE_OVERRIDE')) {
    return {
      action: L10ForbiddenAction.FINAL_SCORE_LEAK,
      code: L10ConstitutionalViolationCode.FORBIDDEN_SCORE_SEMANTICS,
    };
  }
  if (
    upper.includes('CONVICTION') ||
    upper.includes('HIGHEST_CONVICTION') ||
    upper.includes('BEST_TRADE') ||
    upper.includes('BEST_OPPORTUNITY') ||
    upper.includes('IDEAL_EXPLANATION') ||
    upper.includes('IDEAL_HYPOTHESIS') ||
    upper.includes('ALPHA_EXPLANATION') ||
    upper.includes('ACTIONABLE_EXPLANATION') ||
    upper.includes('ACTIONABLE_HYPOTHESIS') ||
    upper.includes('ACTIONABLE_SETUP') ||
    upper.includes('CLEAR_BUY_EXPLANATION') ||
    upper.includes('CLEAR_SELL_EXPLANATION')
  ) {
    return {
      action: L10ForbiddenAction.CONVICTION_LANGUAGE_LEAK,
      code: L10ConstitutionalViolationCode.FORBIDDEN_CONVICTION_SEMANTICS,
    };
  }
  if (
    upper.includes('BUY_SIGNAL') ||
    upper.includes('SELL_SIGNAL') ||
    upper.includes('AVOID_SIGNAL') ||
    upper.includes('TRADE_SIGNAL') ||
    upper.includes('ACTION_SIGNAL') ||
    upper.includes('BUY_READY') ||
    upper.includes('ENTRY_READY') ||
    upper.includes('TRADE_READY') ||
    upper.includes('RECOMMENDATION') ||
    upper.includes('BULLISH_CONFIRMED') ||
    upper.includes('BEARISH_CONFIRMED') ||
    upper.includes('THESIS_CONFIRMATION') ||
    upper.includes('PORTFOLIO_PRIORITY') ||
    upper.includes('OPPORTUNITY_RANK')
  ) {
    return {
      action: L10ForbiddenAction.RECOMMENDATION_LANGUAGE_LEAK,
      code: L10ConstitutionalViolationCode.FORBIDDEN_RECOMMENDATION_SEMANTICS,
    };
  }
  if (
    upper.includes('SINGLE_STORY') ||
    upper.includes('ONLY_EXPLANATION') ||
    upper.includes('THE_EXPLANATION')
  ) {
    return {
      action: L10ForbiddenAction.SINGLE_STORY_COLLAPSE,
      code: L10ConstitutionalViolationCode.SINGLE_STORY_COLLAPSE,
    };
  }
  if (
    upper.includes('WINNING_EXPLANATION') ||
    upper.includes('WINNING_HYPOTHESIS') ||
    upper.includes('WINNING_THESIS') ||
    upper.includes('BEST_EXPLANATION') ||
    upper.includes('BEST_HYPOTHESIS') ||
    upper.includes('FINAL_JUDGMENT') ||
    upper.includes('JUDGMENT_OVERRIDE') ||
    upper.includes('FINAL_EXPLANATION') ||
    upper.includes('FINAL_NARRATIVE') ||
    upper.includes('FINAL_RANK')
  ) {
    return {
      action: L10ForbiddenAction.FINAL_JUDGMENT_LEAK,
      code: L10ConstitutionalViolationCode.FORBIDDEN_JUDGMENT_SEMANTICS,
    };
  }
  if (
    upper.includes('VALIDATION_OVERRIDE') ||
    upper.includes('RE_VALIDATE') ||
    upper.includes('REVALIDATE')
  ) {
    return {
      action: L10ForbiddenAction.L7_LIVE_REVALIDATION,
      code: L10ConstitutionalViolationCode.L7_LIVE_REVALIDATION,
    };
  }
  if (upper.includes('REGIME_OVERRIDE') || upper.includes('REINTERPRET_REGIME')) {
    return {
      action: L10ForbiddenAction.REGIME_RECLASSIFICATION,
      code: L10ConstitutionalViolationCode.REGIME_RECLASSIFICATION,
    };
  }
  if (upper.includes('SEQUENCE_OVERRIDE') || upper.includes('REINTERPRET_SEQUENCE')) {
    return {
      action: L10ForbiddenAction.SEQUENCE_REINTERPRETATION,
      code: L10ConstitutionalViolationCode.SEQUENCE_REINTERPRETATION,
    };
  }
  return {
    action: L10ForbiddenAction.RECOMMENDATION_LANGUAGE_LEAK,
    code: L10ConstitutionalViolationCode.FORBIDDEN_RECOMMENDATION_SEMANTICS,
  };
}

export function checkForL10ForbiddenActions(
  req: L10ForbiddenActionCheckRequest,
): L10ForbiddenActionCheckResult {
  const violations: L10ForbiddenActionViolation[] = [];

  if (req.proposedName) {
    const semanticCheck = checkL10ForbiddenSemantics(req.proposedName);
    if (semanticCheck.forbidden) {
      const { action, code } = classifyForbiddenName(req.proposedName);
      violations.push({
        action,
        violationCode: code,
        detail: `Name "${req.proposedName}" matches forbidden pattern: ${semanticCheck.matchedPattern}`,
      });
    }
  }

  if (req.proposedDescription && containsL10ForbiddenNaming(req.proposedDescription)) {
    violations.push({
      action: L10ForbiddenAction.RECOMMENDATION_LANGUAGE_LEAK,
      violationCode: L10ConstitutionalViolationCode.FORBIDDEN_RECOMMENDATION_SEMANTICS,
      detail: 'Description contains forbidden judgment/recommendation/conviction semantics',
    });
  }

  if (req.proposedOutputClass && isL10ForbiddenOutputClass(req.proposedOutputClass)) {
    const { action, code } = classifyForbiddenName(req.proposedOutputClass);
    violations.push({
      action,
      violationCode: code,
      detail: `Output class "${req.proposedOutputClass}" is forbidden at Layer 10`,
    });
  }

  if (req.proposedAction && ALL_L10_FORBIDDEN_ACTIONS.includes(req.proposedAction)) {
    const def = L10_FORBIDDEN_ACTION_DEFINITIONS.find(d => d.action === req.proposedAction);
    violations.push({
      action: req.proposedAction,
      violationCode: L10ConstitutionalViolationCode.ILLEGAL_CAPABILITY_CLAIM,
      detail: `Forbidden action: ${def?.description ?? req.proposedAction}`,
    });
  }

  return { violations, clean: violations.length === 0 };
}

export function assertNoL10ForbiddenActions(req: L10ForbiddenActionCheckRequest): void {
  const result = checkForL10ForbiddenActions(req);
  if (!result.clean) {
    const first = result.violations[0];
    throw new L10ConstitutionalError(first.violationCode, first.detail, {
      context: req.context,
      violations: result.violations.length,
    });
  }
}

export function checkL10ComponentNameLegality(name: string): {
  legal: boolean;
  violations: readonly string[];
} {
  const issues: string[] = [];

  if (!name || name.length === 0) issues.push('Name is empty');
  if (!/^[a-z][a-z0-9_]*$/.test(name)) issues.push('Name must be lowercase snake_case');
  if (containsL10ForbiddenNaming(name)) {
    issues.push(
      'Name contains forbidden judgment/scenario/recommendation/conviction/causal-certainty/single-story semantics',
    );
  }

  return { legal: issues.length === 0, violations: issues };
}

export function getL10RegisteredForbiddenActionCount(): number {
  return L10_FORBIDDEN_ACTION_DEFINITIONS.length;
}

export function getL10CriticalForbiddenActionCount(): number {
  return getAllL10CriticalForbiddenActions().length;
}
