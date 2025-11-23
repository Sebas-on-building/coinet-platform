import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/Card/Card';
import { Button } from '@/components/ui/Button/Button';

const mockCommands = [
  { id: 1, label: 'Go to Dashboard', action: () => window.location.href = '/dashboard' },
  { id: 2, label: 'Open Plugin Marketplace', action: () => window.location.href = '/plugins' },
  { id: 3, label: 'Search Portfolio', action: () => window.location.href = '/portfolio' },
];

const GlobalCommandPalette = React.memo(() => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(mockCommands);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    setResults(
      query ? mockCommands.filter(c => c.label.toLowerCase().includes(query.toLowerCase())) : mockCommands
    );
  }, [query]);

  const onSelect = (cmd: any) => {
    setOpen(false);
    cmd.action();
  };

  if (!open) return null;
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Card style={{ minWidth: 400, padding: 24, boxShadow: 'var(--shadow-lg)' }}>
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Type a command or search..."
          style={{ width: '100%', fontSize: 18, padding: 8, borderRadius: 8, border: '1px solid var(--color-border)', marginBottom: 12 }}
        />
        <div style={{ maxHeight: 240, overflowY: 'auto' }}>
          {results.map((cmd, i) => (
            <Button key={cmd.id} variant="ghost" size="md" style={{ width: '100%', textAlign: 'left', marginBottom: 4 }} onClick={() => onSelect(cmd)}>
              {cmd.label}
            </Button>
          ))}
          {results.length === 0 && <div style={{ color: 'var(--color-text-secondary)', textAlign: 'center' }}>No results</div>}
        </div>
      </Card>
    </div>
  );
});

export default GlobalCommandPalette; 