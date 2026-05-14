/**
 * L13.1 — Forbidden Action Registry (Runtime)
 *
 * §13.1.5 / §13.1.10 — Runtime enforcement of forbidden actions and
 * forbidden semantic patterns (component names, descriptions, output
 * classes, emitted text). Maps each forbidden action to its
 * disjoint L13C_ violation code.
 */

import {
  ALL_L13_FORBIDDEN_ACTIONS,
  L13ForbiddenAction,
} from '../contracts/l13-constitutional-types';
import {
  L13_FORBIDDEN_ACTION_DEFINITIONS,
  getAllL13CriticalForbiddenActions,
} from '../contracts/l13-forbidden-actions';
import {
  containsL13ForbiddenNaming,
  checkL13ForbiddenSemantics,
} from '../contracts/l13-boundary';
import {
  detectL13FinalJudgmentLeak,
  detectL13LowerLayerRebuildLanguage,
  detectL13MissingDataLaunderLanguage,
  detectL13PredictionTheater,
  detectL13RecommendationLeak,
  isL13ForbiddenOutputClass,
} from '../contracts/l13-mission';
import {
  L13ConstitutionalError,
  L13ConstitutionalViolationCode,
} from '../contracts/l13-violation-codes';

export interface L13ForbiddenActionCheckRequest {
  readonly proposedName?: string;
  readonly proposedDescription?: string;
  readonly proposedOutputClass?: string;
  readonly proposedAction?: L13ForbiddenAction;
  readonly emittedText?: string;
  readonly context: string;
}

export interface L13ForbiddenActionViolation {
  readonly action: L13ForbiddenAction | null;
  readonly violationCode: L13ConstitutionalViolationCode;
  readonly detail: string;
}

export interface L13ForbiddenActionCheckResult {
  readonly violations: readonly L13ForbiddenActionViolation[];
  readonly clean: boolean;
}

/**
 * §13.1.11 — Map a forbidden action to its disjoint L13C_ code.
 */
