import React, { useState } from 'react';
import { Card } from '../../../../../../src/components/ui/Card/Card';
import { Input } from '../../../../../../src/components/ui/Input/Input';
import { Button } from '../../../../../../src/components/ui/Button/Button';
import { useTheme } from '../../../../../../packages/shared-ui/themes/useTheme';

const initialMessages = [
  { id: 1, user: 'Alice', text: 'Welcome to the live chat!' },
  { id: 2, user: 'Bob', text: 'Excited for this session.' },
];

const LiveChat = () => {
  const { spacing, radii, shadows, typography } = useTheme();
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const handleSend = () => {
    if (input.trim()) {
      setMessages([...messages, { id: Date.now(), user: 'You', text: input }]);
      setInput('');
    }
  };
  return (
    <Card style={{ borderRadius: radii.md, boxShadow: shadows.sm, padding: spacing.md, minWidth: 320 }}>
      <div style={{ ...typography.h4, marginBottom: spacing.sm }}>Live Chat</div>
      <div style={{ maxHeight: 120, overflowY: 'auto', marginBottom: spacing.sm }}>
        {messages.map(m => (
          <div key={m.id} style={{ ...typography.body, marginBottom: spacing.xs }}><b>{m.user}:</b> {m.text}</div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: spacing.xs }}>
        <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Type a message..." style={{ flex: 1 }} />
        <Button variant="primary" onClick={handleSend}>Send</Button>
      </div>
    </Card>
  );
};
export default LiveChat; 