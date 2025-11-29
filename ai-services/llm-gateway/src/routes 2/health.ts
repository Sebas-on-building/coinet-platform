import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({ status: 'UP', timestamp: new Date().toISOString() });
});

export { router as healthRoutes };
