import React, { useState } from 'react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';

export default {
  title: 'Dashboard/AI Assistant',
};

export const AIAssistantPanel = () => {
  const [open, setOpen] = useState(true);
  const [messages, setMessages] = useState([
    { from: 'ai', text: 'How can I help you with your dashboard today?' }
  ]);
  const [input, setInput] = useState('');
  const send = () => {
    setMessages([...messages, { from: 'user', text: input }, { from: 'ai', text: 'Here is an insight based on your request.' }]);
    setInput('');
  };
  return (
    <div style={{ padding: 32, background: 'linear-gradient(120deg, #f8fafc 0%, #e0e7ff 100%)', minHeight: '100vh' }}>
      <Button onClick={() => setOpen(o => !o)}>{open ? 'Hide' : 'Show'} AI Assistant</Button>
      {open && (
        <Card style={{ position: 'fixed', bottom: 32, right: 32, width: 400, zIndex: 100 }}>
          <h3>AI Assistant</h3>
          <div style={{ minHeight: 120, maxHeight: 240, overflowY: 'auto', marginBottom: 12 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ textAlign: m.from === 'ai' ? 'left' : 'right', margin: '8px 0' }}>
                <span style={{ background: m.from === 'ai' ? '#e0e7ff' : '#00ffa3', color: m.from === 'ai' ? '#23234d' : '#fff', borderRadius: 8, padding: '6px 12px', display: 'inline-block' }}>
                  {m.text}
                </span>
              </div>
            ))}
          </div>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask the AI anything…"
            style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #e5e7eb', marginBottom: 8 }}
            onKeyDown={e => { if (e.key === 'Enter') send(); }}
          />
          <Button onClick={send} disabled={!input}>Send</Button>
        </Card>
      )}
    </div>
  );
};
