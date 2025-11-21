import React from 'react';
import { useDashboardTheme } from '../../DashboardThemeProvider';
// =========================
// Trading Panel Widget
// =========================
const TradingPanelWidget: React.FC<{ config?: any }> = ({ config }) => {
  const { theme } = useDashboardTheme();
  // Placeholder data
  const [symbol, setSymbol] = React.useState('BTC');
  const [amount, setAmount] = React.useState(0.1);
  return (
    <div style={{
      background: 'var(--widgetarea-bg)',
      borderRadius: 16,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      padding: 24,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
    }}>
      <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Trading Panel</div>
      <form style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label>
          Symbol:
          <select value={symbol} onChange={e => setSymbol(e.target.value)} style={{ marginLeft: 8 }}>
            <option value="BTC">BTC</option>
            <option value="ETH">ETH</option>
            <option value="SOL">SOL</option>
          </select>
        </label>
        <label>
          Amount:
          <input type="number" value={amount} min={0.01} step={0.01} onChange={e => setAmount(Number(e.target.value))} style={{ marginLeft: 8, width: 80 }} />
        </label>
        <button type="submit" style={{ marginTop: 8, padding: '8px 0', borderRadius: 8, background: '#0057FF', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}>
          Buy
        </button>
      </form>
    </div>
  );
};

export default TradingPanelWidget; 