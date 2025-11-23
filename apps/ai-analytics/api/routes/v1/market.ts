import express from 'express';
import { enforceHTTPS } from '../../../../../middleware/httpsEnforce';
import { authenticateJWT } from '../../../../../middleware/auth';
import { requireRole, requireScope } from '../../../../../middleware/scopes';
import { rateLimit } from '../../../../../middleware/rateLimit';
import { enforceVersioning } from '../../../../../middleware/versioning';
import { auditLog } from '../../../../../middleware/audit';
import { prometheusMetrics } from '../../../../../middleware/metrics';
import { query, validationResult } from 'express-validator';

const router = express.Router();

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

// GET market data
router.get(
  '/market',
  query('symbol').isString().isLength({ min: 1, max: 10 }),
  validationErrorHandler,
  prometheusMetrics,
  auditLog('market_access'),
  requireRole('user'),
  requireScope('market:read'),
  (req, res) => {
    res.json({
      data: {
        symbol: req.query.symbol,
        price: 123.45,
        change: 1.23,
        timestamp: new Date().toISOString(),
      },
    });
  }
);

export default router; 