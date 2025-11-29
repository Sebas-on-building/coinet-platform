import React, { useState } from 'react';
import { Card } from 'src/components/ui/Card';
import { Input } from 'src/components/ui/Input';
import { Button } from 'src/components/ui/Button';
import { spacing } from 'src/styles/tokens/spacing';

export const WidgetMarketplace = ({ widgets }: { widgets: { id: string; name: string }[] }) => {
  const [query, setQuery] = useState('');
  const filtered = widgets.filter(w => w.name.toLowerCase().includes(query.toLowerCase()));
  return (
    <Card header="Widget Marketplace">
      <Input placeholder='Search widgets...' value={query} onChange={e => setQuery(e.target.value)} aria-label="Search widgets" />
      <div style={{ marginTop: spacing.md }}>
        {filtered.map(w => (
          <div key={w.id} style={{ display: 'flex', alignItems: 'center', marginBottom: spacing.sm }}>
            <span style={{ flex: 1 }}>{w.name}</span>
            <Button size='sm'>Install</Button>
          </div>
        ))}
      </div>
    </Card>
  );
}; 