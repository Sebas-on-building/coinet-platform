import React from 'react';
import { Button } from 'packages/shared-ui/atoms/Button';

export const WidgetExport = () => (
  <div style={{ background: '#fff', borderRadius: 24, boxShadow: '0 4px 16px rgba(0,0,0,0.08)', padding: 24 }}>
    <h2 style={{ fontWeight: 700, fontSize: 24 }}>Export Data</h2>
    <Button onClick={() => window.open('/api/analytics/export/csv', '_blank')}>Export CSV</Button>
    <Button onClick={() => window.open('/api/analytics/export/png', '_blank')} style={{ marginLeft: 8 }}>Export PNG</Button>
  </div>
); 