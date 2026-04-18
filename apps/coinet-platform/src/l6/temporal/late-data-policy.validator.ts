/**
 * L6.5 §6.5.7.9 — LateDataPolicyValidator
 *
 * Classifies late-arriving data deterministically and blocks silent mutation
 * of current authoritative truth. Emits typed decision codes.
 */

import {
  L6LateDataClass,
  L6LateDataClassification,
  L6LateDataContext,
  L6LateDataDecisionCode,
  mutatesCurrentAuthoritativeTruth,
} from '../contracts/late-data-classification';
import { L6TemporalViolationCode } from '../contracts/temporal-honesty';

export interface L6LateDataValidationResult {
  readonly ok: boolean;
  readonly classification: L6LateDataClassification;
  readonly violations: readonly {
    readonly code: L6TemporalViolationCode;
    readonly field: string;
    readonly detail: string;
  }[];
}

export class LateDataPolicyValidator {
  classify(ctx: L6LateDataContext): L6LateDataClassification {
    // On time
    if (ctx.lateness_ms <= 0) {
      return {
        classification: L6LateDataClass.ON_TIME,
        decision_code: L6LateDataDecisionCode.ACCEPTED_ON_TIME,
        rationale: 'lateness<=0',
      };
    }

    // Beyond horizon -> rejected
    if (ctx.lateness_ms > ctx.lateness_horizon_ms) {
      return {
        classification: L6LateDataClass.LATE_REJECTED,
        decision_code: L6LateDataDecisionCode.REJECTED_STALE_BEYOND_HORIZON,
        rationale: `lateness ${ctx.lateness_ms}ms > horizon ${ctx.lateness_horizon_ms}ms`,
      };
    }

    // Materially affects current truth
    if (ctx.current_state_materially_affected) {
      if (ctx.contract_allows_rematerialization && ctx.l5_rematerialization_path_legal) {
        return {
          classification: L6LateDataClass.LATE_GOVERNED_REMATERIALIZATION_CANDIDATE,
          decision_code: L6LateDataDecisionCode.ROUTED_REMATERIALIZATION_REVIEW,
          rationale: 'current materially affected; rematerialization allowed',
        };
      }
      if (!ctx.contract_allows_rematerialization) {
        return {
          classification: L6LateDataClass.LATE_REJECTED,
          decision_code: L6LateDataDecisionCode.REJECTED_CONTRACT_FORBIDS_REMATERIALIZATION,
          rationale: 'current materially affected but contract forbids rematerialization',
        };
      }
      return {
        classification: L6LateDataClass.LATE_REJECTED,
        decision_code: L6LateDataDecisionCode.REJECTED_WOULD_MUTATE_CURRENT_SILENTLY,
        rationale: 'current materially affected but L5 rematerialization path not legal',
      };
    }

    // Event state may change (but current not materially affected)
    if (ctx.event_state_may_change) {
      return {
        classification: L6LateDataClass.LATE_EVENT_RECOMPUTE,
        decision_code: L6LateDataDecisionCode.ROUTED_EVENT_RECOMPUTE,
        rationale: 'event state may change; historical event recompute allowed',
      };
    }

    // Historical only
    if (ctx.impacted_window_coverage_ratio > 0) {
      return {
        classification: L6LateDataClass.LATE_HISTORICAL_ONLY,
        decision_code: L6LateDataDecisionCode.ROUTED_HISTORICAL_REBUILD,
        rationale: 'past windows impacted; historical-only rebuild',
      };
    }

    return {
      classification: L6LateDataClass.LATE_NON_MATERIAL,
      decision_code: L6LateDataDecisionCode.ACCEPTED_NON_MATERIAL,
      rationale: 'lateness within horizon with no material impact',
    };
  }

  /**
   * Validates a caller's intended classification against the ctx. Used to
   * detect silent-mutation attempts in audit.
   */
  validate(
    ctx: L6LateDataContext,
    declared: L6LateDataClassification,
  ): L6LateDataValidationResult {
    const v: {
      code: L6TemporalViolationCode;
      field: string;
      detail: string;
    }[] = [];
    const derived = this.classify(ctx);

    if (declared.classification !== derived.classification) {
      // Special rule: a caller may not *downgrade* a governed-remat candidate
      // to historical-only or non-material. That would be silent current-state
      // mutation.
      if (
        mutatesCurrentAuthoritativeTruth(derived.classification) &&
        !mutatesCurrentAuthoritativeTruth(declared.classification)
      ) {
        v.push({
          code: L6TemporalViolationCode.LATE_DATA_SILENT_CURRENT_MUTATION,
          field: 'classification',
          detail: `declared=${declared.classification} but current materially affected; must route to rematerialization review`,
        });
      } else {
        v.push({
          code: L6TemporalViolationCode.LATE_DATA_CLASS_MISSING,
          field: 'classification',
          detail: `declared=${declared.classification} does not match derived=${derived.classification}`,
        });
      }
    }
    if (declared.decision_code !== derived.decision_code) {
      v.push({
        code: L6TemporalViolationCode.LATE_DATA_CLASS_MISSING,
        field: 'decision_code',
        detail: `declared=${declared.decision_code} != derived=${derived.decision_code}`,
      });
    }

    return { ok: v.length === 0, classification: derived, violations: v };
  }
}
