/**
 * L10.5 — Hypothesis Shift-Condition Validator §10.5.6
 *
 * Enforces shift-condition semantics: class taxonomy, primary/secondary
 * anchoring, driver-citation law, mandatory classes when competition
 * is live, spread-narrowing law, and minimum-count law.
 */

import {
  L10HypothesisShiftConditionPolicy,
  L10ShiftConditionObservation,
  L10ShiftConditionDriver,
  ALL_L10_SHIFT_CONDITION_DRIVERS,
} from '../contracts/hypothesis-shift-condition-policy';
import {
  L10ShiftConditionClass,
  ALL_L10_SHIFT_CONDITION_CLASSES,
} from '../contracts/hypothesis-evidence-semantics-types';
import {
  L10EvidenceSemanticValidationIssue,
  L10EvidenceSemanticValidationReport,
  L10EvidenceSemanticViolationCode,
} from './l10-evidence-semantics-violation-codes';

export interface L10ShiftConditionValidationInput {
  readonly policy: L10HypothesisShiftConditionPolicy;
  readonly observations: readonly L10ShiftConditionObservation[];
  /** The current primary candidate ref (null only if no competition). */
  readonly primary_candidate_ref: string | null;
  /** The current secondary candidate ref; null means competition is not live. */
  readonly secondary_candidate_ref: string | null;
  /** Whether any active invalidation posture exists on the primary. */
  readonly primary_has_active_invalidation: boolean;
  /** Whether ranking spread is narrow enough to require narrowing conditions. */
  readonly ranking_spread_is_narrow: boolean;
}

export function validateL10ShiftCondition(
  input: L10ShiftConditionValidationInput,
): L10EvidenceSemanticValidationReport {
  const issues: L10EvidenceSemanticValidationIssue[] = [];
  const push = (
    code: L10EvidenceSemanticViolationCode,
    message: string,
    subject?: string,
  ) => issues.push({ code, message, subject });

  const { policy, observations } = input;
  const allowedClasses = new Set(policy.allowed_condition_classes);
  const knownClasses = new Set<L10ShiftConditionClass>(
    ALL_L10_SHIFT_CONDITION_CLASSES,
  );
  const knownDrivers = new Set<L10ShiftConditionDriver>(
    ALL_L10_SHIFT_CONDITION_DRIVERS,
  );
  const competitionLive = input.secondary_candidate_ref !== null;
  const presentClasses = new Set<L10ShiftConditionClass>();

  for (const obs of observations) {
    if (!knownClasses.has(obs.condition_class)) {
      push(
        L10EvidenceSemanticViolationCode.SHIFT_CONDITION_CLASS_UNREGISTERED,
        `condition_class '${obs.condition_class}' not in taxonomy`,
        obs.observation_id,
      );
    }
    if (!allowedClasses.has(obs.condition_class)) {
      push(
        L10EvidenceSemanticViolationCode.SHIFT_CONDITION_CLASS_DISALLOWED,
        `condition_class '${obs.condition_class}' disallowed`,
        obs.observation_id,
      );
    }
    presentClasses.add(obs.condition_class);

    if (!obs.anchor_candidate_refs || obs.anchor_candidate_refs.length === 0) {
      push(
        L10EvidenceSemanticViolationCode.SHIFT_CONDITION_MISSING_ANCHOR,
        'shift condition missing anchor_candidate_refs',
        obs.observation_id,
      );
    }
    if (!obs.evidence_domain) {
      push(
        L10EvidenceSemanticViolationCode.SHIFT_CONDITION_EVIDENCE_DOMAIN_MISSING,
        'shift condition missing evidence_domain',
        obs.observation_id,
      );
    }

    // §10.5.6.9 — driver required.
    if (
      policy.requires_governed_driver &&
      (!obs.drivers || obs.drivers.length === 0)
    ) {
      push(
        L10EvidenceSemanticViolationCode.SHIFT_CONDITION_MISSING_DRIVER,
        'shift condition has no governed driver',
        obs.observation_id,
      );
    } else {
      for (const d of obs.drivers) {
        if (!knownDrivers.has(d)) {
          push(
            L10EvidenceSemanticViolationCode.SHIFT_CONDITION_DRIVER_UNREGISTERED,
            `driver '${d}' not in taxonomy`,
            obs.observation_id,
          );
        }
      }
    }

    // §10.5.6.5 — promotion must anchor on the secondary.
    if (
      obs.condition_class ===
        L10ShiftConditionClass.SECONDARY_PROMOTION_CONDITION &&
      input.secondary_candidate_ref !== null &&
      !obs.anchor_candidate_refs.includes(input.secondary_candidate_ref)
    ) {
      push(
        L10EvidenceSemanticViolationCode.SHIFT_CONDITION_PROMOTION_DETACHED,
        'SECONDARY_PROMOTION_CONDITION not anchored on secondary',
        obs.observation_id,
      );
    }

    // §10.5.6.7 — collapse/reinforcement must anchor on primary.
    if (
      (obs.condition_class ===
        L10ShiftConditionClass.PRIMARY_COLLAPSE_CONDITION ||
        obs.condition_class ===
          L10ShiftConditionClass.PRIMARY_REINFORCEMENT_CONDITION) &&
      input.primary_candidate_ref !== null &&
      !obs.anchor_candidate_refs.includes(input.primary_candidate_ref)
    ) {
      push(
        L10EvidenceSemanticViolationCode.SHIFT_CONDITION_PROMOTION_DETACHED,
        `${obs.condition_class} not anchored on primary`,
        obs.observation_id,
      );
    }
  }

  // §10.5.6.5 / §10.5.6.6 / §10.5.6.7 — mandatory classes when live.
  if (competitionLive) {
    for (const mc of policy.mandatory_when_competition_live) {
      if (!presentClasses.has(mc)) {
        push(
          L10EvidenceSemanticViolationCode.SHIFT_CONDITION_MANDATORY_CLASS_MISSING,
          `mandatory class '${mc}' absent while competition is live`,
        );
      }
    }

    if (observations.length < policy.min_conditions_when_live) {
      push(
        L10EvidenceSemanticViolationCode.SHIFT_CONDITION_BELOW_MIN_WHEN_LIVE,
        `only ${observations.length} conditions; min is ${policy.min_conditions_when_live}`,
      );
    }

    if (observations.length === 0) {
      push(
        L10EvidenceSemanticViolationCode.SHIFT_CONDITION_STATIC_RANKING_WITH_LIVE_COMPETITION,
        'live competition emitted with zero shift conditions',
      );
    }
  }

  // §10.5.6.8 — spread-narrowing conditions.
  if (
    (policy.spread_narrowing_conditions_required ||
      input.ranking_spread_is_narrow) &&
    !presentClasses.has(
      L10ShiftConditionClass.SPREAD_NARROWING_CONDITION,
    )
  ) {
    push(
      L10EvidenceSemanticViolationCode.SHIFT_CONDITION_SPREAD_NARROWING_MISSING,
      'spread-narrowing condition required but absent',
    );
  }

  // §10.5.6.7 — collapse absent under active invalidation.
  if (
    input.primary_has_active_invalidation &&
    !presentClasses.has(
      L10ShiftConditionClass.PRIMARY_COLLAPSE_CONDITION,
    )
  ) {
    push(
      L10EvidenceSemanticViolationCode.SHIFT_CONDITION_COLLAPSE_ABSENT_WITH_ACTIVE_INVALIDATION,
      'active invalidation on primary but no collapse condition declared',
    );
  }

  return { valid: issues.length === 0, issues };
}
