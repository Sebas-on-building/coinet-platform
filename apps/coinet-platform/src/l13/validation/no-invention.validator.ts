/**
 * L13.4 — No-Invention Gate Validator
 *
 * §13.4.16 — Validates the no-invention gate result. Each detected
 * invention maps to a precise L13G_ violation code; blocking
 * inventions are CRITICAL.
 */

import {
  L13InventionClass,
  type L13DetectedInvention,
  type L13NoInventionGateResult,
} from '../contracts/no-invention';
import { L13ViolationSeverity } from '../contracts/l13-constitutional-types';
import { L13GroundingViolationCode } from './l13-grounding-violation-codes';
import {
  l13GroundingResult,
  type L13GroundingIssue,
  type L13GroundingValidationResult,
} from './_l13-grounding-issue';

const SEV = L13ViolationSeverity;

const INVENTION_CODE: Readonly<
  Record<L13InventionClass, L13GroundingViolationCode>
> = {
  [L13InventionClass.INVENTED_EVIDENCE]:
    L13GroundingViolationCode.L13G_INVENTED_EVIDENCE,
  [L13InventionClass.INVENTED_SCORE_DRIVER]:
    L13GroundingViolationCode.L13G_INVENTED_SCORE_DRIVER,
  [L13InventionClass.INVENTED_SCENARIO_TRIGGER]:
    L13GroundingViolationCode.L13G_INVENTED_SCENARIO_TRIGGER,
  [L13InventionClass.INVENTED_SCENARIO_INVALIDATION]:
    L13GroundingViolationCode.L13G_INVENTED_SCENARIO_INVALIDATION,
  [L13InventionClass.INVENTED_HYPOTHESIS_SUPPORT]:
    L13GroundingViolationCode.L13G_INVENTED_HYPOTHESIS_SUPPORT,
  [L13InventionClass.INVENTED_CONTRADICTION_ABSENCE]:
    L13GroundingViolationCode.L13G_INVENTED_CONTRADICTION_ABSENCE,
  [L13InventionClass.INVENTED_CONFIDENCE]:
    L13GroundingViolationCode.L13G_INVENTED_CONFIDENCE,
  [L13InventionClass.INVENTED_REGIME_STATE]:
    L13GroundingViolationCode.L13G_INVENTED_REGIME_STATE,
  [L13InventionClass.INVENTED_SEQUENCE_STATE]:
    L13GroundingViolationCode.L13G_INVENTED_SEQUENCE_STATE,
  [L13InventionClass.INVENTED_MISSING_CONFIRMATION_STATUS]:
    L13GroundingViolationCode.L13G_INVENTED_HYPOTHESIS_SUPPORT,
  [L13InventionClass.INVENTED_DATA_COMPLETENESS]:
    L13GroundingViolationCode.L13G_INVENTED_DATA_COMPLETENESS,
  [L13InventionClass.INVENTED_FINANCIAL_INSTRUCTION]:
    L13GroundingViolationCode.L13G_INVENTED_FINANCIAL_INSTRUCTION,
};

function asIssue(inv: L13DetectedInvention): L13GroundingIssue {
  return {
    code: INVENTION_CODE[inv.invention_class],
    severity: inv.blocks_output
      ? SEV.CRITICAL
      : SEV.ERROR,
    subject_ref: inv.detected_invention_id,
    message: `invention "${inv.invention_class}" detected: ${inv.evidence_text}`,
    details: {
      claim_ref: inv.claim_ref,
      blocks_output: inv.blocks_output,
    },
  };
}

export function validateL13NoInventionGateResult(
  gate: L13NoInventionGateResult,
): L13GroundingValidationResult {
  const issues: L13GroundingIssue[] = [];

  if (!gate.gate_result_id || !gate.replay_hash) {
    issues.push({
      code: L13GroundingViolationCode.L13G_NO_INVENTION_GATE_INVALID,
      severity: SEV.ERROR,
      message: 'no-invention gate missing id or replay_hash',
    });
  }
  for (const d of gate.detected_inventions) {
    issues.push(asIssue(d));
  }
  if (!gate.gate_passed && gate.blocking_invention_refs.length > 0) {
    issues.push({
      code: L13GroundingViolationCode.L13G_NO_INVENTION_GATE_BLOCKED,
      severity: SEV.CRITICAL,
      subject_ref: gate.gate_result_id,
      message: `no-invention gate blocked output (${gate.blocking_invention_refs.length} blocking inventions)`,
    });
  }
  return l13GroundingResult(issues);
}
