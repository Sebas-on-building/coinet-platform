import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';

export const TokenExport: React.FC<{ tokens: Record<string, any> }> = ({ tokens }) => {
  const [status, setStatus] = useState('');
  const handleExport = (type: 'css' | 'json') => {
    const data = type === 'css' ? tokensToCSS(tokens) : JSON.stringify(tokens, null, 2);
    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tokens.${type}`;
    a.click();
    setStatus(`Exported as ${type.toUpperCase()}`);
    setTimeout(() => setStatus(''), 2000);
  };
  function tokensToCSS(tokens: Record<string, any>): string {
    let css = ':root {\n';
    for (const [group, values] of Object.entries(tokens)) {
      if (typeof values === 'object' && values !== null) {
        for (const [key, value] of Object.entries(values as Record<string, any>)) {
          css += `  --co-${group}-${key}: ${value};\n`;
        }
      }
    }
    css += '}\n';
    return css;
  }
  return (
    <div style={{ margin: '24px 0' }}>
      <h4 style={{ fontWeight: 600, fontSize: 18 }}>Token Export</h4>
      <Button onClick={() => handleExport('css')} style={{ marginRight: 8 }}>Export as CSS</Button>
      <Button onClick={() => handleExport('json')}>Export as JSON</Button>
      {status && <div style={{ marginTop: 8, color: '#059669', fontWeight: 500 }}>{status}</div>}
      {/* TODO: Add animated transitions, accessibility, and extensibility for all sub-features */}
    </div>
  );
}; 