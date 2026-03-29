/**
 * Explanation Layer — generates structured reasons for hypothesis ranking.
 */

import type { RankedHypothesis, AmbiguityLevel } from './types';
import { HYPOTHESIS_DEFINITIONS } from './registry';

export function buildRankingExplanation(
  primary: RankedHypothesis,
  secondary: RankedHypothesis | null,
  ambiguity: AmbiguityLevel,
): string[] {
  const lines: string[] = [];
  const pDef = HYPOTHESIS_DEFINITIONS[primary.id];

  const topSupports = primary.supportLinks
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map(l => l.evidenceKey.replace(/\./g, ' '));

  lines.push(
    `Primary hypothesis "${pDef.name}" leads because ${topSupports.join(', ')} align strongly with its expected evidence pattern (score: ${(primary.score * 100).toFixed(0)}).`,
  );

  if (secondary) {
    const sDef = HYPOTHESIS_DEFINITIONS[secondary.id];
    const secSupports = secondary.supportLinks
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 2)
      .map(l => l.evidenceKey.replace(/\./g, ' '));

    lines.push(
      `Secondary hypothesis "${sDef.name}" remains plausible because ${secSupports.length > 0 ? secSupports.join(' and ') : 'partial evidence supports it'} (score: ${(secondary.score * 100).toFixed(0)}, spread: ${((primary.score - secondary.score) * 100).toFixed(0)}pts).`,
    );
  }

  if (primary.contradictionLinks.length > 0) {
    const topContra = primary.contradictionLinks[0];
    lines.push(
      `Confidence is bounded by ${topContra.evidenceKey.replace(/\./g, ' ')} contradicting the primary thesis.`,
    );
  }

  if (primary.missingLinks.length > 0) {
    const criticalMissing = primary.missingLinks
      .filter(l => l.reason.includes('unavailable'))
      .slice(0, 2);
    if (criticalMissing.length > 0) {
      lines.push(
        `Visibility is incomplete: ${criticalMissing.map(l => l.reason).join('; ')}.`,
      );
    }
  }

  if (ambiguity === 'high') {
    lines.push(
      'Ranking ambiguity is HIGH — the top two hypotheses are very close. Additional evidence could shift the ranking.',
    );
  }

  return lines;
}

export function formatHypothesisForAI(primary: RankedHypothesis, secondary: RankedHypothesis | null): string {
  const pDef = HYPOTHESIS_DEFINITIONS[primary.id];
  const parts: string[] = [];

  parts.push(`[HYPOTHESIS ENGINE]`);
  parts.push(`Primary: ${pDef.name} (confidence: ${(primary.confidence * 100).toFixed(0)}%)`);
  parts.push(`Description: ${pDef.description}`);

  if (primary.whyItFits.length > 0) {
    parts.push(`Why it fits: ${primary.whyItFits.slice(0, 3).join('; ')}`);
  }

  if (primary.whatWouldConfirmNext.length > 0) {
    parts.push(`What confirms next: ${primary.whatWouldConfirmNext[0]}`);
  }

  if (primary.whatWouldBreakIt.length > 0) {
    parts.push(`What would break it: ${primary.whatWouldBreakIt[0]}`);
  }

  if (secondary) {
    const sDef = HYPOTHESIS_DEFINITIONS[secondary.id];
    parts.push(`Secondary: ${sDef.name} (confidence: ${(secondary.confidence * 100).toFixed(0)}%)`);
    parts.push(`Spread from leader: ${((primary.score - secondary.score) * 100).toFixed(0)}pts`);
  }

  if (primary.triggeredInvalidationRules.length > 0) {
    parts.push(`Active invalidation pressure: ${primary.triggeredInvalidationRules.map(r => r.reason).join('; ')}`);
  }

  return parts.join('\n');
}
