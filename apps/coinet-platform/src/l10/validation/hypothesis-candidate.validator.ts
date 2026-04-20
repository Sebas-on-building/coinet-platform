/**
 * L10.2 — HypothesisCandidate Validator
 *
 * §10.2.7.4 — A candidate is illegal if family / template absent, no
 * support/challenge/confirmation/invalidation domains declared, not
 * linked to a subject, or carries finality semantics.
 */

import { L10HypothesisCandidate } from '../contracts/hypothesis-candidate';
import {
  L10HypothesisFamilyRegistry,
  getDefaultL10HypothesisFamilyRegistry,
} from '../registry/hypothesis-family.registry';
import {
  L10ObjectValidationIssue,
  L10ObjectValidationReport,
  L10ObjectViolationCode,
  checkL10ObjectLeak,
} from './hypothesis-object-violation-codes';

export function validateL10HypothesisCandidate(
  c: L10HypothesisCandidate,
  familyRegistry: L10HypothesisFamilyRegistry = getDefaultL10HypothesisFamilyRegistry(),
): L10ObjectValidationReport {
  const issues: L10ObjectValidationIssue[] = [];

  if (!c.hypothesis_candidate_id) {
    issues.push({
      code: L10ObjectViolationCode.CANDIDATE_MISSING_ID,
      message: 'hypothesis_candidate_id is required',
    });
  }
  if (!c.hypothesis_subject_id) {
    issues.push({
      code: L10ObjectViolationCode.CANDIDATE_MISSING_SUBJECT,
      message: 'hypothesis_subject_id is required',
    });
  }
  if (!c.hypothesis_family) {
    issues.push({
      code: L10ObjectViolationCode.CANDIDATE_MISSING_FAMILY,
      message: 'hypothesis_family is required',
    });
  } else if (!familyRegistry.has(c.hypothesis_family)) {
    issues.push({
      code: L10ObjectViolationCode.CANDIDATE_FAMILY_UNREGISTERED,
      message: `hypothesis_family ${c.hypothesis_family} not registered`,
    });
  }
  if (!c.hypothesis_template_id || !c.template_version) {
    issues.push({
      code: L10ObjectViolationCode.CANDIDATE_MISSING_TEMPLATE,
      message: 'hypothesis_template_id and template_version are required',
    });
  }
  if (!c.hypothesis_name) {
    issues.push({
      code: L10ObjectViolationCode.CANDIDATE_MISSING_NAME,
      message: 'hypothesis_name is required',
    });
  } else {
    const leak = checkL10ObjectLeak(`${c.hypothesis_name} ${c.description ?? ''}`);
    if (leak.leaks) {
      issues.push({
        code: L10ObjectViolationCode.CANDIDATE_NAME_LEAKS_SEMANTICS,
        message: `hypothesis_name leaks ${leak.label}`,
        details: { leak: leak.label },
      });
    }
  }

  if (c.required_support_domains.length === 0) {
    issues.push({
      code: L10ObjectViolationCode.CANDIDATE_MISSING_SUPPORT_DOMAINS,
      message: 'required_support_domains must not be empty',
    });
  }
  if (c.required_challenge_domains.length === 0) {
    issues.push({
      code: L10ObjectViolationCode.CANDIDATE_MISSING_CHALLENGE_DOMAINS,
      message: 'required_challenge_domains must not be empty',
    });
  }
  if (c.required_confirmation_domains.length === 0) {
    issues.push({
      code: L10ObjectViolationCode.CANDIDATE_MISSING_CONFIRMATION_DOMAINS,
      message: 'required_confirmation_domains must not be empty',
    });
  }
  if (c.invalidation_domains.length === 0) {
    issues.push({
      code: L10ObjectViolationCode.CANDIDATE_MISSING_INVALIDATION_DOMAINS,
      message: 'invalidation_domains must not be empty',
    });
  }

  if (
    c.hypothesis_family &&
    familyRegistry.get(c.hypothesis_family)?.requiresRegimeConditioning &&
    c.regime_conditioning_requirements.length === 0
  ) {
    issues.push({
      code: L10ObjectViolationCode.CANDIDATE_MISSING_REGIME_CONDITIONING,
      message: 'regime_conditioning_requirements required for this family',
    });
  }
  if (
    c.hypothesis_family &&
    familyRegistry.get(c.hypothesis_family)?.requiresSequenceConditioning &&
    c.sequence_conditioning_requirements.length === 0
  ) {
    issues.push({
      code: L10ObjectViolationCode.CANDIDATE_MISSING_SEQUENCE_CONDITIONING,
      message: 'sequence_conditioning_requirements required for this family',
    });
  }

  const finalityLeak = checkL10ObjectLeak(c.description ?? '');
  if (finalityLeak.leaks && (
    finalityLeak.label === 'scenario-finality' ||
    finalityLeak.label === 'fake-certainty' ||
    finalityLeak.label === 'judgment')) {
    issues.push({
      code: L10ObjectViolationCode.CANDIDATE_CARRIES_FINALITY,
      message: `candidate description carries ${finalityLeak.label} semantics`,
    });
  }

  return { valid: issues.length === 0, issues };
}
