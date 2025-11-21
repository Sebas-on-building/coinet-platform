import React, { useState } from 'react';
import { RedisSuiteButton } from 'src/design-system/components/Button/RedisSuiteButton';

const mockHistory = [
  { sender: 'AI', message: 'How can I help you with Redis today?' },
  { sender: 'You', message: 'Show me the top cache keys.' },
  { sender: 'AI', message: 'Top keys: portfolioVal:12345, symbol:BTCUSD, session:abc.' },
];

export const OpsCoPilotPanel = () => {
  const [history, setHistory] = useState(mockHistory);
  const [msg, setMsg] = useState('');

  const handleSend = () => {
    if (!msg) return;
    setHistory([...history, { sender: 'You', message: msg }, { sender: 'AI', message: 'This is a simulated response.' }]);
    setMsg('');
  };

  return (
    <div style={{ background: '#23272F', borderRadius: 16, padding: 24, marginTop: 32, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Ops Co-Pilot</h2>
      <div style={{ background: '#18181b', borderRadius: 8, padding: 12, minHeight: 60, marginBottom: 8, maxHeight: 120, overflowY: 'auto' }}>
        {history.map((h, i) => (
          <div key={i} style={{ color: h.sender === 'AI' ? '#FFD60A' : '#00FFA3', fontFamily: 'monospace', fontSize: 13, marginBottom: 4 }}><span style={{ fontWeight: 600 }}>{h.sender}:</span> {h.message}</div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input style={{ flex: 1, padding: 8, borderRadius: 8, background: '#18181b', color: '#00FFA3' }} placeholder="Ask the co-pilot..." value={msg} onChange={e => setMsg(e.target.value)} />
        <RedisSuiteButton style={{ fontSize: 12, padding: '4px 12px' }} onClick={handleSend}>Send</RedisSuiteButton>
      </div>
    </div>
  );
}; 