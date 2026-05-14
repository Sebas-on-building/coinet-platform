/**
 * L11.1 — Forbidden Action Registry (Runtime)
 *
 * §11.1.5 / §11.1.8 / §11.1.10 — Runtime enforcement of forbidden
 * actions and forbidden semantic patterns (names, descriptions, output
 * classes, engine claims).
 */

import {
  L11ForbiddenAction,
  ALL_L11_FORBIDDEN_ACTIONS,
} from '../contracts/l11-constitutional-types';
import {
  L11_FORBIDDEN_ACTION_DEFINITIONS,
  getAllL11CriticalForbiddenActions,
} from '../contracts/l11-forbidden-actions';
import {
  containsL11ForbiddenNaming,
  checkL11ForbiddenSemantics,
} from '../contracts/l11-boundary';
import { isL11ForbiddenOutputClass } from '../contracts/l11-mission';
import {
  L11ConstitutionalError,
  L11ConstitutionalViolationCode,
} from '../contracts/l11-violation-codes';

export interface L11ForbiddenActionCheckRequest {
  readonly proposedName?: string;
  readonly proposedDescription?: string;
  readonly proposedOutputClass?: string;
  readonly proposedAction?: L11ForbiddenAction;
  readonly context: string;
}

export interface L11ForbiddenActionViolation {
  readonly action: L11ForbiddenAction | null;
  readonly violationCode: L11ConstitutionalViolationCode;
  readonly detail: string;
}

export interface L11ForbiddenActionCheckResult {
  readonly violations: readonly L11ForbiddenActionViolation[];
  readonly clean: boolean;
}

function classifyForbiddenName(name: string): {
  action: L11ForbiddenAction;
  code: L11ConstitutionalViolationCode;
} {
  const upper = name.toUpperCase();
  if (
    upper.includes('SCENARIO_WINNER') ||
    upper.includes('FINAL_SCENARIO') ||
    upper.includes('WINNING_SCENARIO')
  ) {
    return {
      action: L11ForbiddenAction.SCENARIO_WINNER_EMISSION,
      code: L11ConstitutionalViolationCode.FORBIDDEN_SCENARIO_SEMANTICS,
    };
  }
  if (
    upper.includes('TRADE_READY') ||
    upper.includes('ENTRY_READY') ||
    upper.includes('PORTFOLIO_ALLOCATION') ||
    upper.includes('PORTFOLIO_PRIORITY') ||
    upper.includes('GUARANTEED_SETUP') ||
    upper.includes('SAFEST_TRADE')
  ) {
    return {
      action: L11ForbiddenAction.TRADE_ACTION_EMISSION,
      code: L11ConstitutionalViolationCode.FORBIDDEN_TRADE_ACTION_SEMANTICS,
    };
  }
  if (
    upper.includes('BUY_SIGNAL') ||
    upper.includes('SELL_SIGNAL') ||
    upper.includes('AVOID_SIGNAL') ||
    upper.includes('TRADE_SIGNAL') ||
    upper.includes('ACTION_SIGNAL') ||
    upper.includes('RECOMMENDATION') ||
    upper.includes('CLEAR_BUY') ||
    upper.includes('CLEAR_SELL') ||
    upper.includes('ACTIONABLE_SCORE') ||
    upper.includes('ACTIONABLE_SETUP') ||
    upper.includes('CONVICTION_SIGNAL') ||
    upper.includes('CONVICTION_SCORE') ||
    upper.includes('HIGHEST_CONVICTION') ||
    upper.includes('ALPHA_SCORE') ||
    upper.includes('ALPHA_SIGNAL') ||
    upper.includes('IDEAL_SCORE') ||
    upper.includes('IDEAL_SETUP')
  ) {
    return {
      action: L11ForbiddenAction.RECOMMENDATION_EMISSION,
      code: L11ConstitutionalViolationCode.FORBIDDEN_RECOMMENDATION_SEMANTICS,
    };
  }
  if (
    upper.includes('FINAL_JUDGMENT') ||
    upper.includes('JUDGMENT_OVERRIDE') ||
    upper.includes('WINNING_SCORE') ||
    upper.includes('BEST_TRADE') ||
    upper.includes('BEST_OPPORTUNITY')
  ) {
    return {
      action: L11ForbiddenAction.FINAL_JUDGMENT_EMISSION,
      code: L11ConstitutionalViolationCode.FORBIDDEN_JUDGMENT_SEMANTICS,
    };
  }
  if (
    upper.includes('VIBE_SCORE') ||
    upper.includes('NO_MEANING_CLAIM') ||
    upper.includes('MISSING_MEANING_CLAIM')
  ) {
    return {
      action: L11ForbiddenAction.VIBE_SCORE_CREATION,
      code: L11ConstitutionalViolationCode.FORBIDDEN_VIBE_SCORE,
    };
  }
  if (upper.includes('UNATTRIBUTED_SCORE')) {
    return {
      action: L11ForbiddenAction.UNATTRIBUTED_SCORE_EMISSION,
      code: L11ConstitutionalViolationCode.ATTRIBUTION_ABSENT,
    };
  }
  if (upper.includes('UNVERSIONED_SCORE')) {
    return {
      action: L11ForbiddenAction.UNVERSIONED_SCORE_EMISSION,
      code: L11ConstitutionalViolationCode.VERSION_ABSENT,
    };
  }
  if (upper.includes('DIRECTION_UNDECLARED')) {
    return {
      action: L11ForbiddenAction.DIRECTION_UNDECLARED,
      code: L11ConstitutionalViolationCode.DIRECTION_UNDECLARED,
    };
  }
  if (upper.includes('DIRECTION_MIXED')) {
    return {
      action: L11ForbiddenAction.DIRECTION_MIXING,
      code: L11ConstitutionalViolationCode.DIRECTION_MIXED,
    };
  }
  if (upper.includes('LAUNDER_MISSING') || upper.includes('HIDE_MISSING_DATA')) {
    return {
      action: L11ForbiddenAction.MISSING_DATA_LAUNDERING,
      code: L11ConstitutionalViolationCode.MISSING_DATA_LAUNDERING,
    };
  }
  if (upper.includes('LAUNDER_CONTRADICTION') || upper.includes('HIDE_CONTRADICTION')) {
    return {
      action: L11ForbiddenAction.CONTRADICTION_LAUNDERING,
      code: L11ConstitutionalViolationCode.CONTRADICTION_LAUNDERING,
    };
  }
  if (
    upper.includes('REBUILD_HYPOTHESIS') ||
    upper.includes('REBUILD_HYPOTHESES')
  ) {
    return {
      action: L11ForbiddenAction.L10_HYPOTHESIS_REBUILD,
      code: L11ConstitutionalViolationCode.L10_HYPOTHESIS_REBUILD,
    };
  }
  if (
    upper.includes('OVERRIDE_REGIME') ||
    upper.includes('REINTERPRET_REGIME')
  ) {
    return {
      action: L11ForbiddenAction.REGIME_OVERRIDE,
      code: L11ConstitutionalViolationCode.REGIME_RECLASSIFICATION,
    };
  }
  if (
    upper.includes('OVERRIDE_SEQUENCE') ||
    upper.includes('REINTERPRET_SEQUENCE')
  ) {
    return {
      action: L11ForbiddenAction.SEQUENCE_OVERRIDE,
      code: L11ConstitutionalViolationCode.SEQUENCE_REINTERPRETATION,
    };
  }
  if (upper.includes('OVERRIDE_VALIDATION') || upper.includes('RE_VALIDATE')) {
    return {
      action: L11ForbiddenAction.L7_LIVE_REVALIDATION,
      code: L11ConstitutionalViolationCode.L7_LIVE_REVALIDATION,
    };
  }
  if (
    upper.includes('SCORE_AS_ACTION') ||
    upper.includes('SCORE_OVERRIDE') ||
    upper.includes('SCORE_SAYS_BUY') ||
    upper.includes('SCORE_SAYS_SELL')
  ) {
    return {
      action: L11ForbiddenAction.SCORE_AS_ACTION,
      code: L11ConstitutionalViolationCode.SCORE_AS_ACTION,
    };
  }
  return {
    action: L11ForbiddenAction.RECOMMENDATION_EMISSION,
    code: L11ConstitutionalViolationCode.FORBIDDEN_RECOMMENDATION_SEMANTICS,
  };
}

