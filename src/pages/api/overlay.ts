import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import { cachedFetch, clearCacheItem } from '@/lib/cache';
import { fetchGlassnodeSeries } from '@/lib/datasources/glassnode';
import { fetchFredSeries } from '@/lib/datasources/fred';
import { fetchTradingViewSeries } from '@/lib/datasources/tradingview';
import { mergeSeries, downsampleMergedSeries } from '@/lib/datasources/mergeSeries';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

// Initialize Prisma client
const prisma = new PrismaClient();

// Define user type with subscription level
interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  subscriptionLevel?: 'free' | 'premium' | 'enterprise';
}

// Validation schemas for request body
const PriceSeriesSchema = z.object({
  source: z.literal('price'),
  symbol: z.string(),
  timeframe: z.string().optional().default('1d'),
});

const GlassnodeSeriesSchema = z.object({
  source: z.literal('glassnode'),
  metric: z.string(),
  asset: z.string(),
  frequency: z.string().optional().default('24h'),
});

const FredSeriesSchema = z.object({
  source: z.literal('fred'),
  seriesId: z.string(),
  frequency: z.string().optional(),
});

const TradingViewSeriesSchema = z.object({
  source: z.literal('tradingview'),
  symbol: z.string(),
  interval: z.string().optional().default('D'),
});

const SeriesSchema = z.discriminatedUnion('source', [
  PriceSeriesSchema,
  GlassnodeSeriesSchema,
  FredSeriesSchema,
  TradingViewSeriesSchema,
]);

