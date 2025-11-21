import express from 'express';
import { json } from 'body-parser';
import client from 'prom-client';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(json());

const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics();

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(4500, () => {
  console.log('Strategy Service running on port 4500');
}); 