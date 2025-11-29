const express = require('express');
function setupHealthChecks() {
  const app = express();
  app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));
  app.listen(9101, () => console.log('Health endpoint on :9101/health'));
}
module.exports = { setupHealthChecks }; 