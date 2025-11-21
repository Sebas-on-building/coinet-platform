import React from 'react';
import { RedisSuiteButton } from 'src/design-system/components/Button/RedisSuiteButton';

const mockIssues = [
  { issue: 'High Redis memory usage', fix: 'Evict least recently used keys', status: 'pending' },
  { issue: 'Node 3 offline', fix: 'Trigger failover', status: 'pending' },
  { issue: 'Too many cache misses', fix: 'Increase cache size', status: 'remediated' },
];

export const AIRemediationPanel = () => (
  <div style={{ background: '#23272F', borderRadius: 16, padding: 24, marginTop: 32, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
    <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>AI Auto-Remediation</h2>
    <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
      {mockIssues.map((i, idx) => (
        <li key={idx} style={{ marginBottom: 16, background: '#18181b', borderRadius: 8, padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ color: '#FF453A', fontWeight: 600 }}>{i.issue}</div>
            <div style={{ color: '#FFD60A', fontSize: 13 }}>Fix: {i.fix}</div>
          </div>
          {i.status === 'pending' ? (
            <RedisSuiteButton style={{ fontSize: 12, padding: '4px 12px' }}>Remediate</RedisSuiteButton>
          ) : (
            <span style={{ color: '#30D158', fontWeight: 600 }}>Remediated</span>
          )}
        </li>
      ))}
    </ul>
  </div>
); 