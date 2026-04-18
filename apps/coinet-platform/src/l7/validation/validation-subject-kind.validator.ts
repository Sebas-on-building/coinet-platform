/**
 * L7.2 — Validation Subject Kind Validator
 *
 * §7.2.3.6 — Blocks invalid class use, illegal class combinations,
 * under-declared hybrid subjects, narrative-only phrasing, and scope-
 * invalid claims. Operates on a ValidationSubject before the contract
 * validator runs.
 */

import {
  L7ValidationSubject,
} from '../contracts/validation-subject';
import {
  L7ValidationSubjectClass,
  L7SupportPattern,
} from '../contracts/validation-subject-class';
import {
  L7ObjectViolationCode,
} from '../contracts/validation-output-class';
import {
  ValidationSubjectClassRegistry,
  getDefaultSubjectClassRegistry,
} from '../registry/validation-subject-class.registry';
import {
  containsForbiddenNaming,
} from '../contracts/l7-boundary';

export interface ValidationSubjectKindIssue {
  readonly code: L7ObjectViolationCode;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export interface ValidationSubjectKindReport {
  readonly valid: boolean;
  readonly issues: readonly ValidationSubjectKindIssue[];
}

/**
 * Classify a flat list of primitive refs into support patterns. This is a
 * deterministic heuristic based on standard naming conventions used by L6
 * feature/event families (e.g. `l6.feature.price.*`, `l6.event.funding.*`).
 * Callers may supply an explicit `patternMap` to override.
 */
export function classifySupportPatterns(
  refs: readonly string[],
  explicitMap?: Record<string, L7SupportPattern>,
): readonly L7SupportPattern[] {
  const out: Set<L7SupportPattern> = new Set();
  for (const ref of refs) {
    if (explicitMap && ref in explicitMap) {
      out.add(explicitMap[ref]);
      continue;
    }
    const r = ref.toLowerCase();
    if (r.includes('price') || r.includes('ohlcv')) out.add('PRICE_FAMILY');
    if (r.includes('flow') || r.includes('netflow') || r.includes('inflow') || r.includes('outflow')) out.add('FLOW_FAMILY');
    if (r.includes('participation') || r.includes('active') || r.includes('holder')) out.add('PARTICIPATION_FAMILY');
    if (r.includes('onchain') || r.includes('chain.')) out.add('ONCHAIN_FAMILY');
    if (r.includes('funding')) out.add('FUNDING_FAMILY');
    if (r.includes('liquidity')) out.add('LIQUIDITY_FAMILY');
    if (r.includes('revenue') || r.includes('fees')) out.add('REVENUE_FAMILY');
    if (r.includes('tvl')) out.add('TVL_FAMILY');
    if (r.includes('sentiment') || r.includes('social')) out.add('SENTIMENT_FAMILY');
    if (r.includes('structural') || r.includes('structure')) out.add('STRUCTURAL_FAMILY');
    if (r.includes('event.') || r.includes('unlock') || r.includes('governance')) out.add('EVENT_FAMILY');
  }
  return Array.from(out);
}

/**
 * Simple loose-text detector. Layer 7 must not validate free text.
 */
function looksLikeLooseTextOpinion(subject: L7ValidationSubject): boolean {
  if (!subject.claim_name) return true;
  if (subject.claim_name.trim().length === 0) return true;
  const wordCount = subject.claim_name.trim().split(/\s+/).length;
  if (wordCount > 8) return true;
  if (wordCount >= 4 && !/^[a-z][a-z0-9_]*$/.test(subject.claim_name.trim())) return true;
  if (subject.supporting_primitive_refs.length === 0) return true;
  if (subject.required_confirmation_surfaces.length === 0) return true;
  return false;
}

export function validateSubjectKind(
  subject: L7ValidationSubject,
  registry: ValidationSubjectClassRegistry = getDefaultSubjectClassRegistry(),
  options: { primitivePatternMap?: Record<string, L7SupportPattern> } = {},
): ValidationSubjectKindReport {
  const issues: ValidationSubjectKindIssue[] = [];

  if (looksLikeLooseTextOpinion(subject)) {
    issues.push({
      code: L7ObjectViolationCode.SUBJECT_LOOSE_TEXT_OPINION,
      message: 'subject appears to be a loose text opinion',
      details: {
        claim_name: subject.claim_name,
        support_refs: subject.supporting_primitive_refs.length,
      },
    });
  }

  if (!registry.isRegistered(subject.subject_class)) {
    issues.push({
      code: L7ObjectViolationCode.SUBJECT_UNREGISTERED_CLASS,
      message: `unregistered subject_class: ${subject.subject_class}`,
    });
  }

  for (const h of subject.hybrid_subject_classes) {
    if (h === subject.subject_class) continue;
    if (!registry.isRegistered(h)) {
      issues.push({
        code: L7ObjectViolationCode.SUBJECT_UNREGISTERED_CLASS,
        message: `unregistered hybrid subject_class: ${h}`,
      });
    }
  }

  const primaryDescriptor = registry.get(subject.subject_class);
  if (primaryDescriptor) {
    if (!registry.allowsScope(subject.subject_class, subject.scope_type)) {
      issues.push({
        code: L7ObjectViolationCode.SUBJECT_SCOPE_ILLEGAL_FOR_CLASS,
        message: `scope ${subject.scope_type} not legal for class ${subject.subject_class}`,
      });
    }

    const supportPatterns = classifySupportPatterns(
      subject.supporting_primitive_refs,
      options.primitivePatternMap,
    );
    const challengePatterns = classifySupportPatterns(
      subject.required_challenge_surfaces,
      options.primitivePatternMap,
    );

    for (const required of primaryDescriptor.requiredSupportPatterns) {
      if (!supportPatterns.includes(required)) {
        issues.push({
          code: L7ObjectViolationCode.SUBJECT_MISSING_SUPPORT,
          message: `required support pattern missing: ${required}`,
          details: { found: supportPatterns },
        });
      }
    }
    for (const required of primaryDescriptor.requiredChallengePatterns) {
      if (!challengePatterns.includes(required)) {
        issues.push({
          code: L7ObjectViolationCode.SUBJECT_MISSING_CHALLENGE,
          message: `required challenge pattern missing: ${required}`,
          details: { found: challengePatterns },
        });
      }
    }

    if (subject.supporting_primitive_refs.length < primaryDescriptor.minSupportSurfaceCount) {
      issues.push({
        code: L7ObjectViolationCode.SUBJECT_MISSING_SUPPORT,
        message: `insufficient support surfaces: ${subject.supporting_primitive_refs.length} < ${primaryDescriptor.minSupportSurfaceCount}`,
      });
    }
    if (subject.required_challenge_surfaces.length < primaryDescriptor.minChallengeSurfaceCount) {
      issues.push({
        code: L7ObjectViolationCode.SUBJECT_MISSING_CHALLENGE,
        message: `insufficient challenge surfaces: ${subject.required_challenge_surfaces.length} < ${primaryDescriptor.minChallengeSurfaceCount}`,
      });
    }

    for (const shortcut of primaryDescriptor.forbiddenShortcuts) {
      const token = shortcut.toLowerCase();
      if (
        subject.claim_name.toLowerCase().includes(token) ||
        subject.description.toLowerCase().includes(token)
      ) {
        issues.push({
          code: L7ObjectViolationCode.SUBJECT_FORBIDDEN_SHORTCUT,
          message: `uses forbidden shortcut: ${shortcut}`,
        });
      }
    }
  }

  if (subject.hybrid_subject_classes.length > 0) {
    const declared = new Set<L7ValidationSubjectClass>([
      subject.subject_class,
      ...subject.hybrid_subject_classes,
    ]);
    if (declared.size < 2) {
      issues.push({
        code: L7ObjectViolationCode.SUBJECT_UNDERDECLARED_HYBRID,
        message: 'hybrid_subject_classes declared but collapses to a single class',
      });
    }
  }

  if (containsForbiddenNaming(subject.claim_name) || containsForbiddenNaming(subject.description)) {
    issues.push({
      code: L7ObjectViolationCode.SUBJECT_JUDGMENT_LEAK,
      message: 'subject naming leaks scenario/judgment/recommendation language',
    });
  }

  return { valid: issues.length === 0, issues };
}
