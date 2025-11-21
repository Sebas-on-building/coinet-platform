// Atomic API Module for Portfolio Management

/**
 * This module will expose REST/GraphQL endpoints for:
 * - Portfolio management
 * - Analytics
 * - Extensible for new API endpoints
 */

import express from 'express';
import portfolioRouter from './portfolio';
import holdingsRouter from '../holdings/api';
import transactionsRouter from '../transactions/api';
import alertsRouter from '../alerts/api';
import strategiesRouter from '../strategies/api';

const app = express();
app.use(express.json());

app.use('/portfolios', portfolioRouter);
app.use('/holdings', holdingsRouter);
app.use('/transactions', transactionsRouter);
app.use('/alerts', alertsRouter);
app.use('/strategies', strategiesRouter);

export default app; 