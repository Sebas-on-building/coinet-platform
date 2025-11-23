import * as express from 'express';
import { rateLimitMiddleware } from '../../../middleware/rateLimit';
import { loggerMiddleware } from '../../../middleware/logger';
import { metricsMiddleware } from '../../../middleware/metrics';
import { auditMiddleware } from '../../../middleware/audit';

import usersRouter from './users';
import marketRouter from './market';
import alertsRouter from './alerts';
import strategiesRouter from './strategies';
import portfoliosRouter from './portfolios';
import authRouter from './auth';
import graphqlRouter from '../graphql';

const router = express.Router();

// Global middlewares
router.use(rateLimitMiddleware);
router.use(loggerMiddleware);
router.use(metricsMiddleware);
router.use(auditMiddleware);

// API routes
router.use('/users', usersRouter);
router.use('/market', marketRouter);
router.use('/alerts', alertsRouter);
router.use('/strategies', strategiesRouter);
router.use('/portfolios', portfoliosRouter);
router.use('/auth', authRouter);
router.use('/graphql', graphqlRouter);

export default router; 