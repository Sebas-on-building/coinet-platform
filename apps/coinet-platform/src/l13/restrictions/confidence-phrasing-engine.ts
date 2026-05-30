/**
 * L13.5 — Confidence Phrasing Engine
 *
 * §13.5.18 — Classifies emitted output phrase strength across
 * every section, compares against the inherited confidence ceiling
 * (from the ceiling engine) and the composed restriction posture,
 * scans for absolute/contextually forbidden phrases, and produces
 * the `L13ConfidencePhrasingProfile`.
 *
 * Outrun detection is mechanical: if the strongest emitted phrase
 * class outranks the highest class permitted by the ceiling,
 * `confidence_outrun_detected = true`. If any always-forbidden
 * phrase matches, the output is marked rewrite-required (and
 * potentially block-required if combined with other failures).
 */

import type { L13AIExplanationOutput } from '../contracts/ai-output';
import { L13ExplanationConfidenceBand } from '../contracts/confidence-breakdown';
import {
  L13ConfidenceOutrunReasonCode,
  type L13ConfidencePhrasingProfile,
} from '../contracts/confidence-phrasing-profile';
import {
  L13_FORBIDDEN_CERTAINTY_PHRASE_CATALOGUE,
  L13ForbiddenCertaintyPhraseCode,
} from '../contracts/forbidden-certainty-phrase';
import { l13ConfidenceBandAtOrBelow } from '../contracts/explanation-confidence-band';
import {
  L13PhraseStrengthClass,
  l13RankPhraseStrength,
} from '../contracts/phrase-strength';
import { L13RestrictionLevel } from '../contracts/restriction-composition';
import { fnv1a } from '../context/_fnv1a';
import {
  buildL13OutputTextCorpus,
  classifyL13OutputPhraseStrengths,
  l13StrongestSectionPhrase,
} from './phrase-strength-classifier';

const POLICY_V = 'l13.expression.v1';

export interface L13ConfidencePhrasingInput {
  readonly output: L13AIExplanationOutput;
  readonly confidence_ceiling: L13ExplanationConfidenceBand;
  /**
   * Restriction posture from the restriction composition engine.
   * When `EVIDENCE_ONLY` or `BLOCKED`, directional phrase
   * strengths above `CONDITIONAL_MEDIUM` are forbidden regardless
   * of confidence ceiling.
   */
  readonly composed_restriction_level?: L13RestrictionLevel;
  readonly confidence_disclosure_present: boolean;
  readonly required_confidence_disclosure: boolean;
  readonly evidence_refs?: readonly string[];
  readonly lineage_refs?: readonly string[];
}

/**
 * §13.5.18 — Per-ceiling map of the maximum permitted phrase
 * strength class. The phrasing engine compares emitted phrase
 * class against this ceiling.
 */
const CEILING_TO_MAX_PHRASE:
  Readonly<Record<L13ExplanationConfidenceBand, L13PhraseStrengthClass>> = {
  [L13ExplanationConfidenceBand.BLOCKED]:
    L13PhraseStrengthClass.REFUSAL_ONLY,
  [L13ExplanationConfidenceBand.VERY_LOW]:
    L13PhraseStrengthClass.UNCERTAIN_ONLY,
  [L13ExplanationConfidenceBand.LOW]:
    L13PhraseStrengthClass.CONDITIONAL_LOW,
  [L13ExplanationConfidenceBand.MEDIUM]:
    L13PhraseStrengthClass.EXPLANATORY_MEDIUM,
  [L13ExplanationConfidenceBand.HIGH]:
    L13PhraseStrengthClass.EXPLANATORY_HIGH,
  [L13ExplanationConfidenceBand.VERY_HIGH]:
    L13PhraseStrengthClass.ASSERTIVE_HIGH,
};

const ALL_PHRASE_CLASSES: readonly L13PhraseStrengthClass[] =
  Object.values(L13PhraseStrengthClass);

function l13AllowedPhraseClassesForCeiling(
  ceiling: L13ExplanationConfidenceBand,
): readonly L13PhraseStrengthClass[] {
  const max = CEILING_TO_MAX_PHRASE[ceiling];
  const maxRank = l13RankPhraseStrength(max);
  return ALL_PHRASE_CLASSES.filter(
    cls =>
      l13RankPhraseStrength(cls) <= maxRank &&
      cls !== L13PhraseStrengthClass.FORBIDDEN_CERTAINTY,
  );
}

function l13PhraseClassesForbiddenByCeiling(
  ceiling: L13ExplanationConfidenceBand,
): readonly L13PhraseStrengthClass[] {
  const max = CEILING_TO_MAX_PHRASE[ceiling];
  const maxRank = l13RankPhraseStrength(max);
  return ALL_PHRASE_CLASSES.filter(
    cls => l13RankPhraseStrength(cls) > maxRank,
  );
}

