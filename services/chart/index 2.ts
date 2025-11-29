import express from 'express';
import { getChart, createChart, updateChart, deleteChart, exportChartImage } from './chartStore';

const app = express();
app.use(express.json());

app.get('/charts/:id', async (req, res) => {
  const chart = await getChart(req.params.id);
  if (!chart) return res.status(404).json({ error: 'Chart not found' });
  res.json(chart);
});

app.post('/charts', async (req, res) => {
  const chart = await createChart(req.body);
  res.status(201).json(chart);
});

app.put('/charts/:id', async (req, res) => {
  const chart = await updateChart(req.params.id, req.body);
  res.json(chart);
});

app.delete('/charts/:id', async (req, res) => {
  await deleteChart(req.params.id);
  res.status(204).end();
});

app.get('/charts/:id/image', async (req, res) => {
  const image = await exportChartImage(req.params.id);
  res.set('Content-Type', 'image/png');
  res.send(image);
});

app.listen(4002, () => console.log('ChartService running on port 4002')); 