/**
 * L10.5 — Hypothesis Contradiction Validator §10.5.3
 *
 * Enforces contradiction semantics: class taxonomy, narrowing vs
 * blocking law, active vs decayed posture, directness, derivability,
 * mandatory-domain law, and the no-netting rule.
 */

import {
  L10HypothesisContradictionPolicy,
  L10ContradictionObservation,
  L10ContradictionDerivabilityFacet,
} from '../contracts/hypothesis-contradiction-policy';
import {
  L10ContradictionClass,
  L10ContradictionEffectClass,
  L10ContradictionTemporalPosture,
  L10ContradictionDirectness,
  ALL_L10_CONTRADICTION_CLASSES,
  ALL_L10_CONTRADICTION_EFFECT_CLASSES,
} from '../contracts/hypothesis-evidence-semantics-types';
import {
  L10EvidenceSemanticValidationIssue,
  L10EvidenceSemanticValidationReport,
  L10EvidenceSemanticViolationCode,
} from './l10-evidence-semantics-violation-codes';

const inRange01 = (n: number) => Number.isFinite(n) && n >= 0 && n <= 1;

export interface L10ContradictionValidationInput {
  readonly policy: L10HypothesisContradictionPolicy;
  readonly observations: readonly L10ContradictionObservation[];
  readonly declared_derivability_facets:
    readonly L10ContradictionDerivabilityFacet[];
  readonly observed_domains: readonly string[];
  /**
   * If the upstream confidence computation *already* folded a
   * contradiction penalty into its number without emitting an explicit
   * contradiction object, this flag signals the no-netting violation.
   */
  readonly contradiction_netted_into_confidence: boolean;
}

export function validateL10Contradiction(
  input: L10ContradictionValidationInput,
): L10EvidenceSemanticValidationReport {
  const issues: L10EvidenceSemanticValidationIssue[] = [];
  const push = (
    code: L10EvidenceSemanticViolationCode,
    message: string,
    subject?: string,
  ) => issues.push({ code, message, subject });

  const { policy, observations } = input;
  const allowedClasses = new Set(policy.allowed_contradiction_classes);
  const allowedEffects = new Set(policy.allowed_effect_classes);
  const knownClasses = new Set<L10ContradictionClass>(
    ALL_L10_CONTRADICTION_CLASSES,
  );
  const knownEffects = new Set<L10ContradictionEffectClass>(
    ALL_L10_CONTRADICTION_EFFECT_CLASSES,
  );

  for (const obs of observations) {
    if (!knownClasses.has(obs.contradiction_class)) {
      push(
        L10EvidenceSemanticViolationCode.CONTRADICTION_CLASS_UNREGISTERED,
        `contradiction_class '${obs.contradiction_class}' not in taxonomy`,
        obs.observation_id,
      );
    }
    if (!allowedClasses.has(obs.contradiction_class)) {
      push(
        L10EvidenceSemanticViolationCode.CONTRADICTION_CLASS_DISALLOWED,
        `contradiction_class '${obs.contradiction_class}' disallowed`,
        obs.observation_id,
      );
    }
    if (!obs.contradiction_effect) {
      push(
        L10EvidenceSemanticViolationCode.CONTRADICTION_EFFECT_MISSING,
        'contradiction_effect required',
        obs.observation_id,
      );
    } else if (!knownEffects.has(obs.contradiction_effect)) {
      push(
        L10EvidenceSemanticViolationCode.CONTRADICTION_EFFECT_MISSING,
        `unknown effect '${obs.contradiction_effect}'`,
        obs.observation_id,
      );
    } else if (!allowedEffects.has(obs.contradiction_effect)) {
      push(
        L10EvidenceSemanticViolationCode.CONTRADICTION_EFFECT_DISALLOWED,
        `effect '${obs.contradiction_effect}' disallowed`,
        obs.observation_id,
      );
    }

    // §10.5.3.4 — blocking mislabel as narrowing.
    if (
      obs.contradiction_class ===
        L10ContradictionClass.DIRECT_CONTRADICTION &&
      obs.contradiction_directness === L10ContradictionDirectness.DIRECT &&
      obs.contradiction_pressure >= 0.7 &&
      obs.contradiction_effect !== L10ContradictionEffectClass.BLOCKING
    ) {
      push(
        L10EvidenceSemanticViolationCode.CONTRADICTION_BLOCKING_MISLABELED_AS_NARROWING,
        'direct high-pressure contradiction not labeled BLOCKING',
        obs.observation_id,
      );
    }

    // §10.5.3.5 — active posture mislabeled decayed.
    if (
      obs.contradiction_temporal_posture ===
        L10ContradictionTemporalPosture.ACTIVE &&
      (obs.contradiction_class ===
        L10ContradictionClass.DECAYED_CONTRADICTION ||
        obs.contradiction_effect ===
          L10ContradictionEffectClass.DECAYED_HISTORICAL_CONTRADICTION)
    ) {
      push(
        L10EvidenceSemanticViolationCode.CONTRADICTION_ACTIVE_MISLABELED_AS_DECAYED,
        'ACTIVE posture but class/effect claims decayed',
        obs.observation_id,
      );
    }

    // §10.5.3.5 — temporal posture presence.
    if (
      !obs.contradiction_temporal_posture &&
      policy.required_temporal_postures.length > 0
    ) {
      push(
        L10EvidenceSemanticViolationCode.CONTRADICTION_TEMPORAL_POSTURE_MISSING,
        'contradiction_temporal_posture required',
        obs.observation_id,
      );
    }

    // §10.5.3.6 — directness required.
    if (
      policy.requires_directness_distinction &&
      !obs.contradiction_directness
    ) {
      push(
        L10EvidenceSemanticViolationCode.CONTRADICTION_DIRECTNESS_MISSING,
        'contradiction_directness required',
        obs.observation_id,
      );
    }

    if (!inRange01(obs.contradiction_pressure)) {
      push(
        L10EvidenceSemanticViolationCode.CONTRADICTION_PRESSURE_OUT_OF_RANGE,
        `contradiction_pressure=${obs.contradiction_pressure} out of [0,1]`,
        obs.observation_id,
      );
    }
  }

  // §10.5.3.4 — required derivability facets declared.
  const declared = new Set(input.declared_derivability_facets);
  for (const f of policy.required_derivability_facets) {
    if (!declared.has(f)) {
      push(
        L10EvidenceSemanticViolationCode.CONTRADICTION_DERIVABILITY_FACET_MISSING,
        `required derivability facet '${f}' not declared`,
      );
    }
  }

  // §10.5.3.7 — mandatory contradiction domains may not be omitted.
  const observedDomains = new Set(input.observed_domains);
  for (const d of policy.mandatory_contradiction_domains) {
    if (!observedDomains.has(d)) {
      push(
        L10EvidenceSemanticViolationCode.CONTRADICTION_DOMAIN_OMITTED,
        `mandatory contradiction domain '${d}' not observed`,
      );
    }
  }

  // §10.5.7.4 — no netting law.
  if (input.contradiction_netted_into_confidence) {
    push(
      L10EvidenceSemanticViolationCode.CONTRADICTION_NETTED_INTO_CONFIDENCE,
      'contradiction was netted into confidence without explicit object',
    );
  }

  return { valid: issues.length === 0, issues };
}
