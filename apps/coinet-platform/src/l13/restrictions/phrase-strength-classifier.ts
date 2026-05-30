/**
 * L13.5 — Phrase Strength Classifier
 *
 * §13.5.8 / §13.5.18 — Classifies output text into a single
 * `L13PhraseStrengthClass`. Used by the confidence-phrasing engine
 * to compare emitted text against the inherited confidence ceiling.
 *
 * The classifier scans the canonical anchor catalogue defined in
 * `phrase-strength.ts` for case-insensitive substring matches and
 * returns the strongest class detected (by rank). When no anchor
 * matches, the section is treated as `EXPLANATORY_MEDIUM` because
 * neutral explanatory prose is the L13 default voice.
 */

import type { L13AIExplanationOutput } from '../contracts/ai-output';
import type { L13OutputSection } from '../contracts/output-section';
import type { L13SectionPhraseStrength } from '../contracts/confidence-phrasing-profile';
import {
  L13_PHRASE_STRENGTH_ANCHORS,
  L13PhraseStrengthClass,
  l13RankPhraseStrength,
} from '../contracts/phrase-strength';

const DEFAULT_CLASS = L13PhraseStrengthClass.EXPLANATORY_MEDIUM;

/**
 * Classify a single piece of text. Returns the strongest phrase
 * class detected together with the anchor phrases that triggered
 * it. When no anchor matches, the default class
 * (`EXPLANATORY_MEDIUM`) is returned with no anchors.
 */
export function classifyL13PhraseStrengthText(text: string): {
  readonly strongest_class: L13PhraseStrengthClass;
  readonly matched_anchor_phrases: readonly string[];
} {
  if (!text || text.trim().length === 0) {
    return {
      strongest_class: L13PhraseStrengthClass.UNCERTAIN_ONLY,
      matched_anchor_phrases: [],
    };
  }
  const lower = text.toLowerCase();
  let strongest: L13PhraseStrengthClass | null = null;
  const matched: string[] = [];
  for (const anchor of L13_PHRASE_STRENGTH_ANCHORS) {
    if (lower.includes(anchor.phrase)) {
      matched.push(anchor.phrase);
      if (
        strongest === null ||
        l13RankPhraseStrength(anchor.phrase_strength_class) >
          l13RankPhraseStrength(strongest)
      ) {
        strongest = anchor.phrase_strength_class;
      }
    }
  }
  return {
    strongest_class: strongest ?? DEFAULT_CLASS,
    matched_anchor_phrases: matched,
  };
}

interface SectionRefAndText {
  readonly section_ref: string;
  readonly text: string;
}

function collectSectionText(
  ref: string,
  section: L13OutputSection | undefined,
): SectionRefAndText[] {
  if (!section) return [];
  if (!section.present) return [];
  const text = section.content ?? '';
  if (text.trim().length === 0) return [];
  return [{ section_ref: ref, text }];
}

/**
 * §13.5.18 — Classify every section of a Layer 13 output.
 *
 * `section_ref` follows the convention used by L13.4 grounding:
 * `<output_id>:headline`, `<output_id>:summary`,
 * `sec.obs.<n>`, `sec.inf.<n>`, etc.
 */
export function classifyL13OutputPhraseStrengths(
  output: L13AIExplanationOutput,
): readonly L13SectionPhraseStrength[] {
  const headlineRef = `${output.output_id}:headline`;
  const summaryRef = `${output.output_id}:summary`;
  const sources: SectionRefAndText[] = [];
  if (output.headline && output.headline.trim().length > 0) {
    sources.push({ section_ref: headlineRef, text: output.headline });
  }
  if (output.summary && output.summary.trim().length > 0) {
    sources.push({ section_ref: summaryRef, text: output.summary });
  }
  sources.push(...collectSectionText('sec.obs.1', output.observation_section));
  sources.push(...collectSectionText('sec.inf.1', output.inference_section));
  sources.push(...collectSectionText('sec.unc.1', output.uncertainty_section));
  sources.push(
    ...collectSectionText('sec.con.1', output.contradiction_section),
  );
  sources.push(...collectSectionText('sec.scn.1', output.scenario_section));
  sources.push(
    ...collectSectionText(
      'sec.tri.1',
      output.trigger_invalidation_section,
    ),
  );
  const results: L13SectionPhraseStrength[] = sources.map(s => {
    const { strongest_class, matched_anchor_phrases } =
      classifyL13PhraseStrengthText(s.text);
    return {
      section_ref: s.section_ref,
      strongest_class,
      matched_anchor_phrases,
    };
  });
  return results;
}

/**
 * Reduce a set of per-section classifications to the strongest
 * single class across all sections, together with the section_ref
 * that produced it. Used by the phrasing engine to compute
 * `strongest_phrase_class_used`.
 */
export function l13StrongestSectionPhrase(
  strengths: readonly L13SectionPhraseStrength[],
): {
  readonly strongest_class: L13PhraseStrengthClass;
  readonly strongest_section_ref?: string;
} {
  if (strengths.length === 0) {
    return { strongest_class: DEFAULT_CLASS };
  }
  let strongest = strengths[0];
  for (const s of strengths) {
    if (
      l13RankPhraseStrength(s.strongest_class) >
      l13RankPhraseStrength(strongest.strongest_class)
    ) {
      strongest = s;
    }
  }
  return {
    strongest_class: strongest.strongest_class,
    strongest_section_ref: strongest.section_ref,
  };
}

/**
 * Concatenate every section's text into a single corpus for
 * forbidden-phrase scanning. Used by the confidence-phrasing
 * engine and the validator.
 */
export function buildL13OutputTextCorpus(
  output: L13AIExplanationOutput,
): string {
  const parts: string[] = [];
  if (output.headline) parts.push(output.headline);
  if (output.summary) parts.push(output.summary);
  for (const section of [
    output.observation_section,
    output.inference_section,
    output.uncertainty_section,
    output.contradiction_section,
    output.scenario_section,
    output.trigger_invalidation_section,
  ]) {
    if (!section || !section.present) continue;
    if (section.content && section.content.length > 0) {
      parts.push(section.content);
    }
  }
  return parts.join(' ');
}
