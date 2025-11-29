import React from 'react';
import { Card } from '../../../../../../src/components/ui/Card/Card';
import { Button } from '../../../../../../src/components/ui/Button/Button';
import { useTheme } from '../../../../../../packages/shared-ui/themes/useTheme';

const topVideo = {
  title: 'How to Trade BTC',
  description: 'Our most-watched video on BTC trading strategies.',
};

const TopPerformer = () => {
  const { spacing, radii, shadows, typography } = useTheme();
  return (
    <Card style={{ borderRadius: radii.md, boxShadow: shadows.sm, padding: spacing.md, minWidth: 180 }}>
      <div style={{ ...typography.h4, marginBottom: spacing.sm }}>Top Performer</div>
      <div style={{ ...typography.body, marginBottom: spacing.sm }}>{topVideo.title}</div>
      <div style={{ ...typography.caption, marginBottom: spacing.md }}>{topVideo.description}</div>
      <Button variant="secondary">Watch</Button>
    </Card>
  );
};
export default TopPerformer; 