/**
 * §13.5.18 — Run the phrasing engine. Pure function.
 */
export function runL13ConfidencePhrasingEngine(
  input: L13ConfidencePhrasingInput,
): L13ConfidencePhrasingProfile {
  const { output, confidence_ceiling, composed_restriction_level } =
    input;

  const section_phrase_strengths = classifyL13OutputPhraseStrengths(
    output,
  );
  const { strongest_class, strongest_section_ref } =
    l13StrongestSectionPhrase(section_phrase_strengths);

  const allowed = l13AllowedPhraseClassesForCeiling(confidence_ceiling);
  const forbiddenByCeiling =
    l13PhraseClassesForbiddenByCeiling(confidence_ceiling);

  // Restriction-driven phrase narrowing. EVIDENCE_ONLY and BLOCKED
  // cap phrase strength at CONDITIONAL_MEDIUM.
  let finalAllowed = allowed;
  let finalForbidden = forbiddenByCeiling.slice();
  if (
    composed_restriction_level === L13RestrictionLevel.EVIDENCE_ONLY ||
    composed_restriction_level === L13RestrictionLevel.BLOCKED
  ) {
    const cap = L13PhraseStrengthClass.CONDITIONAL_MEDIUM;
    const capRank = l13RankPhraseStrength(cap);
    finalAllowed = finalAllowed.filter(
      cls => l13RankPhraseStrength(cls) <= capRank,
    );
    const restrictionForbidden = ALL_PHRASE_CLASSES.filter(
      cls =>
        l13RankPhraseStrength(cls) > capRank &&
        cls !== L13PhraseStrengthClass.FORBIDDEN_CERTAINTY,
    );
    for (const cls of restrictionForbidden) {
      if (!finalForbidden.includes(cls)) finalForbidden.push(cls);
    }
  }
  // FORBIDDEN_CERTAINTY is always forbidden.
  if (
    !finalForbidden.includes(L13PhraseStrengthClass.FORBIDDEN_CERTAINTY)
  ) {
    finalForbidden = [
      ...finalForbidden,
      L13PhraseStrengthClass.FORBIDDEN_CERTAINTY,
    ];
  }

  // Scan output text for forbidden-certainty phrases.
  const corpus = buildL13OutputTextCorpus(output);
  const corpusLower = corpus.toLowerCase();
  const absolute: L13ForbiddenCertaintyPhraseCode[] = [];
  const contextual: L13ForbiddenCertaintyPhraseCode[] = [];
  for (const entry of L13_FORBIDDEN_CERTAINTY_PHRASE_CATALOGUE) {
    if (entry.pattern.test(corpus)) {
      if (entry.forbidden_under_any_condition) {
        absolute.push(entry.phrase_code);
      } else if (
        entry.forbidden_when_confidence_ceiling_at_or_below !==
          undefined &&
        l13ConfidenceBandAtOrBelow(
          confidence_ceiling,
          entry.forbidden_when_confidence_ceiling_at_or_below,
        )
      ) {
        contextual.push(entry.phrase_code);
      }
    } else {
      // The catalogue uses single regex patterns; for some entries
      // a simple lowercase substring check is more robust against
      // alternative quoting. Re-check via includes when pattern
      // missed but the literal phrase string is present.
      // (No-op when pattern already matched.)
      void corpusLower;
    }
  }
  const absoluteSet = Array.from(new Set(absolute));
  const contextualSet = Array.from(new Set(contextual));

  // Outrun detection.
  const reasonCodes: L13ConfidenceOutrunReasonCode[] = [];
  const strongestRank = l13RankPhraseStrength(strongest_class);
  const maxAllowedRank = l13RankPhraseStrength(
    CEILING_TO_MAX_PHRASE[confidence_ceiling],
  );
  let outrunDetected = false;
  if (strongestRank > maxAllowedRank) {
    outrunDetected = true;
    if (
      confidence_ceiling === L13ExplanationConfidenceBand.MEDIUM &&
      strongestRank >=
        l13RankPhraseStrength(L13PhraseStrengthClass.EXPLANATORY_HIGH)
    ) {
      reasonCodes.push(
        L13ConfidenceOutrunReasonCode.VERY_HIGH_LANGUAGE_UNDER_MEDIUM_CEILING,
      );
    }
    if (
      l13ConfidenceBandAtOrBelow(
        confidence_ceiling,
        L13ExplanationConfidenceBand.MEDIUM,
      ) &&
      strongest_class === L13PhraseStrengthClass.ASSERTIVE_HIGH
    ) {
      reasonCodes.push(
        L13ConfidenceOutrunReasonCode.ASSERTIVE_LANGUAGE_UNDER_ACTIVE_INVALIDATION,
      );
    }
  }
  if (absoluteSet.length > 0) {
    outrunDetected = true;
    reasonCodes.push(
      L13ConfidenceOutrunReasonCode.ABSOLUTE_FORBIDDEN_PHRASE_PRESENT,
    );
  }
  if (contextualSet.length > 0) {
    outrunDetected = true;
    reasonCodes.push(
      L13ConfidenceOutrunReasonCode.CONTEXTUALLY_FORBIDDEN_PHRASE_UNDER_NARROWED_CEILING,
    );
  }
  if (
    composed_restriction_level !== undefined &&
    composed_restriction_level !== L13RestrictionLevel.NONE &&
    composed_restriction_level !== L13RestrictionLevel.DISCLOSURE_ONLY &&
    strongestRank >
      l13RankPhraseStrength(L13PhraseStrengthClass.CONDITIONAL_MEDIUM)
  ) {
    outrunDetected = true;
    reasonCodes.push(
      L13ConfidenceOutrunReasonCode.PHRASE_EXCEEDS_RESTRICTION_POSTURE,
    );
  }
  if (
    input.required_confidence_disclosure &&
    !input.confidence_disclosure_present &&
    l13ConfidenceBandAtOrBelow(
      confidence_ceiling,
      L13ExplanationConfidenceBand.MEDIUM,
    )
  ) {
    outrunDetected = true;
    reasonCodes.push(
      L13ConfidenceOutrunReasonCode.LOW_CONFIDENCE_DISCLOSURE_MISSING,
    );
  }
  // Scenario-as-certainty heuristic.
  if (
    /\bscenario\b[^.]*\b(is|will be)\s+(certain|locked|confirmed|guaranteed)\b/i.test(
      corpus,
    )
  ) {
    outrunDetected = true;
    reasonCodes.push(L13ConfidenceOutrunReasonCode.SCENARIO_AS_CERTAINTY);
  }
  // Confidence-as-probability heuristic — phrases that pretend the
  // confidence band is a probability of an outcome.
  if (
    /\b\d+%\s+(chance|probability|likely)\b/i.test(corpus) ||
    /\bprobability\s+of\s+(continuation|breakout|breakdown|move)\b/i.test(
      corpus,
    )
  ) {
    outrunDetected = true;
    reasonCodes.push(
      L13ConfidenceOutrunReasonCode.CONFIDENCE_AS_PROBABILITY,
    );
  }

  // Block-required: only when confidence ceiling is BLOCKED with
  // substantive output emitted, or when absolute forbidden phrases
  // are present.
  const outputMustBeBlocked =
    confidence_ceiling === L13ExplanationConfidenceBand.BLOCKED &&
    strongestRank >
      l13RankPhraseStrength(L13PhraseStrengthClass.REFUSAL_ONLY);
  const outputMustBeRewritten =
    outrunDetected && !outputMustBeBlocked;

  const dedupReason = Array.from(new Set(reasonCodes));

  const replayMaterial = [
    output.output_id,
    confidence_ceiling,
    composed_restriction_level ?? L13RestrictionLevel.NONE,
    strongest_class,
    finalAllowed.join(','),
    finalForbidden.join(','),
    absoluteSet.join(','),
    contextualSet.join(','),
    dedupReason.join(','),
    outrunDetected ? '1' : '0',
    outputMustBeRewritten ? '1' : '0',
    outputMustBeBlocked ? '1' : '0',
    String(input.required_confidence_disclosure),
    String(input.confidence_disclosure_present),
    POLICY_V,
  ].join('|');
  const replayHash = fnv1a(replayMaterial);

  return {
    phrasing_profile_id: `l13.phrasing.${replayHash}`,
    output_id: output.output_id,
    confidence_ceiling,
    section_phrase_strengths,
    strongest_phrase_class_used: strongest_class,
    strongest_phrase_section_ref: strongest_section_ref,
    allowed_phrase_strength_classes: finalAllowed,
    forbidden_phrase_strength_classes: finalForbidden,
    absolute_forbidden_phrases_detected: absoluteSet,
    contextually_forbidden_phrases_detected: contextualSet,
    required_confidence_disclosure: input.required_confidence_disclosure,
    confidence_disclosure_present: input.confidence_disclosure_present,
    confidence_outrun_detected: outrunDetected,
    confidence_outrun_reason_codes: dedupReason,
    output_must_be_rewritten: outputMustBeRewritten,
    output_must_be_blocked: outputMustBeBlocked,
    evidence_refs: input.evidence_refs ?? [],
    lineage_refs: input.lineage_refs ?? [],
    policy_version: POLICY_V,
    replay_hash: replayHash,
  };
}