const OverlayRequestSchema = z.object({
  series: z.array(SeriesSchema).min(1),
  from: z.string().optional(),
  to: z.string().optional(),
  sampleCount: z.number().optional().default(500),  // For downsampling
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check request method
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get user from Clerk
  const { userId } = getAuth(req);
  const user: User | undefined = userId ? { id: userId } : undefined;

  try {
    // Parse and validate request body
    const parseResult = OverlayRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: parseResult.error.format()
      });
    }

    const { series: seriesRequests, from, to, sampleCount } = parseResult.data;

    // Check subscription requirements for certain data sources
    // This is a simplified example - in a real app, you'd have more robust subscription logic
    if (!userId && seriesRequests.some(s => s.source === 'glassnode' || s.source === 'fred')) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to access this data source'
      });
    }

    // Prepare for data fetching
    const seriesData = [];

    // Process each series
    for (const seriesReq of seriesRequests) {
      let points = [];
      let seriesName = '';

      switch (seriesReq.source) {
        case 'price': {
          const { symbol, timeframe } = seriesReq;
          seriesName = `price-${symbol}-${timeframe}`;

          // Cache key includes date range if specified
          const cacheKey = `price:${symbol}:${timeframe}:${from || ''}:${to || ''}`;

          points = await cachedFetch(
            cacheKey,
            async () => {
              // Fetch price data using your existing API or database
              // This is a simplified example
              const data = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/price-tick?symbol=${symbol}&timeframe=${timeframe}&limit=1000${from ? `&from=${from}` : ''}${to ? `&to=${to}` : ''}`).then(r => r.json());

              // Convert to standard format
              return data.map((candle: any) => ({
                time: new Date(candle.time).getTime(),
                value: candle.close
              }));
            },
            3600 // Cache for 1 hour
          );
          break;
        }

        case 'glassnode': {
          const { metric, asset, frequency } = seriesReq;
          seriesName = `glassnode-${asset}-${metric.replace('/', '-')}`;

          // Cache key for Glassnode data
          const cacheKey = `glassnode:${metric}:${asset}:${frequency}:${from || ''}:${to || ''}`;

          // Verify user has premium access for Glassnode
          if (user?.subscriptionLevel !== 'premium' && user?.subscriptionLevel !== 'enterprise') {
            throw new Error('Glassnode data requires a premium subscription');
          }

          points = await cachedFetch(
            cacheKey,
            async () => {
              let glassnodeData = await fetchGlassnodeSeries({
                metric,
                asset,
                frequency,
                apiKey: process.env.GLASSNODE_API_KEY || ''
              });

              // Filter by date range if provided
              if (from) {
                const fromTime = new Date(from).getTime();
                glassnodeData = glassnodeData.filter(p => p.time >= fromTime);
              }
              if (to) {
                const toTime = new Date(to).getTime();
                glassnodeData = glassnodeData.filter(p => p.time <= toTime);
              }

              return glassnodeData;
            },
            // Cache for 24 hours since on-chain data updates are less frequent
            86400
          );
          break;
        }

        case 'fred': {
          const { seriesId, frequency } = seriesReq;
          seriesName = `fred-${seriesId}`;

          // Cache key for FRED data
          const cacheKey = `fred:${seriesId}:${frequency || ''}:${from || ''}:${to || ''}`;

          points = await cachedFetch(
            cacheKey,
            async () => {
              return await fetchFredSeries({
                seriesId,
                frequency,
                from,
                to,
                apiKey: process.env.FRED_API_KEY || ''
              });
            },
            // Cache for 1 week as economic data changes infrequently
            604800
          );
          break;
        }

        case 'tradingview': {
          const { symbol, interval } = seriesReq;
          seriesName = `tradingview-${symbol.replace(':', '-')}`;

          // Cache key for TradingView data
          const cacheKey = `tradingview:${symbol}:${interval}:${from || ''}:${to || ''}`;

          points = await cachedFetch(
            cacheKey,
            async () => {
              // Convert from/to to timestamps if provided
              const fromTime = from ? new Date(from).getTime() : undefined;
              const toTime = to ? new Date(to).getTime() : undefined;

              return await fetchTradingViewSeries(symbol, interval, fromTime, toTime);
            },
            // Cache for 1 hour
            3600
          );
          break;
        }
      }

      // Add to series array if we have data
      if (points.length > 0) {
        seriesData.push({
          name: seriesName,
          points
        });
      }
    }

    // Merge all series on a unified timeline
    const mergedData = mergeSeries(seriesData);

    // Downsample if requested
    const finalData = sampleCount && mergedData.length > sampleCount
      ? downsampleMergedSeries(mergedData, sampleCount)
      : mergedData;

    // Return the merged data
    return res.status(200).json({
      series: finalData,
      metadata: {
        seriesCount: seriesData.length,
        pointCount: finalData.length,
        timeRange: {
          from: finalData.length > 0 ? new Date(finalData[0].time).toISOString() : null,
          to: finalData.length > 0 ? new Date(finalData[finalData.length - 1].time).toISOString() : null
        }
      }
    });
  } catch (error: any) {
    console.error('Overlay API error:', error);
    return res.status(500).json({
      error: 'Failed to retrieve data',
      message: error.message
    });
  }
}

// Handle template saving and retrieval
export async function saveTemplate(
  userId: string,
  template: {
    name: string;
    description?: string;
    series: any[];
    from?: string;
    to?: string;
    annotations?: any;
    isPublic?: boolean;
    isDefault?: boolean;
    chartType?: string;
    zoom?: any;
    yAxes?: any;
  }
) {
  try {
    // Check if default flag is set and update other templates if needed
    if (template.isDefault) {
      await prisma.overlayTemplate.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false }
      });
    }

    // Create or update the template
    const saved = await prisma.overlayTemplate.create({
      data: {
        userId,
        name: template.name,
        description: template.description,
        series: template.series,
        from: template.from ? new Date(template.from) : null,
        to: template.to ? new Date(template.to) : null,
        annotations: template.annotations || null,
        isPublic: template.isPublic || false,
        isDefault: template.isDefault || false,
        chartType: template.chartType,
        zoom: template.zoom,
        yAxes: template.yAxes
      }
    });

    return saved;
  } catch (error) {
    console.error('Error saving overlay template:', error);
    throw error;
  }
} 