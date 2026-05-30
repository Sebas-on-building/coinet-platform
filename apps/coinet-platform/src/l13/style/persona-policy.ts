/**
 * L13.8 — Persona Policy Builder
 *
 * §13.8.12 / §13.8.13 — Builds a `L13PersonaPolicy` for the given
 * product answer mode. Default is `SMART_TRADER_FRIEND_GROUNDED`;
 * alerts use `ALERT_OPERATOR`; reports use `INSTITUTIONAL_REPORTER`;
 * debug uses `INTERNAL_DEBUG_ANALYST`.
 */

import { L13ProductAnswerMode } from '../contracts/product-answer-mode';
import {
  L13ColloquialismPolicy,
  L13DisclaimerPolicy,
  L13EmojiPolicy,
  L13EmotionalIntensityClass,
  L13ExclamationPolicy,
  L13FirstPersonPolicy,
  L13ForbiddenPersonaTrait,
  L13PersonaClass,
  L13PersonaVoiceTrait,
  type L13PersonaPolicy,
} from '../contracts/persona-policy';
import { fnv1a } from '../context/_fnv1a';

const POLICY_V = 'l13.style.v1';

const PERSONA_FOR_MODE:
  Readonly<Record<L13ProductAnswerMode, L13PersonaClass>> = {
  [L13ProductAnswerMode.SHORT_CHAT]:
    L13PersonaClass.SMART_TRADER_FRIEND_GROUNDED,
  [L13ProductAnswerMode.STANDARD_CHAT]:
    L13PersonaClass.SMART_TRADER_FRIEND_GROUNDED,
  [L13ProductAnswerMode.DEEP_ANALYSIS]:
    L13PersonaClass.SMART_TRADER_FRIEND_GROUNDED,
  [L13ProductAnswerMode.ALERT]: L13PersonaClass.ALERT_OPERATOR,
  [L13ProductAnswerMode.STRUCTURED_REPORT]:
    L13PersonaClass.INSTITUTIONAL_REPORTER,
  [L13ProductAnswerMode.ASSET_COMPARISON]:
    L13PersonaClass.INSTITUTIONAL_REPORTER,
  [L13ProductAnswerMode.THESIS_COMPARISON]:
    L13PersonaClass.INSTITUTIONAL_REPORTER,
  [L13ProductAnswerMode.SCENARIO_EXPLANATION]:
    L13PersonaClass.SMART_TRADER_FRIEND_GROUNDED,
  [L13ProductAnswerMode.SCORE_EXPLANATION]:
    L13PersonaClass.SMART_TRADER_FRIEND_GROUNDED,
  [L13ProductAnswerMode.CONTRADICTION_EXPLANATION]:
    L13PersonaClass.SMART_TRADER_FRIEND_GROUNDED,
  [L13ProductAnswerMode.DEBUG_EXPLANATION]:
    L13PersonaClass.INTERNAL_DEBUG_ANALYST,
};

const ALLOWED_TRAITS:
  Readonly<Record<L13PersonaClass, readonly L13PersonaVoiceTrait[]>> = {
  [L13PersonaClass.SMART_TRADER_FRIEND_GROUNDED]: [
    L13PersonaVoiceTrait.DIRECT,
    L13PersonaVoiceTrait.CONCISE,
    L13PersonaVoiceTrait.HUMAN,
    L13PersonaVoiceTrait.LOW_EGO,
    L13PersonaVoiceTrait.EVIDENCE_FIRST,
    L13PersonaVoiceTrait.UNCERTAINTY_HONEST,
    L13PersonaVoiceTrait.NON_HYPE,
  ],
  [L13PersonaClass.INSTITUTIONAL_REPORTER]: [
    L13PersonaVoiceTrait.DIRECT,
    L13PersonaVoiceTrait.EVIDENCE_FIRST,
    L13PersonaVoiceTrait.UNCERTAINTY_HONEST,
    L13PersonaVoiceTrait.NON_HYPE,
    L13PersonaVoiceTrait.LOW_EGO,
  ],
  [L13PersonaClass.ALERT_OPERATOR]: [
    L13PersonaVoiceTrait.DIRECT,
    L13PersonaVoiceTrait.CONCISE,
    L13PersonaVoiceTrait.EVIDENCE_FIRST,
    L13PersonaVoiceTrait.UNCERTAINTY_HONEST,
    L13PersonaVoiceTrait.NON_HYPE,
  ],
  [L13PersonaClass.INTERNAL_DEBUG_ANALYST]: [
    L13PersonaVoiceTrait.DIRECT,
    L13PersonaVoiceTrait.EVIDENCE_FIRST,
    L13PersonaVoiceTrait.LOW_EGO,
  ],
};

