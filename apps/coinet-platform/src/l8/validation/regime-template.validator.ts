/**
 * L8.6 — Regime Template Validator
 *
 * §8.6.5 / §8.6.7.4 — Validates a single `L8RegimeTemplate` for
 * completeness (all semantic fields present, valid ranges, no overlap
 * between support and challenge domains) and for family-level legality
 * (class in family, scopes in family).
 */

import { L8RegimeTemplate } from '../contracts/regime-template';
import { L8RegimeSignatureClass } from '../contracts/regime-signature';
import {
  L8RegimeRolloutPhase,
  L8RegimeTemplateState,
} from '../contracts/regime-rollout-phase';
import { isL8RegisteredInputDomain } from '../contracts/regime-input-domain';
import { containsL8ForbiddenNaming } from '../contracts/l8-boundary';
import {
  L8RegimeTemplateViolation,
  L8RegimeTemplateViolationCode,
} from './l8-template-violation-codes';
import {
  getDefaultL8RegimeFamilyRegistry,
  L8RegimeFamilyRegistry,
} from '../registry/regime-family.registry';
import {
  getDefaultL8RegimeClassRegistry,
  L8RegimeClassRegistry,
} from '../registry/regime-class.registry';
import {
  getDefaultL8RegimeInputFamilyRegistry,
  L8RegimeInputFamilyRegistry,
} from '../registry/regime-input-family.registry';
import {
  getDefaultL8RegimeFamilyDefinitionRegistry,
  L8RegimeFamilyDefinitionRegistry,
} from '../registry/regime-family-definition.registry';

export interface L8TemplateValidationReport {
  readonly valid: boolean;
  readonly violations: readonly L8RegimeTemplateViolation[];
}

const SEMVER = /^\d+\.\d+\.\d+(?:-[\w.]+)?$/;

function v(
  code: L8RegimeTemplateViolationCode,
  t: L8RegimeTemplate | null,
  detail: string,
  context: Record<string, unknown> = {},
): L8RegimeTemplateViolation {
  return {
    code,
    source: 'regime-template-validator',
    templateId: t?.template_id ?? null,
    family: t?.regime_family ?? null,
    detail,
    context,
  };
}

