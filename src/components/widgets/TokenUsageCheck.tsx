import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { TokenUsageCheckDetails } from './TokenUsageCheckDetails';

export const TokenUsageCheck: React.FC<{ tokens: Record<string, any> }> = ({ tokens }) => {
  // Simulate usage check
  const results = Object.keys(tokens).map(key => ({
    key,
    used: true, // Fake: all used
  }));
  return (
    <div style={{ margin: '12px 0' }}>
      <h5 style={{ fontWeight: 500, fontSize: 16 }}>Usage Check</h5>
      <ul style={{ display: 'flex', flexDirection: 'column', gap: 0, flexWrap: 'wrap' }}>
        {results.map(r => (
          <li key={r.key}>
            <TokenUsageCheckDetails name={r.key} used={r.used} />
          </li>
        ))}
      </ul>
      {/* TODO: Add animated transitions, accessibility, and extensibility for all sub-features */}
    </div>
  );
}; 