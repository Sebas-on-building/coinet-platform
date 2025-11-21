import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { AIExplainabilitySource } from './AIExplainabilitySource';

export const AIExplainability: React.FC<{ answer: string }> = ({ answer }) => {
  // Simulate explainability
  const sources = [
    { type: 'on-chain', label: 'On-chain Data' },
    { type: 'market', label: 'Market Data' },
    { type: 'community', label: 'Community Sentiment' },
  ];
  return (
    <div style={{ margin: '24px 0' }}>
      <h4 style={{ fontWeight: 600, fontSize: 18 }}>AI Explainability</h4>
      <div style={{ marginBottom: 8 }}>This answer was generated using:</div>
      <ul style={{ display: 'flex', gap: 12 }}>
        {sources.map((s, i) => (
          <li key={i}><AIExplainabilitySource type={s.type} label={s.label} /></li>
        ))}
      </ul>
      {/* TODO: Add animated transitions, accessibility, and extensibility for all sub-features */}
    </div>
  );
}; 