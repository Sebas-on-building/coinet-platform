/**
 * L7.2 — Validation Subject Class Registry
 *
 * §7.2.3.3 — Canonical registry of all legal subject classes. Wraps the
 * descriptor table and provides runtime predicates used by the subject-kind
 * validator.
 */

import {
  L7ValidationSubjectClass,
  L7SubjectScopeType,
  L7SupportPattern,
  ValidationSubjectClassDescriptor,
  SUBJECT_CLASS_DESCRIPTORS,
  getSubjectClassDescriptor,
  isRegisteredSubjectClass,
  subjectClassAllowsScope,
} from '../contracts/validation-subject-class';

export class ValidationSubjectClassRegistry {
  private readonly byClass: Map<L7ValidationSubjectClass, ValidationSubjectClassDescriptor>;

  constructor(descriptors: readonly ValidationSubjectClassDescriptor[] = SUBJECT_CLASS_DESCRIPTORS) {
    this.byClass = new Map(descriptors.map(d => [d.class, d]));
  }

  list(): readonly ValidationSubjectClassDescriptor[] {
    return Array.from(this.byClass.values());
  }

  get(cls: L7ValidationSubjectClass): ValidationSubjectClassDescriptor | undefined {
    return this.byClass.get(cls);
  }

  isRegistered(cls: string): boolean {
    return this.byClass.has(cls as L7ValidationSubjectClass);
  }

  allowsScope(cls: L7ValidationSubjectClass, scope: L7SubjectScopeType): boolean {
    return this.byClass.get(cls)?.legalScopeTypes.includes(scope) ?? false;
  }

  requiresSupportPattern(cls: L7ValidationSubjectClass, pat: L7SupportPattern): boolean {
    return this.byClass.get(cls)?.requiredSupportPatterns.includes(pat) ?? false;
  }

  requiresChallengePattern(cls: L7ValidationSubjectClass, pat: L7SupportPattern): boolean {
    return this.byClass.get(cls)?.requiredChallengePatterns.includes(pat) ?? false;
  }

  minSupportCount(cls: L7ValidationSubjectClass): number {
    return this.byClass.get(cls)?.minSupportSurfaceCount ?? 0;
  }

  minChallengeCount(cls: L7ValidationSubjectClass): number {
    return this.byClass.get(cls)?.minChallengeSurfaceCount ?? 0;
  }

  forbiddenShortcuts(cls: L7ValidationSubjectClass): readonly string[] {
    return this.byClass.get(cls)?.forbiddenShortcuts ?? [];
  }
}

const defaultSubjectClassRegistry = new ValidationSubjectClassRegistry();

export function getDefaultSubjectClassRegistry(): ValidationSubjectClassRegistry {
  return defaultSubjectClassRegistry;
}

export { getSubjectClassDescriptor, isRegisteredSubjectClass, subjectClassAllowsScope };
