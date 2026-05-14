/**
 * L12.7 — Extension Classifier (§12.7.10)
 *
 * Pure classification engine: given an `L12ExtensionRequest`, produces
 * the canonical `L12ExtensionAssessment` and rejects any request that
 * weakens trigger / invalidation / no-rebuild law, or that enables
 * prediction / recommendation / final-judgment outputs.
 *
 * The classifier never mutates the request. It never grants
 * "ADDITIVE_SAFE" to a surface mapped as `BREAKING_SEMANTIC` or
 * `PROHIBITED`. It always rejects `PROHIBITED` outright.
 */

import {
  L12ExtensionClassification,
  L12ExtensionRequest,
  L12ExtensionAssessment,
  L12_DEFAULT_SURFACE_CLASSIFICATION,
  L12_CLASSIFICATIONS_REQUIRING_MIGRATION,
  L12_CLASSIFICATIONS_REQUIRING_RECERTIFICATION,
  L12_CLASSIFICATIONS_REQUIRING_REPLAY_BACKFILL,
  L12_EXTENSION_POLICY_VERSION,
} from '../contracts/l12-extension-policy';

export interface L12ExtensionClassifierInput {
  readonly request: L12ExtensionRequest;
}

/**
 * Classify a single extension request. The classifier:
 *   1. Demands declared classification.
 *   2. Auto-rejects PROHIBITED.
 *   3. Auto-rejects requests that weaken trigger / invalidation /
 *      no-rebuild law, or enable prediction / recommendation / final
 *      judgment.
 *   4. Down-classifies to the canonical surface classification when
 *      the requester proposes an under-strength class.
 *   5. Validates declared migration / recertification / backfill
 *      flags match the final classification.
 */
export function classifyL12ExtensionRequest(
  input: L12ExtensionClassifierInput,
): L12ExtensionAssessment {
  const r = input?.request;
  const violations: string[] = [];

  if (!r) {
    return {
      extension_request_id: '',
      extension_surface: '' as never,
      final_classification: L12ExtensionClassification.PROHIBITED,
      admitted: false,
      migration_required: false,
      recertification_required: false,
      replay_backfill_required: false,
      violation_codes: ['L12F_EXTENSION_UNCLASSIFIED'],
      reason: 'request is null',
      policy_version: L12_EXTENSION_POLICY_VERSION,
    };
  }

  if (!r.proposed_classification) {
    violations.push('L12F_EXTENSION_UNCLASSIFIED');
  }

  // Hard rejections — categorical bans (§12.7.10 Prohibited).
  if (r.weakens_trigger_law) {
    violations.push('L12F_WEAKENS_TRIGGER_REQUIREMENT');
  }
  if (r.weakens_invalidation_law) {
    violations.push('L12F_WEAKENS_INVALIDATION_REQUIREMENT');
  }
  if (r.weakens_no_rebuild_law) {
    violations.push('L12F_WEAKENS_NO_REBUILD_LAW');
  }
  if (r.enables_prediction_output) {
    violations.push('L12F_PREDICTION_THEATER_BREACH');
  }
  if (r.enables_recommendation_output) {
    violations.push('L12F_RECOMMENDATION_LEAK');
  }
  if (r.enables_final_judgment_output) {
    violations.push('L12F_FINAL_JUDGMENT_LEAK');
  }
  if (r.bypasses_l5_persistence) {
    violations.push('L12F_L5_PERSISTENCE_LAW_NOT_CERTIFIED');
  }
  if (r.removes_l11_score_context_requirement) {
    violations.push('L12F_L11_SCORE_CONTEXT_LAW_NOT_CERTIFIED');
  }

  // Auto-classify based on canonical surface mapping.
  const canonical: L12ExtensionClassification =
    r.extension_surface
      ? L12_DEFAULT_SURFACE_CLASSIFICATION[r.extension_surface]
      : L12ExtensionClassification.PROHIBITED;

  // Final classification = max(proposed, canonical) by severity.
  const sevRank: Record<L12ExtensionClassification, number> = {
    [L12ExtensionClassification.ADDITIVE_SAFE]: 0,
    [L12ExtensionClassification.BACKWARD_COMPATIBLE]: 1,
    [L12ExtensionClassification.RECERTIFICATION_REQUIRED]: 2,
    [L12ExtensionClassification.MIGRATION_REQUIRED]: 3,
    [L12ExtensionClassification.BREAKING_SEMANTIC]: 4,
    [L12ExtensionClassification.PROHIBITED]: 5,
  };
  const proposed = r.proposed_classification ??
    L12ExtensionClassification.PROHIBITED;
  const finalClassification: L12ExtensionClassification =
    sevRank[proposed] >= sevRank[canonical] ? proposed : canonical;

  if (finalClassification === L12ExtensionClassification.PROHIBITED) {
    violations.push('L12F_PROHIBITED_EXTENSION');
  }

  const migrationRequired =
    L12_CLASSIFICATIONS_REQUIRING_MIGRATION.has(finalClassification);
  const recertRequired =
    L12_CLASSIFICATIONS_REQUIRING_RECERTIFICATION.has(finalClassification);
  const backfillRequired =
    L12_CLASSIFICATIONS_REQUIRING_REPLAY_BACKFILL.has(finalClassification);

  if (migrationRequired && !r.migration_declared) {
    violations.push('L12F_EXTENSION_UNCLASSIFIED');
  }
  if (recertRequired && !r.recertification_declared) {
    violations.push('L12F_EXTENSION_UNCLASSIFIED');
  }
  if (backfillRequired && !r.replay_backfill_declared) {
    violations.push('L12F_EXTENSION_UNCLASSIFIED');
  }

  const admitted = violations.length === 0
    && finalClassification !== L12ExtensionClassification.PROHIBITED;

  const reason = admitted
    ? `admitted as ${finalClassification}`
    : `rejected: ${violations.join(', ') || finalClassification}`;

  return {
    extension_request_id: r.extension_request_id,
    extension_surface: r.extension_surface,
    final_classification: finalClassification,
    admitted,
    migration_required: migrationRequired,
    recertification_required: recertRequired,
    replay_backfill_required: backfillRequired,
    violation_codes: violations,
    reason,
    policy_version: L12_EXTENSION_POLICY_VERSION,
  };
}
