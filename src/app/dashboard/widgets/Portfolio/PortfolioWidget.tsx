import React, { useState } from 'react';
import { WidgetAtom } from '../../../../components/widgets/WidgetAtom';
import { useDesignSystem } from '../../../../components/design-system/DesignSystemProvider';

// Atomic: ColumnToggle
const ColumnToggle: React.FC<{ label: string; checked: boolean; onChange: (v: boolean) => void }> = ({ label, checked, onChange }) => (
  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
    <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
    {label}
  </label>
);

// Atomic: CurrencySelector
const CurrencySelector: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => (
  <select value={value} onChange={e => onChange(e.target.value)} style={{ borderRadius: 8, padding: 4 }}>
    <option value="USD">USD</option>
    <option value="EUR">EUR</option>
    <option value="BTC">BTC</option>
  </select>
);

// Atomic: SortOrderToggle
const SortOrderToggle: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => (
  <button onClick={() => onChange(value === 'asc' ? 'desc' : 'asc')} style={{ borderRadius: 8, padding: 4, border: '1px solid #eee', background: '#fafbfc', cursor: 'pointer' }}>
    Sort: {value === 'asc' ? 'Ascending' : 'Descending'}
  </button>
);

// =========================
// Portfolio Widget
// =========================
const PortfolioWidget: React.FC<{ config?: any }> = ({ config }) => {
  const { tokens } = useDesignSystem();
  // Settings state
  const [showAmount, setShowAmount] = useState(true);
  const [showValue, setShowValue] = useState(true);
  const [showAllocation, setShowAllocation] = useState(true);
  const [currency, setCurrency] = useState('USD');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Placeholder data
  let assets = [
    { symbol: 'BTC', amount: 0.5, value: 33500 },
    { symbol: 'ETH', amount: 10, value: 32000 },
    { symbol: 'SOL', amount: 100, value: 15000 },
  ];
  // Sort
  assets = [...assets].sort((a, b) => sortOrder === 'asc' ? a.value - b.value : b.value - a.value);
  const total = assets.reduce((sum, a) => sum + a.value, 0);

  // Settings panel (molecule)
  const settingsPanel = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 220 }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>Columns</div>
      <ColumnToggle label="Amount" checked={showAmount} onChange={setShowAmount} />
      <ColumnToggle label="Value" checked={showValue} onChange={setShowValue} />
      <ColumnToggle label="Allocation" checked={showAllocation} onChange={setShowAllocation} />
      <div style={{ fontWeight: 600, margin: '12px 0 4px' }}>Currency</div>
      <CurrencySelector value={currency} onChange={setCurrency} />
      <div style={{ fontWeight: 600, margin: '12px 0 4px' }}>Sort Order</div>
      <SortOrderToggle value={sortOrder} onChange={v => setSortOrder(v as 'asc' | 'desc')} />
    </div>
  );

  return (
    <WidgetAtom title="Portfolio" icon={<span>💼</span>} gradient glow settings={settingsPanel}>
      <table style={{ width: '100%', borderCollapse: 'collapse', background: 'transparent' }}>
        <thead>
          <tr style={{ textAlign: 'left', color: tokens.themeColors.muted, fontSize: 14 }}>
            <th>Asset</th>
            {showAmount && <th>Amount</th>}
            {showValue && <th>Value ({currency})</th>}
            {showAllocation && <th>Allocation</th>}
          </tr>
        </thead>
        <tbody>
          {assets.map(asset => (
            <tr key={asset.symbol} style={{ borderBottom: `1px solid ${tokens.themeColors.border}` }}>
              <td style={{ padding: tokens.spacing.xs, fontWeight: 600 }}>{asset.symbol}</td>
              {showAmount && <td style={{ padding: tokens.spacing.xs }}>{asset.amount}</td>}
              {showValue && <td style={{ padding: tokens.spacing.xs }}>${asset.value.toLocaleString()}</td>}
              {showAllocation && <td style={{ padding: tokens.spacing.xs }}>{((asset.value / total) * 100).toFixed(1)}%</td>}
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ fontWeight: 500, marginTop: tokens.spacing.sm, color: tokens.themeColors.text }}>
        Total Value: ${total.toLocaleString()}
      </div>
    </WidgetAtom>
  );
};

export default PortfolioWidget; 