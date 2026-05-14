/**
 * L12.1 — Forbidden Action Registry (Runtime)
 *
 * §12.1.7 / §12.1.12 — Runtime enforcement of forbidden actions and
 * forbidden semantic patterns (component names, descriptions, output
 * classes, emitted text).
 */

import {
  ALL_L12_FORBIDDEN_ACTIONS,
  L12ForbiddenAction,
} from '../contracts/l12-constitutional-types';
import {
  L12_FORBIDDEN_ACTION_DEFINITIONS,
  getAllL12CriticalForbiddenActions,
} from '../contracts/l12-forbidden-actions';
import {
  containsL12ForbiddenNaming,
  checkL12ForbiddenSemantics,
} from '../contracts/l12-boundary';
import {
  detectL12JudgmentLanguage,
  detectL12PredictionTheater,
  detectL12RecommendationLanguage,
  isL12ForbiddenOutputClass,
} from '../contracts/l12-mission';
import {
  L12ConstitutionalError,
  L12ConstitutionalViolationCode,
} from '../contracts/l12-violation-codes';

export interface L12ForbiddenActionCheckRequest {
  readonly proposedName?: string;
  readonly proposedDescription?: string;
  readonly proposedOutputClass?: string;
  readonly proposedAction?: L12ForbiddenAction;
  readonly emittedText?: string;
  readonly context: string;
}

export interface L12ForbiddenActionViolation {
  readonly action: L12ForbiddenAction | null;
  readonly violationCode: L12ConstitutionalViolationCode;
  readonly detail: string;
}

export interface L12ForbiddenActionCheckResult {
  readonly violations: readonly L12ForbiddenActionViolation[];
  readonly clean: boolean;
}

function classifyForbiddenName(name: string): {
  action: L12ForbiddenAction;
  code: L12ConstitutionalViolationCode;
} {
  const upper = name.toUpperCase();
  if (
    upper.includes('GUARANTEED') ||
    upper.includes('CERTAIN') ||
    upper.includes('INEVITABLE') ||
    upper.includes('CANNOT_FAIL')
  ) {
    return {
      action: L12ForbiddenAction.CERTAINTY_CLAIM,
      code: L12ConstitutionalViolationCode.L12C_CERTAINTY_CLAIM,
    };
  }
  if (
    upper.includes('PREDICTION') ||
    upper.includes('FORECAST') ||
    upper.includes('WILL_DEFINITELY') ||
    upper.includes('CONFIRMED_BREAKOUT') ||
    upper.includes('SAFE_CONTINUATION')
  ) {
    return {
      action: L12ForbiddenAction.PREDICTION_THEATER,
      code: L12ConstitutionalViolationCode.L12C_PREDICTION_THEATER,
    };
  }
  if (
    upper.includes('SCENARIO_WINNER') ||
    upper.includes('FINAL_SCENARIO') ||
    upper.includes('WINNING_SCENARIO') ||
    upper.includes('FINAL_JUDGMENT') ||
    upper.includes('WINNING_PATH')
  ) {
    return {
      action: L12ForbiddenAction.FINAL_JUDGMENT_EMISSION,
      code: L12ConstitutionalViolationCode.L12C_JUDGMENT_LEAK,
    };
  }
  if (
    upper.includes('TRADE') ||
    upper.includes('PORTFOLIO') ||
    upper.includes('ENTRY_READY') ||
    upper.includes('TRADE_READY') ||
    upper.includes('SAFEST')
  ) {
    return {
      action: L12ForbiddenAction.TRADE_ACTION_EMISSION,
      code: L12ConstitutionalViolationCode.L12C_TRADE_ACTION_LEAK,
    };
  }
  if (
    upper.includes('RECOMMENDATION') ||
    upper.includes('BUY') ||
    upper.includes('SELL') ||
    upper.includes('AVOID') ||
    upper.includes('CONVICTION') ||
    upper.includes('ACTIONABLE')
  ) {
    return {
      action: L12ForbiddenAction.RECOMMENDATION_EMISSION,
      code: L12ConstitutionalViolationCode.L12C_RECOMMENDATION_LEAK,
    };
  }
  if (
    upper.includes('REBUILD_VALIDATION') ||
    upper.includes('REBUILD_REGIME') ||
    upper.includes('REBUILD_SEQUENCE') ||
    upper.includes('REBUILD_HYPOTHESIS') ||
    upper.includes('REBUILD_HYPOTHESES') ||
    upper.includes('REBUILD_SCORE') ||
    upper.includes('OVERRIDE_REGIME') ||
    upper.includes('OVERRIDE_SEQUENCE') ||
    upper.includes('OVERRIDE_HYPOTHESIS') ||
    upper.includes('OVERRIDE_VALIDATION')
  ) {
    return {
      action: L12ForbiddenAction.LOWER_LAYER_TRUTH_REDEFINITION,
      code: L12ConstitutionalViolationCode.L12C_LOWER_LAYER_REDEFINITION,
    };
  }
  if (upper.includes('NAKED_SCORE') || upper.includes('SCORE_VALUE_ONLY')) {
    return {
      action: L12ForbiddenAction.L11_SCORE_VALUE_ONLY_CONSUMPTION,
      code: L12ConstitutionalViolationCode.L12C_L11_SCORE_VALUE_ONLY,
    };
  }
  if (upper.includes('BYPASS_L5') || upper.includes('RAW_STORAGE') || upper.includes('DIRECT_POSTGRES')) {
    return {
      action: L12ForbiddenAction.L5_PERSISTENCE_BYPASS,
      code: L12ConstitutionalViolationCode.L12C_L5_BYPASS,
    };
  }
  return {
    action: L12ForbiddenAction.PREDICTION_THEATER,
    code: L12ConstitutionalViolationCode.L12C_FORBIDDEN_NAMING,
  };
}

