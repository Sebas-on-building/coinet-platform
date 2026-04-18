/**
 * L7.4 — ValidationClassificationEngine
 *
 * §7.4.7.1–§7.4.7.3 — The only legal place that assigns a
 * `validation_class`. Must never call something confirmed while a
 * critical contradiction remains unresolved, must never ignore material
 * incompleteness, must never translate a degraded state into clean
 * confirmation.
 */

import type { L7ValidationSubjectContract } from '../contracts/validation-subject.contract';
import type {
  L7SupportRecord,
  L7ChallengeRecord,
  L7EvaluationOutput,
  L7ClassificationOutput,
} from '../runtime/l7-execution-context';
import type { L7ContradictionBundleContract } from '../contracts/contradiction-bundle.contract';
import { L7ContradictionSeverity, compareSeverity } from '../contracts/contradiction-bundle';
import { L7RuntimeViolation, L7RuntimeViolationCode } from '../validation/l7-runtime-violation-codes';
import { L7EngineResult, fail, ok } from './engine-types';

export interface ClassificationInput {
  readonly subject: L7ValidationSubjectContract;
  readonly support: readonly L7SupportRecord[];
  readonly challenge: readonly L7ChallengeRecord[];
  readonly contradiction_bundle: L7ContradictionBundleContract;
  readonly incompleteness: L7EvaluationOutput;
  readonly staleness: L7EvaluationOutput;
  readonly ambiguity: L7EvaluationOutput;
  readonly degradation: L7EvaluationOutput;
}

export function classifyValidation(
  input: ClassificationInput,
): L7EngineResult<L7ClassificationOutput> {
  const violations: L7RuntimeViolation[] = [];
  const s = input.subject;
  const modifiers = new Set<string>();
  const rationale: string[] = [];

  // Enforce evaluation-ordering: all four outputs must be present.
  for (const ev of [input.incompleteness, input.staleness, input.ambiguity, input.degradation]) {
    if (!ev) {
      violations.push(v(L7RuntimeViolationCode.CLASSIFY_BEFORE_EVALUATION, s, 'missing evaluation output'));
    }
  }
  if (violations.length > 0) return fail(violations);

  const supportStrength = Math.min(
    1,
    input.support.reduce((acc, r) => acc + r.contribution_score, 0) /
      Math.max(1, input.support.filter(r => r.hard_required).length),
  );
  const challengePressure = Math.min(
    1,
    input.contradiction_bundle.aggregate_penalty_score,
  );
  const critical =
    compareSeverity(input.contradiction_bundle.highest_severity, L7ContradictionSeverity.SEVERE) >= 0;
  const blocking =
    input.contradiction_bundle.highest_severity === L7ContradictionSeverity.BLOCKING;

  if (critical && !modifiers.has('UNRESOLVED_CONTRADICTION_PRESENT')) {
    modifiers.add('UNRESOLVED_CONTRADICTION_PRESENT');
  }
  if (input.staleness.score > 0.25 || input.staleness.affected_surface_refs.length > 0) {
    modifiers.add('STALE_SUPPORT_PRESENT');
  }
  if (input.incompleteness.score > 0.25 || input.incompleteness.affected_surface_refs.length > 0) {
    modifiers.add('INCOMPLETE_SUPPORT_PRESENT');
  }
  if (input.ambiguity.score > 0.4) {
    modifiers.add('AMBIGUOUS_DIRECTION_PRESENT');
  }
  if (input.degradation.score > 0.25) {
    modifiers.add('DEGRADED_SOURCE_PRESENT');
  }
  if (s.regime_assumption_profile.declared && s.regime_assumption_profile.compatibility_mode !== 'NONE') {
    // Partial regime compatibility is set whenever any challenge flagged regime-mismatch.
    for (const c of input.challenge) {
      if (c.family === 'REGIME_MISMATCH') modifiers.add('PARTIAL_REGIME_COMPATIBILITY');
    }
  }

  // Determine primary class.
  let validation_class: L7ClassificationOutput['validation_class'];
  if (blocking) {
    validation_class = 'CONFLICTING';
    rationale.push('BLOCKING contradiction present');
  } else if (input.incompleteness.blocks_classification) {
    validation_class = 'INSUFFICIENT';
    rationale.push('incompleteness evaluation blocks classification');
  } else if (input.staleness.blocks_classification) {
    validation_class = 'STALE';
    rationale.push('staleness policy blocks classification');
  } else if (input.degradation.blocks_classification) {
    validation_class = 'DEGRADED';
    rationale.push('degradation evaluation blocks classification');
  } else if (input.ambiguity.blocks_classification) {
    validation_class = 'AMBIGUOUS';
    rationale.push('ambiguity evaluation blocks classification');
  } else if (critical) {
    validation_class = 'CONFLICTING';
    rationale.push('SEVERE contradiction present');
  } else if (supportStrength >= 0.7 && challengePressure <= 0.2) {
    validation_class = 'CONFIRMED';
    rationale.push('strong support with minimal challenge');
  } else if (supportStrength >= 0.4) {
    validation_class = 'WEAKLY_CONFIRMED';
    rationale.push('moderate support');
  } else {
    validation_class = 'INSUFFICIENT';
    rationale.push('support strength below weakly-confirmed threshold');
  }

  // §7.4.7.3 — never confirm while critical contradiction remains unresolved.
  if (
    (validation_class === 'CONFIRMED' || validation_class === 'WEAKLY_CONFIRMED') &&
    critical
  ) {
    violations.push(v(L7RuntimeViolationCode.CLASSIFY_IGNORED_CRITICAL_CONTRADICTION, s, `class ${validation_class} but critical contradiction present`));
  }
  if (validation_class === 'CONFIRMED' && (modifiers.has('STALE_SUPPORT_PRESENT') || modifiers.has('INCOMPLETE_SUPPORT_PRESENT'))) {
    violations.push(v(L7RuntimeViolationCode.CLASSIFY_DEGRADED_AS_CLEAN, s, 'CONFIRMED with stale/incomplete modifiers present'));
  }
  if (validation_class === 'CONFIRMED' && modifiers.has('AMBIGUOUS_DIRECTION_PRESENT')) {
    violations.push(v(L7RuntimeViolationCode.CLASSIFY_SILENT_AMBIGUITY, s, 'CONFIRMED but AMBIGUOUS_DIRECTION_PRESENT'));
  }

  if (violations.length > 0) return fail(violations);

  return ok({
    validation_subject_id: s.validation_subject_id,
    validation_class,
    modifiers: [...modifiers].sort(),
    support_strength_score: supportStrength,
    rationale_codes: rationale.sort(),
  });
}

function v(code: L7RuntimeViolationCode, s: L7ValidationSubjectContract, detail: string): L7RuntimeViolation {
  return {
    code,
    source: 'validation-classification-engine',
    nodeId: null,
    validation_run_id: null,
    validation_subject_id: s.validation_subject_id,
    detail,
    context: {},
  };
}
