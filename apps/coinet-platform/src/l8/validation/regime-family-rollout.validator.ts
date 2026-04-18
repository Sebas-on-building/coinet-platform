/**
 * L8.6 — Regime Family Rollout Validator
 *
 * §8.6.6 — Enforces rollout ordering, state / mode legality, and
 * shadow-template no-production-clean law. Implements §8.6.6.6 and
 * §8.6.6.7.
 */

import {
  L8RegimeRolloutPhase,
  L8RegimeTemplateState,
  L8RegimeRuntimeMode,
  isTemplateStateLegalForMode,
  mayEmitProductionClean,
} from '../contracts/regime-rollout-phase';
import type { L8RegimeTemplate } from '../contracts/regime-template';
import {
  L8RegimeTemplateViolation,
  L8RegimeTemplateViolationCode,
} from './l8-template-violation-codes';
import {
  getDefaultL8RegimeRolloutRegistry,
  L8RegimeRolloutRegistry,
} from '../registry/regime-rollout.registry';

export interface L8RolloutValidationRequest {
  readonly template: L8RegimeTemplate;
  readonly runtime_mode: L8RegimeRuntimeMode;
  /**
   * §8.6.6.7 — If true, the caller is attempting to emit a regime
   * candidate as production-clean (i.e. the classification engine
   * would attach it as CLEAN_SINGLE coexistence + HIGH / FULL band).
   * The validator rejects that if state/mode forbid it.
   */
  readonly attempting_production_clean: boolean;
}

export interface L8RolloutValidationReport {
  readonly valid: boolean;
  readonly violations: readonly L8RegimeTemplateViolation[];
}

function v(
  code: L8RegimeTemplateViolationCode,
  t: L8RegimeTemplate | null,
  detail: string,
  context: Record<string, unknown> = {},
): L8RegimeTemplateViolation {
  return {
    code,
    source: 'regime-family-rollout-validator',
    templateId: t?.template_id ?? null,
    family: t?.regime_family ?? null,
    detail,
    context,
  };
}

export function validateRegimeFamilyRollout(
  req: L8RolloutValidationRequest,
  registry: L8RegimeRolloutRegistry = getDefaultL8RegimeRolloutRegistry(),
): L8RolloutValidationReport {
  const violations: L8RegimeTemplateViolation[] = [];
  const t = req.template;

  // §8.6.6.5 — template state must be legal for the runtime mode
  if (!isTemplateStateLegalForMode(t.template_state, req.runtime_mode)) {
    violations.push(v(
      L8RegimeTemplateViolationCode.TEMPLATE_STATE_ILLEGAL_FOR_MODE, t,
      `template_state ${t.template_state} not legal for runtime mode ${req.runtime_mode}`,
    ));
  }

  // §8.6.6.7 — shadow / certification templates cannot emit production-clean
  if (req.attempting_production_clean &&
      !mayEmitProductionClean(t.template_state, req.runtime_mode)) {
    violations.push(v(
      L8RegimeTemplateViolationCode.SHADOW_EMITS_PRODUCTION_CLEAN, t,
      `template_state ${t.template_state} may not emit production-clean under mode ${req.runtime_mode}`,
    ));
  }

  // §8.6.6.7 — template skips earlier phases
  if (t.template_state === L8RegimeTemplateState.PRODUCTION_ENABLED &&
      !registry.earlierPhasesComplete(t.rollout_phase)) {
    violations.push(v(
      L8RegimeTemplateViolationCode.TEMPLATE_SKIPS_EARLIER_PHASE, t,
      `template production-enabled in phase ${t.rollout_phase} but earlier phases incomplete`,
    ));
  }

  return { valid: violations.length === 0, violations };
}

/**
 * §8.6.6.6 — Family-wide rollout readiness. Runs the rollout validator
 * across every template in the family and surfaces aggregate violations.
 */
export interface L8FamilyRolloutReadinessRequest {
  readonly family: string;
  readonly runtime_mode: L8RegimeRuntimeMode;
  readonly templates: readonly L8RegimeTemplate[];
}

export function validateFamilyRolloutReadiness(
  req: L8FamilyRolloutReadinessRequest,
  registry: L8RegimeRolloutRegistry = getDefaultL8RegimeRolloutRegistry(),
): L8RolloutValidationReport {
  const violations: L8RegimeTemplateViolation[] = [];

  if (req.templates.length === 0) {
    violations.push({
      code:
        L8RegimeTemplateViolationCode.FAMILY_PRODUCTION_ENABLED_WITHOUT_TEMPLATES,
      source: 'regime-family-rollout-validator',
      templateId: null,
      family: req.family,
      detail: `family ${req.family} has no templates registered`,
      context: {},
    });
  }

  for (const t of req.templates) {
    if (t.regime_family !== req.family) continue;
    const rep = validateRegimeFamilyRollout({
      template: t, runtime_mode: req.runtime_mode,
      attempting_production_clean: false,
    }, registry);
    for (const vi of rep.violations) violations.push(vi);
  }

  return { valid: violations.length === 0, violations };
}

// Keep enum reference reachable.
void L8RegimeRolloutPhase;