export function violationCodeForL13ForbiddenAction(
  action: L13ForbiddenAction,
): L13ConstitutionalViolationCode {
  switch (action) {
    case L13ForbiddenAction.INVENT_MISSING_SUPPORT:
      return L13ConstitutionalViolationCode.L13C_INVENTS_SUPPORT;
    case L13ForbiddenAction.HIDE_CONTRADICTION:
      return L13ConstitutionalViolationCode.L13C_HIDES_CONTRADICTION;
    case L13ForbiddenAction.IGNORE_RESTRICTION:
      return L13ConstitutionalViolationCode.L13C_IGNORES_RESTRICTION;
    case L13ForbiddenAction.OVERRIDE_CONFIDENCE_CAP:
      return L13ConstitutionalViolationCode.L13C_OVERRIDES_CONFIDENCE;
    case L13ForbiddenAction.PRETEND_MISSING_DATA_COMPLETE:
      return L13ConstitutionalViolationCode.L13C_PRETENDS_MISSING_DATA_COMPLETE;
    case L13ForbiddenAction.REBUILD_SCENARIO:
      return L13ConstitutionalViolationCode.L13C_REBUILDS_SCENARIO;
    case L13ForbiddenAction.REBUILD_SCORE:
      return L13ConstitutionalViolationCode.L13C_REBUILDS_SCORE;
    case L13ForbiddenAction.REBUILD_HYPOTHESIS:
      return L13ConstitutionalViolationCode.L13C_REBUILDS_HYPOTHESIS;
    case L13ForbiddenAction.REBUILD_SEQUENCE:
      return L13ConstitutionalViolationCode.L13C_REBUILDS_SEQUENCE;
    case L13ForbiddenAction.REBUILD_REGIME:
      return L13ConstitutionalViolationCode.L13C_REBUILDS_REGIME;
    case L13ForbiddenAction.CREATE_NEW_SCENARIO:
      return L13ConstitutionalViolationCode.L13C_CREATES_NEW_SCENARIO;
    case L13ForbiddenAction.CREATE_NEW_HYPOTHESIS:
      return L13ConstitutionalViolationCode.L13C_CREATES_NEW_HYPOTHESIS;
    case L13ForbiddenAction.COMPUTE_SCORE_LOCALLY:
      return L13ConstitutionalViolationCode.L13C_COMPUTES_SCORE_LOCALLY;
    case L13ForbiddenAction.EMIT_BUY_INSTRUCTION:
    case L13ForbiddenAction.EMIT_SELL_INSTRUCTION:
    case L13ForbiddenAction.EMIT_HOLD_INSTRUCTION:
    case L13ForbiddenAction.EMIT_AVOID_INSTRUCTION:
      return L13ConstitutionalViolationCode.L13C_BUY_SELL_HOLD_AVOID_LEAK;
    case L13ForbiddenAction.EMIT_LEVERAGE_INSTRUCTION:
      return L13ConstitutionalViolationCode.L13C_LEVERAGE_ADVICE_LEAK;
    case L13ForbiddenAction.EMIT_POSITION_SIZE_INSTRUCTION:
      return L13ConstitutionalViolationCode.L13C_POSITION_SIZE_LEAK;
    case L13ForbiddenAction.EMIT_ENTRY_EXIT_INSTRUCTION:
      return L13ConstitutionalViolationCode.L13C_ENTRY_EXIT_LEAK;
    case L13ForbiddenAction.CLAIM_GUARANTEE:
    case L13ForbiddenAction.CLAIM_CERTAINTY_UNSUPPORTED:
      return L13ConstitutionalViolationCode.L13C_UNSUPPORTED_CERTAINTY;
    case L13ForbiddenAction.CALL_SCENARIO_WINNER:
      return L13ConstitutionalViolationCode.L13C_SCENARIO_AS_WINNER;
    case L13ForbiddenAction.CALL_HYPOTHESIS_FINAL_TRUTH:
      return L13ConstitutionalViolationCode.L13C_HYPOTHESIS_AS_FINAL_TRUTH;
    case L13ForbiddenAction.SAY_SCORE_MEANS_RECOMMENDATION:
      return L13ConstitutionalViolationCode.L13C_SCORE_AS_RECOMMENDATION;
    case L13ForbiddenAction.TREAT_SCENARIO_CONFIDENCE_AS_PROBABILITY:
      return L13ConstitutionalViolationCode.L13C_SCENARIO_AS_PROBABILITY;
    case L13ForbiddenAction.OMIT_ACTIVE_INVALIDATION:
      return L13ConstitutionalViolationCode.L13C_SCENARIO_WITHOUT_INVALIDATION_DISCLOSURE;
    case L13ForbiddenAction.OMIT_REQUIRED_TRIGGER:
      return L13ConstitutionalViolationCode.L13C_SCENARIO_WITHOUT_TRIGGER_DISCLOSURE;
    case L13ForbiddenAction.USE_RAW_LOWER_LAYER_BYPASS:
      return L13ConstitutionalViolationCode.L13C_RAW_LOWER_LAYER_BYPASS;
    case L13ForbiddenAction.OUTPUT_UNGROUNDED_CLAIM:
      return L13ConstitutionalViolationCode.L13C_INVENTS_SUPPORT;
    default:
      return L13ConstitutionalViolationCode.L13C_FORBIDDEN_NAMING;
  }
}

