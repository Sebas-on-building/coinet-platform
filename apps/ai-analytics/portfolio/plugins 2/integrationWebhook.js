// Webhook Integration Plugin for Coinet Portfolio Evaluator
const axios = require('axios');
const WEBHOOK_URL = process.env.EXTERNAL_WEBHOOK_URL;

module.exports = {
  async onPortfolioTick({ portfolioId, symbol, price, value, pnl }) {
    await axios.post(WEBHOOK_URL, {
      portfolioId, symbol, price, value, pnl, time: new Date().toISOString(),
    });
  },
}; 