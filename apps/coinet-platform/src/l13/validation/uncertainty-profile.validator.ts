/**
 * L13.2 — Uncertainty Profile Validator
 *
 * §13.2.8 — Active conditions must force corresponding sources/
 * disclosures and must_disclose_uncertainty=true.
 */

import {
  L13UncertaintySource,
  type L13UncertaintyProfile,
} from '../contracts/uncertainty-profile';
import { L13RequiredDisclosure } from '../contracts/explanation-restriction-profile';
import { L13ViolationSeverity } from '../contracts/l13-constitutional-types';
import { L13InputPackageViolationCode } from './l13-input-package-violation-codes';
import {
  l13PackageResult,
  type L13InputPackageIssue,
  type L13InputPackageValidationResult,
} from './_l13-issue';

const SEV = L13ViolationSeverity;

interface Pair {
  flag: keyof L13UncertaintyProfile;
  source: L13UncertaintySource;
  disclosure: L13RequiredDisclosure;
  label: string;
}

const PAIRS: readonly Pair[] = [
  {
    flag: 'active_contradiction_present',
    source: L13UncertaintySource.L7_CONTRADICTION,
    disclosure: L13RequiredDisclosure.CONTRADICTION,
    label: 'active contradiction',
  },
  {
    flag: 'active_invalidation_present',
    source: L13UncertaintySource.L12_ACTIVE_INVALIDATION,
    disclosure: L13RequiredDisclosure.ACTIVE_INVALIDATION,
    label: 'active invalidation',
  },
  {
    flag: 'unresolved_trigger_present',
    source: L13UncertaintySource.L12_UNRESOLVED_TRIGGER,
    disclosure: L13RequiredDisclosure.UNRESOLVED_TRIGGER,
    label: 'unresolved trigger',
  },
  {
    flag: 'material_missing_data_present',
    source: L13UncertaintySource.L11_MISSING_DATA,
    disclosure: L13RequiredDisclosure.MISSING_DATA,
    label: 'material missing data',
  },
  {
    flag: 'material_drift_present',
    source: L13UncertaintySource.L11_DRIFT,
    disclosure: L13RequiredDisclosure.DRIFT,
    label: 'material drift',
  },
];

export function validateL13UncertaintyProfile(
  profile: L13UncertaintyProfile,
): L13InputPackageValidationResult {
  const issues: L13InputPackageIssue[] = [];

  for (const p of PAIRS) {
    const flag = profile[p.flag] as boolean;
    if (flag) {
      if (!profile.uncertainty_sources.includes(p.source)) {
        issues.push({
          code: L13InputPackageViolationCode.L13P_UNCERTAINTY_PROFILE_INVALID,
          severity: SEV.CRITICAL,
          message: `${p.label} present but uncertainty source ${p.source} missing`,
        });
      }
      if (
        !profile.required_disclosures.includes(p.disclosure)
      ) {
        issues.push({
          code: L13InputPackageViolationCode.L13P_UNCERTAINTY_PROFILE_INVALID,
          severity: SEV.CRITICAL,
          message: `${p.label} present but required disclosure ${p.disclosure} missing`,
        });
      }
      if (!profile.must_disclose_uncertainty) {
        issues.push({
          code: L13InputPackageViolationCode.L13P_UNCERTAINTY_PROFILE_INVALID,
          severity: SEV.CRITICAL,
          message: `${p.label} present but must_disclose_uncertainty=false`,
        });
      }
    }
  }

  if (
    profile.narrow_spread_present &&
    !profile.uncertainty_sources.includes(
      L13UncertaintySource.L12_NARROW_SCENARIO_SPREAD,
    ) &&
    !profile.uncertainty_sources.includes(
      L13UncertaintySource.L10_NARROW_HYPOTHESIS_SPREAD,
    )
  ) {
    issues.push({
      code: L13InputPackageViolationCode.L13P_UNCERTAINTY_PROFILE_INVALID,
      severity: SEV.CRITICAL,
      message:
        'narrow spread present but neither L10 nor L12 narrow-spread source listed',
    });
  }

  if (
    profile.must_disclose_uncertainty &&
    profile.forbidden_certainty_phrases.length === 0
  ) {
    issues.push({
      code: L13InputPackageViolationCode.L13P_UNCERTAINTY_PROFILE_INVALID,
      severity: SEV.ERROR,
      message:
        'must_disclose_uncertainty=true but forbidden_certainty_phrases empty',
    });
  }

  return l13PackageResult(issues);
}
