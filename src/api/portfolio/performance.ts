import { Router } from 'express';
import Joi from 'joi';
import { PrismaClient, TransactionSide } from '@prisma/client';

const router = Router();

// Singleton Prisma client to avoid connection exhaustion
const prisma =
  (global as unknown as { __portfolioPrisma?: PrismaClient }).__portfolioPrisma ??
  new PrismaClient();
if (process.env.NODE_ENV !== 'production') {
  (global as unknown as { __portfolioPrisma?: PrismaClient }).__portfolioPrisma = prisma;
}

const TIMEFRAME_DAYS: Record<string, number | null> = {
  '1d': 1,
  '1w': 7,
  '1m': 30,
  '1y': 365,
  all: null,
};

function sinceDate(timeframe: string): Date | null {
  const days = TIMEFRAME_DAYS[timeframe];
  if (days === null) return null;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

// Get performance chart – reconstructs portfolio value over time from transactions
router.get('/chart', async (req, res) => {
  const schema = Joi.object({
    timeframe: Joi.string().valid('1d', '1w', '1m', '1y', 'all').default('1m'),
    portfolioId: Joi.string().optional(),
    userId: Joi.string().optional(),
  });
  const { error, value } = schema.validate(req.query);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const since = sinceDate(value.timeframe);
    const where: Record<string, unknown> = {};
    if (value.portfolioId) where.portfolioId = value.portfolioId;
    if (value.userId) where.portfolio = { userId: value.userId };
    if (since) where.executedAt = { gte: since };

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { executedAt: 'asc' },
      select: {
        symbol: true,
        side: true,
        quantity: true,
        price: true,
        total: true,
        executedAt: true,
      },
    });

    // Build cumulative cost-basis series: each day = sum of (buy totals - sell totals)
    const dailyMap = new Map<string, number>();
    for (const tx of transactions) {
      const day = tx.executedAt.toISOString().slice(0, 10);
      const delta = tx.side === TransactionSide.BUY
        ? Number(tx.total)
        : -Number(tx.total);
      dailyMap.set(day, (dailyMap.get(day) ?? 0) + delta);
    }

    // Convert to cumulative chart points
    let cumulative = 0;
    const chart = Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, delta]) => {
        cumulative += delta;
        return { date, value: Math.max(0, cumulative) };
      });

    return res.json({ chart });
  } catch (err) {
    console.error('[portfolio/chart]', err);
    return res.status(500).json({ error: 'Failed to fetch performance data' });
  }
});

// Compare assets – returns price history for each symbol using transaction data
router.get('/compare', async (req, res) => {
  const schema = Joi.object({
    symbols: Joi.alternatives()
      .try(Joi.array().items(Joi.string()).min(2), Joi.string())
      .required(),
    timeframe: Joi.string().valid('1d', '1w', '1m', '1y', 'all').default('1m'),
  });
  const { error, value } = schema.validate(req.query);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const raw = value.symbols;
    const symbols: string[] = Array.isArray(raw)
      ? raw
      : String(raw)
          .split(',')
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean);
    if (symbols.length < 2) {
      return res.status(400).json({ error: 'At least 2 symbols required for comparison' });
    }
    const since = sinceDate(value.timeframe);

    const transactions = await prisma.transaction.findMany({
      where: {
        symbol: { in: symbols },
        ...(since ? { executedAt: { gte: since } } : {}),
      },
      orderBy: { executedAt: 'asc' },
      select: { symbol: true, price: true, executedAt: true },
    });

    // Group average execution prices by symbol → date
    const bySymbol: Record<string, { date: string; price: number }[]> = {};
    for (const tx of transactions) {
      const sym = tx.symbol.toUpperCase();
      const date = tx.executedAt.toISOString().slice(0, 10);
      if (!bySymbol[sym]) bySymbol[sym] = [];
      bySymbol[sym].push({ date, price: Number(tx.price) });
    }

    return res.json({ comparison: bySymbol });
  } catch (err) {
    console.error('[portfolio/compare]', err);
    return res.status(500).json({ error: 'Failed to fetch comparison data' });
  }
});

export default router; 