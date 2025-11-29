import express from 'express';
import { enforceHTTPS } from '../../../../../middleware/httpsEnforce';
import { authenticateJWT } from '../../../../../middleware/auth';
import { requireRole, requireScope } from '../../../../../middleware/scopes';
import { rateLimit } from '../../../../../middleware/rateLimit';
import { enforceVersioning } from '../../../../../middleware/versioning';
import { auditLog } from '../../../../../middleware/audit';
import { prometheusMetrics } from '../../../../../middleware/metrics';

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

// /analytics endpoint with all sub-features
router.get(
  '/analytics',
  prometheusMetrics,
  auditLog('analytics_access'),
  requireRole('user'),
  requireScope('analytics:read'),
  (req, res) => {
    res.json({
      data: {
        summary: 'Mocked analytics data',
        user: req.user,
        timestamp: new Date().toISOString(),
      },
    });
  }
);

export default router; 