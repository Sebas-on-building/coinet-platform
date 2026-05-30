/**
 * L13.5 — Contradiction Disclosure Profile Contract
 *
 * §13.5.11 — When contradiction is present, the expression layer
 * must convert it into mandatory disclosure phrases and ceiling
 * narrowing. The contradiction-disclosure engine emits this profile
 * for every Layer 13 output.
 *
 * Effect classes (§13.5.11):
 *   - NO_CONTRADICTION      — clean; nothing required.
 *   - DISCLOSURE_ONLY       — emit, but mention contradiction.
 *   - NARROWS_LANGUAGE      — emit, ceiling drops, phrase strength
 *                              reduces, disclosure required.
 *   - BLOCKS_CLEAN_OUTPUT   — emit allowed, but readiness cannot
 *                              be clean.
 *   - BLOCKS_OUTPUT         — substantive emission disallowed.
 */

import type { L13RequiredDisclosurePhraseCode } from './required-disclosure-phrase';

export enum L13ContradictionDisclosureEffectClass {
  NO_CONTRADICTION = 'NO_CONTRADICTION',
  DISCLOSURE_ONLY = 'DISCLOSURE_ONLY',
  NARROWS_LANGUAGE = 'NARROWS_LANGUAGE',
  BLOCKS_CLEAN_OUTPUT = 'BLOCKS_CLEAN_OUTPUT',
  BLOCKS_OUTPUT = 'BLOCKS_OUTPUT',
}

export const ALL_L13_CONTRADICTION_DISCLOSURE_EFFECT_CLASSES:
  readonly L13ContradictionDisclosureEffectClass[] =
  Object.values(L13ContradictionDisclosureEffectClass);

/**
 * §13.5.11 — Deterministic ranking. Used by the engine to combine
 * effects from multiple contradictions: most restrictive wins.
 */
export const L13_CONTRADICTION_EFFECT_RANK:
  Readonly<Record<L13ContradictionDisclosureEffectClass, number>> = {
  [L13ContradictionDisclosureEffectClass.NO_CONTRADICTION]: 0,
  [L13ContradictionDisclosureEffectClass.DISCLOSURE_ONLY]: 1,
  [L13ContradictionDisclosureEffectClass.NARROWS_LANGUAGE]: 2,
  [L13ContradictionDisclosureEffectClass.BLOCKS_CLEAN_OUTPUT]: 3,
  [L13ContradictionDisclosureEffectClass.BLOCKS_OUTPUT]: 4,
};

export function l13RankContradictionEffect(
  cls: L13ContradictionDisclosureEffectClass,
): number {
  return L13_CONTRADICTION_EFFECT_RANK[cls];
}

export function l13StrengthenContradictionEffect(
  a: L13ContradictionDisclosureEffectClass,
  b: L13ContradictionDisclosureEffectClass,
): L13ContradictionDisclosureEffectClass {
  return l13RankContradictionEffect(a) >= l13RankContradictionEffect(b)
    ? a
    : b;
}

/**
 * §13.5.11 — Contradiction Disclosure Profile.
 */
export interface L13ContradictionDisclosureProfile {
  readonly contradiction_disclosure_id: string;

  readonly output_id: string;
  readonly input_package_id: string;

  readonly contradiction_refs: readonly string[];

  readonly contradiction_effect_class:
    L13ContradictionDisclosureEffectClass;

  readonly must_mention_contradiction: boolean;
  readonly contradiction_phrase_requirements:
    readonly L13RequiredDisclosurePhraseCode[];

  readonly contradiction_section_required: boolean;
  readonly contradiction_section_ref?: string;

  readonly contradiction_hidden_detected: boolean;
  readonly contradiction_minimized_detected: boolean;
  readonly contradiction_overridden_detected: boolean;

  readonly output_allowed: boolean;

  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];

  readonly policy_version: string;
  readonly replay_hash: string;
}
