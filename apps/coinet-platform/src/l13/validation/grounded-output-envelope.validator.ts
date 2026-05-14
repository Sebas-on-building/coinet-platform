/**
 * L13.4 — Grounded Output Envelope Validator
 *
 * §13.4.16 — Validates the L13.4-to-L13.6 bridge envelope.
 */

import {
  isL13BlockedGroundingReadiness,
  L13GroundingReadinessClass,
} from '../contracts/claim-grounding';
import type { L13GroundedOutputEnvelope } from '../contracts/grounded-output-envelope';
import { L13ViolationSeverity } from '../contracts/l13-constitutional-types';
import { L13GroundingViolationCode } from './l13-grounding-violation-codes';
import {
  l13GroundingResult,
  type L13GroundingIssue,
  type L13GroundingValidationResult,
} from './_l13-grounding-issue';

const SEV = L13ViolationSeverity;

function missing(v: unknown): boolean {
  return (
    v === undefined ||
    v === null ||
    (typeof v === 'string' && v.trim() === '')
  );
}

export function validateL13GroundedOutputEnvelope(
  envelope: L13GroundedOutputEnvelope,
): L13GroundingValidationResult {
  const issues: L13GroundingIssue[] = [];

  for (const f of [
    'grounded_output_id',
    'output_id',
    'input_package_id',
    'claim_extraction_result_ref',
    'claim_grounding_result_ref',
    'no_invention_gate_result_ref',
    'citation_pack_ref',
    'replay_hash',
    'policy_version',
  ] as const) {
    if (missing(envelope[f] as unknown)) {
      issues.push({
        code: L13GroundingViolationCode.L13G_ENVELOPE_INVALID,
        severity: SEV.CRITICAL,
        message: `envelope field ${f} missing`,
      });
    }
  }

  if (envelope.lineage_refs.length === 0) {
    issues.push({
      code: L13GroundingViolationCode.L13G_LINEAGE_REF_MISSING,
      severity: SEV.ERROR,
      message: 'envelope lineage_refs empty',
    });
  }

  // Blocked readiness cannot emit.
  if (
    (isL13BlockedGroundingReadiness(envelope.grounding_readiness_class) ||
      envelope.grounding_readiness_class ===
        L13GroundingReadinessClass.GROUNDING_REFUSAL_REQUIRED) &&
    envelope.allowed_to_emit
  ) {
    issues.push({
      code: L13GroundingViolationCode.L13G_ENVELOPE_EMIT_WHILE_BLOCK_REQUIRED,
      severity: SEV.CRITICAL,
      subject_ref: envelope.grounded_output_id,
      message: `envelope claims allowed_to_emit while readiness=${envelope.grounding_readiness_class}`,
    });
  }

  // Block-required + allow inconsistency.
  if (envelope.block_required && envelope.allowed_to_emit) {
    issues.push({
      code: L13GroundingViolationCode.L13G_ENVELOPE_EMIT_WHILE_BLOCK_REQUIRED,
      severity: SEV.CRITICAL,
      subject_ref: envelope.grounded_output_id,
      message: 'block_required=true but allowed_to_emit=true',
    });
  }

  // Rewrite required without flag.
  if (envelope.rewrite_required && envelope.allowed_to_emit) {
    issues.push({
      code: L13GroundingViolationCode.L13G_REWRITE_REQUIRED_BUT_NOT_MARKED,
      severity: SEV.ERROR,
      subject_ref: envelope.grounded_output_id,
      message: 'rewrite_required=true but allowed_to_emit=true',
    });
  }

  return l13GroundingResult(issues);
}
