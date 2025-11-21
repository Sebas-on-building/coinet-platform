import React from 'react';

export const Card = ({ children, style = {}, ...props }: React.PropsWithChildren<{ style?: React.CSSProperties }>) => (
  <div
    style={{
      background: 'rgba(255,255,255,0.85)',
      borderRadius: 20,
      boxShadow: '0 8px 40px rgba(14,118,253,0.10), 0 1.5px 4px rgba(0,0,0,0.04)',
      padding: 32,
      margin: '1rem 0',
      ...style
    }}
    {...props}
  >
    {children}
  </div>
); 