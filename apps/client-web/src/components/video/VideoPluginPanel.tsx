import React from 'react';
import { Card } from '../../../../../../src/components/ui/Card/Card';
import { Button } from '../../atoms/Button';
import { useTheme } from '../../../../packages/shared-ui/themes/useTheme';

const plugins = [
  { id: 1, name: 'Subtitles', enabled: true },
  { id: 2, name: 'Auto Chapters', enabled: false },
];

const VideoPluginPanel = () => {
  const { colors, spacing, radii, typography, shadows } = useTheme();
  return (
    <Card style={{ borderRadius: radii.lg, boxShadow: shadows.md, padding: spacing.lg, minWidth: 320 }}>
      <div style={{ ...typography.h3, marginBottom: spacing.md }}>Plugins</div>
      {plugins.map(p => (
        <div key={p.id} style={{ ...typography.body, marginBottom: spacing.xs, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{p.name}</span>
          <Button variant={p.enabled ? 'primary' : 'secondary'} size="sm">{p.enabled ? 'Disable' : 'Enable'}</Button>
        </div>
      ))}
    </Card>
  );
};
export default VideoPluginPanel; 