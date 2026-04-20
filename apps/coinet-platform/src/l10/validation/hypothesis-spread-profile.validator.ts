/**
 * L10.2 — HypothesisSpreadProfile Validator §10.2.14.4
 */

import {
  L10HypothesisSpreadProfile,
  L10SpreadClass,
  l10SpreadClassForGap,
} from '../contracts/hypothesis-spread-profile';
import {
  L10ObjectValidationIssue,
  L10ObjectValidationReport,
  L10ObjectViolationCode,
} from './hypothesis-object-violation-codes';

const inRange01 = (n: number) => Number.isFinite(n) && n >= 0 && n <= 1;

export interface L10SpreadValidationInput {
  readonly spread: L10HypothesisSpreadProfile;
  readonly competitionSize: number;
}

export function validateL10HypothesisSpreadProfile(
  input: L10SpreadValidationInput,
): L10ObjectValidationReport {
  const issues: L10ObjectValidationIssue[] = [];
  const s = input.spread;

  if (!s.spread_profile_id) {
    issues.push({ code: L10ObjectViolationCode.SPREAD_MISSING_ID, message: 'spread_profile_id required' });
  }
  if (!s.primary_hypothesis_ref) {
    issues.push({ code: L10ObjectViolationCode.SPREAD_MISSING_PRIMARY, message: 'primary_hypothesis_ref required' });
  }
  if (input.competitionSize > 1 && !s.secondary_hypothesis_ref) {
    issues.push({
      code: L10ObjectViolationCode.SPREAD_MISSING_SECONDARY_WHEN_COMPETITION,
      message: 'secondary_hypothesis_ref required when competition_size > 1',
    });
  }
  if (s.confidence_spread === undefined || s.confidence_spread === null) {
    issues.push({ code: L10ObjectViolationCode.SPREAD_MISSING_MAGNITUDE, message: 'confidence_spread required' });
  } else if (!inRange01(s.confidence_spread)) {
    issues.push({
      code: L10ObjectViolationCode.SPREAD_MAGNITUDE_OUT_OF_RANGE,
      message: `confidence_spread=${s.confidence_spread} out of [0,1]`,
    });
  }
  if (!s.spread_class) {
    issues.push({ code: L10ObjectViolationCode.SPREAD_MISSING_CLASS, message: 'spread_class required' });
  } else if (
    inRange01(s.confidence_spread) &&
    l10SpreadClassForGap(s.confidence_spread) !== s.spread_class
  ) {
    issues.push({
      code: L10ObjectViolationCode.SPREAD_CLASS_INCONSISTENT,
      message: `spread_class ${s.spread_class} inconsistent with gap ${s.confidence_spread}`,
    });
  }
  const isNarrowClass =
    s.spread_class === L10SpreadClass.NARROW ||
    s.spread_class === L10SpreadClass.TIED;
  if (isNarrowClass && s.narrow_spread_flag !== true) {
    issues.push({
      code: L10ObjectViolationCode.SPREAD_NARROW_FLAG_HIDDEN,
      message: 'narrow / tied spread must set narrow_spread_flag=true',
    });
  }
  if (!s.lineage_refs || s.lineage_refs.length === 0) {
    issues.push({ code: L10ObjectViolationCode.SPREAD_MISSING_LINEAGE, message: 'lineage_refs required' });
  }

  return { valid: issues.length === 0, issues };
}
