// Slack Notification Plugin for Coinet Portfolio Evaluator
const axios = require('axios');
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

module.exports = {
  async onAlertCheck({ portfolioId, symbol, price, pnl }) {
    if (pnl < -1000) {
      await axios.post(SLACK_WEBHOOK_URL, {
        text: `:warning: *Alert: Large Loss in Portfolio ${portfolioId}*\n*Symbol:* ${symbol}\n*P&L:* ${pnl}\n*Price:* ${price}`,
      });
    }
  },
}; 