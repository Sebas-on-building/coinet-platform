import React, { useState } from 'react';
import { Card } from '@/components/ui/Card/Card';
import { Button } from '@/components/ui/Button/Button';

const mockResults = [
  { id: 1, title: 'How to use Coinet Video', snippet: 'Learn how to upload, edit, and share videos...' },
  { id: 2, title: 'Advanced Analytics', snippet: 'Explore engagement, retention, and more...' },
];

const AISearchBar = React.memo(() => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<typeof mockResults>([]);
  const [loading, setLoading] = useState(false);

  const onSearch = () => {
    setLoading(true);
    setTimeout(() => {
      setResults(query ? mockResults : []);
      setLoading(false);
    }, 500);
  };

  return (
    <Card style={{ padding: 'var(--spacing-md)', minWidth: 340, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
      <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Ask anything about your videos..."
          style={{ flex: 1, fontSize: 16, borderRadius: 6, padding: 8, border: '1px solid var(--color-border)' }}
          aria-label="AI Search"
        />
        <Button onClick={onSearch} disabled={loading || !query} variant="primary" size="sm">Search</Button>
      </div>
      {loading && <div>Searching...</div>}
      {results.length > 0 && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {results.map(r => (
            <Card key={r.id} style={{ padding: 8, background: 'var(--color-bg-elevated)' }}>
              <strong>{r.title}</strong>
              <div style={{ color: 'var(--color-text-secondary)' }}>{r.snippet}</div>
            </Card>
          ))}
        </div>
      )}
      {!loading && query && results.length === 0 && <div>No results found.</div>}
    </Card>
  );
});

export default AISearchBar; 