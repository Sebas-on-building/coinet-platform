// Email Notification Plugin for Coinet Portfolio Evaluator
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  // Configure SMTP
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// --- Sub-feature: Threshold Logic ---
function shouldSendAlert(pnl) {
  return pnl < -1000;
}

// --- Sub-feature: HTML Email ---
function buildHtmlEmail({ portfolioId, symbol, price, pnl }) {
  return `
    <div style="font-family:Helvetica,Arial,sans-serif;padding:24px;background:#f8fafc;border-radius:16px;max-width:480px;margin:auto;">
      <h2 style="color:#6366f1;">Coinet Portfolio Alert</h2>
      <p><b>Portfolio:</b> ${portfolioId}</p>
      <p><b>Symbol:</b> ${symbol}</p>
      <p><b>P&amp;L:</b> <span style="color:${pnl < 0 ? '#ef4444' : '#10b981'};font-weight:bold;">${pnl}</span></p>
      <p><b>Price:</b> ${price}</p>
      <hr style="margin:24px 0;"/>
      <p style="font-size:12px;color:#888;">Coinet | Apple x Canva x TradingView x Solana</p>
    </div>
  `;
}

// --- Sub-feature: Audit Log ---
async function auditLog(event, details) {
  // Placeholder: log to DB or external service
  // e.g., await db.query('INSERT INTO audit_log ...', ...)
}

module.exports = {
  async onAlertCheck({ portfolioId, symbol, price, pnl, userEmail }) {
    if (shouldSendAlert(pnl)) {
      await transporter.sendMail({
        from: 'alerts@coinet.com',
        to: userEmail || 'user@coinet.com',
        subject: `Alert: Large Loss in Portfolio ${portfolioId}`,
        text: `Symbol: ${symbol}\nP&L: ${pnl}\nPrice: ${price}`,
        html: buildHtmlEmail({ portfolioId, symbol, price, pnl }),
      });
      await auditLog('email_alert_sent', { portfolioId, symbol, price, pnl, userEmail });
    }
  },
}; 