import { Router } from 'express';
import holdingsRouter from './holdings';
import performanceRouter from './performance';
import riskRouter from './risk';
import rebalancingRouter from './rebalancing';

const router = Router();

router.use('/holdings', holdingsRouter);
router.use('/performance', performanceRouter);
router.use('/risk', riskRouter);
router.use('/rebalancing', rebalancingRouter);

export default router; 