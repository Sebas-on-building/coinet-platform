/**
 * L9.7 — Sequence Causal-Restraint Law
 *
 * §9.7.7 — Temporal order may not be laundered into full causality
 * (INV-9.1-E / INV-9.7-E). L9.7 emits an explicit causal-restraint
 * posture so later layers know whether they may use the sequence as
 * temporal support, as a provisional causal hint, or not at all as a
 * causal statement.
 */

/**
 * §9.7.7.4 — Canonical causal-restraint classes. Applied to the
 * inferred sequence; fed into the restriction engine (§9.7.7.5) and
 * the reliance readiness summarizer (§9.7.9.3).
 */
export enum L9SequenceCausalRestraintClass {
  /** §9.7.7.4 — default; no causal claim permitted beyond temporal support. */
  STRICT_RESTRAINT = 'STRICT_RESTRAINT',
  /** §9.7.7.4 — narrowed causal hint allowed only under explicit disclosure. */
  NARROWED_RESTRAINT = 'NARROWED_RESTRAINT',
  /** §9.7.7.4 — provisional causal hint; must still be disclosed. */
  PROVISIONAL_CAUSAL_HINT = 'PROVISIONAL_CAUSAL_HINT',
  /** §9.7.7.4 — causal language is blocked entirely. */
  BLOCKED_CAUSAL_LANGUAGE = 'BLOCKED_CAUSAL_LANGUAGE',
}

export const ALL_L9_SEQUENCE_CAUSAL_RESTRAINT_CLASSES:
  readonly L9SequenceCausalRestraintClass[] =
    Object.values(L9SequenceCausalRestraintClass);

/**
 * §9.7.7.3 — Canonical causal tokens/phrases that L9.7 must detect
 * and block in any descriptive surface produced by or piped through
 * the reliance layer. Kept ASCII-only and case-insensitive; patterns
 * mirror the INV-9.6-G leakage style.
 */
export const L9_FORBIDDEN_CAUSAL_LANGUAGE_PATTERN =
  /(caused|proves (?:the|this|that)|confirms (?:the|this|that) (?:catalyst|reaction)|guarantees (?:the|this|that) (?:next|phase)|proves why (?:price|market|the market))/i;

/**
 * §9.7.7.1 / §9.7.7.2 — Detector for forbidden causal language. Used
 * by both the restriction-engine output validator and the causal
 * restraint validator (INV-9.7-E).
 */
export function detectL9ForbiddenCausalLanguage(text: string): boolean {
  return L9_FORBIDDEN_CAUSAL_LANGUAGE_PATTERN.test(text);
}

/**
 * §9.7.7.5 — Causal-restraint interaction profile. Governs which
 * rights the restriction engine may grant and which tokens later
 * layers may emit.
 */
export interface L9SequenceCausalRestraintProfile {
  readonly sequence_subject_id: string;
  readonly restraint_class: L9SequenceCausalRestraintClass;
  /** §9.7.7.5 — textual evidence that justifies the class. */
  readonly rationale_notes: readonly string[];
  /** §9.7.7.3 — tokens flagged by the causal-language detector. */
  readonly flagged_tokens: readonly string[];
  /** §9.7.7.5 — whether final-judgment rights are permitted at all. */
  readonly permits_final_judgment: boolean;
  readonly policy_version: string;
  readonly lineage_refs: readonly string[];
}

/**
 * §9.7.7.5 — Deterministic helper: given a restraint class, does it
 * permit final-judgment rights?
 */
export function l9RestraintPermitsFinalJudgment(
  cls: L9SequenceCausalRestraintClass,
): boolean {
  return cls === L9SequenceCausalRestraintClass.PROVISIONAL_CAUSAL_HINT;
}
