/**
 * L13.3 — Confidence Disclosure Validator
 *
 * §13.3.6 — Validates the L13.3 confidence disclosure that travels
 * with every output. Confidence band required, narrowing reasons
 * mandatory when capping, confident language not allowed under caps,
 * uncertainty language required under active invalidation, no
 * probability theater.
 */

import {
  containsL13ForbiddenConfidencePhrase,
  detectL13ProbabilityTheater,
  L13ConfidenceDisclosure,
} from '../contracts/confidence-disclosure';
import { L13ExplanationConfidenceBand } from '../contracts/confidence-breakdown';
import { L13ViolationSeverity } from '../contracts/l13-constitutional-types';
import { L13OutputViolationCode } from './l13-output-violation-codes';
import {
  l13OutputResult,
  type L13OutputIssue,
  type L13OutputValidationResult,
} from './_l13-output-issue';

const SEV = L13ViolationSeverity;

export function validateL13ConfidenceDisclosure(
  disclosure: L13ConfidenceDisclosure,
): L13OutputValidationResult {
  const issues: L13OutputIssue[] = [];

  if (
    !disclosure.confidence_disclosure_id ||
    !disclosure.explanation_confidence_band
  ) {
    issues.push({
      code: L13OutputViolationCode.L13O_CONFIDENCE_DISCLOSURE_INVALID,
      severity: SEV.ERROR,
      message: 'confidence disclosure missing id or band',
    });
  }

  if (disclosure.evidence_refs.length === 0) {
    issues.push({
      code: L13OutputViolationCode.L13O_CONFIDENCE_DISCLOSURE_INVALID,
      severity: SEV.CRITICAL,
      message: 'confidence disclosure missing evidence_refs',
    });
  }

  if (
    disclosure.confidence_cap_refs.length > 0 &&
    disclosure.may_use_confident_language
  ) {
    issues.push({
      code: L13OutputViolationCode.L13O_CONFIDENCE_DISCLOSURE_INVALID,
      severity: SEV.CRITICAL,
      message:
        'may_use_confident_language=true while confidence_cap_refs are present',
    });
  }

  if (
    disclosure.confidence_cap_refs.length > 0 &&
    disclosure.confidence_narrowing_reasons.length === 0
  ) {
    issues.push({
      code: L13OutputViolationCode.L13O_CONFIDENCE_DISCLOSURE_INVALID,
      severity: SEV.ERROR,
      message:
        'confidence_cap_refs present but no narrowing reasons listed',
    });
  }

  if (
    disclosure.explanation_confidence_band ===
      L13ExplanationConfidenceBand.BLOCKED &&
    disclosure.may_use_confident_language
  ) {
    issues.push({
      code: L13OutputViolationCode.L13O_CONFIDENCE_DISCLOSURE_INVALID,
      severity: SEV.CRITICAL,
      message: 'BLOCKED band cannot use confident language',
    });
  }

  // §13.3.6 — Confidence statement must not contain forbidden
  // certainty phrases or probability theater.
  if (disclosure.confidence_statement) {
    if (
      containsL13ForbiddenConfidencePhrase(disclosure.confidence_statement)
    ) {
      issues.push({
        code: L13OutputViolationCode.L13O_CERTAINTY_LEAK,
        severity: SEV.CRITICAL,
        message: 'confidence statement contains forbidden certainty phrase',
      });
    }
    if (detectL13ProbabilityTheater(disclosure.confidence_statement)) {
      issues.push({
        code: L13OutputViolationCode.L13O_CONFIDENCE_AS_PROBABILITY,
        severity: SEV.CRITICAL,
        message:
          'confidence statement uses probability theater (e.g. "70% chance")',
      });
    }
  } else {
    issues.push({
      code: L13OutputViolationCode.L13O_CONFIDENCE_DISCLOSURE_INVALID,
      severity: SEV.ERROR,
      message: 'confidence_statement missing',
    });
  }

  // forbidden_confidence_phrases must be attached.
  if (disclosure.forbidden_confidence_phrases.length === 0) {
    issues.push({
      code: L13OutputViolationCode.L13O_CONFIDENCE_DISCLOSURE_INVALID,
      severity: SEV.WARNING,
      message: 'forbidden_confidence_phrases list is empty',
    });
  }

  return l13OutputResult(issues);
}
