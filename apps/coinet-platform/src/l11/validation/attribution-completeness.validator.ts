/**
 * L11.4 — Attribution Completeness Validator (§11.4.13)
 */

import {
  L11ScoreAttribution,
  L11AttributionCompletenessClass,
  ALL_L11_ATTRIBUTION_COMPLETENESS_CLASSES,
  isL11AttributionEmissible,
} from '../contracts';
import {
  L11ScoreAttributionIssue,
  L11ScoreAttributionViolationCode,
  makeL11ScoreAttributionIssue,
} from './l11-score-attribution-violation-codes';

export interface L11AttributionCompletenessValidationResult {
  readonly ok: boolean;
  readonly issues: readonly L11ScoreAttributionIssue[];
}

export function validateL11AttributionCompleteness(
  a: L11ScoreAttribution,
): L11AttributionCompletenessValidationResult {
  const issues: L11ScoreAttributionIssue[] = [];
  if (!a.attribution_completeness_class) {
    issues.push(makeL11ScoreAttributionIssue(
      L11ScoreAttributionViolationCode.L11A_COMPLETENESS_CLASS_MISSING,
      'attribution_completeness_class missing',
      { attribution_id: a.attribution_id }));
  } else if (!ALL_L11_ATTRIBUTION_COMPLETENESS_CLASSES.includes(a.attribution_completeness_class)) {
    issues.push(makeL11ScoreAttributionIssue(
      L11ScoreAttributionViolationCode.L11A_COMPLETENESS_CLASS_MISSING,
      `unknown completeness class ${a.attribution_completeness_class}`,
      { attribution_id: a.attribution_id }));
  } else if (!isL11AttributionEmissible(a.attribution_completeness_class)) {
    issues.push(makeL11ScoreAttributionIssue(
      L11ScoreAttributionViolationCode.L11A_COMPLETENESS_BLOCKED_EMITTED,
      `attribution_completeness_class ${a.attribution_completeness_class} blocks emission`,
      { attribution_id: a.attribution_id }));
  }

  // §11.4.13.2 — disclosure-required must imply COMPLETE_WITH_DISCLOSURE
  const hasDisclosure = a.missing_data_contributions.some(c => c.disclosure_required);
  if (hasDisclosure &&
      a.attribution_completeness_class === L11AttributionCompletenessClass.COMPLETE_ATTRIBUTION) {
    issues.push(makeL11ScoreAttributionIssue(
      L11ScoreAttributionViolationCode.L11A_COMPLETENESS_CLASS_MISSING,
      'attribution carries disclosure but completeness class is COMPLETE_ATTRIBUTION',
      { attribution_id: a.attribution_id }));
  }

  return { ok: issues.length === 0, issues };
}
