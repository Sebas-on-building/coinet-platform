// Dev-only harness: serves the additive /api/market-regime route in isolation
// (no DB needed) so the homepage Market Pulse can be verified locally before
// the route is deployed to production api.coinet.ai. Not shipped / not imported.
const express = require("express");
const router = require("../dist/api/market-regime/routes").default;
const app = express();
app.use("/api/market-regime", router);
const PORT = process.env.REGIME_PORT || 4123;
app.listen(PORT, () => console.log(`[regime-harness] listening on ${PORT}`));
