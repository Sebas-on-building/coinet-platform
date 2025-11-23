import express from 'express';
import { enforceHTTPS } from '../../../../../middleware/httpsEnforce';
import { authenticateJWT } from '../../../../../middleware/auth';
import { requireRole, requireScope } from '../../../../../middleware/scopes';
import { rateLimit } from '../../../../../middleware/rateLimit';
import { enforceVersioning } from '../../../../../middleware/versioning';
import { auditLog } from '../../../../../middleware/audit';
import { prometheusMetrics } from '../../../../../middleware/metrics';
import { body, validationResult } from 'express-validator';
import { loadPlugin, validateInput, runPlugin } from '../../../../services/plugin-sdk/pluginExecutor';

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
  '/plugin/execute',
  body('pluginName').isString().isLength({ min: 1, max: 100 }),
  body('input').isObject(),
  validationErrorHandler,
  prometheusMetrics,
  auditLog('plugin_execute'),
  requireRole('user'),
  requireScope('plugin:execute'),
  asyncHandler(async (req, res) => {
    const { pluginName, input } = req.body;
    const plugin = loadPlugin(pluginName);
    // For demo, assume plugin has a static schema
    const schema = plugin.schema || {};
    if (!validateInput(input, schema)) {
      return res.status(400).json({ error: 'Invalid input for plugin' });
    }
    const output = await runPlugin(plugin, input);
    res.json({ output });
  })
);

export default router; 