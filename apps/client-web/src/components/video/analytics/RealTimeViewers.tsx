import React, { useState, useEffect } from 'react';
import { Card } from '../../../../../../src/components/ui/Card/Card';
import { useTheme } from '../../../../../../packages/shared-ui/themes/useTheme';

const RealTimeViewers = () => {
  const { spacing, radii, shadows, typography, colors } = useTheme();
  const [viewers, setViewers] = useState(42);
  useEffect(() => {
    const interval = setInterval(() => {
      setViewers(v => v + (Math.random() > 0.5 ? 1 : -1));
    }, 2000);
    return () => clearInterval(interval);
  }, []);
  return (
    <Card style={{ borderRadius: radii.md, boxShadow: shadows.sm, padding: spacing.md, minWidth: 120, background: colors.surface }}>
      <div style={{ ...typography.h4, marginBottom: spacing.sm }}>Live Viewers</div>
      <div style={{ ...typography.display, color: colors.primary, fontWeight: 700 }}>{viewers}</div>
    </Card>
  );
};
export default RealTimeViewers; 