import express from 'express';
import { PrismaClient } from '@prisma/client';
const app = express();
const prisma = new PrismaClient();
app.use(express.json());

// List reviews for a plugin
app.get('/api/reviews/:pluginId', async (req, res) => {
  const reviews = await prisma.review.findMany({ where: { pluginId: req.params.pluginId } });
  res.json(reviews);
});

// Submit a review
app.post('/api/reviews', async (req, res) => {
  const { pluginId, userId, rating, comment } = req.body;
  // TODO: AI moderation, sentiment analysis
  const review = await prisma.review.create({ data: { pluginId, userId, rating, comment } });
  res.status(201).json(review);
});

// ... endpoints for moderation, analytics, etc.

app.listen(4002, () => console.log('Plugin Review Service running on :4002')); 