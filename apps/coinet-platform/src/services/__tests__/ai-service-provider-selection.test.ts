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

  it('initializes every configured provider in failover priority order', () => {
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
    process.env.XAI_API_KEY = 'test-xai-key';
    process.env.OPENAI_API_KEY = 'test-openai-key';

    const svc = new AIService();
    const providers = (svc as unknown as { providers: Array<{ name: string }> }).providers;
    expect(providers.map((p) => p.name)).toEqual(['anthropic', 'grok', 'openai']);
  });
});

/**
 * Runtime-failover tests. These exercise the private createChatCompletion
 * loop against injected fake provider clients (no network, no API keys) to
 * prove that a failing provider fails over to the next in the chain.
 */
describe('AIService runtime failover', () => {
  type CallResult = { content: string; model: string; totalTokens?: number; provider: string };

  function anthropicEntry(behavior: () => Promise<unknown>, calls: string[]) {
    return {
      name: 'anthropic' as const,
      resolveModel: () => 'claude-sonnet-4-6',
      anthropic: {
        messages: {
          create: async () => {
            calls.push('anthropic');
            return behavior();
          },
        },
      },
    };
  }

  function openaiLikeEntry(name: 'grok' | 'openai', behavior: () => Promise<unknown>, calls: string[]) {
    return {
      name,
      resolveModel: () => (name === 'grok' ? 'grok-x' : 'gpt-x'),
      openai: {
        chat: {
          completions: {
            create: async () => {
              calls.push(name);
              return behavior();
            },
          },
        },
      },
    };
  }

  function callCompletion(svc: AIService): Promise<CallResult> {
    return (svc as unknown as {
      createChatCompletion: (
        m: unknown[],
        o: { maxTokens: number },
      ) => Promise<CallResult>;
    }).createChatCompletion([{ role: 'user', content: 'hi' }], { maxTokens: 100 });
  }

  function setProviders(svc: AIService, providers: unknown[]) {
    (svc as unknown as { providers: unknown[] }).providers = providers;
  }

  it('serves from the primary provider when it succeeds (no failover)', async () => {
    const calls: string[] = [];
    const svc = new AIService();
    setProviders(svc, [
      anthropicEntry(
        async () => ({
          content: [{ type: 'text', text: 'hello from claude' }],
          model: 'claude-sonnet-4-6',
          usage: { input_tokens: 3, output_tokens: 4 },
        }),
        calls,
      ),
      openaiLikeEntry('grok', async () => ({ choices: [{ message: { content: 'should not run' } }], model: 'grok-x' }), calls),
    ]);

    const res = await callCompletion(svc);
    expect(res.provider).toBe('anthropic');
    expect(res.content).toBe('hello from claude');
    expect(res.totalTokens).toBe(7);
    expect(calls).toEqual(['anthropic']); // grok never called
  });

  it('fails over to the next provider when the primary throws', async () => {
    const calls: string[] = [];
    const svc = new AIService();
    setProviders(svc, [
      anthropicEntry(async () => {
        throw new Error('anthropic 529 overloaded');
      }, calls),
      openaiLikeEntry(
        'grok',
        async () => ({
          choices: [{ message: { content: 'served by grok' } }],
          model: 'grok-x',
          usage: { total_tokens: 11 },
        }),
        calls,
      ),
    ]);

    const res = await callCompletion(svc);
    expect(res.provider).toBe('grok');
    expect(res.content).toBe('served by grok');
    expect(res.totalTokens).toBe(11);
    expect(calls).toEqual(['anthropic', 'grok']); // tried anthropic first, then grok
  });

  it('throws the last error only when every provider fails', async () => {
    const calls: string[] = [];
    const svc = new AIService();
    setProviders(svc, [
      anthropicEntry(async () => {
        throw new Error('anthropic down');
      }, calls),
      openaiLikeEntry('openai', async () => {
        throw new Error('openai down');
      }, calls),
    ]);

    await expect(callCompletion(svc)).rejects.toThrow('openai down');
    expect(calls).toEqual(['anthropic', 'openai']);
  });
});
