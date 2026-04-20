/**
 * L10.5 — Hypothesis Confirmation Validator §10.5.4
 *
 * Enforces confirmation semantics: class taxonomy, presence
 * distinctions, upgrade-critical declaration, template-domain
 * completeness, and the primary-with-missing-upgrades law.
 */

import {
  L10HypothesisConfirmationPolicy,
  L10ConfirmationObservation,
} from '../contracts/hypothesis-confirmation-policy';
import {
  L10ConfirmationClass,
  L10ConfirmationPresence,
  L10EvidencePostureClass,
  ALL_L10_CONFIRMATION_CLASSES,
  L10_UPGRADE_CAPABLE_CONFIRMATION_CLASSES,
} from '../contracts/hypothesis-evidence-semantics-types';
import {
  L10EvidenceSemanticValidationIssue,
  L10EvidenceSemanticValidationReport,
  L10EvidenceSemanticViolationCode,
} from './l10-evidence-semantics-violation-codes';

export interface L10ConfirmationValidationInput {
  readonly policy: L10HypothesisConfirmationPolicy;
  readonly observations: readonly L10ConfirmationObservation[];
  /** Whether present and required are reported as a single collapsed set. */
  readonly required_and_present_collapsed: boolean;
  /** Domains observed across the confirmation set. */
  readonly observed_domains: readonly string[];
  /** Whether this candidate is currently ranked primary. */
  readonly is_primary: boolean;
}

export function validateL10Confirmation(
  input: L10ConfirmationValidationInput,
): L10EvidenceSemanticValidationReport {
  const issues: L10EvidenceSemanticValidationIssue[] = [];
  const push = (
    code: L10EvidenceSemanticViolationCode,
    message: string,
    subject?: string,
  ) => issues.push({ code, message, subject });

  const { policy, observations } = input;
  const allowedClasses = new Set(policy.allowed_confirmation_classes);
  const knownClasses = new Set<L10ConfirmationClass>(
    ALL_L10_CONFIRMATION_CLASSES,
  );
  const requiredPresence = new Set(policy.required_presence_distinctions);

  let hasUpgradeCritical = false;
  let missingUpgradeCritical = false;

  for (const obs of observations) {
    if (!knownClasses.has(obs.confirmation_class)) {
      push(
        L10EvidenceSemanticViolationCode.CONFIRMATION_CLASS_UNREGISTERED,
        `confirmation_class '${obs.confirmation_class}' not in taxonomy`,
        obs.observation_id,
      );
    }
    if (!allowedClasses.has(obs.confirmation_class)) {
      push(
        L10EvidenceSemanticViolationCode.CONFIRMATION_CLASS_DISALLOWED,
        `confirmation_class '${obs.confirmation_class}' disallowed`,
        obs.observation_id,
      );
    }
    if (!obs.confirmation_presence) {
      push(
        L10EvidenceSemanticViolationCode.CONFIRMATION_PRESENCE_MISSING,
        'confirmation_presence required',
        obs.observation_id,
      );
    }
    if (
      obs.is_upgrade_critical &&
      !L10_UPGRADE_CAPABLE_CONFIRMATION_CLASSES.includes(
        obs.confirmation_class,
      )
    ) {
      push(
        L10EvidenceSemanticViolationCode.CONFIRMATION_UPGRADE_CRITICAL_OMITTED,
        'upgrade-critical flag on a non-upgrade-capable class',
        obs.observation_id,
      );
    }
    if (obs.is_upgrade_critical) hasUpgradeCritical = true;
    if (
      obs.is_upgrade_critical &&
      obs.confirmation_presence === L10ConfirmationPresence.MISSING
    ) {
      missingUpgradeCritical = true;
    }

    if (
      obs.confirmation_presence === L10ConfirmationPresence.PRESENT &&
      obs.evidence_posture === L10EvidencePostureClass.DEGRADED
    ) {
      push(
        L10EvidenceSemanticViolationCode.CONFIRMATION_DEGRADED_TREATED_AS_FULL,
        'degraded posture reported as fully PRESENT',
        obs.observation_id,
      );
    }
  }

  // §10.5.4.4 — required/present collapse is illegal.
  if (input.required_and_present_collapsed) {
    push(
      L10EvidenceSemanticViolationCode.CONFIRMATION_REQUIRED_AND_PRESENT_COLLAPSED,
      'required and present confirmations reported as single set',
    );
  }

  // §10.5.4.4 — required presence distinctions enforcement: every required
  // presence class must actually appear in the observations or be
  // declared as MISSING (visible).
  const observedPresences = new Set(
    observations.map(o => o.confirmation_presence),
  );
  for (const rp of requiredPresence) {
    if (rp === L10ConfirmationPresence.REQUIRED) continue; // logical only
    if (!observedPresences.has(rp)) {
      // Only strictly enforce for MISSING — present/degraded absence is
      // allowed if nothing qualifies.
      if (rp === L10ConfirmationPresence.MISSING) {
        // the absence of any missing-confirmation object for a policy
        // that demands the distinction usually means hidden missing.
        const anyMissingHidden = observations.some(
          o =>
            !observedPresences.has(L10ConfirmationPresence.MISSING) &&
            o.confirmation_presence !== L10ConfirmationPresence.PRESENT,
        );
        if (anyMissingHidden) {
          push(
            L10EvidenceSemanticViolationCode.CONFIRMATION_MISSING_HIDDEN,
            'MISSING confirmations not separately surfaced',
          );
        }
      }
    }
  }

  // §10.5.4.3 — mandatory confirmation domains.
  const observedDomains = new Set(input.observed_domains);
  for (const d of policy.mandatory_confirmation_domains) {
    if (!observedDomains.has(d)) {
      push(
        L10EvidenceSemanticViolationCode.CONFIRMATION_TEMPLATE_DOMAIN_MISSING,
        `mandatory confirmation domain '${d}' not observed`,
      );
    }
  }

  // §10.5.4.6 — upgrade-critical classes must be declared.
  for (const req of policy.required_upgrade_capable_classes) {
    if (
      !observations.some(
        o => o.confirmation_class === req && o.is_upgrade_critical,
      )
    ) {
      push(
        L10EvidenceSemanticViolationCode.CONFIRMATION_UPGRADE_CRITICAL_OMITTED,
        `required upgrade-critical class '${req}' not declared`,
      );
    }
  }
  void hasUpgradeCritical;

  // §10.5.4.7 — primary with missing upgrades.
  if (
    input.is_primary &&
    missingUpgradeCritical &&
    !policy.allow_primary_with_missing_upgrades
  ) {
    push(
      L10EvidenceSemanticViolationCode.CONFIRMATION_PRIMARY_WITH_MISSING_UPGRADES,
      'primary candidate emitted with missing upgrade-critical confirmations',
    );
  }

  return { valid: issues.length === 0, issues };
}
