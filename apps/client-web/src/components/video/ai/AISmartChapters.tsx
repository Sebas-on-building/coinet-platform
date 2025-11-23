import React from 'react';
import { Card } from '../../../../../../src/components/ui/Card/Card';
import { useTheme } from '../../../../../../packages/shared-ui/themes/useTheme';

const aiChapters = [
  { id: 1, title: 'Intro to BTC', time: '00:00' },
  { id: 2, title: 'Market Analysis', time: '02:10' },
  { id: 3, title: 'Strategy Deep Dive', time: '10:45' },
];

const AISmartChapters = () => {
  const { spacing, radii, shadows, typography } = useTheme();
  return (
    <Card style={{ borderRadius: radii.md, boxShadow: shadows.sm, padding: spacing.md, minWidth: 220 }}>
      <div style={{ ...typography.h4, marginBottom: spacing.sm }}>AI Smart Chapters</div>
      {aiChapters.map(c => (
        <div key={c.id} style={{ ...typography.body, marginBottom: spacing.xs }}>{c.time} — {c.title}</div>
      ))}
    </Card>
  );
};
export default AISmartChapters; 