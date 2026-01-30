/**
 * Backtest API Endpoint
 * 
 * Handles requests to run a backtest against historical market data.
 * Validates input, fetches required data, and returns performance metrics.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { fetchHistoricalData, runBacktest, BacktestConfig, BacktestResult } from '@/lib/backtester';

// Input validation schema
const BacktestRequestSchema = z.object({
  symbol: z.string().min(1),
  timeframe: z.string().min(1),
  from: z.string(), // ISO date string or timestamp
  to: z.string(), // ISO date string or timestamp
  config: z.object({
    startCapital: z.number().positive(),
    longCondition: z.string().optional(),
    shortCondition: z.string().optional(),
    exitLongCondition: z.string().optional(),
    exitShortCondition: z.string().optional(),
    tradeSize: z.number().min(1).max(100),
    useStopLoss: z.boolean(),
    stopLossPercent: z.number().optional(),
    useTakeProfit: z.boolean(),
    takeProfitPercent: z.number().optional(),
    commissionPercent: z.number().optional(),
    slippagePercent: z.number().optional(),
    allowSimultaneousTrades: z.boolean().optional()
  })
});

/**
 * Backtest API Handler
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get authenticated user from Clerk
  const { userId } = getAuth(req);

  // Validate input
  const parseResult = BacktestRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Invalid request',
      details: parseResult.error.format()
    });
  }

  const { symbol, timeframe, from, to, config } = parseResult.data;

  try {
    // Fetch historical data
    const candles = await fetchHistoricalData(symbol, timeframe, from, to);

    if (!candles || candles.length === 0) {
      return res.status(404).json({ error: 'No data found for the specified parameters' });
    }

    // Run the backtest
    const result = await runBacktest(candles, {
      symbol,
      ...config
    });

    // Return results
    return res.status(200).json(result);
  } catch (err: any) {
    console.error('Backtest error:', err);
    return res.status(500).json({ error: err.message || 'Backtest failed' });
  }
} 