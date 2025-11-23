import React from 'react';
import { Card } from '../../../../../../src/components/ui/Card/Card';
import { useTheme } from '../../../../packages/shared-ui/themes/useTheme';

const notifications = [
  { id: 1, message: 'New comment on your video.' },
  { id: 2, message: 'Your video was featured!' },
];

const VideoNotifications = () => {
  const { colors, spacing, radii, typography, shadows } = useTheme();
  return (
    <Card style={{ borderRadius: radii.lg, boxShadow: shadows.md, padding: spacing.lg, minWidth: 320 }}>
      <div style={{ ...typography.h3, marginBottom: spacing.md }}>Notifications</div>
      {notifications.map(n => (
        <div key={n.id} style={{ ...typography.body, marginBottom: spacing.xs }}>{n.message}</div>
      ))}
    </Card>
  );
};
export default VideoNotifications; 