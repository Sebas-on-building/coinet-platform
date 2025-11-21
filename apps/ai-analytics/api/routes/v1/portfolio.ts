import express from 'express';
import { enforceHTTPS } from '../../../../../middleware/httpsEnforce';
import { authenticateJWT } from '../../../../../middleware/auth';
import { requireRole, requireScope } from '../../../../../middleware/scopes';
import { rateLimit } from '../../../../../middleware/rateLimit';
import { enforceVersioning } from '../../../../../middleware/versioning';
import { auditLog } from '../../../../../middleware/audit';
import { prometheusMetrics } from '../../../../../middleware/metrics';
import { body, validationResult } from 'express-validator';

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

// GET portfolio
router.get(
  '/portfolio',
  prometheusMetrics,
  auditLog('portfolio_access'),
  requireRole('user'),
  requireScope('portfolio:read'),
  (req, res) => {
    res.json({
      data: {
        id: 'mock-portfolio',
        name: 'Demo Portfolio',
        holdings: [],
        user: req.user,
        timestamp: new Date().toISOString(),
      },
    });
  }
);

function validationErrorHandler(req: any, res: any, next: any) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }
  next();
}

// POST portfolio (create)
router.post(
  '/portfolio',
  body('name').isString().isLength({ min: 1, max: 100 }),
  validationErrorHandler,
  prometheusMetrics,
  auditLog('portfolio_create'),
  requireRole('user'),
  requireScope('portfolio:write'),
  (req, res) => {
    res.status(201).json({
      data: {
        id: 'mock-portfolio',
        name: req.body.name,
        holdings: [],
        user: req.user,
        timestamp: new Date().toISOString(),
      },
    });
  }
);

export default router; 