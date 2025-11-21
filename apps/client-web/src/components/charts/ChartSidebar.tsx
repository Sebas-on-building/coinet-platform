import React from 'react';

interface ChartSidebarProps {
  data: any;
}

export const ChartSidebar = ({ data }: ChartSidebarProps) => (
  <aside style={{ width: 320, background: '#F2F2F7', borderRadius: 16, boxShadow: '0 2px 16px rgba(0,0,0,0.06)', padding: 24, minHeight: 400 }}>
    <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Order Book</div>
    {/* TODO: Render order book and recent trades from data */}
    <div style={{ color: '#888' }}>Order book and trades coming soon.</div>
  </aside>
); 