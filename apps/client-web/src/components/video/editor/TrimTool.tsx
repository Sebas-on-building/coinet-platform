import React, { useState } from 'react';
import { Card } from '../../../../../../src/components/ui/Card/Card';
import { Button } from '../../../../../../src/components/ui/Button/Button';
import { useTheme } from '../../../../../../packages/shared-ui/themes/useTheme';

const TrimTool = () => {
  const { spacing, radii, shadows, typography } = useTheme();
  const [start, setStart] = useState('00:00');
  const [end, setEnd] = useState('10:00');
  return (
    <Card style={{ borderRadius: radii.md, boxShadow: shadows.sm, padding: spacing.md, minWidth: 320 }}>
      <div style={{ ...typography.h4, marginBottom: spacing.sm }}>Trim Video</div>
      <div style={{ display: 'flex', gap: spacing.sm, marginBottom: spacing.sm }}>
        <input type="text" value={start} onChange={e => setStart(e.target.value)} style={{ flex: 1, borderRadius: radii.sm, padding: spacing.xs }} placeholder="Start (00:00)" />
        <input type="text" value={end} onChange={e => setEnd(e.target.value)} style={{ flex: 1, borderRadius: radii.sm, padding: spacing.xs }} placeholder="End (10:00)" />
      </div>
      <Button variant="primary">Trim</Button>
    </Card>
  );
};
export default TrimTool; 