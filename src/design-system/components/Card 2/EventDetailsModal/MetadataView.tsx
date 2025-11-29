import React from 'react';
import type { CardEvent } from '../CardEventLog';

export const MetadataView: React.FC<{
  event: CardEvent;
  showJSON: boolean;
  onToggleJSON: () => void;
}> = ({ event, showJSON, onToggleJSON }) => {
  const [copied, setCopied] = React.useState<string | null>(null);
  const meta = { ...event };

  const handleCopy = (key: string, value: any) => {
    navigator.clipboard.writeText(String(value));
    setCopied(key);
    setTimeout(() => setCopied(null), 1200);
  };

  return (
    <section style={{ background: 'var(--color-surface-glass)', borderRadius: 16, padding: 20, boxShadow: 'var(--shadow-md)' }} aria-label="Event metadata">
      <header style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        <h3 style={{ fontWeight: 700, fontSize: 18, flex: 1 }}>Metadata</h3>
        <button onClick={onToggleJSON} aria-label="Toggle JSON/raw view" style={{ borderRadius: 8, padding: '4px 12px', fontWeight: 600, background: 'var(--color-surface)', border: '1px solid var(--color-border)', cursor: 'pointer', fontSize: 13 }}>{showJSON ? 'Raw' : 'JSON'}</button>
      </header>
      {showJSON ? (
        <pre style={{ background: 'var(--color-background)', borderRadius: 8, padding: 12, fontSize: 13, maxHeight: 180, overflow: 'auto' }}>{JSON.stringify(meta, null, 2)}</pre>
      ) : (
        <dl style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr max-content', gap: 8, fontSize: 15 }}>
          {Object.entries(meta).map(([key, value]) => (
            <React.Fragment key={key}>
              <dt style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>{key}</dt>
              <dd style={{ margin: 0, color: 'var(--color-text)' }}>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</dd>
              <dd style={{ margin: 0 }}>
                <button
                  aria-label={`Copy ${key}`}
                  onClick={() => handleCopy(key, value)}
                  style={{ background: 'none', border: 'none', color: copied === key ? 'var(--color-accent-green)' : 'var(--color-accent-blue)', cursor: 'pointer', fontSize: 14 }}
                >
                  {copied === key ? '✓' : 'Copy'}
                </button>
              </dd>
            </React.Fragment>
          ))}
        </dl>
      )}
    </section>
  );
}; 