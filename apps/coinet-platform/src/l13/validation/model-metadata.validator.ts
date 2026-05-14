/**
 * L13.3 — Model Metadata Validator
 *
 * §13.3.9 — Every output must carry model metadata sufficient for
 * later runtime replay. L13.3 does not implement the final grounding
 * gate yet, but the metadata must exist with valid shape.
 */

import type { L13ModelMetadata } from '../contracts/model-metadata';
import { L13ViolationSeverity } from '../contracts/l13-constitutional-types';
import { L13OutputViolationCode } from './l13-output-violation-codes';
import {
  l13OutputResult,
  type L13OutputIssue,
  type L13OutputValidationResult,
} from './_l13-output-issue';

const SEV = L13ViolationSeverity;

function missing(v: unknown): boolean {
  return (
    v === undefined ||
    v === null ||
    (typeof v === 'string' && v.trim() === '')
  );
}

export function validateL13ModelMetadata(
  meta: L13ModelMetadata,
): L13OutputValidationResult {
  const issues: L13OutputIssue[] = [];

  for (const field of [
    'model_metadata_id',
    'model_provider',
    'model_name',
    'prompt_template_id',
    'prompt_template_version',
    'input_package_hash',
    'output_policy_version',
    'generation_started_at',
    'generation_completed_at',
    'policy_version',
  ] as const) {
    if (missing(meta[field] as unknown)) {
      issues.push({
        code: L13OutputViolationCode.L13O_MODEL_METADATA_INVALID,
        severity: SEV.ERROR,
        message: `model metadata field ${field} missing`,
      });
    }
  }

  if (typeof meta.temperature !== 'number' || meta.temperature < 0) {
    issues.push({
      code: L13OutputViolationCode.L13O_MODEL_METADATA_INVALID,
      severity: SEV.ERROR,
      message: 'temperature must be a non-negative number',
    });
  }

  if (typeof meta.max_output_tokens !== 'number' || meta.max_output_tokens <= 0) {
    issues.push({
      code: L13OutputViolationCode.L13O_MODEL_METADATA_INVALID,
      severity: SEV.ERROR,
      message: 'max_output_tokens must be a positive number',
    });
  }

  if (typeof meta.post_validation_passed !== 'boolean') {
    issues.push({
      code: L13OutputViolationCode.L13O_MODEL_METADATA_INVALID,
      severity: SEV.ERROR,
      message: 'post_validation_passed must be boolean',
    });
  }

  if (
    typeof meta.safety_gate_passed !== 'boolean' ||
    typeof meta.grounding_gate_passed !== 'boolean'
  ) {
    issues.push({
      code: L13OutputViolationCode.L13O_MODEL_METADATA_INVALID,
      severity: SEV.ERROR,
      message: 'safety/grounding gate status must be boolean',
    });
  }

  if (meta.lineage_refs.length === 0) {
    issues.push({
      code: L13OutputViolationCode.L13O_MODEL_METADATA_INVALID,
      severity: SEV.ERROR,
      message: 'model metadata missing lineage_refs',
    });
  }

  return l13OutputResult(issues);
}
