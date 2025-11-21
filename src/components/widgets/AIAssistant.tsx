import React from 'react';
import { Tooltip } from '../ui';

export const AIAssistant: React.FC<{ suggestion: string }> = ({ suggestion }) => (
  <Tooltip content={suggestion} placement="right" gradient glow>
    <span role="img" aria-label="AI Assistant" style={{ fontSize: 24, cursor: 'pointer' }}>🤖</span>
  </Tooltip>
); 