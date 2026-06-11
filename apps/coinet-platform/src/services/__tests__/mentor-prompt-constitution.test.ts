/**
 * Mentor prompt constitution — PERMANENT guard.
 *
 * Character & Voice Spec v1.0 requires the eight Laws to appear VERBATIM in
 * every assembled system prompt, for every provider (all three providers share
 * one prompt). This test fails the build if any Law is dropped, reworded, or if
 * a removed Law-violating instruction (invented-score fallback, buy/sell sizing)
 * creeps back in. No network, no API key — pure string assertions.
 */

import { describe, it, expect } from 'vitest';
import { SYSTEM_PROMPT, SYSTEM_PROMPT_JSON } from '../ai-service';
import { COINET_LAW_STATEMENTS } from '../conversation-rules';

describe('mentor prompt constitution', () => {
  it('exposes exactly the eight Laws', () => {
    expect(COINET_LAW_STATEMENTS).toHaveLength(8);
  });

  it('SYSTEM_PROMPT contains all 8 Laws verbatim', () => {
    for (const law of COINET_LAW_STATEMENTS) {
      expect(SYSTEM_PROMPT).toContain(law);
    }
  });

  it('SYSTEM_PROMPT_JSON contains all 8 Laws verbatim', () => {
    for (const law of COINET_LAW_STATEMENTS) {
      expect(SYSTEM_PROMPT_JSON).toContain(law);
    }
  });

  it('embeds the load-bearing Law 1 and Law 8 clauses verbatim', () => {
    // Law 1 — the never-invent imperative (the worst failure mode)
    expect(SYSTEM_PROMPT).toContain('the single worst thing this product can do');
    // Law 8 — no buy/sell instructions
    expect(SYSTEM_PROMPT).toContain('Coinet never says "buy now" or "sell now"');
  });

  it('carries the mentor guardrails: identity honesty, no emojis, grounding contract', () => {
    expect(SYSTEM_PROMPT).toContain('No emojis');
    expect(SYSTEM_PROMPT).toContain("the mentor's voice is how you choose to speak");
    expect(SYSTEM_PROMPT).toContain('GROUNDING CONTRACT');
  });

  it('carries the market-wide Law-1 guard (regime block only, no prior-token import)', () => {
    expect(SYSTEM_PROMPT).toContain('[MARKET REGIME CONTEXT]');
    expect(SYSTEM_PROMPT).toContain('Do NOT carry forward a specific token');
  });

  it('does NOT reintroduce removed Law-violating instructions', () => {
    // The old OmniScore "fallback protocol" instructed inventing/estimating scores.
    expect(SYSTEM_PROMPT).not.toContain('Synthetic OmniScore Estimation');
    expect(SYSTEM_PROMPT).not.toContain('engine fallback mode');
    // The old meme-coin block gave explicit position-sizing trade directives.
    expect(SYSTEM_PROMPT).not.toContain('% of normal size');
  });
});
