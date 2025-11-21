import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import session from 'express-session';
import { json } from 'body-parser';
import cookieParser from 'cookie-parser';
import { logger } from '../api/middleware/logger';
import { metricsMiddleware, exposeMetrics } from '../api/middleware/metrics';
import { traceMiddleware } from '../api/middleware/tracing';
import { rbacMiddleware } from '../api/middleware/rbac';
import { rateLimitMiddleware } from '../api/middleware/rateLimit';
import { validateMiddleware } from '../api/middleware/validate';
import { errorHandler } from '../api/middleware/errorHandler';
import { loadPlugins } from '../api/plugins';
import authRoutes from './routes/auth';
import userRoutes from '../api/routes/user';
import rbacRoutes from '../api/routes/rbac';
import twoFARoutes from './routes/2fa';
import auditRoutes from '../api/routes/audit';
import client from 'prom-client';
import { logRequest } from './logger';
import dotenv from 'dotenv';
import userProfileRoute from './routes/user';
import graphqlHandler from './api/graphql';
import oauthRoutes from './routes/oauth';
import sessionRoutes from './routes/session';
import adminRoutes from './routes/admin';
import onboardingRoutes from './routes/onboarding';
import analyticsRoutes from './routes/analytics';
import badgeRoutes from './routes/badges';
import recommendationRoutes from './routes/recommendations';
import analyticsAdminRoutes from './routes/analyticsAdmin';

dotenv.config();

const app = express();
app.use(helmet());
app.use(cors());
app.use(json());
app.use(cookieParser());
app.use(session({ secret: process.env.SESSION_SECRET!, resave: false, saveUninitialized: true }));
app.use(logger);
app.use(metricsMiddleware);
app.use(traceMiddleware);
app.use(rateLimitMiddleware);
app.use(validateMiddleware);
app.use(rbacMiddleware);
app.use(logRequest);

// Load plugins (extensible auth methods, admin UI, etc.)
loadPlugins(app);

// Register core routes
app.use('/auth', authRoutes);
app.use('/user', userRoutes);
app.use('/rbac', rbacRoutes);
app.use('/2fa', twoFARoutes);
app.use('/oauth', oauthRoutes);
app.use('/session', sessionRoutes);
app.use('/admin', adminRoutes);
app.use('/audit', auditRoutes);
app.use('/api/user', userProfileRoute);
app.use('/graphql', graphqlHandler);
app.use('/onboarding', onboardingRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/badges', badgeRoutes);
app.use('/recommendations', recommendationRoutes);
app.use('/analytics-admin', analyticsAdminRoutes);

app.use('/metrics', exposeMetrics);

const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics();

const requestCounter = new client.Counter({
  name: 'auth_requests_total',
  help: 'Total number of requests',
  labelNames: ['method', 'route', 'status'],
});
const errorCounter = new client.Counter({
  name: 'auth_errors_total',
  help: 'Total number of errors',
  labelNames: ['method', 'route', 'status'],
});
const latencyHistogram = new client.Histogram({
  name: 'auth_request_latency_seconds',
  help: 'Request latency in seconds',
  labelNames: ['method', 'route', 'status'],
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Example endpoint with metrics
app.post('/auth/login', async (req, res) => {
  const end = latencyHistogram.startTimer();
  try {
    // ...login logic
    requestCounter.inc({ method: 'POST', route: '/auth/login', status: 200 });
    res.json({ success: true });
  } catch (err) {
    errorCounter.inc({ method: 'POST', route: '/auth/login', status: 500 });
    res.status(500).json({ error: 'Internal error' });
  } finally {
    end({ method: 'POST', route: '/auth/login', status: res.statusCode });
  }
});

app.use(errorHandler as express.ErrorRequestHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Auth Service running on port ${PORT}`);
}); 