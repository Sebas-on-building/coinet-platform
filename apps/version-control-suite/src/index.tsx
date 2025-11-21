import React from 'react';
import { VersionControlDashboard } from 'packages/version-control-ui';

export default function VersionControlSuiteApp() {
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', fontFamily: 'Inter, system-ui, sans-serif', color: '#fff' }}>
      <VersionControlDashboard />
    </div>
  );
}
