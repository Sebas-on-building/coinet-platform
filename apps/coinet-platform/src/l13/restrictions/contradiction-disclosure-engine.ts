/**
 * L13.5 — Contradiction Disclosure Engine
 *
 * §13.5.17 — Builds the `L13ContradictionDisclosureProfile` from
 * the contradiction summary on the input package, the contradiction
 * matches produced by L13.4 grounding, and the output's
 * contradiction section / corpus text.
 *
 * Effect-class derivation (§13.5.11):
 *   - No contradiction in summary and no contradiction match: NO_CONTRADICTION
 *   - Contradiction in summary but pressure low: DISCLOSURE_ONLY
 *   - Contradiction in summary with moderate pressure or any
 *     L13.4 match that recommends narrowing: NARROWS_LANGUAGE
 *   - L13.4 match with `blocks_claim` set or grounding readiness
 *     `GROUNDING_BLOCKED_CONTRADICTED`: BLOCKS_OUTPUT
 *   - Contradiction present but section absent / hidden /
 *     minimized / overridden: BLOCKS_CLEAN_OUTPUT
 *
 * The engine is a pure function. It also detects three failure
 * patterns (`hidden`, `minimized`, `overridden`) by scanning the
 * output text against canonical phrase patterns.
 */

import type { L13AIInputPackage } from '../contracts/ai-input-package';
import type { L13AIExplanationOutput } from '../contracts/ai-output';
import type { L13ClaimGroundingResult } from '../contracts/claim-grounding';
import { L13GroundingReadinessClass } from '../contracts/claim-grounding';
import type {
  L13ContradictionMatch,
} from '../contracts/contradiction-match';
import { L13ClaimContradictionEffect } from '../contracts/contradiction-match';
import {
  L13ContradictionDisclosureEffectClass,
  l13StrengthenContradictionEffect,
  type L13ContradictionDisclosureProfile,
} from '../contracts/contradiction-disclosure-profile';
import {
  L13RequiredDisclosurePhraseCode,
} from '../contracts/required-disclosure-phrase';
import { fnv1a } from '../context/_fnv1a';
import {
  buildL13OutputTextCorpus,
} from './phrase-strength-classifier';

const POLICY_V = 'l13.expression.v1';

const HIDING_PATTERNS: readonly RegExp[] = [
  /\bno\s+(major\s+)?contradictions?\b/i,
  /\bno\s+(meaningful|significant)\s+contradictions?\b/i,
  /\beverything\s+lines\s+up\b/i,
  /\bclean\s+signal\b/i,
  /\bsignals?\s+(all\s+)?align\b/i,
  /\bno\s+(real\s+)?(opposition|pushback)\b/i,
];

const MINIMIZING_PATTERNS: readonly RegExp[] = [
  /\bonly\s+a\s+minor\s+contradiction\b/i,
  /\bcontradiction\s+is\s+(minor|small|negligible|trivial)\b/i,
  /\bjust\s+a\s+small\s+wrinkle\b/i,
  /\bnothing\s+to\s+worry\s+about\b/i,
  /\boverall\s+still\s+(clean|clear)\b/i,
];

const OVERRIDING_PATTERNS: readonly RegExp[] = [
  /\bcontradiction\s+is\s+outweighed\s+by\b/i,
  /\bcontradiction\s+(but|however)\s+(positive|bullish|bearish)\s+evidence\s+wins\b/i,
  /\bpositive\s+evidence\s+(beats|overrides|outweighs)\s+(the\s+)?contradiction\b/i,
  /\bcontradiction\s+doesn'?t\s+matter\b/i,
];

export interface L13ContradictionDisclosureInput {
  readonly output: L13AIExplanationOutput;
  readonly input_package: L13AIInputPackage;
  readonly grounding_result: L13ClaimGroundingResult;
  readonly contradiction_matches: readonly L13ContradictionMatch[];
  readonly evidence_refs?: readonly string[];
  readonly lineage_refs?: readonly string[];
}

function l13ContradictionRefsFromMatches(
  matches: readonly L13ContradictionMatch[],
): readonly string[] {
  const set = new Set<string>();
  for (const m of matches) {
    for (const ref of m.matched_contradiction_refs) set.add(ref);
  }
  return Array.from(set);
}

/**
 * §13.5.17 — Run the contradiction-disclosure engine.
 */
