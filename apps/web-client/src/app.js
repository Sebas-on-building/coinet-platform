const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/ready', (req, res) => {
  res.json({ status: 'ready' });
});

app.get('/', (req, res) => {
  res.send('<h1>Coinet Web Client</h1><p>API Gateway: /api/*</p>');
});

app.listen(port, () => {
  console.log(`Web client running on port ${port}`);
});