export function checkL12ForbiddenAction(
  req: L12ForbiddenActionCheckRequest,
): L12ForbiddenActionCheckResult {
  const violations: L12ForbiddenActionViolation[] = [];

  if (req.proposedName && containsL12ForbiddenNaming(req.proposedName)) {
    const { action, code } = classifyForbiddenName(req.proposedName);
    violations.push({
      action,
      violationCode: code,
      detail: `Forbidden name "${req.proposedName}" in ${req.context}`,
    });
  }
  if (req.proposedDescription && containsL12ForbiddenNaming(req.proposedDescription)) {
    const sem = checkL12ForbiddenSemantics(req.proposedDescription);
    violations.push({
      action: null,
      violationCode: L12ConstitutionalViolationCode.L12C_FORBIDDEN_NAMING,
      detail: `Forbidden description in ${req.context}: ${sem.matchedPattern ?? 'unknown'}`,
    });
  }
  if (req.proposedOutputClass && isL12ForbiddenOutputClass(req.proposedOutputClass)) {
    violations.push({
      action: null,
      violationCode: L12ConstitutionalViolationCode.L12C_ILLEGAL_OUTPUT_CLASS,
      detail: `Forbidden output class "${req.proposedOutputClass}" in ${req.context}`,
    });
  }
  if (req.emittedText) {
    if (detectL12PredictionTheater(req.emittedText)) {
      violations.push({
        action: L12ForbiddenAction.PREDICTION_THEATER,
        violationCode: L12ConstitutionalViolationCode.L12C_PREDICTION_THEATER,
        detail: `Prediction theater detected in ${req.context}`,
      });
    }
    if (detectL12RecommendationLanguage(req.emittedText)) {
      violations.push({
        action: L12ForbiddenAction.RECOMMENDATION_EMISSION,
        violationCode: L12ConstitutionalViolationCode.L12C_RECOMMENDATION_LEAK,
        detail: `Recommendation leak detected in ${req.context}`,
      });
    }
    if (detectL12JudgmentLanguage(req.emittedText)) {
      violations.push({
        action: L12ForbiddenAction.FINAL_JUDGMENT_EMISSION,
        violationCode: L12ConstitutionalViolationCode.L12C_JUDGMENT_LEAK,
        detail: `Judgment leak detected in ${req.context}`,
      });
    }
  }
  if (req.proposedAction) {
    const def = L12_FORBIDDEN_ACTION_DEFINITIONS.find(d => d.action === req.proposedAction);
    if (def) {
      violations.push({
        action: req.proposedAction,
        violationCode: L12ConstitutionalViolationCode.L12C_FORBIDDEN_NAMING,
        detail: `Proposed action "${req.proposedAction}" is forbidden in ${req.context}`,
      });
    }
  }

  return { violations, clean: violations.length === 0 };
}

export function assertL12NoForbiddenAction(req: L12ForbiddenActionCheckRequest): void {
  const r = checkL12ForbiddenAction(req);
  if (!r.clean) {
    const first = r.violations[0];
    throw new L12ConstitutionalError(first.violationCode, first.detail, {
      context: req.context,
      proposedName: req.proposedName,
    });
  }
}

void ALL_L12_FORBIDDEN_ACTIONS;
void getAllL12CriticalForbiddenActions;
