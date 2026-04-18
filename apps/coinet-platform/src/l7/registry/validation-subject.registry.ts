/**
 * L7.2 — Validation Subject Template Registry
 *
 * §7.2.7.2 — The ValidationSubjectRegistry holds legal subject templates,
 * their class bindings, scope legality, evidence profile, and versions.
 * A runtime ValidationSubject must correspond to a registered template.
 */

import {
  L7ValidationSubject,
  L7EvidenceRequirements,
} from '../contracts/validation-subject';
import {
  L7ValidationSubjectClass,
  L7SubjectScopeType,
} from '../contracts/validation-subject-class';
import { L7MaterialityClass } from '../contracts/validation-materiality';

export interface ValidationSubjectTemplate {
  readonly subject_template_id: string;
  readonly claim_family: string;
  readonly claim_name: string;
  readonly claim_version: string;
  readonly subject_class: L7ValidationSubjectClass;
  readonly hybrid_subject_classes: readonly L7ValidationSubjectClass[];
  readonly legal_scope_types: readonly L7SubjectScopeType[];
  readonly materiality_posture: L7MaterialityClass;
  readonly evidence_profile: L7EvidenceRequirements;
  readonly description: string;
}

export class ValidationSubjectRegistry {
  private readonly templatesById: Map<string, ValidationSubjectTemplate> = new Map();
  private readonly versionsByKey: Map<string, string[]> = new Map();

  register(tpl: ValidationSubjectTemplate): void {
    if (this.templatesById.has(tpl.subject_template_id)) {
      throw new Error(`duplicate subject_template_id: ${tpl.subject_template_id}`);
    }
    this.templatesById.set(tpl.subject_template_id, tpl);
    const key = this.templateKey(tpl.claim_family, tpl.claim_name);
    const versions = this.versionsByKey.get(key) ?? [];
    if (!versions.includes(tpl.claim_version)) versions.push(tpl.claim_version);
    this.versionsByKey.set(key, versions);
  }

  get(subject_template_id: string): ValidationSubjectTemplate | undefined {
    return this.templatesById.get(subject_template_id);
  }

  has(subject_template_id: string): boolean {
    return this.templatesById.has(subject_template_id);
  }

  list(): readonly ValidationSubjectTemplate[] {
    return Array.from(this.templatesById.values());
  }

  versionsOf(claim_family: string, claim_name: string): readonly string[] {
    return this.versionsByKey.get(this.templateKey(claim_family, claim_name)) ?? [];
  }

  templateMatchesSubject(subject: L7ValidationSubject): boolean {
    const tpl = this.templatesById.get(subject.subject_template_id);
    if (!tpl) return false;
    if (tpl.claim_family !== subject.claim_family) return false;
    if (tpl.claim_name !== subject.claim_name) return false;
    if (tpl.claim_version !== subject.claim_version) return false;
    if (tpl.subject_class !== subject.subject_class) return false;
    if (!tpl.legal_scope_types.includes(subject.scope_type)) return false;
    return true;
  }

  clear(): void {
    this.templatesById.clear();
    this.versionsByKey.clear();
  }

  private templateKey(fam: string, name: string): string {
    return `${fam}::${name}`;
  }
}

const defaultSubjectRegistry = new ValidationSubjectRegistry();

export function getDefaultSubjectRegistry(): ValidationSubjectRegistry {
  return defaultSubjectRegistry;
}
