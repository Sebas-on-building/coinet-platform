import express from 'express';
import * as cache from '../services/cache';

const router = express.Router();

// Publish a notification
router.post('/notify', async (req, res) => {
  const { message } = req.body;
  await cache.publish('notifications', message);
  res.json({ ok: true });
});

// Subscribe to notifications (for WS server or polling demo)
router.get('/subscribe', async (req, res) => {
  await cache.subscribe('notifications', (msg) => {
    // In a real WS server, push to clients
    console.log('Notification:', msg);
  });
  res.json({ ok: true });
});

export default router; 