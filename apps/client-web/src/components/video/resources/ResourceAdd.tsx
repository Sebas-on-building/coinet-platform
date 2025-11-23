import React, { useState } from 'react';
import { Card } from '../../../../../../src/components/ui/Card/Card';
import { Input } from '../../../../../../src/components/ui/Input/Input';
import { Button } from '../../../../../../src/components/ui/Button/Button';
import { useTheme } from '../../../../../../packages/shared-ui/themes/useTheme';

const ResourceAdd = () => {
  const { spacing, radii, shadows, typography } = useTheme();
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  return (
    <Card style={{ borderRadius: radii.md, boxShadow: shadows.sm, padding: spacing.md, minWidth: 220 }}>
      <div style={{ ...typography.h4, marginBottom: spacing.sm }}>Add Resource</div>
      <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="Label" style={{ marginBottom: spacing.xs }} />
      <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="URL" style={{ marginBottom: spacing.sm }} />
      <Button variant="primary" disabled={!label || !url}>Add</Button>
    </Card>
  );
};
export default ResourceAdd; 