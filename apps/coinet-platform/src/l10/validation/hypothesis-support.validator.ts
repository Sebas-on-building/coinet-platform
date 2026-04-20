/**
 * L10.5 — Hypothesis Support Validator §10.5.2
 *
 * Enforces support semantics: role-taxonomy, primary-capable roles,
 * derivability facets, required domains, posture/stale/degraded laws,
 * and missing-support visibility.
 */

import {
  L10HypothesisSupportPolicy,
  L10SupportObservation,
  L10SupportDerivabilityFacet,
} from '../contracts/hypothesis-support-policy';
import {
  L10SupportRoleClass,
  L10EvidencePostureClass,
  L10_PRIMARY_CAPABLE_SUPPORT_ROLES,
  ALL_L10_SUPPORT_ROLE_CLASSES,
} from '../contracts/hypothesis-evidence-semantics-types';
import {
  L10EvidenceSemanticValidationIssue,
  L10EvidenceSemanticValidationReport,
  L10EvidenceSemanticViolationCode,
} from './l10-evidence-semantics-violation-codes';

const inRange01 = (n: number) => Number.isFinite(n) && n >= 0 && n <= 1;

export interface L10SupportValidationInput {
  readonly policy: L10HypothesisSupportPolicy;
  readonly observations: readonly L10SupportObservation[];
  /**
   * Derivability facets the candidate's emission actually declared for
   * its support-strength decomposition. Validator checks this is a
   * superset of `policy.required_derivability_facets`.
   */
  readonly declared_derivability_facets:
    readonly L10SupportDerivabilityFacet[];
  /** Domains actually observed across the support set. */
  readonly observed_domains: readonly string[];
  /** Domains explicitly flagged as missing-expected in the support set. */
  readonly declared_missing_expected_domains: readonly string[];
}

export function validateL10Support(
  input: L10SupportValidationInput,
): L10EvidenceSemanticValidationReport {
  const issues: L10EvidenceSemanticValidationIssue[] = [];
  const push = (
    code: L10EvidenceSemanticViolationCode,
    message: string,
    subject?: string,
  ) => issues.push({ code, message, subject });

  const { policy, observations } = input;
  const allowed = new Set(policy.allowed_support_roles);
  const primaryCapable = new Set(policy.primary_anchor_roles);
  const knownRoles = new Set<L10SupportRoleClass>(
    ALL_L10_SUPPORT_ROLE_CLASSES,
  );

  for (const obs of observations) {
    if (!obs.support_role) {
      push(
        L10EvidenceSemanticViolationCode.SUPPORT_MISSING_ROLE,
        'support observation missing role',
        obs.observation_id,
      );
      continue;
    }
    if (!knownRoles.has(obs.support_role)) {
      push(
        L10EvidenceSemanticViolationCode.SUPPORT_ROLE_UNREGISTERED,
        `support_role '${obs.support_role}' not in taxonomy`,
        obs.observation_id,
      );
    }
    if (!allowed.has(obs.support_role)) {
      push(
        L10EvidenceSemanticViolationCode.SUPPORT_ROLE_DISALLOWED,
        `support_role '${obs.support_role}' disallowed for candidate`,
        obs.observation_id,
      );
    }
    if (!obs.supporting_ref) {
      push(
        L10EvidenceSemanticViolationCode.SUPPORT_CLAIM_WITHOUT_REF,
        'support observation missing supporting_ref',
        obs.observation_id,
      );
    }
    if (!inRange01(obs.support_strength)) {
      push(
        L10EvidenceSemanticViolationCode.SUPPORT_STRENGTH_OUT_OF_RANGE,
        `support_strength=${obs.support_strength} out of [0,1]`,
        obs.observation_id,
      );
    }
    if (obs.support_strength > 0 && !obs.support_role) {
      push(
        L10EvidenceSemanticViolationCode.SUPPORT_STRENGTH_WITHOUT_ROLE,
        'support_strength > 0 requires a role',
        obs.observation_id,
      );
    }

    // §10.5.2.5 — primary anchor must come from a primary-capable role.
    if (
      obs.support_role === L10SupportRoleClass.PRIMARY_SUPPORT &&
      !L10_PRIMARY_CAPABLE_SUPPORT_ROLES.includes(obs.support_role)
    ) {
      push(
        L10EvidenceSemanticViolationCode.SUPPORT_ROLE_DISALLOWED,
        `PRIMARY_SUPPORT role asserted but not primary-capable`,
        obs.observation_id,
      );
    }
    if (
      primaryCapable.has(obs.support_role) &&
      obs.support_posture === L10EvidencePostureClass.EVIDENCE_ONLY
    ) {
      push(
        L10EvidenceSemanticViolationCode.SUPPORT_PRIMARY_FROM_EVIDENCE_ONLY,
        `primary-capable support rests on evidence-only posture`,
        obs.observation_id,
      );
    }
    if (
      primaryCapable.has(obs.support_role) &&
      (obs.support_posture === L10EvidencePostureClass.DEGRADED ||
        obs.support_posture === L10EvidencePostureClass.DECAYED)
    ) {
      push(
        L10EvidenceSemanticViolationCode.SUPPORT_PRIMARY_FROM_DEGRADED,
        `primary-capable support is degraded/decayed`,
        obs.observation_id,
      );
    }

    // §10.5.2.6 — stale/degraded masquerade as clean support.
    if (
      obs.support_posture === L10EvidencePostureClass.STALE &&
      obs.support_role !== L10SupportRoleClass.STALE_SUPPORT
    ) {
      push(
        L10EvidenceSemanticViolationCode.SUPPORT_STALE_PRESENTED_AS_CLEAN,
        'stale posture not reflected in role',
        obs.observation_id,
      );
    }
    if (
      obs.support_posture === L10EvidencePostureClass.DEGRADED &&
      obs.support_role !== L10SupportRoleClass.DEGRADED_SUPPORT
    ) {
      push(
        L10EvidenceSemanticViolationCode.SUPPORT_DEGRADED_PRESENTED_AS_CLEAN,
        'degraded posture not reflected in role',
        obs.observation_id,
      );
    }

    // §10.5.2.8 — permitted lineage domains.
    if (policy.permitted_lineage_domains.length > 0) {
      const ok = policy.permitted_lineage_domains.includes(
        obs.support_domain,
      );
      if (!ok) {
        push(
          L10EvidenceSemanticViolationCode.SUPPORT_LINEAGE_DOMAIN_FOREIGN,
          `support_domain '${obs.support_domain}' not permitted`,
          obs.observation_id,
        );
      }
    }
  }

  // §10.5.2.4 — required derivability facets must be declared.
  const declared = new Set(input.declared_derivability_facets);
  for (const f of policy.required_derivability_facets) {
    if (!declared.has(f)) {
      push(
        L10EvidenceSemanticViolationCode.SUPPORT_DERIVABILITY_FACET_MISSING,
        `required derivability facet '${f}' not declared`,
      );
    }
  }

  // §10.5.2.7 — required template-critical domains must be observed or
  // else *explicitly* declared missing. Silent absence is illegal.
  const observedDomains = new Set(input.observed_domains);
  const declaredMissing = new Set(
    input.declared_missing_expected_domains,
  );
  for (const d of policy.required_support_domains) {
    if (!observedDomains.has(d) && !declaredMissing.has(d)) {
      push(
        L10EvidenceSemanticViolationCode.SUPPORT_MISSING_EXPECTED_HIDDEN,
        `required support domain '${d}' absent and not declared missing`,
      );
    }
  }

  return { valid: issues.length === 0, issues };
}
