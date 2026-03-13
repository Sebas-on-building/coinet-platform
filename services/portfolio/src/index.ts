import express from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import restRoutes from './routes/rest';
import graphqlRoute from './routes/graphql';
import { logRequest } from './middleware/logger';
import { startConsumer } from './kafka/consumer';
import './middleware/tracing';

dotenv.config();
const app = express();

const portfolioRawOrigins = (process.env.CORS_ORIGIN ?? process.env.CORS_ORIGINS ?? '').trim();
const portfolioEnvOrigins = portfolioRawOrigins
  ? portfolioRawOrigins.split(',').map((o) => o.trim()).filter(Boolean)
  : [];
const portfolioAllowedOrigins: string[] = [
  'https://app.coinet.ai',
  'https://coinet.ai',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8080',
  ...portfolioEnvOrigins,
];
const portfolioIsProd = process.env.NODE_ENV === 'production';

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (portfolioAllowedOrigins.includes(origin)) return callback(null, true);
      if (!portfolioIsProd && (origin.includes('vercel.app') || origin.includes('coinet'))) {
        return callback(null, true);
      }
      if (portfolioIsProd) return callback(null, false);
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id', 'X-Request-ID'],
  })
);
app.use(express.json());
app.use(logRequest);

app.use('/api', restRoutes);
app.use('/graphql', graphqlRoute);

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.end(await import('prom-client').then(c => c.register.metrics()));
});
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(4300, () => {
  console.log('Portfolio Service running on port 4300');
  startConsumer();
}); 