function classifyForbiddenName(name: string): {
  action: L13ForbiddenAction | null;
  code: L13ConstitutionalViolationCode;
} {
  const upper = name.toUpperCase();

  // engine impersonation
  if (
    upper.includes('SCENARIO_GENERATOR') ||
    upper.includes('SCENARIO_BUILDER')
  ) {
    return {
      action: L13ForbiddenAction.CREATE_NEW_SCENARIO,
      code: L13ConstitutionalViolationCode.L13C_CREATES_NEW_SCENARIO,
    };
  }
  if (
    upper.includes('SCORE_CALCULATOR') ||
    upper.includes('SCORE_COMPUTER') ||
    upper.includes('SCORE_ENGINE')
  ) {
    return {
      action: L13ForbiddenAction.COMPUTE_SCORE_LOCALLY,
      code: L13ConstitutionalViolationCode.L13C_COMPUTES_SCORE_LOCALLY,
    };
  }
  if (
    upper.includes('REGIME_CLASSIFIER') ||
    upper.includes('REGIME_ENGINE')
  ) {
    return {
      action: L13ForbiddenAction.REBUILD_REGIME,
      code: L13ConstitutionalViolationCode.L13C_REBUILDS_REGIME,
    };
  }
  if (
    upper.includes('SEQUENCE_ENGINE') ||
    upper.includes('REINTERPRET_SEQUENCE')
  ) {
    return {
      action: L13ForbiddenAction.REBUILD_SEQUENCE,
      code: L13ConstitutionalViolationCode.L13C_REBUILDS_SEQUENCE,
    };
  }
  if (
    upper.includes('HYPOTHESIS_RANKER') ||
    upper.includes('HYPOTHESIS_ENGINE')
  ) {
    return {
      action: L13ForbiddenAction.REBUILD_HYPOTHESIS,
      code: L13ConstitutionalViolationCode.L13C_REBUILDS_HYPOTHESIS,
    };
  }
  if (
    upper.includes('TRADE_ADVISOR') ||
    upper.includes('TRADE_RECOMMENDATION') ||
    upper.includes('TRADE_ADVICE') ||
    upper.includes('BUY_SIGNAL') ||
    upper.includes('SELL_SIGNAL') ||
    upper.includes('HOLD_SIGNAL') ||
    upper.includes('AVOID_SIGNAL')
  ) {
    return {
      action: L13ForbiddenAction.EMIT_BUY_INSTRUCTION,
      code: L13ConstitutionalViolationCode.L13C_BUY_SELL_HOLD_AVOID_LEAK,
    };
  }
  if (upper.includes('LEVERAGE_ADVICE') || upper.includes('LEVERAGE_RECOMMENDATION')) {
    return {
      action: L13ForbiddenAction.EMIT_LEVERAGE_INSTRUCTION,
      code: L13ConstitutionalViolationCode.L13C_LEVERAGE_ADVICE_LEAK,
    };
  }
  if (upper.includes('POSITION_SIZE')) {
    return {
      action: L13ForbiddenAction.EMIT_POSITION_SIZE_INSTRUCTION,
      code: L13ConstitutionalViolationCode.L13C_POSITION_SIZE_LEAK,
    };
  }
  if (upper.includes('ENTRY_ADVICE') || upper.includes('EXIT_ADVICE')) {
    return {
      action: L13ForbiddenAction.EMIT_ENTRY_EXIT_INSTRUCTION,
      code: L13ConstitutionalViolationCode.L13C_ENTRY_EXIT_LEAK,
    };
  }
  if (
    upper.includes('PREDICTION_SIGNAL') ||
    upper.includes('PREDICTION_ENGINE') ||
    upper.includes('FORECAST_SIGNAL') ||
    upper.includes('FORECAST_ENGINE') ||
    upper.includes('GUARANTEED') ||
    upper.includes('CERTAIN_PATH') ||
    upper.includes('CERTAIN_OUTCOME') ||
    upper.includes('INEVITABLE') ||
    upper.includes('CANNOT_FAIL')
  ) {
    return {
      action: L13ForbiddenAction.CLAIM_GUARANTEE,
      code: L13ConstitutionalViolationCode.L13C_PREDICTION_THEATER,
    };
  }
  if (
    upper.includes('SCENARIO_WINNER') ||
    upper.includes('WINNING_SCENARIO') ||
    upper.includes('WINNING_PATH') ||
    upper.includes('FINAL_VERDICT') ||
    upper.includes('FINAL_JUDGMENT') ||
    upper.includes('FINAL_ANSWER')
  ) {
    return {
      action: L13ForbiddenAction.CALL_SCENARIO_WINNER,
      code: L13ConstitutionalViolationCode.L13C_FINAL_JUDGMENT_LEAK,
    };
  }
  if (
    upper.includes('REBUILD_SCENARIO') ||
    upper.includes('REBUILD_SCORE') ||
    upper.includes('REBUILD_HYPOTHESIS') ||
    upper.includes('REBUILD_HYPOTHESES') ||
    upper.includes('REBUILD_SEQUENCE') ||
    upper.includes('REBUILD_REGIME') ||
    upper.includes('REBUILD_VALIDATION') ||
    upper.includes('OVERRIDE_CONTRADICTION') ||
    upper.includes('OVERRIDE_RESTRICTION') ||
    upper.includes('OVERRIDE_CONFIDENCE')
  ) {
    return {
      action: L13ForbiddenAction.REBUILD_SCENARIO,
      code: L13ConstitutionalViolationCode.L13C_AI_ACTS_AS_ENGINE,
    };
  }
  if (
    upper.includes('INVENT_SUPPORT') ||
    upper.includes('INVENT_EVIDENCE') ||
    upper.includes('PRETEND_MISSING_DATA')
  ) {
    return {
      action: L13ForbiddenAction.INVENT_MISSING_SUPPORT,
      code: L13ConstitutionalViolationCode.L13C_INVENTS_SUPPORT,
    };
  }
  if (upper.includes('HIDE_CONTRADICTION') || upper.includes('MASK_CONTRADICTION')) {
    return {
      action: L13ForbiddenAction.HIDE_CONTRADICTION,
      code: L13ConstitutionalViolationCode.L13C_HIDES_CONTRADICTION,
    };
  }
  if (upper.includes('RAW_LOWER_LAYER') || upper.includes('BYPASS_L')) {
    return {
      action: L13ForbiddenAction.USE_RAW_LOWER_LAYER_BYPASS,
      code: L13ConstitutionalViolationCode.L13C_RAW_LOWER_LAYER_BYPASS,
    };
  }
  return {
    action: null,
    code: L13ConstitutionalViolationCode.L13C_FORBIDDEN_NAMING,
  };
}

