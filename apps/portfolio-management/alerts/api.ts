import express from 'express';
import { createAlert, getAlertsByUser, updateAlert, deleteAlert } from './service';

const router = express.Router();

// Create alert
router.post('/', async (req, res) => {
  const { userId, symbol, condition, threshold } = req.body;
  const alert = await createAlert(userId, symbol, condition, threshold);
  res.json(alert);
});

// Get alerts by user
router.get('/user/:userId', async (req, res) => {
  const { userId } = req.params;
  const alerts = await getAlertsByUser(userId);
  res.json(alerts);
});

// Update alert
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  const updated = await updateAlert(id, data);
  res.json(updated);
});

// Delete alert
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  await deleteAlert(id);
  res.json({ success: true });
});

export default router; 