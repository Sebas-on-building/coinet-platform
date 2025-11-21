import React from 'react';

interface PortfolioTableProps {
  data: { symbol: string; amount: number; value: number }[];
}

export const PortfolioTable = ({ data = [] }: PortfolioTableProps) => (
  <table style={{ width: '100%', borderRadius: 12, background: '#fff', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
    <thead>
      <tr style={{ background: '#F2F2F7' }}>
        <th style={{ padding: 16, textAlign: 'left' }}>Symbol</th>
        <th style={{ padding: 16, textAlign: 'right' }}>Amount</th>
        <th style={{ padding: 16, textAlign: 'right' }}>Value (USD)</th>
      </tr>
    </thead>
    <tbody>
      {data.map((row, i) => (
        <tr key={row.symbol} style={{ borderBottom: '1px solid #eee' }}>
          <td style={{ padding: 16 }}>{row.symbol}</td>
          <td style={{ padding: 16, textAlign: 'right' }}>{row.amount}</td>
          <td style={{ padding: 16, textAlign: 'right' }}>{row.value}</td>
        </tr>
      ))}
    </tbody>
  </table>
); 