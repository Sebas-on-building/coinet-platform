/**
 * L13.8 — Persona Policy Contract
 *
 * §13.8.12 — §13.8.15 — Persona taxonomy, voice traits, forbidden
 * persona traits, and emotional-intensity controls.
 *
 * Default canonical persona: `SMART_TRADER_FRIEND_GROUNDED`.
 */

export enum L13PersonaClass {
  SMART_TRADER_FRIEND_GROUNDED = 'SMART_TRADER_FRIEND_GROUNDED',
  INSTITUTIONAL_REPORTER = 'INSTITUTIONAL_REPORTER',
  ALERT_OPERATOR = 'ALERT_OPERATOR',
  INTERNAL_DEBUG_ANALYST = 'INTERNAL_DEBUG_ANALYST',
}

export const ALL_L13_PERSONA_CLASSES: readonly L13PersonaClass[] =
  Object.values(L13PersonaClass);

export enum L13PersonaVoiceTrait {
  DIRECT = 'DIRECT',
  CONCISE = 'CONCISE',
  HUMAN = 'HUMAN',
  LOW_EGO = 'LOW_EGO',
  EVIDENCE_FIRST = 'EVIDENCE_FIRST',
  UNCERTAINTY_HONEST = 'UNCERTAINTY_HONEST',
  NON_HYPE = 'NON_HYPE',
}

export const ALL_L13_PERSONA_VOICE_TRAITS:
  readonly L13PersonaVoiceTrait[] =
  Object.values(L13PersonaVoiceTrait);

export enum L13ForbiddenPersonaTrait {
  HYPE = 'HYPE',
  SALESY = 'SALESY',
  PRESCRIPTIVE_ADVISOR = 'PRESCRIPTIVE_ADVISOR',
  PROPHETIC = 'PROPHETIC',
  DISCLAIMER_HEAVY = 'DISCLAIMER_HEAVY',
  EMPTY_CORPORATE = 'EMPTY_CORPORATE',
  ROBOTIC_LIST_DUMP = 'ROBOTIC_LIST_DUMP',
}

export const ALL_L13_FORBIDDEN_PERSONA_TRAITS:
  readonly L13ForbiddenPersonaTrait[] =
  Object.values(L13ForbiddenPersonaTrait);

export enum L13FirstPersonPolicy {
  FORBIDDEN = 'FORBIDDEN',
  ALLOWED_AS_ENGINE = 'ALLOWED_AS_ENGINE',
  ALLOWED_AS_OPERATOR = 'ALLOWED_AS_OPERATOR',
}

export enum L13ColloquialismPolicy {
  FORBIDDEN = 'FORBIDDEN',
  LIGHT = 'LIGHT',
  TRADER_FRIENDLY = 'TRADER_FRIENDLY',
}

export enum L13EmojiPolicy {
  FORBIDDEN = 'FORBIDDEN',
  RARE_NEUTRAL = 'RARE_NEUTRAL',
  ALLOWED = 'ALLOWED',
}

export enum L13ExclamationPolicy {
  FORBIDDEN = 'FORBIDDEN',
  RARE = 'RARE',
  ALLOWED = 'ALLOWED',
}

export enum L13DisclaimerPolicy {
  /**
   * Default — disclosure language only when L13.5/L13.7 mandates
   * it. No generic "NFA / DYOR" appendices.
   */
  ONLY_WHEN_REQUIRED = 'ONLY_WHEN_REQUIRED',
  /**
   * Reports may carry a structured restriction section but never
   * a per-paragraph disclaimer chorus.
   */
  STRUCTURED_RESTRICTION_SECTION = 'STRUCTURED_RESTRICTION_SECTION',
  /**
   * Forbidden — used to flag legacy templates.
   */
  PER_PARAGRAPH_DISCLAIMER_CHORUS = 'PER_PARAGRAPH_DISCLAIMER_CHORUS',
}

/**
 * §13.8.15 — Emotional-intensity ceiling.
 */
export enum L13EmotionalIntensityClass {
  FLAT_TECHNICAL = 'FLAT_TECHNICAL',
  CONTROLLED = 'CONTROLLED',
  ENERGETIC_BUT_CALM = 'ENERGETIC_BUT_CALM',
  HYPE_BLOCKED = 'HYPE_BLOCKED',
}

export const ALL_L13_EMOTIONAL_INTENSITY_CLASSES:
  readonly L13EmotionalIntensityClass[] =
  Object.values(L13EmotionalIntensityClass);

export interface L13PersonaPolicy {
  readonly persona_policy_id: string;
  readonly persona_class: L13PersonaClass;
  readonly allowed_voice_traits: readonly L13PersonaVoiceTrait[];
  readonly forbidden_voice_traits:
    readonly L13ForbiddenPersonaTrait[];
  readonly first_person_policy: L13FirstPersonPolicy;
  readonly colloquialism_policy: L13ColloquialismPolicy;
  readonly emoji_policy: L13EmojiPolicy;
  readonly exclamation_policy: L13ExclamationPolicy;
  readonly disclaimer_policy: L13DisclaimerPolicy;
  readonly emotional_intensity_ceiling: L13EmotionalIntensityClass;
  readonly may_use_trader_friendly_shortcuts: boolean;
  readonly may_use_informal_transition_phrasing: boolean;
  readonly policy_version: string;
  readonly replay_hash: string;
}
