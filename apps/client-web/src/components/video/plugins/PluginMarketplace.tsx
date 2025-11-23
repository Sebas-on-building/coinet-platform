import React from 'react';
import { Card } from '../../../../../../src/components/ui/Card/Card';
import { Button } from '../../../../../../src/components/ui/Button/Button';
import { useTheme } from '../../../../../../packages/shared-ui/themes/useTheme';

const plugins = [
  { id: 1, name: 'Subtitles', description: 'Auto-generate subtitles for your videos.' },
  { id: 2, name: 'Chapters AI', description: 'AI-powered chapter detection.' },
  { id: 3, name: 'Live Polls', description: 'Engage your audience with live polls.' },
];

const PluginMarketplace = () => {
  const { spacing, radii, shadows, typography } = useTheme();
  return (
    <Card style={{ borderRadius: radii.md, boxShadow: shadows.sm, padding: spacing.md, minWidth: 320 }}>
      <div style={{ ...typography.h4, marginBottom: spacing.sm }}>Plugin Marketplace</div>
      {plugins.map(p => (
        <div key={p.id} style={{ ...typography.body, marginBottom: spacing.xs, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>
            <b>{p.name}</b> <span style={{ ...typography.caption, color: '#888' }}>{p.description}</span>
          </span>
          <Button size="sm" variant="primary">Install</Button>
        </div>
      ))}
    </Card>
  );
};
export default PluginMarketplace; 