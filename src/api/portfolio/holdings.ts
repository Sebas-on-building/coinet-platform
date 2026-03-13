import { Router } from 'express';
import Joi from 'joi';
import { PrismaClient } from '@prisma/client';

const router = Router();

// Singleton Prisma client to avoid connection exhaustion
const prisma =
  (global as unknown as { __portfolioPrisma?: PrismaClient }).__portfolioPrisma ??
  new PrismaClient();
if (process.env.NODE_ENV !== 'production') {
  (global as unknown as { __portfolioPrisma?: PrismaClient }).__portfolioPrisma = prisma;
}

const SYMBOL_REGEX = /^[A-Za-z0-9.-]{1,20}$/;

/** Get userId from req (set by session or JWT auth middleware) */
function getUserId(req: { user?: { id?: string }; session?: { userId?: string } }): string | null {
  return req.user?.id ?? req.session?.userId ?? null;
}

/** Verify portfolio belongs to user. Returns true if no auth (backward compat). */
async function verifyPortfolioAccess(
  portfolioId: string,
  userId: string | null
): Promise<{ ok: boolean; error?: string }> {
  if (!userId) return { ok: true }; // No auth middleware — allow (caller should add auth)
  const portfolio = await prisma.portfolio.findUnique({
    where: { id: portfolioId },
    select: { userId: true },
  });
  if (!portfolio) return { ok: false, error: 'Portfolio not found' };
  if (portfolio.userId !== userId) return { ok: false, error: 'Forbidden' };
  return { ok: true };
}

// List holdings for a portfolio
router.get('/', async (req, res) => {
  const schema = Joi.object({
    portfolioId: Joi.string().uuid().required(),
  });
  const { error, value } = schema.validate(req.query);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const access = await verifyPortfolioAccess(value.portfolioId, getUserId(req));
  if (!access.ok) {
    return res.status(access.error === 'Forbidden' ? 403 : 404).json({ error: access.error });
  }

  try {
    const holdings = await prisma.portfolioHolding.findMany({
      where: { portfolioId: value.portfolioId },
      orderBy: { symbol: 'asc' },
    });
    return res.json({
      holdings: holdings.map((h) => ({
        id: h.id,
        portfolioId: h.portfolioId,
        symbol: h.symbol,
        quantity: Number(h.quantity),
        avgCost: Number(h.avgCost),
        currentPrice: h.currentPrice != null ? Number(h.currentPrice) : null,
        totalValue: h.totalValue != null ? Number(h.totalValue) : null,
        updatedAt: h.updatedAt,
      })),
    });
  } catch (err) {
    console.error('[portfolio/holdings] list', err);
    return res.status(500).json({ error: 'Failed to fetch holdings' });
  }
});

// Add or update holding (upsert by portfolioId + symbol)
router.post('/', async (req, res) => {
  const schema = Joi.object({
    portfolioId: Joi.string().uuid().required(),
    symbol: Joi.string().pattern(SYMBOL_REGEX).max(20).required(),
    amount: Joi.number().positive().required(),
    price: Joi.number().positive().required(),
  });
  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const access = await verifyPortfolioAccess(value.portfolioId, getUserId(req));
  if (!access.ok) {
    return res.status(access.error === 'Forbidden' ? 403 : 404).json({ error: access.error });
  }

  try {
    const portfolio = await prisma.portfolio.findUnique({
      where: { id: value.portfolioId },
    });
    if (!portfolio) return res.status(404).json({ error: 'Portfolio not found' });

    const symbol = String(value.symbol).toUpperCase();
    const quantity = value.amount;
    const avgCost = value.price;

    const existing = await prisma.portfolioHolding.findUnique({
      where: {
        portfolioId_symbol: { portfolioId: value.portfolioId, symbol },
      },
    });

    let holding;
    if (existing) {
      const newQty = Number(existing.quantity) + quantity;
      if (newQty < 0) {
        return res.status(400).json({ error: 'Insufficient quantity to reduce' });
      }
      const newAvgCost =
        newQty === 0
          ? 0
          : (Number(existing.quantity) * Number(existing.avgCost) + quantity * avgCost) / newQty;
      if (newQty === 0) {
        await prisma.portfolioHolding.delete({ where: { id: existing.id } });
        return res.status(200).json({ holding: null, deleted: true });
      }
      holding = await prisma.portfolioHolding.update({
        where: { id: existing.id },
        data: {
          quantity: newQty,
          avgCost: newAvgCost,
        },
      });
    } else {
      holding = await prisma.portfolioHolding.create({
        data: {
          portfolioId: value.portfolioId,
          symbol,
          quantity,
          avgCost,
        },
      });
    }

    return res.status(201).json({
      holding: {
        id: holding.id,
        portfolioId: holding.portfolioId,
        symbol: holding.symbol,
        quantity: Number(holding.quantity),
        avgCost: Number(holding.avgCost),
        updatedAt: holding.updatedAt,
      },
    });
  } catch (err) {
    console.error('[portfolio/holdings] add', err);
    return res.status(500).json({ error: 'Failed to add holding' });
  }
});

// Update holding by id
router.put('/:id', async (req, res) => {
  const idSchema = Joi.string().uuid();
  if (idSchema.validate(req.params.id).error) {
    return res.status(400).json({ error: 'Invalid holding id' });
  }
  const schema = Joi.object({
    amount: Joi.number().positive(),
    price: Joi.number().positive(),
  }).min(1);
  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const existing = await prisma.portfolioHolding.findUnique({
      where: { id: req.params.id },
      include: { portfolio: { select: { userId: true } } },
    });
    if (!existing) return res.status(404).json({ error: 'Holding not found' });

    const userId = getUserId(req);
    if (userId && existing.portfolio.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const quantity = value.amount ?? Number(existing.quantity);
    const avgCost = value.price ?? Number(existing.avgCost);

    const holding = await prisma.portfolioHolding.update({
      where: { id: req.params.id },
      data: { quantity, avgCost },
    });

    return res.json({
      holding: {
        id: holding.id,
        portfolioId: holding.portfolioId,
        symbol: holding.symbol,
        quantity: Number(holding.quantity),
        avgCost: Number(holding.avgCost),
        updatedAt: holding.updatedAt,
      },
    });
  } catch (err) {
    console.error('[portfolio/holdings] update', err);
    return res.status(500).json({ error: 'Failed to update holding' });
  }
});

// Delete holding by id
router.delete('/:id', async (req, res) => {
  const idSchema = Joi.string().uuid();
  if (idSchema.validate(req.params.id).error) {
    return res.status(400).json({ error: 'Invalid holding id' });
  }
  try {
    const existing = await prisma.portfolioHolding.findUnique({
      where: { id: req.params.id },
      include: { portfolio: { select: { userId: true } } },
    });
    if (!existing) return res.status(404).json({ error: 'Holding not found' });

    const userId = getUserId(req);
    if (userId && existing.portfolio.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await prisma.portfolioHolding.delete({ where: { id: req.params.id } });
    return res.status(204).send();
  } catch (err) {
    console.error('[portfolio/holdings] delete', err);
    return res.status(500).json({ error: 'Failed to delete holding' });
  }
});

export default router;
