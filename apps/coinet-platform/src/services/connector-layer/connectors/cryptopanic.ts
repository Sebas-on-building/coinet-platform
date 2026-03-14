/**
 * CryptoPanic Connector — Narrative Attention Truth Domain (News)
 *
 * Truth role: News aggregation, narrative tracking, critical event detection.
 * Not for: Market truth, pricing authority, or protocol fundamentals.
 */

import { BaseConnector, type RawAcquisition } from '../base-connector';
import type { ConnectorAcquireParams } from '../types';
import type { NewsData } from '../../evidence-pack/types';

interface NewsRaw {
  items?: Array<{
    title?: string;
    source?: { title?: string };
    url?: string;
    published_at?: string;
    votes?: { positive?: number; negative?: number };
  }>;
  count?: number;
}

export class CryptoPanicConnector extends BaseConnector<NewsRaw, NewsData> {
  constructor() {
    super({
      id: 'cxn-cryptopanic',
      provider: 'cryptopanic',
      source_class: 'narrative',
      truth_class: 'narrative_attention',
      category: 'polling',
      default_entity_type: 'narrative',
      default_timeout_ms: 10_000,
      enabled: true,
    });
  }

  protected async acquire(
    params: ConnectorAcquireParams,
    timeoutMs: number,
  ): Promise<RawAcquisition<NewsRaw>> {
    const { fetchNews } = await import('../../news-service');
    const coins = params.symbol ? [params.symbol] : undefined;

    const data = await Promise.race([
      fetchNews(coins),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`CryptoPanic timeout after ${timeoutMs}ms`)), timeoutMs),
      ),
    ]);

    if (!data) return { ok: false, error: 'No news data returned from CryptoPanic' };
    return { ok: true, data: data as unknown as NewsRaw, raw: data };
  }

  protected validate(raw: NewsRaw): string[] {
    return [];
  }

  protected buildCanonicalCandidateId(params: ConnectorAcquireParams): string {
    if (params.canonical_candidate_id) return params.canonical_candidate_id;
    return `narrative:${(params.symbol || 'market').toLowerCase()}`;
  }

  protected extractObservationTime(raw: NewsRaw): number {
    const latest = raw.items?.[0]?.published_at;
    if (latest) {
      const parsed = new Date(latest).getTime();
      if (!isNaN(parsed)) return parsed;
    }
    return Date.now();
  }

  protected normalize(raw: NewsRaw, _params: ConnectorAcquireParams): NewsData {
    const items = (raw.items ?? []).slice(0, 10).map(item => {
      const positive = item.votes?.positive ?? 0;
      const negative = item.votes?.negative ?? 0;
      const total = positive + negative;
      const sentimentVal: 'positive' | 'negative' | 'neutral' =
        total === 0 ? 'neutral'
          : positive > negative * 2 ? 'positive'
            : negative > positive * 2 ? 'negative'
              : 'neutral';

      return {
        headline: item.title || 'Untitled',
        source: item.source?.title || 'Unknown',
        url: item.url,
        published_at_unix: item.published_at
          ? Math.floor(new Date(item.published_at).getTime() / 1000)
          : Math.floor(Date.now() / 1000),
        sentiment: sentimentVal,
      };
    });

    const sentimentCounts = { positive: 0, negative: 0, neutral: 0 };
    items.forEach(i => { sentimentCounts[i.sentiment ?? 'neutral']++; });

    const overall: NewsData['overall_sentiment'] =
      sentimentCounts.positive > sentimentCounts.negative * 2 ? 'bullish'
        : sentimentCounts.negative > sentimentCounts.positive * 2 ? 'bearish'
          : sentimentCounts.positive > 0 && sentimentCounts.negative > 0 ? 'mixed'
            : 'neutral';

    return {
      items,
      overall_sentiment: overall,
      has_critical_news: false,
      dominant_topics: [],
    };
  }
}
