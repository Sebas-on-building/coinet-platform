import React from 'react';

export function ProgressBar({ percent }: { percent: number }) {
  return (
    <div style={{ background: '#eee', borderRadius: 8, height: 12, width: '100%', margin: '16px 0' }}>
      <div style={{
        width: `${percent}%`,
        height: '100%',
        background: 'linear-gradient(90deg, #0e76fd 0%, #6e4fff 100%)',
        borderRadius: 8,
        transition: 'width 0.5s cubic-bezier(.4,0,.2,1)'
      }} />
    </div>
  );
} 