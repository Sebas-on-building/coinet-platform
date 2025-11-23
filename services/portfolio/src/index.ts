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
app.use(helmet());
app.use(cors());
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