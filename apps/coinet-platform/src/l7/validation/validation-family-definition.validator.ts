/**
 * L7.5 — Validation Family Definition Validator
 *
 * §7.5.6 — Validates that a validation family definition is complete,
 * subject-class-registered, scope-legal, support/challenge domain
 * declared, contradiction-coverage-complete, template-coverage-complete,
 * and semantically within L7 boundaries (no drift toward
 * regime/scenario/judgment/recommendation semantics).
 */

import { L7ValidationFamilyDefinition } from '../contracts/validation-family-definition';
import {
  isRegisteredSubjectClass,
  subjectClassAllowsScope,
} from '../contracts/validation-subject-class';
import {
  getL7ContradictionFamilyDescriptor,
  isL7ContradictionFamilyClass,
} from '../contracts/contradiction-family';
import {
  getDefaultContradictionTemplateRegistry,
  L7ContradictionTemplateRegistry,
} from '../registry/contradiction-template.registry';
import {
  L7SemanticViolation,
  L7SemanticViolationCode,
} from './l7-semantic-violation-codes';

/**
 * §7.5.9.1 INV-7.5-G — Keywords that signal drift into regime/scenario/
 * judgment/recommendation semantics. Used to scan family descriptions.
 */
const L7_SEMANTIC_DRIFT_KEYWORDS: readonly string[] = [
  'regime decision',
  'scenario selection',
  'final judgment',
  'final recommendation',
  'sizing guidance',
  'execution decision',
  'portfolio decision',
  'prescriptive',
  'trade idea',
];

function v(
  code: L7SemanticViolationCode,
  detail: string,
  extra: Partial<L7SemanticViolation> = {},
): L7SemanticViolation {
  return { code, detail, ...extra };
}

export class L7ValidationFamilyDefinitionValidator {
  constructor(
    private readonly templateRegistry: L7ContradictionTemplateRegistry = getDefaultContradictionTemplateRegistry(),
  ) {}

  validate(def: L7ValidationFamilyDefinition): readonly L7SemanticViolation[] {
    const violations: L7SemanticViolation[] = [];

    // §7.5.6 — subject classes must be registered.
    for (const sc of def.legal_subject_classes) {
      if (!isRegisteredSubjectClass(sc)) {
        violations.push(
          v(
            L7SemanticViolationCode.FAMILY_SUBJECT_CLASS_UNREGISTERED,
            `family ${def.family_id} references unregistered subject class ${sc}`,
            { familyId: def.family_id, subjectClass: sc },
          ),
        );
      }
    }

    // §7.5.6 — scopes must be legal for at least one of the declared subject classes.
    for (const scope of def.legal_scopes) {
      const any = def.legal_subject_classes.some(sc =>
        subjectClassAllowsScope(sc as any, scope),
      );
      if (!any) {
        violations.push(
          v(
            L7SemanticViolationCode.FAMILY_SCOPE_ILLEGAL,
            `family ${def.family_id} declares scope ${scope} not legal for any of its subject classes`,
            { familyId: def.family_id },
          ),
        );
      }
    }

    // §7.5.6 — support / challenge domains required.
    if (def.required_support_domains.length === 0) {
      violations.push(
        v(
          L7SemanticViolationCode.FAMILY_SUPPORT_DOMAIN_MISSING,
          `family ${def.family_id} declares no required support domains`,
          { familyId: def.family_id },
        ),
      );
    }
    if (def.required_challenge_domains.length === 0) {
      violations.push(
        v(
          L7SemanticViolationCode.FAMILY_CHALLENGE_DOMAIN_MISSING,
          `family ${def.family_id} declares no required challenge domains`,
          { familyId: def.family_id },
        ),
      );
    }

    // §7.5.6 — contradiction families must be registered and legal for its subjects.
    if (def.allowed_contradiction_families.length === 0) {
      violations.push(
        v(
          L7SemanticViolationCode.FAMILY_CONTRADICTION_COVERAGE_MISSING,
          `family ${def.family_id} declares no contradiction families`,
          { familyId: def.family_id },
        ),
      );
    }
    for (const cf of def.allowed_contradiction_families) {
      if (!isL7ContradictionFamilyClass(cf)) {
        violations.push(
          v(
            L7SemanticViolationCode.CONTRADICTION_FAMILY_NOT_REGISTERED,
            `family ${def.family_id} references unregistered contradiction family ${cf}`,
            { familyId: def.family_id, contradictionFamily: cf },
          ),
        );
        continue;
      }
      const desc = getL7ContradictionFamilyDescriptor(cf);
      if (!desc) continue;
      const anySubjectLegal = def.legal_subject_classes.some(sc =>
        desc.legalSubjectClasses.includes(sc),
      );
      if (!anySubjectLegal) {
        violations.push(
          v(
            L7SemanticViolationCode.CONTRADICTION_FAMILY_SUBJECT_CLASS_ILLEGAL,
            `family ${def.family_id} declares contradiction family ${cf} but no subject class is legal for it`,
            { familyId: def.family_id, contradictionFamily: cf },
          ),
        );
      }
    }

    // §7.5.6 — template coverage: declared template ids must be registered and
    // must reference a contradiction family the validation family allows.
    if (def.allowed_template_ids.length === 0) {
      violations.push(
        v(
          L7SemanticViolationCode.FAMILY_TEMPLATE_COVERAGE_MISSING,
          `family ${def.family_id} declares no template ids`,
          { familyId: def.family_id },
        ),
      );
    }
    const allowedFamilySet = new Set(def.allowed_contradiction_families);
    for (const tid of def.allowed_template_ids) {
      const t = this.templateRegistry.get(tid);
      if (!t) {
        violations.push(
          v(
            L7SemanticViolationCode.TEMPLATE_NOT_REGISTERED,
            `family ${def.family_id} references unregistered template ${tid}`,
            { familyId: def.family_id, templateId: tid },
          ),
        );
        continue;
      }
      if (!allowedFamilySet.has(t.contradiction_family)) {
        violations.push(
          v(
            L7SemanticViolationCode.TEMPLATE_FAMILY_ILLEGAL,
            `family ${def.family_id} references template ${tid} whose contradiction family ${t.contradiction_family} is not in allowed_contradiction_families`,
            {
              familyId: def.family_id,
              templateId: tid,
              contradictionFamily: t.contradiction_family,
            },
          ),
        );
      }
      if (!t.applicable_validation_families.includes(def.family_id)) {
        violations.push(
          v(
            L7SemanticViolationCode.TEMPLATE_OUTSIDE_REGISTRY,
            `template ${tid} does not list validation family ${def.family_id} as applicable`,
            { familyId: def.family_id, templateId: tid },
          ),
        );
      }
    }

    // §7.5.9.1 INV-7.5-G — drift detection.
    const desc = def.description.toLowerCase();
    for (const kw of L7_SEMANTIC_DRIFT_KEYWORDS) {
      if (desc.includes(kw)) {
        violations.push(
          v(
            L7SemanticViolationCode.FAMILY_SEMANTIC_DRIFT,
            `family ${def.family_id} description contains drift keyword "${kw}"`,
            { familyId: def.family_id },
          ),
        );
      }
    }

    return violations;
  }
}

const defaultValidationFamilyDefinitionValidator = new L7ValidationFamilyDefinitionValidator();

export function getDefaultValidationFamilyDefinitionValidator(): L7ValidationFamilyDefinitionValidator {
  return defaultValidationFamilyDefinitionValidator;
}
