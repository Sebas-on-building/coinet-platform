const express = require('express');
const promClient = require('prom-client');
function setupMetrics() {
  const app = express();
  const collectDefaultMetrics = promClient.collectDefaultMetrics;
  collectDefaultMetrics();
  app.get('/metrics', async (req, res) => {
    res.set('Content-Type', promClient.register.contentType);
    res.end(await promClient.register.metrics());
  });
  app.listen(9100, () => console.log('Prometheus metrics on :9100/metrics'));
}
module.exports = { setupMetrics }; 