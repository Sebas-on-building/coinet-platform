/**
 * L12.6 — Downstream consumption validator (§12.6.19, §12.6.20).
 *
 * Detects rebuild attempts, lower-layer ref reuse, restriction bypass,
 * scenario-as-recommendation, scenario-as-final-judgment, and prediction
 * theater reuse.
 */

import {
  L12DownstreamConsumptionRequest,
  L12ScenarioDownstreamUse,
  isL12LowerLayerRebuildRef,
} from '../contracts/l12-downstream-consumption';
import {
  L12PersistenceValidationResult,
  L12PersistenceViolationCode,
  L12PersistenceViolationIssue,
  l12PersistenceIssueOf,
} from '../persistence/l12-persistence-violation-codes';

const RECOMMENDATION_RE = /\b(buy|sell|long|short|invest|enter\s+position|allocate|trade\s+now|recommendation)\b/i;
const FINAL_JUDGMENT_RE = /\b(final\s+judgment|definitive\s+answer|conclusive(?:ly)?|guaranteed|certain(?:ty)?)\b/i;
const TRADE_INSTRUCTION_RE = /\b(execute(?:s|d)?|place\s+order|enter\s+trade|stop[-\s]?loss|take[-\s]?profit)\b/i;
const PREDICTION_CERTAINTY_RE = /\b(will\s+definitely|sure\s+thing|locked\s+in|inevitable|deterministic\s+forecast)\b/i;
const REBUILD_RE = /\b(reconstruct|rebuild|recompute|regenerate)\b\s*(scenarios?)/i;

export function validateL12DownstreamConsumption(
  request: L12DownstreamConsumptionRequest,
): L12PersistenceValidationResult {
  const issues: L12PersistenceViolationIssue[] = [];

  if (request.attempts_lower_layer_rebuild) {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_DOWNSTREAM_REBUILD_ATTEMPT,
        `consumer ${request.consumer_layer} attempts lower-layer scenario rebuild`,
        request.downstream_request_id,
      ),
    );
  }

  for (const ref of request.lower_layer_refs_requested) {
    if (isL12LowerLayerRebuildRef(ref)) {
      issues.push(
        l12PersistenceIssueOf(
          L12PersistenceViolationCode.L12P_DOWNSTREAM_LOWER_LAYER_REF_REQUESTED,
          `consumer requested lower-layer ref ${ref} for scenario reconstruction`,
          request.downstream_request_id,
        ),
      );
    }
  }

  if (!request.honors_restriction_profile) {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_DOWNSTREAM_RESTRICTION_BYPASS,
        `consumer ${request.consumer_layer} bypasses restriction profile`,
        request.downstream_request_id,
      ),
    );
  }
  if (!request.honors_invalidation) {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_DOWNSTREAM_IGNORES_INVALIDATION,
        `consumer ${request.consumer_layer} ignores scenario invalidation`,
        request.downstream_request_id,
      ),
    );
  }
  if (!request.honors_path_confidence) {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_DOWNSTREAM_IGNORES_CONFIDENCE,
        `consumer ${request.consumer_layer} ignores path confidence`,
        request.downstream_request_id,
      ),
    );
  }
  if (!request.honors_readiness) {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_DOWNSTREAM_IGNORES_READINESS,
        `consumer ${request.consumer_layer} ignores readiness`,
        request.downstream_request_id,
      ),
    );
  }

  if (!request.requires_evidence) {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_DOWNSTREAM_EVIDENCE_OMISSION,
        `consumer ${request.consumer_layer} omits evidence requirement`,
        request.downstream_request_id,
      ),
    );
  }
  if (!request.requires_lineage) {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_DOWNSTREAM_LINEAGE_OMISSION,
        `consumer ${request.consumer_layer} omits lineage requirement`,
        request.downstream_request_id,
      ),
    );
  }

  // Forbidden uses (declared use text)
  const text = request.declared_use_text ?? '';
  if (REBUILD_RE.test(text)) {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_DOWNSTREAM_REBUILD_ATTEMPT,
        `declared use describes scenario rebuild: ${text}`,
        request.downstream_request_id,
      ),
    );
  }
  if (RECOMMENDATION_RE.test(text)) {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_SCENARIO_AS_RECOMMENDATION,
        `declared use frames scenario as recommendation: ${text}`,
        request.downstream_request_id,
      ),
    );
  }
  if (FINAL_JUDGMENT_RE.test(text)) {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_SCENARIO_AS_FINAL_JUDGMENT,
        `declared use frames scenario as final judgment: ${text}`,
        request.downstream_request_id,
      ),
    );
  }
  if (TRADE_INSTRUCTION_RE.test(text)) {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_SCENARIO_AS_TRADE_INSTRUCTION,
        `declared use frames scenario as trade instruction: ${text}`,
        request.downstream_request_id,
      ),
    );
  }
  if (PREDICTION_CERTAINTY_RE.test(text)) {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_SCENARIO_AS_PREDICTION_CERTAINTY,
        `declared use frames scenario as prediction certainty: ${text}`,
        request.downstream_request_id,
      ),
    );
  }

  // Use-class disallowed (e.g., L13 explanation requesting trade instruction)
  if (
    request.requested_use === L12ScenarioDownstreamUse.SCENARIO_WEIGHTING &&
    !request.scenario_id_refs &&
    !request.scenario_set_ref
  ) {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_DOWNSTREAM_LINEAGE_OMISSION,
        'scenario-weighting use missing scenario refs',
        request.downstream_request_id,
      ),
    );
  }

  return { ok: issues.length === 0, issues };
}
