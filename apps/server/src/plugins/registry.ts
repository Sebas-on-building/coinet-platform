import express from 'express';
const router = express.Router();

// Pseudo async DB (replace with real DB in prod)
const db = {
  plugins: {} as Record<string, any>,
  async getAll() { return Object.values(this.plugins); },
  async get(id: string) { return this.plugins[id]; },
  async add(plugin: any) { this.plugins[plugin.id] = plugin; },
  async update(id: string, data: any) { this.plugins[id] = { ...this.plugins[id], ...data }; },
  async delete(id: string) { delete this.plugins[id]; },
};

// Pseudo auth middleware
function requireAuth(req, res, next) {
  // TODO: Integrate real auth
  if (!req.headers['x-user']) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

/**
 * GET /plugins - List all plugins
 */
router.get('/', requireAuth, async (req, res) => {
  res.json(await db.getAll());
});

/**
 * POST /plugins - Register a new plugin
 */
router.post('/', requireAuth, async (req, res) => {
  const { name, author, version, ...rest } = req.body;
  if (!name || !author || !version) return res.status(400).json({ error: 'Missing fields' });
  const id = `${name}:${author}`;
  await db.add({ id, name, author, version, ...rest });
  res.status(201).json(await db.get(id));
});

/**
 * GET /plugins/:id - Fetch plugin metadata
 */
router.get('/:id', requireAuth, async (req, res) => {
  const plugin = await db.get(req.params.id);
  if (!plugin) return res.status(404).json({ error: 'Not found' });
  res.json(plugin);
});

/**
 * PUT /plugins/:id - Update plugin metadata
 */
router.put('/:id', requireAuth, async (req, res) => {
  if (!await db.get(req.params.id)) return res.status(404).json({ error: 'Not found' });
  await db.update(req.params.id, req.body);
  res.json(await db.get(req.params.id));
});

/**
 * DELETE /plugins/:id - Delete a plugin
 */
router.delete('/:id', requireAuth, async (req, res) => {
  if (!await db.get(req.params.id)) return res.status(404).json({ error: 'Not found' });
  await db.delete(req.params.id);
  res.status(204).end();
});

export default router; 