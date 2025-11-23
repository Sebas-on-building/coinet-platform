import express from 'express';

const app = express();
app.use(express.json());

app.post('/fetch/market', (req, res) => {
  // Placeholder: fetch market data
  res.json({ status: 'market data fetched' });
});

app.post('/fetch/onchain', (req, res) => {
  // Placeholder: fetch on-chain data
  res.json({ status: 'on-chain data fetched' });
});

app.post('/fetch/social', (req, res) => {
  // Placeholder: fetch social data
  res.json({ status: 'social data fetched' });
});

app.post('/adapters/:source', (req, res) => {
  // Placeholder: run adapter for data source
  res.json({ status: `adapter ${req.params.source} run` });
});

app.listen(4006, () => console.log('DataIngestService running on port 4006')); 