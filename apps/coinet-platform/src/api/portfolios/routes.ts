/**
 * Portfolio API - Authenticated portfolio management
 *
 * All routes require auth. Maps Clerk/demo userId to internal User for ownership.
 */

import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../../middleware/requireAuth';
import { resolveUserForAuth } from '../../services/user-resolver';
import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';

const router: Router = Router();

/** Get internal User.id from auth. Returns null if resolution fails. */
async function getInternalUserId(req: AuthenticatedRequest): Promise<string | null> {
  const authUserId = req.auth?.userId ?? req.userId;
  if (!authUserId) return null;
  const resolved = await resolveUserForAuth(authUserId);
  return resolved?.id ?? null;
}

// All routes require authentication
router.use(requireAuth);

/**
 * GET /api/v1/portfolios
 * List portfolios for the authenticated user
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = await getInternalUserId(req);
    if (!userId) {
      return res.status(403).json({ error: 'User not found. Please complete onboarding.' });
    }

    const portfolios = await prisma.portfolio.findMany({
      where: { userId },
      include: {
        holdings: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = portfolios.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      isDefault: p.isDefault,
      isPublic: p.isPublic,
      totalValue: p.totalValue != null ? Number(p.totalValue) : null,
      currency: p.currency,
      holdings: p.holdings.map((h) => ({
        id: h.id,
        symbol: h.symbol,
        quantity: Number(h.quantity),
        avgCost: Number(h.avgCost),
        currentPrice: h.currentPrice != null ? Number(h.currentPrice) : null,
        totalValue: h.totalValue != null ? Number(h.totalValue) : null,
      })),
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));

    return res.json(data);
  } catch (err) {
    logger.error('Portfolio list failed', { error: err });
    return res.status(500).json({ error: 'Failed to fetch portfolios' });
  }
});

/**
 * POST /api/v1/portfolios
 * Create a new portfolio
 */
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = await getInternalUserId(req);
    if (!userId) {
      return res.status(403).json({ error: 'User not found. Please complete onboarding.' });
    }

    const { name, description } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Portfolio name is required' });
    }

    const portfolio = await prisma.portfolio.create({
      data: {
        userId,
        name: name.trim(),
        description: description?.trim() || null,
      },
    });

    return res.status(201).json({
      id: portfolio.id,
      name: portfolio.name,
      description: portfolio.description,
      isDefault: portfolio.isDefault,
      isPublic: portfolio.isPublic,
      createdAt: portfolio.createdAt,
      updatedAt: portfolio.updatedAt,
    });
  } catch (err) {
    logger.error('Portfolio create failed', { error: err });
    return res.status(500).json({ error: 'Failed to create portfolio' });
  }
});

/**
 * GET /api/v1/portfolios/:id
 * Get portfolio by ID (ownership check)
 */
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = await getInternalUserId(req);
    if (!userId) {
      return res.status(403).json({ error: 'User not found. Please complete onboarding.' });
    }

    const portfolio = await prisma.portfolio.findUnique({
      where: { id: req.params.id },
      include: { holdings: true },
    });

    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }
    if (portfolio.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    return res.json({
      id: portfolio.id,
      name: portfolio.name,
      description: portfolio.description,
      isDefault: portfolio.isDefault,
      isPublic: portfolio.isPublic,
      totalValue: portfolio.totalValue != null ? Number(portfolio.totalValue) : null,
      currency: portfolio.currency,
      holdings: portfolio.holdings.map((h) => ({
        id: h.id,
        symbol: h.symbol,
        quantity: Number(h.quantity),
        avgCost: Number(h.avgCost),
        currentPrice: h.currentPrice != null ? Number(h.currentPrice) : null,
        totalValue: h.totalValue != null ? Number(h.totalValue) : null,
      })),
      createdAt: portfolio.createdAt,
      updatedAt: portfolio.updatedAt,
    });
  } catch (err) {
    logger.error('Portfolio get failed', { error: err });
    return res.status(500).json({ error: 'Failed to fetch portfolio' });
  }
});

/**
 * PUT /api/v1/portfolios/:id
 * Update portfolio (ownership check)
 */
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = await getInternalUserId(req);
    if (!userId) {
      return res.status(403).json({ error: 'User not found. Please complete onboarding.' });
    }

    const portfolio = await prisma.portfolio.findUnique({
      where: { id: req.params.id },
    });

    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }
    if (portfolio.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { name, description, isDefault } = req.body;
    const data: Record<string, unknown> = {};
    if (typeof name === 'string' && name.trim()) data.name = name.trim();
    if (description !== undefined) data.description = description?.trim() || null;
    if (typeof isDefault === 'boolean') data.isDefault = isDefault;

    const updated = await prisma.portfolio.update({
      where: { id: req.params.id },
      data,
    });

    return res.json({
      id: updated.id,
      name: updated.name,
      description: updated.description,
      isDefault: updated.isDefault,
      isPublic: updated.isPublic,
      updatedAt: updated.updatedAt,
    });
  } catch (err) {
    logger.error('Portfolio update failed', { error: err });
    return res.status(500).json({ error: 'Failed to update portfolio' });
  }
});

