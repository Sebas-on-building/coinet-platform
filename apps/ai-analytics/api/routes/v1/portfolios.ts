import express, { Request, Response } from 'express';
import { enforceHTTPS } from '../../../../../middleware/httpsEnforce';
import { authenticateJWT } from '../../../../../middleware/auth';
import { requireAnyRole, requirePermission } from '../../../../../middleware/rbac';
import { rateLimit } from '../../../../../middleware/rateLimit';
import { enforceVersioning } from '../../../../../middleware/versioning';
import { auditLog } from '../../../../../middleware/audit';
import { prometheusMetrics } from '../../../../../middleware/metrics';
import { body, param, validationResult } from 'express-validator';
import { getById, create, update, remove, listByUser } from '../../../../../services/portfolio/src/db/portfolioRepository';
import liveblocksWSS from '../../realtime/liveblocksServer';
import { Pool } from 'pg';
const { timeWeightedReturn, sharpeRatio, sortinoRatio, maxDrawdown, diversificationScore, sectorExposure, riskMetrics, customFormula } = require('../../portfolio/portfolio_analytics');

const router = express.Router();
const db = new Pool({
  user: 'ai',
  host: 'localhost',
  database: 'timescale',
  password: 'ai',
  port: 5432,
});

function asyncHandler(fn: any) {
  return function (req: any, res: any, next: any) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

router.use(enforceHTTPS);
router.use(enforceVersioning);
router.use(asyncHandler(authenticateJWT));
router.use(asyncHandler(rateLimit));

function validationErrorHandler(req: any, res: any, next: any) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }
  next();
}

// POST /api/v1/portfolios - Create portfolio
router.post(
  '/portfolios',
  body('name').isString().isLength({ min: 1, max: 100 }),
  validationErrorHandler,
  prometheusMetrics,
  auditLog('portfolio_create'),
  requireAnyRole(['user', 'admin']),
  requirePermission('portfolio:create'),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const portfolio = await create(req.user.id, req.body.name);
    liveblocksWSS.clients.forEach(client => {
      if (client.readyState === client.OPEN) {
        client.send(JSON.stringify({ event: 'portfolio_created', data: portfolio }));
      }
    });
    res.status(201).json({ data: portfolio });
  })
);

// GET /api/v1/portfolios - List portfolios
router.get(
  '/portfolios',
  prometheusMetrics,
  auditLog('portfolio_list'),
  requireAnyRole(['user', 'admin']),
  requirePermission('portfolio:read'),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const portfolios = await listByUser(req.user.id);
    res.json({ data: portfolios });
  })
);

// GET /api/v1/portfolios/:id - Get portfolio details
router.get(
  '/portfolios/:id',
  param('id').isString(),
  validationErrorHandler,
  prometheusMetrics,
  auditLog('portfolio_detail'),
  requireAnyRole(['user', 'admin']),
  requirePermission('portfolio:read'),
  asyncHandler(async (req: Request, res: Response) => {
    const portfolio = await getById(req.params.id);
    if (!portfolio) return res.status(404).json({ error: 'Portfolio not found' });
    res.json({ data: portfolio });
  })
);

// PUT /api/v1/portfolios/:id - Update portfolio
router.put(
  '/portfolios/:id',
  param('id').isString(),
  body('name').isString().isLength({ min: 1, max: 100 }),
  validationErrorHandler,
  prometheusMetrics,
  auditLog('portfolio_update'),
  requireAnyRole(['user', 'admin']),
  requirePermission('portfolio:update'),
  asyncHandler(async (req: Request, res: Response) => {
    const portfolio = await update(req.params.id, req.body.name);
    if (!portfolio) return res.status(404).json({ error: 'Portfolio not found' });
    liveblocksWSS.clients.forEach(client => {
      if (client.readyState === client.OPEN) {
        client.send(JSON.stringify({ event: 'portfolio_updated', data: portfolio }));
      }
    });
    res.json({ data: portfolio });
  })
);

