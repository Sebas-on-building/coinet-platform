import React, { useState } from 'react';
import { Card } from '../../ui/Card';
import { Button } from '../../atoms/Button';
import { Input } from '../../atoms/Input';
import { useTheme } from '../../../../packages/shared-ui/themes/useTheme';

const StrategyEditor = () => {
  const { colors, spacing, radii, typography, shadows } = useTheme();
  const [params, setParams] = useState({ risk: 'Medium', capital: 1000 });
  return (
    <Card style={{ borderRadius: radii.lg, boxShadow: shadows.md, padding: spacing.lg, minWidth: 400 }}>
      <div style={{ ...typography.h3, marginBottom: spacing.md }}>Strategy Editor</div>
      <div style={{ marginBottom: spacing.md }}>
        <textarea style={{ width: '100%', minHeight: 120, borderRadius: radii.md, border: `1px solid ${colors.border}`, padding: spacing.sm, fontFamily: 'monospace', fontSize: 14 }} placeholder="// Write your strategy code here..." />
      </div>
      <div style={{ display: 'flex', gap: spacing.md, marginBottom: spacing.md }}>
        <Input value={params.risk} onChange={e => setParams(p => ({ ...p, risk: e.target.value }))} placeholder="Risk" />
        <Input value={params.capital} onChange={e => setParams(p => ({ ...p, capital: e.target.value }))} placeholder="Capital" type="number" />
      </div>
      <div style={{ display: 'flex', gap: spacing.md }}>
        <Button variant="primary">Save</Button>
        <Button variant="secondary">Run</Button>
      </div>
    </Card>
  );
};
export default StrategyEditor; 