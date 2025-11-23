import React, { useState } from 'react';
import type { CardEvent } from '../CardEventLog';

export const ComplianceNotes: React.FC<{
  event: CardEvent;
}> = ({ event }) => {
  const [note, setNote] = useState(event.meta?.complianceNote || '');
  const [editing, setEditing] = useState(false);

  return (
    <section style={{ background: 'var(--color-surface-glass)', borderRadius: 16, padding: 20, boxShadow: 'var(--shadow-md)' }} aria-label="Compliance notes">
      <header style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        <h3 style={{ fontWeight: 700, fontSize: 18, flex: 1 }}>Compliance Notes</h3>
        {!editing && (
          <button onClick={() => setEditing(true)} aria-label="Edit compliance note" style={{ borderRadius: 8, padding: '4px 12px', fontWeight: 600, background: 'var(--color-surface)', border: '1px solid var(--color-border)', cursor: 'pointer', fontSize: 13 }}>Edit</button>
        )}
      </header>
      {editing ? (
        <div style={{ display: 'flex', gap: 8 }}>
          <textarea value={note} onChange={e => setNote(e.target.value)} style={{ flex: 1, borderRadius: 8, padding: 8, fontSize: 14, border: '1px solid var(--color-border)' }} aria-label="Edit compliance note" />
          <button onClick={() => setEditing(false)} style={{ borderRadius: 8, padding: '8px 16px', fontWeight: 700, background: 'var(--color-accent-blue)', color: '#fff', border: 'none', cursor: 'pointer' }}>Save</button>
        </div>
      ) : (
        <div style={{ color: 'var(--color-text-secondary)', fontSize: 15, minHeight: 32 }}>{note || <span style={{ color: 'var(--color-border)' }}>No compliance notes</span>}</div>
      )}
    </section>
  );
}; 