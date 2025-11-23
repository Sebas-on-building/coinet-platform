import express from 'express';
const router = express.Router();

// Pseudo async DB (replace with real DB in prod)
const db = {
  reviews: {} as Record<string, any[]>,
  async getAll(pluginId: string) { return this.reviews[pluginId] || []; },
  async add(pluginId: string, review: any) {
    if (!this.reviews[pluginId]) this.reviews[pluginId] = [];
    this.reviews[pluginId].push(review);
  },
};

// Pseudo auth middleware
function requireAuth(req, res, next) {
  if (!req.headers['x-user']) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

/**
 * GET /reviews/:pluginId - List all reviews for a plugin
 */
router.get('/:pluginId', requireAuth, async (req, res) => {
  res.json(await db.getAll(req.params.pluginId));
});

/**
 * POST /reviews/:pluginId - Submit a review for a plugin
 */
router.post('/:pluginId', requireAuth, async (req, res) => {
  const { rating, text, author } = req.body;
  if (!rating || !author) return res.status(400).json({ error: 'Missing fields' });
  await db.add(req.params.pluginId, { rating, text, author, date: new Date().toISOString() });
  res.status(201).json(await db.getAll(req.params.pluginId));
});

export default router; 