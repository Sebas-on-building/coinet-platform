import express from 'express';
const router = express.Router();

// In-memory security status and audit
const security: Record<string, any> = {};
const auditHistory: Record<string, any[]> = {};

/**
 * GET /security/:pluginId - Fetch security status/report for a plugin
 */
router.get('/:pluginId', (req, res) => {
  res.json(security[req.params.pluginId] || { status: 'safe', details: 'No issues detected.' });
});

/**
 * POST /security/:pluginId - Update security status/report for a plugin
 */
router.post('/:pluginId', (req, res) => {
  const { status, details } = req.body;
  security[req.params.pluginId] = { status, details };
  res.status(201).json(security[req.params.pluginId]);
});

/**
 * POST /security/:pluginId/audit - Append a security audit event
 */
router.post('/:pluginId/audit', (req, res) => {
  const { status, details } = req.body;
  if (!auditHistory[req.params.pluginId]) auditHistory[req.params.pluginId] = [];
  auditHistory[req.params.pluginId].push({ status, details, date: new Date().toISOString() });
  res.status(201).json(auditHistory[req.params.pluginId]);
});

/**
 * GET /security/:pluginId/history - Fetch security audit history
 */
router.get('/:pluginId/history', (req, res) => {
  res.json(auditHistory[req.params.pluginId] || []);
});

export default router; 