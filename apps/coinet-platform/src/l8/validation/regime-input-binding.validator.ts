/**
 * L8.5 — Regime Input Binding Validator
 *
 * §8.5.6.6 — Rejects bindings that:
 *   - declare no dependency class
 *   - pair illegal source layer/surface combos
 *   - bind evidence-only surfaces as required truth
 *   - bind historical-only surfaces as clean current support
 *   - bind L7 surfaces without required restriction/contradiction flags
 *   - declare a max_reliance_class stronger than the dependency class ceiling
 *   - pair a family that is not legal for the declared input domain
 */

import {
  L8RegimeInputBinding,
  L8RegimeDependencyClass,
  L8RegimeMaxRelianceClass,
  maxRelianceCeilingFor,
  relianceExceedsCeiling,
} from '../contracts/regime-input-binding';
import { L8RegimeInputViolationCode } from '../contracts/regime-consumption-rights';
import {
  getDefaultL8RegimeInputFamilyRegistry,
  L8RegimeInputFamilyRegistry,
} from '../registry/regime-input-family.registry';
import {
  getDefaultL8RegimeInputDomainRegistry,
  L8RegimeInputDomainRegistry,
} from '../registry/regime-input-domain.registry';

export interface L8InputBindingIssue {
  readonly code: L8RegimeInputViolationCode;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export interface L8InputBindingReport {
  readonly valid: boolean;
  readonly issues: readonly L8InputBindingIssue[];
}

export function validateRegimeInputBinding(
  binding: L8RegimeInputBinding,
  familyRegistry: L8RegimeInputFamilyRegistry =
    getDefaultL8RegimeInputFamilyRegistry(),
  domainRegistry: L8RegimeInputDomainRegistry =
    getDefaultL8RegimeInputDomainRegistry(),
): L8InputBindingReport {
  const issues: L8InputBindingIssue[] = [];

  // Family legality
  if (!familyRegistry.isRegistered(binding.input_family)) {
    issues.push({
      code: L8RegimeInputViolationCode.UNREGISTERED_FAMILY,
      message: `input_family ${binding.input_family} not registered`,
    });
    return { valid: false, issues };
  }

  // Domain legality
  if (!domainRegistry.isRegistered(binding.input_domain)) {
    issues.push({
      code: L8RegimeInputViolationCode.UNREGISTERED_DOMAIN,
      message: `input_domain ${binding.input_domain} not registered`,
    });
    return { valid: false, issues };
  }

  // Domain/family mismatch
  if (!domainRegistry.allowsFamily(binding.input_domain, binding.input_family)) {
    issues.push({
      code: L8RegimeInputViolationCode.DOMAIN_FAMILY_MISMATCH,
      message:
        `family ${binding.input_family} not legal for domain ${binding.input_domain}`,
      details: {
        family: binding.input_family,
        domain: binding.input_domain,
      },
    });
  }

  // Domain/source-layer legality
  if (!domainRegistry.allowsSourceLayer(binding.input_domain,
      binding.source_layer)) {
    issues.push({
      code: L8RegimeInputViolationCode.DOMAIN_SOURCE_LAYER_ILLEGAL,
      message:
        `source_layer ${binding.source_layer} not legal for domain ${binding.input_domain}`,
    });
  }

  // Source layer/family match
  if (familyRegistry.sourceLayerOf(binding.input_family) !==
      binding.source_layer) {
    issues.push({
      code: L8RegimeInputViolationCode.BINDING_SOURCE_LAYER_MISMATCH,
      message:
        `family ${binding.input_family} expects layer ${familyRegistry.sourceLayerOf(binding.input_family)} but binding declares ${binding.source_layer}`,
    });
  }

  // Legal surface class
  if (!familyRegistry.allowsSurfaceClass(binding.input_family,
      binding.source_surface_class)) {
    issues.push({
      code: L8RegimeInputViolationCode.BINDING_SOURCE_SURFACE_ILLEGAL,
      message:
        `surface_class ${binding.source_surface_class} not legal for family ${binding.input_family}`,
    });
  }

  // Dependency class + max reliance
  if (!binding.dependency_class) {
    issues.push({
      code: L8RegimeInputViolationCode.BINDING_MISSING_DEPENDENCY_CLASS,
      message: 'dependency_class missing',
    });
  }
  if (!binding.max_reliance_class) {
    issues.push({
      code: L8RegimeInputViolationCode.BINDING_MISSING_MAX_RELIANCE,
      message: 'max_reliance_class missing',
    });
  }

  // Reliance ceiling
  if (binding.dependency_class && binding.max_reliance_class) {
    const ceiling = maxRelianceCeilingFor(binding.dependency_class);
    if (relianceExceedsCeiling(binding.max_reliance_class, ceiling)) {
      issues.push({
        code: L8RegimeInputViolationCode.BINDING_RELIANCE_EXCEEDS_CEILING,
        message:
          `${binding.max_reliance_class} exceeds ceiling ${ceiling} for ${binding.dependency_class}`,
      });
    }
  }

  // §8.5.6.3 — evidence-only surfaces bound as required truth
  if (familyRegistry.evidenceOnlyEligible(binding.input_family) === false &&
      binding.dependency_class ===
        L8RegimeDependencyClass.EVIDENCE_ONLY_INPUT) {
    issues.push({
      code: L8RegimeInputViolationCode.BINDING_EVIDENCE_ONLY_AS_REQUIRED,
      message:
        `family ${binding.input_family} is not evidence-only eligible`,
    });
  }
  // Historical surfaces (L6_FEATURE_HISTORY / L7 history) bound as required
  // current primitive/validation input → illegal.
  if (binding.source_surface_class.includes('_HISTORY') &&
      (binding.dependency_class ===
        L8RegimeDependencyClass.REQUIRED_PRIMITIVE_INPUT ||
       binding.dependency_class ===
        L8RegimeDependencyClass.REQUIRED_VALIDATION_INPUT)) {
    issues.push({
      code: L8RegimeInputViolationCode.BINDING_HISTORICAL_AS_CURRENT,
      message:
        `historical surface ${binding.source_surface_class} bound as ${binding.dependency_class}`,
    });
  }

  // OPTIONAL_CONTEXT_INPUT with max_reliance > CONTEXT_ONLY
  if (binding.dependency_class ===
      L8RegimeDependencyClass.OPTIONAL_CONTEXT_INPUT &&
      binding.max_reliance_class !== L8RegimeMaxRelianceClass.CONTEXT_ONLY &&
      binding.max_reliance_class !== L8RegimeMaxRelianceClass.EVIDENCE_ONLY &&
      binding.max_reliance_class !== L8RegimeMaxRelianceClass.BLOCKED) {
    issues.push({
      code: L8RegimeInputViolationCode.BINDING_OPTIONAL_AS_REQUIRED,
      message:
        `OPTIONAL_CONTEXT_INPUT with reliance ${binding.max_reliance_class}`,
    });
  }

  // §8.5.4.1 / §8.5.4.6 — restriction / contradiction consumption flags
  if (familyRegistry.requiresRestriction(binding.input_family) &&
      !binding.restriction_consumption_required) {
    issues.push({
      code: L8RegimeInputViolationCode.BINDING_FAMILY_REQUIRES_RESTRICTION,
      message:
        `family ${binding.input_family} requires restriction consumption`,
    });
  }
  if (familyRegistry.requiresContradiction(binding.input_family) &&
      !binding.contradiction_consumption_required) {
    issues.push({
      code: L8RegimeInputViolationCode.BINDING_FAMILY_REQUIRES_CONTRADICTION,
      message:
        `family ${binding.input_family} requires contradiction consumption`,
    });
  }

  return { valid: issues.length === 0, issues };
}
