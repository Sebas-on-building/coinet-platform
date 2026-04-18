/**
 * L7.5 — Contradiction Template Validator
 *
 * §7.5.5.2 / §7.5.5.4 — Validates that a contradiction template is
 * complete, registered, family-legal, subject-class-legal, and
 * pattern-legal. §7.5.5.6 — Only production templates may power
 * production detection; experimental templates must be blocked.
 */

import {
  L7ContradictionTemplate,
  L7ContradictionTemplateBlockingPolicy,
  L7ContradictionTemplateCapPolicy,
} from '../contracts/contradiction-template';
import {
  L7ContradictionFamilyClass,
  isL7ContradictionFamilyClass,
  getL7ContradictionFamilyDescriptor,
} from '../contracts/contradiction-family';
import { L7ValidationSubjectClass } from '../contracts/validation-subject-class';
import {
  getDefaultContradictionTemplateRegistry,
  L7ContradictionTemplateRegistry,
} from '../registry/contradiction-template.registry';
import {
  L7SemanticViolation,
  L7SemanticViolationCode,
} from './l7-semantic-violation-codes';

function v(
  code: L7SemanticViolationCode,
  detail: string,
  extra: Partial<L7SemanticViolation> = {},
): L7SemanticViolation {
  return { code, detail, ...extra };
}

export class L7ContradictionTemplateValidator {
  constructor(
    private readonly registry: L7ContradictionTemplateRegistry = getDefaultContradictionTemplateRegistry(),
  ) {}

  /**
   * §7.5.5.2 — Shape / completeness validation.
   */
  validateStructure(t: L7ContradictionTemplate): readonly L7SemanticViolation[] {
    const violations: L7SemanticViolation[] = [];

    if (!t.template_id || t.template_id.trim() === '') {
      violations.push(v(L7SemanticViolationCode.TEMPLATE_INVALID, 'template_id empty', {}));
    }
    if (!t.template_name) {
      violations.push(v(L7SemanticViolationCode.TEMPLATE_INVALID, 'template_name empty', {}));
    }
    if (!t.template_version) {
      violations.push(v(L7SemanticViolationCode.TEMPLATE_INVALID, 'template_version empty', {}));
    }

    if (!isL7ContradictionFamilyClass(t.contradiction_family)) {
      violations.push(
        v(
          L7SemanticViolationCode.TEMPLATE_FAMILY_UNKNOWN,
          `template ${t.template_id} references unknown family ${t.contradiction_family}`,
          { templateId: t.template_id, contradictionFamily: t.contradiction_family },
        ),
      );
    }

    if (t.applicable_subject_classes.length === 0) {
      violations.push(
        v(
          L7SemanticViolationCode.TEMPLATE_SUBJECT_CLASS_ILLEGAL,
          `template ${t.template_id} declares no applicable subject classes`,
          { templateId: t.template_id },
        ),
      );
    }

    if (t.required_support_surface_patterns.length === 0) {
      violations.push(
        v(
          L7SemanticViolationCode.TEMPLATE_SUPPORT_PATTERN_MISSING,
          `template ${t.template_id} declares no required support patterns`,
          { templateId: t.template_id },
        ),
      );
    }

    if (t.required_challenge_surface_patterns.length === 0) {
      violations.push(
        v(
          L7SemanticViolationCode.TEMPLATE_CHALLENGE_PATTERN_MISSING,
          `template ${t.template_id} declares no required challenge patterns`,
          { templateId: t.template_id },
        ),
      );
    }

    if (!t.severity_model_class) {
      violations.push(
        v(
          L7SemanticViolationCode.TEMPLATE_SEVERITY_MODEL_MISSING,
          `template ${t.template_id} has no severity model`,
          { templateId: t.template_id },
        ),
      );
    }

    if (
      t.blocking_policy === L7ContradictionTemplateBlockingPolicy.NEVER_BLOCKS &&
      t.cap_policy === L7ContradictionTemplateCapPolicy.NEVER_CAPS
    ) {
      violations.push(
        v(
          L7SemanticViolationCode.TEMPLATE_BLOCKING_CAP_BOTH_MISSING,
          `template ${t.template_id} must either block or cap`,
          { templateId: t.template_id },
        ),
      );
    }

    const lineage = t.lineage_requirements;
    if (!lineage) {
      violations.push(
        v(
          L7SemanticViolationCode.TEMPLATE_LINEAGE_INCOMPLETE,
          `template ${t.template_id} has no lineage_requirements`,
          { templateId: t.template_id },
        ),
      );
    } else {
      if (
        !lineage.requires_support_lineage &&
        !lineage.requires_challenge_lineage &&
        !lineage.requires_event_lineage
      ) {
        violations.push(
          v(
            L7SemanticViolationCode.TEMPLATE_LINEAGE_INCOMPLETE,
            `template ${t.template_id} requires no lineage at all`,
            { templateId: t.template_id },
          ),
        );
      }
    }

    return violations;
  }

