/**
 * L12.5 — Trigger / invalidation interaction engine (§12.5.18).
 *
 * Resolves the dominance relationship between a trigger strength profile and
 * an invalidation strength profile for the same scenario, deterministically.
 * Strong triggers cannot override blocking invalidation.
 */

import {
  L12InvalidationStrengthBand,
  L12InvalidationStrengthProfile,
} from '../contracts/invalidation-strength-profile';
import { buildL12ScenarioReplayHash } from '../contracts/scenario-ids';
import {
  L12TriggerInvalidationInteractionClass,
  L12TriggerInvalidationInteractionRecord,
  l12ResolveInteractionClass,
} from '../contracts/trigger-invalidation-interaction';
import {
  L12TriggerStrengthBand,
  L12TriggerStrengthProfile,
} from '../contracts/trigger-strength-profile';

export interface L12TriggerInvalidationInteractionInput {
  readonly trigger: L12TriggerStrengthProfile;
  readonly invalidation: L12InvalidationStrengthProfile;
  /**
   * If true, the caller signals the trigger was attempting to upgrade
   * readiness/confidence above the invalidation's allowed cap. The engine
   * will mark this in the record so audits can surface the violation.
   */
  readonly trigger_attempts_to_override_blocked_invalidation?: boolean;
  readonly lineage_refs?: readonly string[];
  readonly policy_version: string;
}

export interface L12TriggerInvalidationInteractionResult {
  readonly ok: boolean;
  readonly record?: L12TriggerInvalidationInteractionRecord;
  readonly issues: readonly string[];
}

export function computeL12TriggerInvalidationInteraction(
  inp: L12TriggerInvalidationInteractionInput,
): L12TriggerInvalidationInteractionResult {
  const issues: string[] = [];

  if (inp.trigger.scenario_id !== inp.invalidation.scenario_id) {
    issues.push('trigger.scenario_id mismatch with invalidation.scenario_id');
  }
  if (inp.trigger.scenario_set_id !== inp.invalidation.scenario_set_id) {
    issues.push('trigger.scenario_set_id mismatch with invalidation.scenario_set_id');
  }

  const interaction_class = l12ResolveInteractionClass({
    triggerBand: inp.trigger.trigger_strength_band,
    invalidationBand: inp.invalidation.invalidation_strength_band,
    invalidationActive: inp.invalidation.is_active,
  });

  // Rule: blocking invalidation cannot be overridden by any trigger band.
  const overrideAttempt = !!inp.trigger_attempts_to_override_blocked_invalidation;
  if (
    overrideAttempt &&
    inp.invalidation.is_active &&
    inp.invalidation.invalidation_strength_band === L12InvalidationStrengthBand.BLOCKING
  ) {
    issues.push('trigger attempts to override blocking invalidation');
  }
  if (
    inp.trigger.trigger_strength_band === L12TriggerStrengthBand.DECISIVE &&
    inp.invalidation.is_active &&
    inp.invalidation.invalidation_strength_band !== L12InvalidationStrengthBand.WATCH
  ) {
    // Decisive trigger under any active non-watch invalidation must not
    // be claimed dominant by the engine.
    if (interaction_class === L12TriggerInvalidationInteractionClass.TRIGGER_DOMINANT) {
      issues.push('decisive trigger declared dominant under active invalidation');
    }
  }

  const lineage = [
    ...(inp.lineage_refs ?? []),
    `trigger:${inp.trigger.trigger_id}`,
    `invalidation:${inp.invalidation.invalidation_id}`,
    `scenario:${inp.trigger.scenario_id}`,
  ].sort();

  const replay_hash = buildL12ScenarioReplayHash({
    domain: 'l12.5.trigger_invalidation_interaction',
    policy_version: inp.policy_version,
    material: {
      trigger_id: inp.trigger.trigger_id,
      invalidation_id: inp.invalidation.invalidation_id,
      trigger_band: inp.trigger.trigger_strength_band,
      invalidation_band: inp.invalidation.invalidation_strength_band,
      invalidation_active: inp.invalidation.is_active,
      invalidation_blocking: inp.invalidation.is_blocking,
      interaction_class,
      override_attempt: overrideAttempt,
    },
  });

  const record: L12TriggerInvalidationInteractionRecord = {
    interaction_record_id: `l12.interaction.${inp.trigger.trigger_id}_${inp.invalidation.invalidation_id}`,
    scenario_set_id: inp.trigger.scenario_set_id,
    scenario_id: inp.trigger.scenario_id,
    trigger_id: inp.trigger.trigger_id,
    invalidation_id: inp.invalidation.invalidation_id,
    trigger_strength_band: inp.trigger.trigger_strength_band,
    invalidation_strength_band: inp.invalidation.invalidation_strength_band,
    invalidation_active: inp.invalidation.is_active,
    invalidation_blocking: inp.invalidation.is_blocking,
    interaction_class,
    trigger_overrides_blocked_invalidation_attempted: overrideAttempt,
    lineage_refs: lineage,
    replay_hash,
    policy_version: inp.policy_version,
  };

  return { ok: issues.length === 0, record, issues };
}