export function runL13ContradictionDisclosureEngine(
  input: L13ContradictionDisclosureInput,
): L13ContradictionDisclosureProfile {
  const { output, input_package, grounding_result, contradiction_matches } =
    input;
  const summary = input_package.contradiction_summary;
  const profile = input_package.uncertainty_profile;
  // Contradiction is "present" only when there are active
  // contradiction refs, an active-contradiction flag, or at least
  // one L13.4 contradiction match with a non-NO_CONTRADICTION
  // effect. A nonzero pressure score on its own is not sufficient
  // — pressure may carry historical context without an active
  // contradiction to disclose.
  const hasSummaryContradiction =
    profile.active_contradiction_present ||
    (summary && summary.active_contradiction_refs.length > 0);
  const hasActiveContradictionMatch = contradiction_matches.some(
    m =>
      m.contradiction_effect !==
      L13ClaimContradictionEffect.NO_CONTRADICTION,
  );

  const allRefs = new Set<string>();
  if (summary) {
    for (const ref of summary.active_contradiction_refs ?? []) allRefs.add(ref);
  }
  for (const ref of l13ContradictionRefsFromMatches(contradiction_matches)) {
    allRefs.add(ref);
  }
  for (const ref of output.contradiction_refs ?? []) allRefs.add(ref);

  // Effect derivation.
  let effect: L13ContradictionDisclosureEffectClass =
    L13ContradictionDisclosureEffectClass.NO_CONTRADICTION;
  if (!hasSummaryContradiction && !hasActiveContradictionMatch) {
    effect = L13ContradictionDisclosureEffectClass.NO_CONTRADICTION;
  } else {
    // Grounding-driven blocking.
    if (
      grounding_result.grounding_readiness_class ===
        L13GroundingReadinessClass.GROUNDING_BLOCKED_CONTRADICTED ||
      grounding_result.any_contradicted_claim_emitted
    ) {
      effect = L13ContradictionDisclosureEffectClass.BLOCKS_OUTPUT;
    } else {
      // Examine matches for narrowing/blocking signals.
      for (const m of contradiction_matches) {
        if (m.blocks_claim) {
          effect = l13StrengthenContradictionEffect(
            effect,
            L13ContradictionDisclosureEffectClass.BLOCKS_OUTPUT,
          );
        } else if (
          m.contradiction_effect ===
            L13ClaimContradictionEffect.NARROWS_CLAIM ||
          m.contradiction_effect ===
            L13ClaimContradictionEffect.DISCLOSURE_REQUIRED
        ) {
          effect = l13StrengthenContradictionEffect(
            effect,
            L13ContradictionDisclosureEffectClass.NARROWS_LANGUAGE,
          );
        }
      }
      // Pressure-based escalation.
      const pressure =
        summary?.contradiction_pressure_score ?? 0;
      if (
        effect ===
          L13ContradictionDisclosureEffectClass.NO_CONTRADICTION
      ) {
        if (pressure >= 0.6) {
          effect = L13ContradictionDisclosureEffectClass.NARROWS_LANGUAGE;
        } else if (pressure > 0) {
          effect = L13ContradictionDisclosureEffectClass.DISCLOSURE_ONLY;
        }
      } else if (
        effect ===
          L13ContradictionDisclosureEffectClass.DISCLOSURE_ONLY &&
        pressure >= 0.4
      ) {
        effect = L13ContradictionDisclosureEffectClass.NARROWS_LANGUAGE;
      }
    }
  }

  const sectionPresent =
    !!output.contradiction_section &&
    output.contradiction_section.present &&
    (output.contradiction_section.content ?? '').trim().length > 0;
  const sectionRef = sectionPresent
    ? output.contradiction_section.section_id
    : undefined;
  const sectionRequired =
    effect !==
      L13ContradictionDisclosureEffectClass.NO_CONTRADICTION;

  // Pattern-based failure detection.
  const corpus = buildL13OutputTextCorpus(output);
  const hidden = sectionRequired
    ? HIDING_PATTERNS.some(p => p.test(corpus))
    : false;
  const minimized = sectionRequired
    ? MINIMIZING_PATTERNS.some(p => p.test(corpus))
    : false;
  const overridden = sectionRequired
    ? OVERRIDING_PATTERNS.some(p => p.test(corpus))
    : false;

  // Escalate to BLOCKS_CLEAN_OUTPUT if section is required but
  // missing / hidden / minimized / overridden.
  let finalEffect = effect;
  if (
    sectionRequired &&
    (!sectionPresent || hidden || minimized || overridden)
  ) {
    finalEffect = l13StrengthenContradictionEffect(
      finalEffect,
      L13ContradictionDisclosureEffectClass.BLOCKS_CLEAN_OUTPUT,
    );
  }

  const mustMention =
    finalEffect ===
      L13ContradictionDisclosureEffectClass.DISCLOSURE_ONLY ||
    finalEffect ===
      L13ContradictionDisclosureEffectClass.NARROWS_LANGUAGE ||
    finalEffect ===
      L13ContradictionDisclosureEffectClass.BLOCKS_CLEAN_OUTPUT;

  const phraseRequirements: L13RequiredDisclosurePhraseCode[] =
    mustMention
      ? [L13RequiredDisclosurePhraseCode.CONTRADICTION_REMAINS_ACTIVE]
      : [];

  const outputAllowed =
    finalEffect !==
    L13ContradictionDisclosureEffectClass.BLOCKS_OUTPUT;

  const replayMaterial = [
    output.output_id,
    input_package.input_package_id,
    Array.from(allRefs).sort().join(','),
    finalEffect,
    String(mustMention),
    phraseRequirements.join(','),
    String(sectionRequired),
    sectionRef ?? '',
    String(hidden),
    String(minimized),
    String(overridden),
    String(outputAllowed),
    POLICY_V,
  ].join('|');
  const replayHash = fnv1a(replayMaterial);

  return {
    contradiction_disclosure_id: `l13.contradiction.${replayHash}`,
    output_id: output.output_id,
    input_package_id: input_package.input_package_id,
    contradiction_refs: Array.from(allRefs),
    contradiction_effect_class: finalEffect,
    must_mention_contradiction: mustMention,
    contradiction_phrase_requirements: phraseRequirements,
    contradiction_section_required: sectionRequired,
    contradiction_section_ref: sectionRef,
    contradiction_hidden_detected: hidden,
    contradiction_minimized_detected: minimized,
    contradiction_overridden_detected: overridden,
    output_allowed: outputAllowed,
    evidence_refs: input.evidence_refs ?? [],
    lineage_refs: input.lineage_refs ?? [],
    policy_version: POLICY_V,
    replay_hash: replayHash,
  };
}
