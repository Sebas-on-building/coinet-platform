/**
 * LunarCrush Connector — Narrative Attention Truth Domain (Sentiment)
 *
 * Truth role: Social sentiment, trending metrics, attention signals.
 * Not for: Market pricing, protocol fundamentals, or hard facts.
 */

import { BaseConnector, type RawAcquisition } from '../base-connector';
import type { ConnectorAcquireParams } from '../types';
import type { SentimentData } from '../../evidence-pack/types';

interface SentimentRaw {
  fearGreedIndex?: number;
  fearGreedLabel?: string;
  sentiment?: number;
  volume_mentions_24h?: number;
  trending_rank?: number;
  bullish_percentage?: number;
  social_dominance?: number;
  sentiment_change_24h?: number;
}

export class LunarCrushConnector extends BaseConnector<SentimentRaw, SentimentData> {
  constructor() {
    super({
      id: 'cxn-lunarcrush',
      provider: 'lunarcrush',
      source_class: 'narrative',
      truth_class: 'narrative_attention',
      category: 'polling',
      scheduled_cadence_tier: 'medium_frequency',
      default_entity_type: 'market_event',
      default_timeout_ms: 10_000,
      enabled: true,
    });
  }

  protected async acquire(
    params: ConnectorAcquireParams,
    timeoutMs: number,
  ): Promise<RawAcquisition<SentimentRaw>> {
    const { getMarketSentiment } = await import('../../sentiment-service');

    const data = await Promise.race([
      getMarketSentiment(),
      new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error(`LunarCrush timeout after ${timeoutMs}ms`)), timeoutMs),
      ),
    ]);

    if (!data) return { ok: false, error: 'No sentiment data returned from LunarCrush' };
    return { ok: true, data: data as unknown as SentimentRaw, raw: data };
  }

  protected validate(raw: SentimentRaw): string[] {
    return [];
  }

  protected buildCanonicalCandidateId(_params: ConnectorAcquireParams): string {
    return 'market:sentiment';
  }

  protected normalize(raw: SentimentRaw, _params: ConnectorAcquireParams): SentimentData {
    const fgi = raw.fearGreedIndex ?? 50;
    const label: SentimentData['label'] =
      fgi <= 20 ? 'extreme_fear'
        : fgi <= 40 ? 'fear'
          : fgi <= 60 ? 'neutral'
            : fgi <= 80 ? 'greed'
              : 'extreme_greed';

    const score = raw.sentiment ?? ((fgi - 50) / 50);

    return {
      label,
      score: Math.max(-1, Math.min(1, score)),
      volume_mentions_24h: raw.volume_mentions_24h,
      trending_rank: raw.trending_rank,
      bullish_percentage: raw.bullish_percentage,
      social_dominance: raw.social_dominance,
      sentiment_change_24h: raw.sentiment_change_24h,
    };
  }
}
