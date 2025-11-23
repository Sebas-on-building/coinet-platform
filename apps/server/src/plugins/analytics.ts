import express from 'express';
const router = express.Router();

// In-memory analytics store
const analytics: Record<string, any[]> = {};

/**
 * GET /analytics/:pluginId - Fetch analytics events for a plugin
 */
router.get('/:pluginId', (req, res) => {
  res.json(analytics[req.params.pluginId] || []);
});

/**
 * POST /analytics/:pluginId - Submit an analytics event for a plugin
 */
router.post('/:pluginId', (req, res) => {
  const { event, data } = req.body;
  if (!event) return res.status(400).json({ error: 'Missing event' });
  if (!analytics[req.params.pluginId]) analytics[req.params.pluginId] = [];
  analytics[req.params.pluginId].push({ event, data, date: new Date().toISOString() });
  res.status(201).json(analytics[req.params.pluginId]);
});

export default router; 