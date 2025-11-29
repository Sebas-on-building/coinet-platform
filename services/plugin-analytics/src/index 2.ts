import express from 'express';
import { PrismaClient } from '@prisma/client';
const app = express();
const prisma = new PrismaClient();
app.use(express.json());

// Track event
app.post('/api/analytics', async (req, res) => {
  const { pluginId, type, userId, meta } = req.body;
  const event = await prisma.analyticsEvent.create({ data: { pluginId, type, userId, meta } });
  res.status(201).json(event);
});

// Get analytics for a plugin
app.get('/api/analytics/:pluginId', async (req, res) => {
  const events = await prisma.analyticsEvent.findMany({ where: { pluginId: req.params.pluginId } });
  res.json(events);
});

app.listen(4004, () => console.log('Plugin Analytics Service running on :4004')); 