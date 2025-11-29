import React from 'react';

export const Button = ({ children, variant = 'primary', ...props }: React.PropsWithChildren<{ variant?: 'primary' | 'secondary' } & React.ButtonHTMLAttributes<HTMLButtonElement>>) => (
  <button
    className={`btn btn-${variant}`}
    style={{
      borderRadius: 12,
      padding: '12px 24px',
      fontWeight: 700,
      fontSize: 18,
      background: variant === 'primary'
        ? 'linear-gradient(90deg, #0e76fd 0%, #6e4fff 100%)'
        : 'rgba(255,255,255,0.08)',
      color: variant === 'primary' ? '#fff' : '#0e76fd',
      boxShadow: variant === 'primary'
        ? '0 4px 32px rgba(14,118,253,0.08)'
        : 'none',
      transition: 'all 0.2s cubic-bezier(.4,0,.2,1)'
    }}
    {...props}
  >
    {children}
  </button>
); 