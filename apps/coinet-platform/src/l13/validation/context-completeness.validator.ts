/**
 * L13.2 — Context Completeness Validator
 *
 * §13.2.4 — Cross-checks the package readiness/completeness classes
 * against the actual presence of summaries and disclosures.
 */

import {
  L13InputPackageCompletenessClass,
  L13InputPackageReadinessClass,
  type L13AIInputPackage,
} from '../contracts/ai-input-package';
import { L13ViolationSeverity } from '../contracts/l13-constitutional-types';
import { L13InputPackageViolationCode } from './l13-input-package-violation-codes';
import {
  l13PackageResult,
  type L13InputPackageIssue,
  type L13InputPackageValidationResult,
} from './_l13-issue';

export function validateL13ContextCompleteness(
  pkg: L13AIInputPackage,
): L13InputPackageValidationResult {
  const issues: L13InputPackageIssue[] = [];

  if (
    pkg.package_completeness_class ===
      L13InputPackageCompletenessClass.NARROWED_BY_MISSING_DATA &&
    pkg.missing_data_disclosures.length === 0
  ) {
    issues.push({
      code: L13InputPackageViolationCode.L13P_MISSING_DATA_DISCLOSURE_OMITTED,
      severity: L13ViolationSeverity.CRITICAL,
      message:
        'completeness=NARROWED_BY_MISSING_DATA but no missing-data disclosures attached',
    });
  }
  if (
    pkg.package_completeness_class ===
      L13InputPackageCompletenessClass.NARROWED_BY_DRIFT &&
    pkg.drift_disclosures.length === 0
  ) {
    issues.push({
      code: L13InputPackageViolationCode.L13P_DRIFT_DISCLOSURE_OMITTED,
      severity: L13ViolationSeverity.CRITICAL,
      message:
        'completeness=NARROWED_BY_DRIFT but no drift disclosures attached',
    });
  }
  if (
    pkg.package_readiness_class ===
      L13InputPackageReadinessClass.NARROWED_BY_CONTRADICTION &&
    pkg.contradiction_summary.active_contradiction_refs.length === 0
  ) {
    issues.push({
      code: L13InputPackageViolationCode.L13P_PACKAGE_READINESS_ILLEGAL,
      severity: L13ViolationSeverity.ERROR,
      message:
        'readiness=NARROWED_BY_CONTRADICTION but no active contradictions referenced',
    });
  }
  if (
    pkg.package_readiness_class ===
      L13InputPackageReadinessClass.READY_FULL_CONTEXT &&
    (pkg.contradiction_summary.active_contradiction_refs.length > 0 ||
      pkg.uncertainty_profile.must_disclose_uncertainty)
  ) {
    issues.push({
      code: L13InputPackageViolationCode.L13P_PACKAGE_READINESS_ILLEGAL,
      severity: L13ViolationSeverity.ERROR,
      message:
        'READY_FULL_CONTEXT illegal while contradictions or required disclosures are present',
    });
  }

  return l13PackageResult(issues);
}
