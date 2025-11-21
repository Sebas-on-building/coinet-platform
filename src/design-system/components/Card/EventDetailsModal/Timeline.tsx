import React from 'react';
import type { CardEvent } from '../CardEventLog';

export const Timeline: React.FC<{
  events: CardEvent[];
  currentEvent: CardEvent;
}> = ({ events, currentEvent }) => {
  return (
    <section style={{ background: 'var(--color-surface-glass)', borderRadius: 16, padding: 20, boxShadow: 'var(--shadow-md)' }} aria-label="Event timeline">
      <header style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Timeline</header>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {events.map((e, i) => (
          <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: e === currentEvent ? 'var(--color-accent-blue-opaque)' : 'transparent', borderRadius: 8, padding: 8, transition: 'background 0.2s' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: e === currentEvent ? 'var(--color-accent-blue)' : 'var(--color-border)', display: 'inline-block' }} aria-label={e.type}></span>
            <span style={{ fontWeight: e === currentEvent ? 700 : 500, color: e === currentEvent ? 'var(--color-accent-blue)' : 'var(--color-text)' }}>{e.type}</span>
            <span style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>{new Date(e.timestamp).toLocaleTimeString()}</span>
            <span style={{ color: 'var(--color-text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.source}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}; 