  /**
   * §7.5.5.4 — Cross-legality validation against the contradiction
   * ontology and subject class vocabulary.
   */
  validateCrossLegality(t: L7ContradictionTemplate): readonly L7SemanticViolation[] {
    const violations: L7SemanticViolation[] = [];
    const familyDesc = getL7ContradictionFamilyDescriptor(t.contradiction_family);
    if (!familyDesc) {
      violations.push(
        v(
          L7SemanticViolationCode.TEMPLATE_FAMILY_UNKNOWN,
          `family ${t.contradiction_family} not registered`,
          { templateId: t.template_id, contradictionFamily: t.contradiction_family },
        ),
      );
      return violations;
    }

    const legalSubjectSet = new Set(familyDesc.legalSubjectClasses);
    for (const sc of t.applicable_subject_classes) {
      if (!legalSubjectSet.has(sc)) {
        violations.push(
          v(
            L7SemanticViolationCode.TEMPLATE_SUBJECT_CLASS_ILLEGAL,
            `template ${t.template_id} claims subject class ${sc} not legal for family ${t.contradiction_family}`,
            {
              templateId: t.template_id,
              contradictionFamily: t.contradiction_family,
              subjectClass: sc,
            },
          ),
        );
      }
    }

    const supportDomainSet = new Set(familyDesc.supportDomains);
    for (const p of t.required_support_surface_patterns) {
      if (!supportDomainSet.has(p)) {
        violations.push(
          v(
            L7SemanticViolationCode.TEMPLATE_SUPPORT_PATTERN_MISSING,
            `template ${t.template_id} requires support pattern ${p} not declared by family ${t.contradiction_family}`,
            { templateId: t.template_id, contradictionFamily: t.contradiction_family },
          ),
        );
      }
    }

    const challengeDomainSet = new Set(familyDesc.challengeDomains);
    for (const p of t.required_challenge_surface_patterns) {
      if (!challengeDomainSet.has(p)) {
        violations.push(
          v(
            L7SemanticViolationCode.TEMPLATE_CHALLENGE_PATTERN_MISSING,
            `template ${t.template_id} requires challenge pattern ${p} not declared by family ${t.contradiction_family}`,
            { templateId: t.template_id, contradictionFamily: t.contradiction_family },
          ),
        );
      }
    }

    return violations;
  }

  /**
   * §7.5.5.6 — Production template legality.
   */
  validateProduction(t: L7ContradictionTemplate): readonly L7SemanticViolation[] {
    const violations: L7SemanticViolation[] = [];
    if (t.status !== 'PRODUCTION') {
      violations.push(
        v(
          L7SemanticViolationCode.TEMPLATE_OUTSIDE_REGISTRY,
          `template ${t.template_id} is not PRODUCTION`,
          { templateId: t.template_id },
        ),
      );
    }
    if (!this.registry.isRegistered(t.template_id)) {
      violations.push(
        v(
          L7SemanticViolationCode.TEMPLATE_NOT_REGISTERED,
          `template ${t.template_id} not registered`,
          { templateId: t.template_id },
        ),
      );
    }
    return violations;
  }

  /**
   * §7.5.5.2 — Full validation (structure + cross-legality).
   */
  validate(t: L7ContradictionTemplate): readonly L7SemanticViolation[] {
    return [...this.validateStructure(t), ...this.validateCrossLegality(t)];
  }

  /**
   * §7.5.4.6 — Rejects freeform contradiction emission, returning
   * a canonical violation if the caller attempts to emit a contradiction
   * outside the template registry or outside the contradiction ontology.
   */
  rejectFreeform(
    attemptedFamily: string | undefined,
    attemptedTemplateId: string | undefined,
  ): readonly L7SemanticViolation[] {
    const violations: L7SemanticViolation[] = [];
    if (!attemptedTemplateId) {
      violations.push(
        v(
          L7SemanticViolationCode.TEMPLATE_FREEFORM_CONTRADICTION_EMITTED,
          'contradiction emitted without a template_id',
          { contradictionFamily: attemptedFamily },
        ),
      );
    } else if (!this.registry.isRegistered(attemptedTemplateId)) {
      violations.push(
        v(
          L7SemanticViolationCode.TEMPLATE_OUTSIDE_REGISTRY,
          `contradiction emitted via unregistered template ${attemptedTemplateId}`,
          { templateId: attemptedTemplateId },
        ),
      );
    }
    if (attemptedFamily && !isL7ContradictionFamilyClass(attemptedFamily)) {
      violations.push(
        v(
          L7SemanticViolationCode.UNKNOWN_CONTRADICTION_FAMILY,
          `contradiction emitted with unknown family ${attemptedFamily}`,
          { contradictionFamily: attemptedFamily },
        ),
      );
    }
    return violations;
  }

  /** Convenience for family boundary integration. */
  isSubjectClassAllowed(
    t: L7ContradictionTemplate,
    subjectClass: L7ValidationSubjectClass,
  ): boolean {
    return t.applicable_subject_classes.includes(subjectClass);
  }

  isFamilyAllowed(t: L7ContradictionTemplate, family: L7ContradictionFamilyClass): boolean {
    return t.contradiction_family === family;
  }
}

const defaultContradictionTemplateValidator = new L7ContradictionTemplateValidator();

export function getDefaultContradictionTemplateValidator(): L7ContradictionTemplateValidator {
  return defaultContradictionTemplateValidator;
}
