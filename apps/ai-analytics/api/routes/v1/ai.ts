import express from 'express';
import { enforceHTTPS } from '../../../../../middleware/httpsEnforce';
import { authenticateJWT } from '../../../../../middleware/auth';
import { requireRole, requireScope } from '../../../../../middleware/scopes';
import { rateLimit } from '../../../../../middleware/rateLimit';
import { enforceVersioning } from '../../../../../middleware/versioning';
import { auditLog } from '../../../../../middleware/audit';
import { prometheusMetrics } from '../../../../../middleware/metrics';
import { body, validationResult } from 'express-validator';
import { anomalyDetection, forecast } from '../../../../services/ai-analytics/llm/aiAnalyticsService';

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

router.post(
  '/ai/anomaly',
  body('data').isArray({ min: 3 }),
  validationErrorHandler,
  prometheusMetrics,
  auditLog('ai_anomaly'),
  requireRole('user'),
  requireScope('ai:analyze'),
  asyncHandler(async (req, res) => {
    const { data } = req.body;
    const result = await anomalyDetection(data);
    res.json({ result });
  })
);

router.post(
  '/ai/forecast',
  body('data').isArray({ min: 3 }),
  body('steps').isInt({ min: 1, max: 100 }),
  validationErrorHandler,
  prometheusMetrics,
  auditLog('ai_forecast'),
  requireRole('user'),
  requireScope('ai:forecast'),
  asyncHandler(async (req, res) => {
    const { data, steps } = req.body;
    const result = await forecast(data, steps);
    res.json({ result });
  })
);

export default router; 