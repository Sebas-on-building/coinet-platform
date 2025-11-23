import express from 'express';
import { PrismaClient } from '@prisma/client';
const app = express();
const prisma = new PrismaClient();
app.use(express.json());

// REST: List plugins
app.get('/api/plugins', async (req, res) => {
  const plugins = await prisma.plugin.findMany({ include: { versions: true, reviews: true, analytics: true, monetization: true } });
  res.json(plugins);
});

// REST: Get plugin by ID
app.get('/api/plugins/:id', async (req, res) => {
  const plugin = await prisma.plugin.findUnique({ where: { id: req.params.id }, include: { versions: true, reviews: true, analytics: true, monetization: true } });
  if (!plugin) return res.status(404).json({ error: 'Not found' });
  res.json(plugin);
});

// REST: Create plugin
app.post('/api/plugins', async (req, res) => {
  const { name, description, ownerId, tags } = req.body;
  const plugin = await prisma.plugin.create({ data: { name, description, ownerId, tags } });
  res.status(201).json(plugin);
});

// ... more endpoints for update, delete, versioning, etc.

app.listen(4001, () => console.log('Plugin Registry running on :4001')); 