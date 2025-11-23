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

// GET /realtime (mock WebSocket upgrade)
router.get(
  '/realtime',
  prometheusMetrics,
  auditLog('realtime_subscribe'),
  requireRole('user'),
  requireScope('realtime:subscribe'),
  (req, res) => {
    // Mock: WebSocket upgrade
    // wsServer.handleUpgrade(req, res, ...)
    res.json({ message: 'Subscribed to real-time updates (mocked)' });
  }
);

export default router; 