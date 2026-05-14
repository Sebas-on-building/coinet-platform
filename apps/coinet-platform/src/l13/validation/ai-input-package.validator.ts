/**
 * L13.2 — AI Input Package Validator
 *
 * §13.2.18 — Top-level package validator. Checks identity fields,
 * required summaries, trace fields, raw lower-layer bypass, naked
 * L11/L12 contexts, intent-specific required summaries, allowed
 * answer modes, and replay-hash presence.
 */

import {
  L13_BLOCKED_PACKAGE_READINESS_CLASSES,
  L13_REQUIRED_ENGINE_SUMMARY_FIELDS,
  L13_REQUIRED_IDENTITY_FIELDS,
  L13_REQUIRED_TRACE_FIELDS,
  L13InputPackageReadinessClass,
  type L13AIInputPackage,
} from '../contracts/ai-input-package';
import { L13ScoreContextCompletenessClass } from '../contracts/ai-context-summary';
import {
  L13_ALWAYS_BLOCKED_ANSWER_MODES,
  L13BlockedAnswerMode,
} from '../contracts/explanation-restriction-profile';
import { L13ViolationSeverity } from '../contracts/l13-constitutional-types';
import {
  isL13AdversarialIntent,
  L13UserIntentClass,
} from '../contracts/user-intent-binding';
import { L13InputPackageViolationCode } from './l13-input-package-violation-codes';
import {
  l13PackageResult,
  type L13InputPackageIssue,
  type L13InputPackageValidationResult,
} from './_l13-issue';

const SEV = L13ViolationSeverity;

function err(
  code: L13InputPackageViolationCode,
  severity: L13ViolationSeverity,
  message: string,
  subject_ref?: string,
  details?: Record<string, unknown>,
): L13InputPackageIssue {
  return { code, severity, message, subject_ref, details };
}

function isMissingScalar(v: unknown): boolean {
  return (
    v === undefined ||
    v === null ||
    (typeof v === 'string' && v.trim() === '')
  );
}

function isMissingArray(v: unknown): boolean {
  return !Array.isArray(v) || v.length === 0;
}

/**
 * Field → violation code map for missing required scalars.
 */
const SCALAR_FIELD_CODE: Partial<
  Record<keyof L13AIInputPackage, L13InputPackageViolationCode>
> = {
  input_package_id:
    L13InputPackageViolationCode.L13P_INPUT_PACKAGE_ID_MISSING,
  request_id: L13InputPackageViolationCode.L13P_REQUEST_ID_MISSING,
  user_intent_ref: L13InputPackageViolationCode.L13P_USER_INTENT_MISSING,
  scope_type: L13InputPackageViolationCode.L13P_SCOPE_MISSING,
  scope_id: L13InputPackageViolationCode.L13P_SCOPE_MISSING,
  as_of: L13InputPackageViolationCode.L13P_AS_OF_MISSING,
  policy_version: L13InputPackageViolationCode.L13P_POLICY_VERSION_MISSING,
  replay_hash: L13InputPackageViolationCode.L13P_REPLAY_HASH_MISSING,
};

const SUMMARY_FIELD_CODE: Partial<
  Record<keyof L13AIInputPackage, L13InputPackageViolationCode>
> = {
  canonical_entity_summary:
    L13InputPackageViolationCode.L13P_ENTITY_SUMMARY_MISSING,
  validation_summary:
    L13InputPackageViolationCode.L13P_VALIDATION_SUMMARY_MISSING,
  contradiction_summary:
    L13InputPackageViolationCode.L13P_CONTRADICTION_SUMMARY_MISSING,
  regime_summary: L13InputPackageViolationCode.L13P_REGIME_SUMMARY_MISSING,
  sequence_summary:
    L13InputPackageViolationCode.L13P_SEQUENCE_SUMMARY_MISSING,
  hypothesis_summary:
    L13InputPackageViolationCode.L13P_HYPOTHESIS_SUMMARY_MISSING,
  score_summary: L13InputPackageViolationCode.L13P_SCORE_SUMMARY_MISSING,
  scenario_summary:
    L13InputPackageViolationCode.L13P_SCENARIO_SUMMARY_MISSING,
  confidence_breakdown:
    L13InputPackageViolationCode.L13P_CONFIDENCE_BREAKDOWN_MISSING,
  uncertainty_profile:
    L13InputPackageViolationCode.L13P_UNCERTAINTY_PROFILE_MISSING,
  restriction_profile:
    L13InputPackageViolationCode.L13P_RESTRICTION_PROFILE_MISSING,
};

