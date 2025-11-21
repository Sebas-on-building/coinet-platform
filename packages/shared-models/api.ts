import { Router } from 'express';
const router = Router();

router.post('/action', async (req, res) => {
  // Validate and handle command
  res.status(200).json({ status: 'ok' });
});

export default router;
