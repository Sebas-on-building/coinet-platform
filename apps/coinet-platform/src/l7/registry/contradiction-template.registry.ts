/**
 * L7.5 — Contradiction Template Registry
 *
 * §7.5.5.4 — Registers governed contradiction templates. Validates
 * template completeness, family registration, subject-class
 * compatibility, support/challenge pattern legality, and supports
 * versioning.
 *
 * §7.5.5.6 — No production contradiction rule may exist outside this
 * registry unless explicitly marked `EXPERIMENTAL` and blocked from
 * production materialization.
 */

import {
  L7ContradictionTemplate,
  L7_CONTRADICTION_TEMPLATES,
  isL7ContradictionTemplateRegistered,
  L7ContradictionTemplateBlockingPolicy,
  L7ContradictionTemplateCapPolicy,
} from '../contracts/contradiction-template';
import { L7ContradictionFamilyClass } from '../contracts/contradiction-family';
import { L7ValidationSubjectClass } from '../contracts/validation-subject-class';

export class L7ContradictionTemplateRegistry {
  private readonly byId: Map<string, L7ContradictionTemplate>;

  constructor(
    templates: readonly L7ContradictionTemplate[] = L7_CONTRADICTION_TEMPLATES,
  ) {
    this.byId = new Map(templates.map(t => [t.template_id, t]));
  }

  list(): readonly L7ContradictionTemplate[] {
    return Array.from(this.byId.values());
  }

  listProduction(): readonly L7ContradictionTemplate[] {
    return this.list().filter(t => t.status === 'PRODUCTION');
  }

  listExperimental(): readonly L7ContradictionTemplate[] {
    return this.list().filter(t => t.status === 'EXPERIMENTAL');
  }

  get(id: string): L7ContradictionTemplate | undefined {
    return this.byId.get(id);
  }

  isRegistered(id: string): boolean {
    return isL7ContradictionTemplateRegistered(id);
  }

  listByFamily(family: L7ContradictionFamilyClass): readonly L7ContradictionTemplate[] {
    return this.list().filter(t => t.contradiction_family === family);
  }

  listBySubjectClass(
    subjectClass: L7ValidationSubjectClass,
  ): readonly L7ContradictionTemplate[] {
    return this.list().filter(t =>
      t.applicable_subject_classes.includes(subjectClass),
    );
  }

  listByValidationFamily(familyId: string): readonly L7ContradictionTemplate[] {
    return this.list().filter(t => t.applicable_validation_families.includes(familyId));
  }

  /**
   * §7.5.5.5 — Template execution law. Returns true if the template has
   * a live blocking or cap policy and is production-grade.
   */
  isProductionExecutable(id: string): boolean {
    const t = this.byId.get(id);
    if (!t) return false;
    if (t.status !== 'PRODUCTION') return false;
    const noBlocking =
      t.blocking_policy === L7ContradictionTemplateBlockingPolicy.NEVER_BLOCKS;
    const noCap = t.cap_policy === L7ContradictionTemplateCapPolicy.NEVER_CAPS;
    return !(noBlocking && noCap);
  }
}

const defaultContradictionTemplateRegistry = new L7ContradictionTemplateRegistry();

export function getDefaultContradictionTemplateRegistry(): L7ContradictionTemplateRegistry {
  return defaultContradictionTemplateRegistry;
}
