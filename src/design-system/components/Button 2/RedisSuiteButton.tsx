import React from 'react';
import { redisSuiteColors } from '../../tokens/colors';

export const RedisSuiteButton = ({ children, ...props }) => (
  <button
    style={{
      background: `linear-gradient(90deg, ${redisSuiteColors.primary}, ${redisSuiteColors.accent})`,
      color: redisSuiteColors.text,
      borderRadius: 12,
      padding: '12px 24px',
      fontWeight: 600,
      boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
      transition: 'all 0.2s cubic-bezier(.4,0,.2,1)',
    }}
    {...props}
  >
    {children}
  </button>
); 