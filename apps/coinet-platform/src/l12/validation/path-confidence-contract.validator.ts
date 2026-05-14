/**
 * L12.3 — Path confidence contract validator (§12.3.10.3).
 */

import {
  isL12HighConfidenceBand,
  l12ConfidenceBandFor,
} from '../contracts/path-confidence-profile';
import {
  L12ConfidenceCapPosture,
  L12PathConfidenceContract,
  l12RequiresConfidenceCap,
} from '../contracts/path-confidence.contract';
import { L12ScenarioReadinessClass } from '../contracts/scenario-object-readiness';
import {
  L12ContractViolation,
  L12ContractViolationCode,
} from './l12-contract-violation-codes';

export interface L12PathConfidenceContextForValidation {
  readonly cap_posture?: L12ConfidenceCapPosture;
}

const CERTAINTY: readonly RegExp[] = [
  /\bcertain(ty|ly)?\b/i,
  /\bguaranteed\b/i,
  /\binevitable\b/i,
];

function inRange01(x: number): boolean {
  return typeof x === 'number' && x >= 0 && x <= 1 && !Number.isNaN(x);
}

export function validateL12PathConfidenceContract(
  c: L12PathConfidenceContract,
  ctx?: L12PathConfidenceContextForValidation,
): readonly L12ContractViolation[] {
  const v: L12ContractViolation[] = [];
  const sid = c.path_confidence_contract_id || '<unknown>';

  if (!inRange01(c.primary_path_confidence_score)) {
    v.push({
      code: L12ContractViolationCode.L12K_CONFIDENCE_OUT_OF_RANGE,
      subject_id: sid,
      detail: `primary_path_confidence_score out of [0,1]: ${c.primary_path_confidence_score}`,
    });
  }
  if (
    c.primary_path_confidence_band &&
    inRange01(c.primary_path_confidence_score) &&
    l12ConfidenceBandFor(c.primary_path_confidence_score) !==
      c.primary_path_confidence_band
  ) {
    v.push({
      code: L12ContractViolationCode.L12K_CONFIDENCE_BAND_MISMATCH,
      subject_id: sid,
      detail: `band ${c.primary_path_confidence_band} does not match score ${c.primary_path_confidence_score}`,
    });
  }
  for (const [k, x] of Object.entries(c.scenario_confidences ?? {})) {
    if (!inRange01(x)) {
      v.push({
        code: L12ContractViolationCode.L12K_CONFIDENCE_OUT_OF_RANGE,
        subject_id: sid,
        detail: `scenario_confidences[${k}] out of [0,1]: ${x}`,
      });
    }
  }
  // Cap law (§12.3.10.2)
  if (ctx?.cap_posture) {
    const requiresCap = l12RequiresConfidenceCap(ctx.cap_posture);
    const isHigh = isL12HighConfidenceBand(c.primary_path_confidence_band);
    const hasCapRefs = (c.confidence_cap_refs ?? []).length > 0;

    if (requiresCap && isHigh) {
      if (ctx.cap_posture.contradictionUnresolved) {
        v.push({
          code: L12ContractViolationCode.L12K_CONFIDENCE_UNCAPPED_UNDER_CONTRADICTION,
          subject_id: sid,
          detail: 'high confidence under unresolved contradiction',
        });
      }
      if (ctx.cap_posture.hasActiveInvalidation) {
        v.push({
          code: L12ContractViolationCode.L12K_CONFIDENCE_UNCAPPED_UNDER_INVALIDATION,
          subject_id: sid,
          detail: 'high confidence under active invalidation',
        });
      }
      if (ctx.cap_posture.missingVisibilityMaterial) {
        v.push({
          code: L12ContractViolationCode.L12K_CONFIDENCE_UNCAPPED_UNDER_MISSING_VISIBILITY,
          subject_id: sid,
          detail: 'high confidence under missing visibility',
        });
      }
      if (ctx.cap_posture.driftMaterialOrCritical) {
        v.push({
          code: L12ContractViolationCode.L12K_CONFIDENCE_UNCAPPED_UNDER_DRIFT,
          subject_id: sid,
          detail: 'high confidence under material drift',
        });
      }
    }
    if (requiresCap && !hasCapRefs) {
      v.push({
        code: L12ContractViolationCode.L12K_CONFIDENCE_CAP_REFS_MISSING,
        subject_id: sid,
        detail: 'cap posture requires cap refs but none present',
      });
    }
    if (
      c.readiness_class === L12ScenarioReadinessClass.SCENARIO_READY &&
      requiresCap
    ) {
      v.push({
        code: L12ContractViolationCode.L12K_CONFIDENCE_READINESS_CLEAN_UNDER_NARROWED,
        subject_id: sid,
        detail: 'readiness SCENARIO_READY but cap posture requires narrowing',
      });
    }
  }
  // Lineage / replay
  if (!c.lineage_refs || c.lineage_refs.length === 0) {
    v.push({
      code: L12ContractViolationCode.L12K_LINEAGE_REFS_ABSENT,
      subject_id: sid,
      detail: 'lineage_refs required',
    });
  }
  if (!c.replay_hash) {
    v.push({
      code: L12ContractViolationCode.L12K_REPLAY_HASH_MISSING,
      subject_id: sid,
      detail: 'replay_hash required',
    });
  }
  for (const ref of c.cap_reason_refs ?? []) {
    if (CERTAINTY.some(p => p.test(ref))) {
      v.push({
        code: L12ContractViolationCode.L12K_CONFIDENCE_CERTAINTY_CLAIM,
        subject_id: sid,
        detail: `cap_reason_ref claims certainty: "${ref}"`,
      });
      break;
    }
  }
  return v;
}
