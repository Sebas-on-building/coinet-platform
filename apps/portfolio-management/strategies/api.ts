import express from 'express';
import { createStrategy, getStrategiesByUser, updateStrategy, deleteStrategy } from './service';

const router = express.Router();

// Create strategy
router.post('/', async (req, res) => {
  const { userId, name, definition } = req.body;
  const strategy = await createStrategy(userId, name, definition);
  res.json(strategy);
});

// Get strategies by user
router.get('/user/:userId', async (req, res) => {
  const { userId } = req.params;
  const strategies = await getStrategiesByUser(userId);
  res.json(strategies);
});

// Update strategy
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  const updated = await updateStrategy(id, data);
  res.json(updated);
});

// Delete strategy
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  await deleteStrategy(id);
  res.json({ success: true });
});

export default router; 