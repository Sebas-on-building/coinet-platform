import { Router } from 'express';
const router = Router();

router.post('/ingest', async (req, res) => {
  // Validate and handle ingest command
  res.status(200).json({ status: 'ok' });
});

export default router; 