export function checkL13ForbiddenAction(
  req: L13ForbiddenActionCheckRequest,
): L13ForbiddenActionCheckResult {
  const violations: L13ForbiddenActionViolation[] = [];

  if (req.proposedName && containsL13ForbiddenNaming(req.proposedName)) {
    const { action, code } = classifyForbiddenName(req.proposedName);
    violations.push({
      action,
      violationCode: code,
      detail: `Forbidden name "${req.proposedName}" in ${req.context}`,
    });
  }
  if (
    req.proposedDescription &&
    containsL13ForbiddenNaming(req.proposedDescription)
  ) {
    const sem = checkL13ForbiddenSemantics(req.proposedDescription);
    violations.push({
      action: null,
      violationCode:
        L13ConstitutionalViolationCode.L13C_FORBIDDEN_NAMING,
      detail: `Forbidden description in ${req.context}: ${sem.matchedPattern ?? 'unknown'}`,
    });
  }
  if (
    req.proposedOutputClass &&
    isL13ForbiddenOutputClass(req.proposedOutputClass)
  ) {
    violations.push({
      action: null,
      violationCode:
        L13ConstitutionalViolationCode.L13C_ILLEGAL_OUTPUT_CLASS,
      detail: `Forbidden output class "${req.proposedOutputClass}" in ${req.context}`,
    });
  }
  if (req.emittedText) {
    if (detectL13RecommendationLeak(req.emittedText)) {
      violations.push({
        action: L13ForbiddenAction.EMIT_BUY_INSTRUCTION,
        violationCode:
          L13ConstitutionalViolationCode.L13C_BUY_SELL_HOLD_AVOID_LEAK,
        detail: `Recommendation leak detected in ${req.context}`,
      });
    }
    if (detectL13PredictionTheater(req.emittedText)) {
      violations.push({
        action: L13ForbiddenAction.CLAIM_GUARANTEE,
        violationCode:
          L13ConstitutionalViolationCode.L13C_PREDICTION_THEATER,
        detail: `Prediction theater detected in ${req.context}`,
      });
    }
    if (detectL13FinalJudgmentLeak(req.emittedText)) {
      violations.push({
        action: L13ForbiddenAction.CALL_SCENARIO_WINNER,
        violationCode:
          L13ConstitutionalViolationCode.L13C_FINAL_JUDGMENT_LEAK,
        detail: `Final judgment leak detected in ${req.context}`,
      });
    }
    if (detectL13LowerLayerRebuildLanguage(req.emittedText)) {
      violations.push({
        action: L13ForbiddenAction.USE_RAW_LOWER_LAYER_BYPASS,
        violationCode:
          L13ConstitutionalViolationCode.L13C_RAW_LOWER_LAYER_BYPASS,
        detail: `Lower-layer rebuild language detected in ${req.context}`,
      });
    }
    if (detectL13MissingDataLaunderLanguage(req.emittedText)) {
      violations.push({
        action: L13ForbiddenAction.PRETEND_MISSING_DATA_COMPLETE,
        violationCode:
          L13ConstitutionalViolationCode.L13C_PRETENDS_MISSING_DATA_COMPLETE,
        detail: `Missing-data laundering detected in ${req.context}`,
      });
    }
  }
  if (req.proposedAction) {
    const def = L13_FORBIDDEN_ACTION_DEFINITIONS.find(
      d => d.action === req.proposedAction,
    );
    if (def) {
      violations.push({
        action: req.proposedAction,
        violationCode: violationCodeForL13ForbiddenAction(req.proposedAction),
        detail: `Proposed action "${req.proposedAction}" is forbidden in ${req.context}`,
      });
    }
  }

  return { violations, clean: violations.length === 0 };
}

export function assertL13NoForbiddenAction(
  req: L13ForbiddenActionCheckRequest,
): void {
  const r = checkL13ForbiddenAction(req);
  if (!r.clean) {
    const first = r.violations[0];
    throw new L13ConstitutionalError(first.violationCode, first.detail, {
      context: req.context,
      proposedName: req.proposedName,
    });
  }
}

void ALL_L13_FORBIDDEN_ACTIONS;
void getAllL13CriticalForbiddenActions;