/**
 * §13.2.18 — Top-level validator.
 */
export function validateL13AIInputPackage(
  pkg: L13AIInputPackage,
): L13InputPackageValidationResult {
  const issues: L13InputPackageIssue[] = [];

  // §13.2.3.1 — Required identity fields.
  for (const f of L13_REQUIRED_IDENTITY_FIELDS) {
    if (isMissingScalar(pkg[f] as unknown)) {
      const code =
        SCALAR_FIELD_CODE[f] ??
        L13InputPackageViolationCode.L13P_INPUT_PACKAGE_ID_MISSING;
      issues.push(err(code, SEV.CRITICAL, `${f} missing`));
    }
  }

  // §13.2.3.2 — Required engine-summary fields.
  for (const f of L13_REQUIRED_ENGINE_SUMMARY_FIELDS) {
    if (pkg[f] === undefined || pkg[f] === null) {
      const code =
        SUMMARY_FIELD_CODE[f] ??
        L13InputPackageViolationCode.L13P_ENTITY_SUMMARY_MISSING;
      issues.push(err(code, SEV.CRITICAL, `${f} missing`));
    }
  }

  // §13.2.3.3 — Required trace fields.
  for (const f of L13_REQUIRED_TRACE_FIELDS) {
    const v = pkg[f] as unknown;
    if (Array.isArray(v) ? v.length === 0 : isMissingScalar(v)) {
      const code =
        f === 'evidence_refs'
          ? L13InputPackageViolationCode.L13P_EVIDENCE_REFS_MISSING
          : f === 'lineage_refs'
            ? L13InputPackageViolationCode.L13P_LINEAGE_REFS_MISSING
            : f === 'prompt_budget'
              ? L13InputPackageViolationCode.L13P_PROMPT_BUDGET_MISSING
              : f === 'allowed_answer_modes'
                ? L13InputPackageViolationCode.L13P_ALLOWED_ANSWER_MODES_MISSING
                : L13InputPackageViolationCode.L13P_BLOCKED_ANSWER_MODES_MISSING;
      issues.push(err(code, SEV.CRITICAL, `${f} missing`));
    }
  }

  // §13.2.18 — Raw lower-layer bypass. Detect any evidence ref that
  // looks like a raw layer identifier rather than a governed surface.
  for (const ref of pkg.evidence_refs) {
    if (/^(l[3-9]|l1[0-2])_raw_/i.test(ref)) {
      issues.push(
        err(
          L13InputPackageViolationCode.L13P_RAW_LOWER_LAYER_CONTEXT,
          SEV.CRITICAL,
          `raw lower-layer evidence ref "${ref}" is illegal in L13 input package`,
          ref,
        ),
      );
    }
  }

  // §13.2.5.7 — Naked / incomplete L11 score context.
  if (pkg.score_summary) {
    const ss = pkg.score_summary;
    const cls = ss.score_context_completeness_class;
    const naked =
      ss.production_score_families.length > 0 &&
      (ss.top_positive_attribution_refs.length === 0 &&
        ss.top_negative_attribution_refs.length === 0 &&
        ss.score_missing_data_profile_refs.length === 0 &&
        ss.score_drift_refs.length === 0 &&
        ss.score_restriction_refs.length === 0);
    if (naked) {
      issues.push(
        err(
          L13InputPackageViolationCode.L13P_NAKED_L11_SCORE_CONTEXT,
          SEV.CRITICAL,
          'L11 score context is naked (no attribution / no missing-data profile / no drift / no restrictions)',
        ),
      );
    }
    if (
      cls === L13ScoreContextCompletenessClass.MISSING_ATTRIBUTION ||
      cls ===
        L13ScoreContextCompletenessClass.MISSING_MISSING_DATA_PROFILE ||
      cls === L13ScoreContextCompletenessClass.MISSING_DRIFT_STATUS ||
      cls === L13ScoreContextCompletenessClass.MISSING_RESTRICTIONS
    ) {
      issues.push(
        err(
          L13InputPackageViolationCode.L13P_INCOMPLETE_L11_SCORE_CONTEXT,
          SEV.CRITICAL,
          `L11 score context incomplete (${cls})`,
        ),
      );
    }
  }

  // §13.2.5.8 — Naked / incomplete L12 scenario context.
  if (pkg.scenario_summary) {
    const sc = pkg.scenario_summary;
    const naked =
      !!sc.base_case_ref &&
      sc.trigger_refs.length === 0 &&
      sc.invalidation_refs.length === 0 &&
      sc.path_confidence_refs.length === 0;
    if (naked) {
      issues.push(
        err(
          L13InputPackageViolationCode.L13P_NAKED_L12_SCENARIO_CONTEXT,
          SEV.CRITICAL,
          'L12 scenario context is naked (no triggers / invalidations / path confidence)',
        ),
      );
    }
    if (sc.base_case_ref && sc.trigger_refs.length === 0) {
      issues.push(
        err(
          L13InputPackageViolationCode.L13P_INCOMPLETE_L12_SCENARIO_CONTEXT,
          SEV.CRITICAL,
          'L12 scenario summary is missing trigger refs',
        ),
      );
    }
    if (sc.base_case_ref && sc.invalidation_refs.length === 0) {
      issues.push(
        err(
          L13InputPackageViolationCode.L13P_INCOMPLETE_L12_SCENARIO_CONTEXT,
          SEV.CRITICAL,
          'L12 scenario summary is missing invalidation refs',
        ),
      );
    }
    if (sc.base_case_ref && sc.path_confidence_refs.length === 0) {
      issues.push(
        err(
          L13InputPackageViolationCode.L13P_INCOMPLETE_L12_SCENARIO_CONTEXT,
          SEV.CRITICAL,
          'L12 scenario summary is missing path confidence refs',
        ),
      );
    }
  }

  // §13.2.18 — Adverse-state omissions.
  if (
    pkg.contradiction_summary &&
    pkg.contradiction_summary.active_contradiction_refs.length > 0 &&
    !pkg.uncertainty_profile?.active_contradiction_present
  ) {
    issues.push(
      err(
        L13InputPackageViolationCode.L13P_ACTIVE_CONTRADICTION_OMITTED,
        SEV.CRITICAL,
        'active contradiction refs present but uncertainty profile flag is false',
      ),
    );
  }
  // §13.2.18 — Active invalidation and confidence-cap omission checks
  // are driven by the uncertainty profile flags, not by the mere
  // presence of conditional refs. Scenario invalidation_refs are
  // conditional metadata; confidence_cap_refs may be present without
  // being binding. The disclosure-law block below catches the cases
  // where the uncertainty flags are set but the disclosures are not
  // attached.

  // §13.2.10 — Disclosure law: uncertainty flags must produce
  // disclosures.
  if (
    pkg.uncertainty_profile?.material_missing_data_present &&
    pkg.missing_data_disclosures.length === 0
  ) {
    issues.push(
      err(
        L13InputPackageViolationCode.L13P_MISSING_DATA_DISCLOSURE_OMITTED,
        SEV.CRITICAL,
        'material missing data flagged but no missing-data disclosures attached',
      ),
    );
  }
  if (
    pkg.uncertainty_profile?.material_drift_present &&
    pkg.drift_disclosures.length === 0
  ) {
    issues.push(
      err(
        L13InputPackageViolationCode.L13P_DRIFT_DISCLOSURE_OMITTED,
        SEV.CRITICAL,
        'material drift flagged but no drift disclosures attached',
      ),
    );
  }

  // §13.2.9 — Always-blocked answer modes must not appear in
  // allowed_answer_modes (and they must appear in
  // blocked_answer_modes).
  for (const m of L13_ALWAYS_BLOCKED_ANSWER_MODES) {
    if (
      !pkg.blocked_answer_modes.includes(m as L13BlockedAnswerMode)
    ) {
      issues.push(
        err(
          L13InputPackageViolationCode.L13P_BLOCKED_ANSWER_MODE_ALLOWED,
          SEV.CRITICAL,
          `always-blocked answer mode "${m}" missing from blocked_answer_modes`,
        ),
      );
    }
  }

  // §13.2.17 — Intent-specific context law.
  if (pkg.user_intent_binding) {
    const intent = pkg.user_intent_binding.intent_class;
    const reqs = pkg.user_intent_binding;
    if (
      reqs.requires_scenario_context &&
      !pkg.scenario_summary?.base_case_ref
    ) {
      issues.push(
        err(
          L13InputPackageViolationCode.L13P_FORWARD_INTENT_WITHOUT_SCENARIO,
          SEV.CRITICAL,
          `intent ${intent} requires scenario context but base_case_ref missing`,
        ),
      );
    }
    if (
      reqs.requires_score_context &&
      isMissingArray(pkg.score_summary?.production_score_families)
    ) {
      issues.push(
        err(
          L13InputPackageViolationCode.L13P_SCORE_INTENT_WITHOUT_SCORE,
          SEV.CRITICAL,
          `intent ${intent} requires score context but production_score_families empty`,
        ),
      );
    }
    if (
      reqs.requires_hypothesis_context &&
      !pkg.hypothesis_summary?.primary_hypothesis_ref
    ) {
      issues.push(
        err(
          L13InputPackageViolationCode.L13P_HYPOTHESIS_INTENT_WITHOUT_HYPOTHESIS,
          SEV.CRITICAL,
          `intent ${intent} requires hypothesis context but primary_hypothesis_ref missing`,
        ),
      );
    }
    if (
      isL13AdversarialIntent(
        intent as L13UserIntentClass,
      ) &&
      !pkg.uncertainty_profile?.must_disclose_uncertainty
    ) {
      issues.push(
        err(
          L13InputPackageViolationCode.L13P_RESTRICTION_BYPASS,
          SEV.CRITICAL,
          'adversarial intent must force uncertainty disclosure',
        ),
      );
    }
  }

  // §13.2.4 — Readiness sanity.
  if (
    pkg.package_readiness_class ===
      L13InputPackageReadinessClass.READY_FULL_CONTEXT &&
    pkg.uncertainty_profile?.must_disclose_uncertainty
  ) {
    issues.push(
      err(
        L13InputPackageViolationCode.L13P_PACKAGE_READINESS_ILLEGAL,
        SEV.ERROR,
        'READY_FULL_CONTEXT illegal while uncertainty disclosures are required',
      ),
    );
  }
  if (
    L13_BLOCKED_PACKAGE_READINESS_CLASSES.includes(
      pkg.package_readiness_class,
    ) &&
    pkg.allowed_answer_modes.length > 1
  ) {
    issues.push(
      err(
        L13InputPackageViolationCode.L13P_PACKAGE_READINESS_ILLEGAL,
        SEV.ERROR,
        'blocked package may not allow multiple answer modes',
      ),
    );
  }

  // §13.2.11 — Prompt budget invariants.
  if (pkg.prompt_budget) {
    const pb = pkg.prompt_budget;
    if (
      pb.max_context_tokens <= 0 ||
      pb.available_context_tokens < 0 ||
      pb.available_context_tokens > pb.max_context_tokens
    ) {
      issues.push(
        err(
          L13InputPackageViolationCode.L13P_PROMPT_BUDGET_INVALID,
          SEV.ERROR,
          'prompt budget tokens are inconsistent',
        ),
      );
    }
  }

  return l13PackageResult(issues);
}
