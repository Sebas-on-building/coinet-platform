import React from 'react';
import { Card } from '../../../../../../src/components/ui/Card/Card';
import { Button } from '../../../../../../src/components/ui/Button/Button';
import { useTheme } from '../../../../../../packages/shared-ui/themes/useTheme';

const subtitles = [
  { id: 1, lang: 'English', status: 'Auto-generated' },
  { id: 2, lang: 'German', status: 'Uploaded' },
];

const SubtitlesPanel = () => {
  const { spacing, radii, shadows, typography } = useTheme();
  return (
    <Card style={{ borderRadius: radii.md, boxShadow: shadows.sm, padding: spacing.md, minWidth: 220 }}>
      <div style={{ ...typography.h4, marginBottom: spacing.sm }}>Subtitles</div>
      {subtitles.map(s => (
        <div key={s.id} style={{ ...typography.body, marginBottom: spacing.xs, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{s.lang} <span style={{ ...typography.caption, color: '#888' }}>({s.status})</span></span>
          <Button size="sm" variant="secondary">Edit</Button>
        </div>
      ))}
      <Button variant="primary" size="sm" style={{ marginTop: spacing.sm }}>Add Subtitle</Button>
    </Card>
  );
};
export default SubtitlesPanel; 