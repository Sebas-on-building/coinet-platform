/**
 * Mentor card templates (Phase 2) — unit tests.
 *
 * Proves: identifiers humanize to display labels; engine prose is framed in the
 * mentor's voice with detail folded in VERBATIM (no regression to generic text);
 * structured numbers pass through unchanged; the input is never mutated; and two
 * dissimilar assets produce genuinely different card strings (not generic-identical).
 */

import { describe, it, expect } from 'vitest';
import { renderMentorCardFields, titleCase } from '../judgment-card-templates';
import type { CoinetJudgmentPromptPackageJudgment } from '../judgment-prompt-package.types';

describe('renderMentorCardFields — humanization', () => {
  it('humanizes state / thesis / timing / contradiction / cluster identifiers', () => {
    const j: CoinetJudgmentPromptPackageJudgment = {
      state: 'thin_liquidity_risk',
      thesis: 'distribution_under_hype',
      timing_phase: 'post_peak',
      cause_detail: {
        dominant_cluster: 'leverage_expansion',
        drivers: [{ family: 'spot_demand', direction: 'positive', strength: 0.5, summary: 'x' } as any],
      },
      contradiction_items: [
        { class: 'volume_vs_liquidity', severity: 'critical', summary: 's', resolvable: true } as any,
      ],
    };
    const out = renderMentorCardFields(j);
    expect(out.state).toBe('Thin Liquidity Risk');
    expect(out.thesis).toBe('Distribution Under Hype');
    expect(out.timing_phase).toBe('Post Peak');
    expect(out.cause_detail?.dominant_cluster).toBe('Leverage Expansion');
    expect(out.cause_detail?.drivers?.[0].family).toBe('Spot Demand');
    expect(out.contradiction_items?.[0].class).toBe('Volume vs Liquidity');
  });

  it('falls back to Title Case for identifiers without a label map entry', () => {
    expect(titleCase('some_new_cluster')).toBe('Some New Cluster');
    const out = renderMentorCardFields({ state: 'a_brand_new_state' });
    expect(out.state).toBe('A Brand New State');
  });
});

describe('renderMentorCardFields — mentor framing with verbatim fold-in', () => {
  it('frames the failure condition and varies the lead by thesis, folding the trigger in', () => {
    const base = { failure_condition: 'Thesis fails if price reverses on volume spike.' };
    const a = renderMentorCardFields({ ...base, thesis: 'distribution_under_hype' });
    const b = renderMentorCardFields({ ...base, thesis: 'leverage_driven_squeeze' });
    expect(a.failure_condition).toContain('price reverses on volume spike'); // detail preserved
    expect(a.failure_condition!.startsWith('Wrong if')).toBe(true);
    expect(b.failure_condition!.startsWith('This unwinds if')).toBe(true);
    expect(a.failure_condition).not.toBe(b.failure_condition); // varies by thesis
  });

  it('replaces the flat maturity note with a phase-specific read, keeps unknown phases', () => {
    const known = renderMentorCardFields({
      timing_phase: 'post_peak',
      timing_detail: { maturity_note: 'Setup shows maturity indicators. Risk/reward shifting.' },
    });
    expect(known.timing_detail?.maturity_note).toContain('past its peak');

    const unknown = renderMentorCardFields({
      timing_phase: 'expansion',
      timing_detail: { maturity_note: 'engine specific note' },
    });
    expect(unknown.timing_detail?.maturity_note).toBe('engine specific note');
  });

  it('frames primary uncertainty by confidence band, folding the detail in', () => {
    const detail = 'Low confidence in fundamental data — limited data available.';
    const vlow = renderMentorCardFields({ confidence_band: 'very_low', confidence_detail: { primary_uncertainty: detail } });
    expect(vlow.confidence_detail?.primary_uncertainty).toContain('watchlist note');
    expect(vlow.confidence_detail?.primary_uncertainty).toContain('limited data available');

    const med = renderMentorCardFields({ confidence_band: 'medium', confidence_detail: { primary_uncertainty: detail } });
    expect(med.confidence_detail?.primary_uncertainty).toBe(detail); // unframed above low
  });

  it('frames the scenario branches, folding the engine text in verbatim', () => {
    const out = renderMentorCardFields({
      scenario_detail: {
        bullish_confirmation: 'spot volume expands',
        bearish_failure: 'price reverses on a volume spike',
        next_trigger: 'liquidation cascades',
      },
    });
    expect(out.scenario_detail?.bullish_confirmation).toBe('What would confirm it: spot volume expands');
    expect(out.scenario_detail?.bearish_failure).toBe('What breaks it: price reverses on a volume spike');
    expect(out.scenario_detail?.next_trigger).toBe("Next thing I'm watching: liquidation cascades");
  });
});

describe('renderMentorCardFields — safety', () => {
  it('passes every structured number through unchanged', () => {
    const j: CoinetJudgmentPromptPackageJudgment = {
      thesis_detail: { support_score: 0.36, contradiction_score: 0.08, confidence: 0.28, clarity: 0.27 },
      timing_detail: { score: 67, position: 6, total: 9, maturity_warning: false },
      confidence_detail: { score: 0.08, breakdown: { market: 0.75, fundamentals: 0.3, onchain: 0.4, narrative: 0.55 } },
      contradiction_load: 0.42,
    };
    const out = renderMentorCardFields(j);
    expect(out.thesis_detail).toEqual(j.thesis_detail);
    expect(out.timing_detail).toEqual(j.timing_detail);
    expect(out.confidence_detail?.score).toBe(0.08);
    expect(out.confidence_detail?.breakdown).toEqual(j.confidence_detail!.breakdown);
    expect(out.contradiction_load).toBe(0.42);
  });

  it('does not mutate the input object', () => {
    const j: CoinetJudgmentPromptPackageJudgment = {
      state: 'thin_liquidity_risk',
      cause_detail: { dominant_cluster: 'leverage_expansion', drivers: [{ family: 'spot_demand' } as any] },
    };
    renderMentorCardFields(j);
    expect(j.state).toBe('thin_liquidity_risk'); // raw enum untouched
    expect(j.cause_detail?.dominant_cluster).toBe('leverage_expansion');
    expect(j.cause_detail?.drivers?.[0].family).toBe('spot_demand');
  });

  it('two dissimilar assets produce genuinely different card strings', () => {
    const btcLike = renderMentorCardFields({
      state: 'structurally_weak_rally',
      thesis: 'distribution_under_hype',
      failure_condition: 'Thesis fails if price reverses on volume spike.',
    });
    const pepeLike = renderMentorCardFields({
      state: 'thin_liquidity_risk',
      thesis: 'narrative_only_pump',
      failure_condition: 'Thesis fails if liquidity dries up.',
    });
    expect(btcLike.state).not.toBe(pepeLike.state);
    expect(btcLike.thesis).not.toBe(pepeLike.thesis);
    expect(btcLike.failure_condition).not.toBe(pepeLike.failure_condition);
  });
});
