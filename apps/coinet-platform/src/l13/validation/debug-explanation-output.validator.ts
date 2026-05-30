/**
 * L13.7 — Debug Explanation Output Validator
 *
 * §13.7.4 — Internal-only mode. The validator confirms structural
 * integrity and the `internal_only=true` invariant. The
 * output-mode envelope validator refuses to wrap a debug payload
 * into a user-emittable envelope.
 */

import type { L13DebugExplanationOutput } from '../contracts/debug-explanation-output';
import { L13ViolationSeverity } from '../contracts/l13-constitutional-types';
import { L13ModeViolationCode } from './l13-mode-violation-codes';
import {
  l13ModeResult,
  type L13ModeIssue,
  type L13ModeValidationResult,
} from './_l13-mode-issue';

const SEV = L13ViolationSeverity;

export function validateL13DebugExplanationOutput(
  debug: L13DebugExplanationOutput,
): L13ModeValidationResult {
  const issues: L13ModeIssue[] = [];
  if (!debug.debug_explanation_id) {
    issues.push({
      code: L13ModeViolationCode.L13M_MODE_PAYLOAD_MISSING,
      severity: SEV.CRITICAL,
      message: 'debug_explanation_id missing',
    });
  }
  if (!debug.replay_hash) {
    issues.push({
      code: L13ModeViolationCode.L13M_MODE_REPLAY_HASH_MISSING,
      severity: SEV.CRITICAL,
      message: 'replay_hash missing',
    });
  }
  if (debug.lineage_refs.length === 0) {
    issues.push({
      code: L13ModeViolationCode.L13M_MODE_LINEAGE_MISSING,
      severity: SEV.CRITICAL,
      message: 'lineage_refs empty',
    });
  }
  if (debug.internal_only !== true) {
    issues.push({
      code: L13ModeViolationCode.L13M_DEBUG_MODE_USER_EMITTED,
      severity: SEV.CRITICAL,
      message: 'internal_only must be true',
    });
  }
  if (!debug.developer_narrative) {
    issues.push({
      code: L13ModeViolationCode.L13M_MODE_PAYLOAD_MISSING,
      severity: SEV.CRITICAL,
      message: 'developer_narrative missing',
    });
  }
  return l13ModeResult(issues);
}