/**
 * DELETE /api/v1/portfolios/:id
 * Delete portfolio (ownership check)
 */
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = await getInternalUserId(req);
    if (!userId) {
      return res.status(403).json({ error: 'User not found. Please complete onboarding.' });
    }

    const portfolio = await prisma.portfolio.findUnique({
      where: { id: req.params.id },
    });

    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }
    if (portfolio.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await prisma.portfolio.delete({ where: { id: req.params.id } });
    return res.status(204).send();
  } catch (err) {
    logger.error('Portfolio delete failed', { error: err });
    return res.status(500).json({ error: 'Failed to delete portfolio' });
  }
});

/**
 * GET /api/v1/portfolios/:id/holdings
 * List holdings for a portfolio (ownership check)
 */
router.get('/:id/holdings', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = await getInternalUserId(req);
    if (!userId) {
      return res.status(403).json({ error: 'User not found. Please complete onboarding.' });
    }

    const portfolio = await prisma.portfolio.findUnique({
      where: { id: req.params.id },
      select: { userId: true },
    });

    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }
    if (portfolio.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const holdings = await prisma.portfolioHolding.findMany({
      where: { portfolioId: req.params.id },
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
    logger.error('Holdings list failed', { error: err });
    return res.status(500).json({ error: 'Failed to fetch holdings' });
  }
});

/**
 * POST /api/v1/portfolios/:id/holdings
 * Add or update holding (upsert by symbol)
 */
router.post('/:id/holdings', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = await getInternalUserId(req);
    if (!userId) {
      return res.status(403).json({ error: 'User not found. Please complete onboarding.' });
    }

    const portfolio = await prisma.portfolio.findUnique({
      where: { id: req.params.id },
    });

    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }
    if (portfolio.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { symbol, amount, price } = req.body;
    const symbolStr = typeof symbol === 'string' ? symbol.trim().toUpperCase() : null;
    const amountNum = typeof amount === 'number' ? amount : parseFloat(amount);
    const priceNum = typeof price === 'number' ? price : parseFloat(price);

    if (!symbolStr || symbolStr.length === 0 || symbolStr.length > 20) {
      return res.status(400).json({ error: 'Valid symbol is required' });
    }
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }
    if (isNaN(priceNum) || priceNum <= 0) {
      return res.status(400).json({ error: 'Price must be a positive number' });
    }

    const existing = await prisma.portfolioHolding.findUnique({
      where: { portfolioId_symbol: { portfolioId: req.params.id, symbol: symbolStr } },
    });

    let holding;
    if (existing) {
      const newQty = Number(existing.quantity) + amountNum;
      if (newQty < 0) {
        return res.status(400).json({ error: 'Insufficient quantity to reduce' });
      }
      const newAvgCost =
        newQty === 0
          ? 0
          : (Number(existing.quantity) * Number(existing.avgCost) + amountNum * priceNum) / newQty;
      if (newQty === 0) {
        await prisma.portfolioHolding.delete({ where: { id: existing.id } });
        return res.status(200).json({ holding: null, deleted: true });
      }
      holding = await prisma.portfolioHolding.update({
        where: { id: existing.id },
        data: { quantity: newQty, avgCost: newAvgCost },
      });
    } else {
      holding = await prisma.portfolioHolding.create({
        data: {
          portfolioId: req.params.id,
          symbol: symbolStr,
          quantity: amountNum,
          avgCost: priceNum,
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
    logger.error('Holding add failed', { error: err });
    return res.status(500).json({ error: 'Failed to add holding' });
  }
});

/**
 * GET /api/v1/portfolios/:id/analytics
 * Portfolio analytics (risk, Sharpe, etc.) - returns 501 until implemented
 */
router.get('/:id/analytics', async (req: AuthenticatedRequest, res: Response) => {
  const userId = await getInternalUserId(req);
  if (!userId) return res.status(403).json({ error: 'User not found. Please complete onboarding.' });
  const portfolio = await prisma.portfolio.findUnique({
    where: { id: req.params.id },
    select: { userId: true },
  });
  if (!portfolio) return res.status(404).json({ error: 'Portfolio not found' });
  if (portfolio.userId !== userId) return res.status(403).json({ error: 'Forbidden' });
  return res.status(501).json({ error: 'Portfolio analytics not yet implemented' });
});

/**
 * GET /api/v1/portfolios/:id/history
 * Portfolio value history - returns 501 until implemented
 */
router.get('/:id/history', async (req: AuthenticatedRequest, res: Response) => {
  const userId = await getInternalUserId(req);
  if (!userId) return res.status(403).json({ error: 'User not found. Please complete onboarding.' });
  const portfolio = await prisma.portfolio.findUnique({
    where: { id: req.params.id },
    select: { userId: true },
  });
  if (!portfolio) return res.status(404).json({ error: 'Portfolio not found' });
  if (portfolio.userId !== userId) return res.status(403).json({ error: 'Forbidden' });
  return res.status(501).json({ error: 'Portfolio history not yet implemented' });
});

/**
 * POST /api/v1/portfolios/:id/custom-formula
 * Custom formula evaluation - returns 501 until implemented
 */
router.post('/:id/custom-formula', async (req: AuthenticatedRequest, res: Response) => {
  const userId = await getInternalUserId(req);
  if (!userId) return res.status(403).json({ error: 'User not found. Please complete onboarding.' });
  const portfolio = await prisma.portfolio.findUnique({
    where: { id: req.params.id },
    select: { userId: true },
  });
  if (!portfolio) return res.status(404).json({ error: 'Portfolio not found' });
  if (portfolio.userId !== userId) return res.status(403).json({ error: 'Forbidden' });
  return res.status(501).json({ error: 'Custom formula not yet implemented' });
});

export default router;