export function checkForL11ForbiddenActions(
  req: L11ForbiddenActionCheckRequest,
): L11ForbiddenActionCheckResult {
  const violations: L11ForbiddenActionViolation[] = [];

  if (req.proposedName) {
    const semanticCheck = checkL11ForbiddenSemantics(req.proposedName);
    if (semanticCheck.forbidden) {
      const { action, code } = classifyForbiddenName(req.proposedName);
      violations.push({
        action,
        violationCode: code,
        detail: `Name "${req.proposedName}" matches forbidden pattern: ${semanticCheck.matchedPattern}`,
      });
    }
  }

  if (req.proposedDescription && containsL11ForbiddenNaming(req.proposedDescription)) {
    violations.push({
      action: L11ForbiddenAction.RECOMMENDATION_EMISSION,
      violationCode: L11ConstitutionalViolationCode.FORBIDDEN_RECOMMENDATION_SEMANTICS,
      detail: 'Description contains forbidden judgment/recommendation/trade-action/vibe-score semantics',
    });
  }

  if (req.proposedOutputClass && isL11ForbiddenOutputClass(req.proposedOutputClass)) {
    const { action, code } = classifyForbiddenName(req.proposedOutputClass);
    violations.push({
      action,
      violationCode: code,
      detail: `Output class "${req.proposedOutputClass}" is forbidden at Layer 11`,
    });
  }

  if (req.proposedAction && ALL_L11_FORBIDDEN_ACTIONS.includes(req.proposedAction)) {
    const def = L11_FORBIDDEN_ACTION_DEFINITIONS.find(d => d.action === req.proposedAction);
    violations.push({
      action: req.proposedAction,
      violationCode: L11ConstitutionalViolationCode.ILLEGAL_CAPABILITY_CLAIM,
      detail: `Forbidden action: ${def?.description ?? req.proposedAction}`,
    });
  }

  return { violations, clean: violations.length === 0 };
}

export function assertNoL11ForbiddenActions(req: L11ForbiddenActionCheckRequest): void {
  const result = checkForL11ForbiddenActions(req);
  if (!result.clean) {
    const first = result.violations[0];
    throw new L11ConstitutionalError(first.violationCode, first.detail, {
      context: req.context,
      violations: result.violations.length,
    });
  }
}

export function checkL11ComponentNameLegality(name: string): {
  legal: boolean;
  violations: readonly string[];
} {
  const issues: string[] = [];

  if (!name || name.length === 0) issues.push('Name is empty');
  if (!/^[a-z][a-z0-9_]*$/.test(name)) issues.push('Name must be lowercase snake_case');
  if (containsL11ForbiddenNaming(name)) {
    issues.push(
      'Name contains forbidden judgment/recommendation/scenario/trade-action/vibe-score/laundering/rebuild semantics',
    );
  }

  return { legal: issues.length === 0, violations: issues };
}

export function getL11RegisteredForbiddenActionCount(): number {
  return L11_FORBIDDEN_ACTION_DEFINITIONS.length;
}

export function getL11CriticalForbiddenActionCount(): number {
  return getAllL11CriticalForbiddenActions().length;
}