// DELETE /api/v1/portfolios/:id - Delete portfolio
router.delete(
  '/portfolios/:id',
  param('id').isString(),
  validationErrorHandler,
  prometheusMetrics,
  auditLog('portfolio_delete'),
  requireAnyRole(['user', 'admin']),
  requirePermission('portfolio:delete'),
  asyncHandler(async (req: Request, res: Response) => {
    const success = await remove(req.params.id);
    if (!success) return res.status(404).json({ error: 'Portfolio not found' });
    liveblocksWSS.clients.forEach(client => {
      if (client.readyState === client.OPEN) {
        client.send(JSON.stringify({ event: 'portfolio_deleted', data: { id: req.params.id } }));
      }
    });
    res.json({ message: 'Portfolio deleted' });
  })
);

// POST /api/v1/portfolios/:id/holdings - Add/update holdings
router.post(
  '/portfolios/:id/holdings',
  param('id').isString(),
  body('symbol').isString(),
  body('quantity').isNumeric(),
  body('cost').isNumeric(),
  validationErrorHandler,
  prometheusMetrics,
  auditLog('holding_add_update'),
  requireAnyRole(['user', 'admin']),
  requirePermission('portfolio:write'),
  asyncHandler(async (req: Request, res: Response) => {
    // const holding = await portfolioRepository.addOrUpdateHolding(req.params.id, req.body.symbol, req.body.quantity, req.body.cost);
    const holding = { id: 'mock-holding', symbol: req.body.symbol, quantity: req.body.quantity, cost: req.body.cost };
    liveblocksWSS.clients.forEach(client => {
      if (client.readyState === client.OPEN) {
        client.send(JSON.stringify({ event: 'holding_added_or_updated', data: holding }));
      }
    });
    res.status(201).json({ data: holding });
  })
);

// DELETE /api/v1/portfolios/:id/holdings/:holdingId - Remove a holding
router.delete(
  '/portfolios/:id/holdings/:holdingId',
  param('id').isString(),
  param('holdingId').isString(),
  validationErrorHandler,
  prometheusMetrics,
  auditLog('holding_delete'),
  requireAnyRole(['user', 'admin']),
  requirePermission('portfolio:write'),
  asyncHandler(async (req: Request, res: Response) => {
    // const success = await portfolioRepository.removeHolding(req.params.id, req.params.holdingId);
    liveblocksWSS.clients.forEach(client => {
      if (client.readyState === client.OPEN) {
        client.send(JSON.stringify({ event: 'holding_deleted', data: { id: req.params.holdingId } }));
      }
    });
    res.json({ message: 'Holding deleted' });
  })
);

// GET /api/v1/portfolios/:id/analytics
router.get('/:id/analytics', async (req: Request, res: Response) => {
  const portfolioId = req.params.id;
  const window = req.query.window ? Number(req.query.window) : 30;
  const riskFreeRate = req.query.riskFreeRate ? Number(req.query.riskFreeRate) : 0.01;
  const [twr, sharpe, sortino, drawdown, diversification, sectors, risk] = await Promise.all([
    timeWeightedReturn(portfolioId, window),
    sharpeRatio(portfolioId, window, riskFreeRate),
    sortinoRatio(portfolioId, window, riskFreeRate),
    maxDrawdown(portfolioId, window),
    diversificationScore(portfolioId),
    sectorExposure(portfolioId),
    riskMetrics(portfolioId, window)
  ]);
  res.json({ timeWeightedReturn: twr, sharpeRatio: sharpe, sortinoRatio: sortino, maxDrawdown: drawdown, diversificationScore: diversification, sectorExposure: sectors, riskMetrics: risk });
});

// GET /api/v1/portfolios/:id/history
router.get('/:id/history', async (req: Request, res: Response) => {
  const portfolioId = req.params.id;
  const window = req.query.window ? Number(req.query.window) : 30;
  const { rows } = await db.query(
    'SELECT value FROM portfolio_value_history WHERE portfolio_id=$1 ORDER BY time ASC LIMIT $2',
    [portfolioId, window]
  );
  res.json(rows.map(r => Number(r.value)));
});

// POST /api/v1/portfolios/:id/custom-formula
router.post('/:id/custom-formula', async (req: Request, res: Response) => {
  const portfolioId = req.params.id;
  const { formula, window } = req.body;
  const result = await customFormula(portfolioId, formula, window || 30);
  res.json({ result });
});

export default router; 