export function validateRegimeTemplate(
  t: L8RegimeTemplate,
  familyRegistry: L8RegimeFamilyRegistry =
    getDefaultL8RegimeFamilyRegistry(),
  classRegistry: L8RegimeClassRegistry =
    getDefaultL8RegimeClassRegistry(),
  inputFamilyRegistry: L8RegimeInputFamilyRegistry =
    getDefaultL8RegimeInputFamilyRegistry(),
  familyDefinitionRegistry: L8RegimeFamilyDefinitionRegistry =
    getDefaultL8RegimeFamilyDefinitionRegistry(),
): L8TemplateValidationReport {
  const violations: L8RegimeTemplateViolation[] = [];

  // Identity
  if (!t.template_id) {
    violations.push(v(
      L8RegimeTemplateViolationCode.TEMPLATE_MISSING_ID, t,
      'template_id missing',
    ));
  }
  if (!t.template_version || !SEMVER.test(t.template_version)) {
    violations.push(v(
      L8RegimeTemplateViolationCode.TEMPLATE_MISSING_VERSION, t,
      `template_version missing or not semver: ${t.template_version}`,
    ));
  }
  const expectedId =
    `tpl.${t.regime_family}.${t.regime_class}@${t.template_version}`;
  if (t.template_id && t.template_version &&
      t.template_id !== expectedId) {
    violations.push(v(
      L8RegimeTemplateViolationCode.TEMPLATE_ID_MISMATCH, t,
      `template_id ${t.template_id} does not match canonical ${expectedId}`,
    ));
  }

  // Family / class
  if (!familyRegistry.isRegistered(t.regime_family)) {
    violations.push(v(
      L8RegimeTemplateViolationCode.TEMPLATE_UNKNOWN_FAMILY, t,
      `family ${t.regime_family} not registered`,
    ));
  }
  if (!classRegistry.isRegistered(t.regime_class)) {
    violations.push(v(
      L8RegimeTemplateViolationCode.TEMPLATE_CLASS_NOT_IN_FAMILY, t,
      `class ${t.regime_class} not registered`,
    ));
  } else if (!classRegistry.belongsToFamily(t.regime_class, t.regime_family)) {
    violations.push(v(
      L8RegimeTemplateViolationCode.TEMPLATE_CLASS_NOT_IN_FAMILY, t,
      `class ${t.regime_class} does not belong to family ${t.regime_family}`,
    ));
  }

  // Scope legality
  if (!t.applicable_scope_types || t.applicable_scope_types.length === 0) {
    violations.push(v(
      L8RegimeTemplateViolationCode.TEMPLATE_MISSING_APPLICABLE_SCOPES, t,
      'applicable_scope_types empty',
    ));
  } else if (familyRegistry.isRegistered(t.regime_family)) {
    for (const sc of t.applicable_scope_types) {
      if (!familyRegistry.allowsScope(t.regime_family, sc)) {
        violations.push(v(
          L8RegimeTemplateViolationCode.TEMPLATE_SCOPE_NOT_IN_FAMILY, t,
          `scope ${sc} not legal for family ${t.regime_family}`,
        ));
      }
    }
  }

  // Validation / feature patterns
  if (!t.required_validation_patterns ||
      t.required_validation_patterns.length === 0) {
    violations.push(v(
      L8RegimeTemplateViolationCode.TEMPLATE_MISSING_VALIDATION_PATTERNS, t,
      'required_validation_patterns empty',
    ));
  } else {
    const familyDef = familyDefinitionRegistry.get(t.regime_family);
    if (familyDef) {
      for (const pat of t.required_validation_patterns) {
        if (!familyDef.legal_validation_patterns.includes(pat)) {
          violations.push(v(
            L8RegimeTemplateViolationCode
              .TEMPLATE_VALIDATION_PATTERN_NOT_ALLOWED, t,
            `validation pattern ${pat} not legal for family ${t.regime_family}`,
          ));
        }
      }
    }
  }
  if (!t.required_feature_patterns ||
      t.required_feature_patterns.length === 0) {
    violations.push(v(
      L8RegimeTemplateViolationCode.TEMPLATE_MISSING_FEATURE_PATTERNS, t,
      'required_feature_patterns empty',
    ));
  }

  // Support / challenge domains
  if (!t.support_domains || t.support_domains.length === 0) {
    violations.push(v(
      L8RegimeTemplateViolationCode.TEMPLATE_MISSING_SUPPORT_DOMAINS, t,
      'support_domains empty',
    ));
  } else {
    for (const d of t.support_domains) {
      if (!isL8RegisteredInputDomain(d)) {
        violations.push(v(
          L8RegimeTemplateViolationCode
            .TEMPLATE_SUPPORT_DOMAIN_NOT_REGISTERED, t,
          `support domain ${d} not registered`,
        ));
      }
    }
  }
  if (!t.challenge_domains || t.challenge_domains.length === 0) {
    violations.push(v(
      L8RegimeTemplateViolationCode.TEMPLATE_MISSING_CHALLENGE_DOMAINS, t,
      'challenge_domains empty',
    ));
  } else {
    for (const d of t.challenge_domains) {
      if (!isL8RegisteredInputDomain(d)) {
        violations.push(v(
          L8RegimeTemplateViolationCode
            .TEMPLATE_CHALLENGE_DOMAIN_NOT_REGISTERED, t,
          `challenge domain ${d} not registered`,
        ));
      }
    }
  }
  // §8.6.3.7 — support and challenge must remain separate sets
  if (t.support_domains && t.challenge_domains) {
    const supportSet = new Set(t.support_domains);
    const overlaps = t.challenge_domains.filter(d => supportSet.has(d));
    if (overlaps.length > 0) {
      violations.push(v(
        L8RegimeTemplateViolationCode.TEMPLATE_SUPPORT_CHALLENGE_OVERLAP, t,
        `support and challenge domains overlap: ${overlaps.join(', ')}`,
      ));
    }
  }

  // Legal input families (§8.6.7.6 — consistency with family definition)
  if (!t.legal_input_families || t.legal_input_families.length === 0) {
    violations.push(v(
      L8RegimeTemplateViolationCode.TEMPLATE_MISSING_LEGAL_INPUTS, t,
      'legal_input_families empty',
    ));
  } else {
    const familyDef = familyDefinitionRegistry.get(t.regime_family);
    for (const f of t.legal_input_families) {
      if (!inputFamilyRegistry.isRegistered(f)) {
        violations.push(v(
          L8RegimeTemplateViolationCode.TEMPLATE_INPUT_FAMILY_NOT_ALLOWED, t,
          `input family ${f} not registered`,
        ));
      } else if (familyDef &&
          !familyDef.legal_input_families.includes(f)) {
        violations.push(v(
          L8RegimeTemplateViolationCode.TEMPLATE_INPUT_FAMILY_NOT_ALLOWED, t,
          `input family ${f} not allowed for family ${t.regime_family}`,
        ));
      }
    }
  }

  // Transition signatures
  if (!t.transition_signatures || t.transition_signatures.length === 0) {
    violations.push(v(
      L8RegimeTemplateViolationCode
        .TEMPLATE_MISSING_TRANSITION_SIGNATURES, t,
      'transition_signatures empty',
    ));
  } else {
    const ids = new Set<string>();
    for (const s of t.transition_signatures) {
      if (!s.signature_id) {
        violations.push(v(
          L8RegimeTemplateViolationCode.SIGNATURE_ID_MISSING, t,
          'transition signature missing id',
        ));
        continue;
      }
      if (ids.has(s.signature_id)) {
        violations.push(v(
          L8RegimeTemplateViolationCode.SIGNATURE_ID_DUPLICATE, t,
          `transition signature id ${s.signature_id} duplicated`,
        ));
      }
      ids.add(s.signature_id);
      if (s.transition_weight < 0 || s.transition_weight > 1) {
        violations.push(v(
          L8RegimeTemplateViolationCode.SIGNATURE_WEIGHT_OUT_OF_RANGE, t,
          `transition weight ${s.transition_weight} OOR for ${s.signature_id}`,
        ));
      }
      if (!s.triggered_by_domains ||
          s.triggered_by_domains.length === 0) {
        violations.push(v(
          L8RegimeTemplateViolationCode.SIGNATURE_MISSING_DOMAINS, t,
          `transition signature ${s.signature_id} missing domains`,
        ));
      }
      if (!s.signature_id.startsWith(
        `${L8RegimeSignatureClass.TRANSITION === 'TRANSITION'
          ? 'sig.transition' : ''}.`,
      )) {
        if (!s.signature_id.startsWith('sig.transition.')) {
          violations.push(v(
            L8RegimeTemplateViolationCode.SIGNATURE_WRONG_CLASS, t,
            `transition signature id ${s.signature_id} missing sig.transition prefix`,
          ));
        }
      }
    }
  }

  // Ambiguity signatures
  if (!t.ambiguity_signatures || t.ambiguity_signatures.length === 0) {
    violations.push(v(
      L8RegimeTemplateViolationCode
        .TEMPLATE_MISSING_AMBIGUITY_SIGNATURES, t,
      'ambiguity_signatures empty',
    ));
  } else {
    const ids = new Set<string>();
    for (const s of t.ambiguity_signatures) {
      if (!s.signature_id) {
        violations.push(v(
          L8RegimeTemplateViolationCode.SIGNATURE_ID_MISSING, t,
          'ambiguity signature missing id',
        ));
        continue;
      }
      if (ids.has(s.signature_id)) {
        violations.push(v(
          L8RegimeTemplateViolationCode.SIGNATURE_ID_DUPLICATE, t,
          `ambiguity signature id ${s.signature_id} duplicated`,
        ));
      }
      ids.add(s.signature_id);
      if (s.ambiguity_weight < 0 || s.ambiguity_weight > 1) {
        violations.push(v(
          L8RegimeTemplateViolationCode.SIGNATURE_WEIGHT_OUT_OF_RANGE, t,
          `ambiguity weight ${s.ambiguity_weight} OOR for ${s.signature_id}`,
        ));
      }
      if (!s.triggered_by_domains ||
          s.triggered_by_domains.length === 0) {
        violations.push(v(
          L8RegimeTemplateViolationCode.SIGNATURE_MISSING_DOMAINS, t,
          `ambiguity signature ${s.signature_id} missing domains`,
        ));
      }
      if (!s.signature_id.startsWith('sig.ambiguity.')) {
        violations.push(v(
          L8RegimeTemplateViolationCode.SIGNATURE_WRONG_CLASS, t,
          `ambiguity signature id ${s.signature_id} missing sig.ambiguity prefix`,
        ));
      }
    }
  }

  // Confidence / multiplier defaults
  if (!t.confidence_posture_defaults ||
      t.confidence_posture_defaults.length === 0) {
    violations.push(v(
      L8RegimeTemplateViolationCode.TEMPLATE_MISSING_CONFIDENCE_DEFAULTS, t,
      'confidence_posture_defaults empty',
    ));
  }
  if (!t.multiplier_derivation_defaults ||
      t.multiplier_derivation_defaults.length === 0) {
    violations.push(v(
      L8RegimeTemplateViolationCode.TEMPLATE_MISSING_MULTIPLIER_DEFAULTS, t,
      'multiplier_derivation_defaults empty',
    ));
  }

  // Rollout
  if (t.rollout_phase === undefined) {
    violations.push(v(
      L8RegimeTemplateViolationCode.FAMILY_ROLLOUT_PHASE_MISMATCH, t,
      'rollout_phase missing',
    ));
  } else {
    const familyDef = familyDefinitionRegistry.get(t.regime_family);
    if (familyDef && familyDef.rollout_phase !== t.rollout_phase) {
      violations.push(v(
        L8RegimeTemplateViolationCode.FAMILY_ROLLOUT_PHASE_MISMATCH, t,
        `template rollout_phase ${t.rollout_phase} != family phase ${familyDef.rollout_phase}`,
      ));
    }
  }
  if (typeof t.rollout_priority !== 'number' ||
      t.rollout_priority < 0 ||
      !Number.isFinite(t.rollout_priority)) {
    violations.push(v(
      L8RegimeTemplateViolationCode
        .TEMPLATE_ROLLOUT_PRIORITY_OUT_OF_RANGE, t,
      `rollout_priority out of range: ${t.rollout_priority}`,
    ));
  }
  if (!t.template_state) {
    violations.push(v(
      L8RegimeTemplateViolationCode.TEMPLATE_STATE_ILLEGAL_FOR_MODE, t,
      'template_state missing',
    ));
  }

  // Cleanliness / drift
  if (containsL8ForbiddenNaming(t.description ?? '') ||
      containsL8ForbiddenNaming(t.created_by ?? '')) {
    violations.push(v(
      L8RegimeTemplateViolationCode.TEMPLATE_JUDGMENT_LEAK, t,
      'description/created_by contains forbidden judgment / scenario / recommendation semantics',
    ));
  }

  return { valid: violations.length === 0, violations };
}

// Stable references so unused-import lints do not flag enum imports that
// only appear in typed literals.
void L8RegimeRolloutPhase;
void L8RegimeTemplateState;