const FORBIDDEN_TRAITS: readonly L13ForbiddenPersonaTrait[] = [
  L13ForbiddenPersonaTrait.HYPE,
  L13ForbiddenPersonaTrait.SALESY,
  L13ForbiddenPersonaTrait.PRESCRIPTIVE_ADVISOR,
  L13ForbiddenPersonaTrait.PROPHETIC,
  L13ForbiddenPersonaTrait.DISCLAIMER_HEAVY,
  L13ForbiddenPersonaTrait.EMPTY_CORPORATE,
  L13ForbiddenPersonaTrait.ROBOTIC_LIST_DUMP,
];

function emotionalCeilingForPersona(
  cls: L13PersonaClass,
): L13EmotionalIntensityClass {
  if (cls === L13PersonaClass.ALERT_OPERATOR) {
    return L13EmotionalIntensityClass.ENERGETIC_BUT_CALM;
  }
  if (cls === L13PersonaClass.INSTITUTIONAL_REPORTER) {
    return L13EmotionalIntensityClass.FLAT_TECHNICAL;
  }
  if (cls === L13PersonaClass.INTERNAL_DEBUG_ANALYST) {
    return L13EmotionalIntensityClass.FLAT_TECHNICAL;
  }
  return L13EmotionalIntensityClass.CONTROLLED;
}

/**
 * §13.8.13 — Build a persona policy for the given mode.
 */
export function buildL13PersonaPolicy(
  mode: L13ProductAnswerMode,
): L13PersonaPolicy {
  const personaClass = PERSONA_FOR_MODE[mode];
  const allowed = ALLOWED_TRAITS[personaClass];
  const ceiling = emotionalCeilingForPersona(personaClass);
  const disclaimerPolicy =
    personaClass === L13PersonaClass.INSTITUTIONAL_REPORTER
      ? L13DisclaimerPolicy.STRUCTURED_RESTRICTION_SECTION
      : L13DisclaimerPolicy.ONLY_WHEN_REQUIRED;
  const replayHash = fnv1a(
    [
      personaClass,
      allowed.slice().sort().join(','),
      FORBIDDEN_TRAITS.slice().sort().join(','),
      disclaimerPolicy,
      ceiling,
      POLICY_V,
    ].join('|'),
  );
  return {
    persona_policy_id: `l13.persona.${replayHash}`,
    persona_class: personaClass,
    allowed_voice_traits: allowed,
    forbidden_voice_traits: FORBIDDEN_TRAITS,
    first_person_policy:
      personaClass === L13PersonaClass.INTERNAL_DEBUG_ANALYST
        ? L13FirstPersonPolicy.ALLOWED_AS_OPERATOR
        : L13FirstPersonPolicy.ALLOWED_AS_ENGINE,
    colloquialism_policy:
      personaClass === L13PersonaClass.SMART_TRADER_FRIEND_GROUNDED
        ? L13ColloquialismPolicy.TRADER_FRIENDLY
        : L13ColloquialismPolicy.FORBIDDEN,
    emoji_policy: L13EmojiPolicy.FORBIDDEN,
    exclamation_policy: L13ExclamationPolicy.RARE,
    disclaimer_policy: disclaimerPolicy,
    emotional_intensity_ceiling: ceiling,
    may_use_trader_friendly_shortcuts:
      personaClass === L13PersonaClass.SMART_TRADER_FRIEND_GROUNDED,
    may_use_informal_transition_phrasing:
      personaClass === L13PersonaClass.SMART_TRADER_FRIEND_GROUNDED,
    policy_version: POLICY_V,
    replay_hash: replayHash,
  };
}
