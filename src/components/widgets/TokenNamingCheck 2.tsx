import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { TokenNamingCheckDetails } from './TokenNamingCheckDetails';

export const TokenNamingCheck: React.FC<{ tokens: Record<string, any> }> = ({ tokens }) => {
  // Simulate naming check
  const results = Object.keys(tokens).map(key => ({
    key,
    pass: /^[a-z0-9-]+$/.test(key),
  }));
  return (
    <div style={{ margin: '12px 0' }}>
      <h5 style={{ fontWeight: 500, fontSize: 16 }}>Naming Check</h5>
      <ul style={{ display: 'flex', flexDirection: 'column', gap: 0, flexWrap: 'wrap' }}>
        {results.map(r => (
          <li key={r.key}>
            <TokenNamingCheckDetails name={r.key} pass={r.pass} />
          </li>
        ))}
      </ul>
      {/* TODO: Add animated transitions, accessibility, and extensibility for all sub-features */}
    </div>
  );
}; 