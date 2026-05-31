/**
 * AI Service provider-selection tests.
 *
 * Verifies the provider chain: Anthropic (primary) → Grok (xAI) → OpenAI
 * (fallback). These tests are no-network and require NO provider API key —
 * they only construct AIService against manipulated env and inspect the
 * resolved provider + configured state.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AIService } from '../ai-service';

const PROVIDER_ENV_KEYS = [
  'ANTHROPIC_API_KEY',
  'ANTHROPIC_MODEL',
  'XAI_API_KEY',
  'GROK_API_KEY',
  'GROK_MODEL',
  'OPENAI_API_KEY',
  'OPENAI_MODEL',
] as const;

function readProvider(svc: AIService): string {
  return (svc as unknown as { provider: string }).provider;
}

describe('AIService provider selection', () => {
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of PROVIDER_ENV_KEYS) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of PROVIDER_ENV_KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });

  it('selects Anthropic as primary when ANTHROPIC_API_KEY is present', () => {
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
    process.env.XAI_API_KEY = 'test-xai-key';
    process.env.OPENAI_API_KEY = 'test-openai-key';

    const svc = new AIService();
    expect(readProvider(svc)).toBe('anthropic');
    expect(svc.isAvailable()).toBe(true);
  });

  it('falls back to Grok when Anthropic is absent but XAI_API_KEY is present', () => {
    process.env.XAI_API_KEY = 'test-xai-key';
    process.env.OPENAI_API_KEY = 'test-openai-key';

    const svc = new AIService();
    expect(readProvider(svc)).toBe('grok');
    expect(svc.isAvailable()).toBe(true);
  });

  it('falls back to OpenAI when only OPENAI_API_KEY is present', () => {
    process.env.OPENAI_API_KEY = 'test-openai-key';

    const svc = new AIService();
    expect(readProvider(svc)).toBe('openai');
    expect(svc.isAvailable()).toBe(true);
  });

  it('is not configured when no provider key is present', () => {
    const svc = new AIService();
    expect(svc.isAvailable()).toBe(false);
  });

  it('prefers Anthropic over Grok+OpenAI regardless of other keys', () => {
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
    const svc = new AIService();
    expect(readProvider(svc)).toBe('anthropic');
  });
});
