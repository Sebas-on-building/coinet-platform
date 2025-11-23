import express from 'express';
import { json } from 'body-parser';
import client from 'prom-client';
import dotenv from 'dotenv';
import { createClient } from 'redis';
dotenv.config();

const app = express();
app.use(json());

const redis = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
redis.connect();

const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics();

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(4400, () => {
  console.log('Alerts Service running on port 4400');
}); 