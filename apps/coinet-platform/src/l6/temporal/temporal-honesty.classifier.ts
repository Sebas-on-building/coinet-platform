/**
 * L6.5 §6.5.8 — TemporalHonestyClassifier
 *
 * Decides the single `L6TemporalHonestyClass` for a primitive output given
 * its temporal mode, warmup state, freshness/coverage status, late-data
 * class, and validity state. This is the runtime's honesty-surface decision.
 */

import { L6TemporalMode, isHistoricalTemporalMode } from '../contracts/temporal-surfaces';
import { L6TemporalHonestyClass, L6TemporalViolationCode } from '../contracts/temporal-honesty';
import { L6FeatureValidityState } from '../contracts/feature-validity-state';
import { L6WarmupState } from '../contracts/warmup-spec';
import { L6LateDataClass } from '../contracts/late-data-classification';

export interface TemporalHonestyInput {
  readonly temporal_mode: L6TemporalMode;
  readonly validity_state: L6FeatureValidityState;
  readonly warmup_state: L6WarmupState;
  readonly freshness_ok: boolean;
  readonly coverage_ok: boolean;
  readonly late_data_class: L6LateDataClass;
}

export interface TemporalHonestyResult {
  readonly class: L6TemporalHonestyClass;
  readonly rationale: string;
  readonly ok: boolean;
  readonly violations: readonly {
    readonly code: L6TemporalViolationCode;
    readonly field: string;
    readonly detail: string;
  }[];
}

export class TemporalHonestyClassifier {
  classify(input: TemporalHonestyInput): TemporalHonestyResult {
    const v: {
      code: L6TemporalViolationCode;
      field: string;
      detail: string;
    }[] = [];

    // BLOCKED always wins
    if (input.validity_state === L6FeatureValidityState.BLOCKED) {
      return {
        class: L6TemporalHonestyClass.BLOCKED_TEMPORAL,
        rationale: 'validity_state=BLOCKED',
        ok: true,
        violations: [],
      };
    }

    // Warmup-specific: any warming/insufficient state with validity still
    // PROVISIONAL/DEGRADED means provisional-warmup honesty.
    if (
      input.warmup_state === L6WarmupState.WARMING_UP ||
      input.warmup_state === L6WarmupState.INSUFFICIENT_HISTORY ||
      input.warmup_state === L6WarmupState.INSUFFICIENT_COVERAGE ||
      input.warmup_state === L6WarmupState.BLOCKED_BY_BASELINE ||
      input.warmup_state === L6WarmupState.BLOCKED_BY_DEPENDENCY
    ) {
      if (input.validity_state === L6FeatureValidityState.VALID) {
        v.push({
          code: L6TemporalViolationCode.TEMPORAL_HONESTY_MISCLASSIFIED,
          field: 'validity_state',
          detail: `VALID incompatible with warmup_state=${input.warmup_state}`,
        });
      }
      return {
        class: L6TemporalHonestyClass.PROVISIONAL_WARMUP,
        rationale: `warmup_state=${input.warmup_state}`,
        ok: v.length === 0,
        violations: v,
      };
    }

    // Historical modes
    if (isHistoricalTemporalMode(input.temporal_mode)) {
      if (input.late_data_class === L6LateDataClass.LATE_HISTORICAL_ONLY ||
          input.late_data_class === L6LateDataClass.LATE_EVENT_RECOMPUTE) {
        return {
          class: L6TemporalHonestyClass.LATE_RECOMPUTED,
          rationale: `historical ${input.temporal_mode} + ${input.late_data_class}`,
          ok: true,
          violations: [],
        };
      }
      if (input.freshness_ok && input.coverage_ok &&
          input.validity_state === L6FeatureValidityState.VALID) {
        return {
          class: L6TemporalHonestyClass.HISTORICAL_CLEAN,
          rationale: 'historical clean replay',
          ok: true,
          violations: [],
        };
      }
      return {
        class: L6TemporalHonestyClass.HISTORICAL_DEGRADED,
        rationale: 'historical but not clean',
        ok: true,
        violations: [],
      };
    }

    // Current modes
    const currentClean =
      input.freshness_ok &&
      input.coverage_ok &&
      input.validity_state === L6FeatureValidityState.VALID &&
      (input.late_data_class === L6LateDataClass.ON_TIME ||
       input.late_data_class === L6LateDataClass.LATE_NON_MATERIAL);

    if (currentClean) {
      return {
        class: L6TemporalHonestyClass.CURRENT_CLEAN,
        rationale: 'valid + fresh + covered + on-time',
        ok: true,
        violations: [],
      };
    }

    // Silent mutation detector — if late class mutates current truth without
    // explicit validity signal, flag it.
    if (
      input.late_data_class === L6LateDataClass.LATE_GOVERNED_REMATERIALIZATION_CANDIDATE &&
      input.validity_state === L6FeatureValidityState.VALID &&
      input.freshness_ok &&
      input.coverage_ok
    ) {
      v.push({
        code: L6TemporalViolationCode.LATE_DATA_SILENT_CURRENT_MUTATION,
        field: 'late_data_class',
        detail: 'rematerialization candidate emitted as CURRENT_CLEAN',
      });
    }

    return {
      class: L6TemporalHonestyClass.CURRENT_DEGRADED,
      rationale: 'current but not clean (freshness/coverage/validity/late-class)',
      ok: v.length === 0,
      violations: v,
    };
  }
}
