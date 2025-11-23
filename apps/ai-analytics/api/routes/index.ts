import express from 'express';
import { AnalyticsEngine } from '../services/analyticsEngine';
import analyticsRouter from './v1/analytics';
import alertsRouter from './v1/alerts';
import portfoliosRouter from './v1/portfolios';

const router = express.Router();
const engine = new AnalyticsEngine();

router.use('/v1/analytics', analyticsRouter);
router.use('/v1/alerts', alertsRouter);
router.use('/v1/portfolios', portfoliosRouter);

router.post('/run', async (req, res) => {
  const result = await engine.runJob(req.body);
  res.json(result);
});

router.get('/plugins', (req, res) => {
  res.json(engine.plugins.list());
});

export default router; 