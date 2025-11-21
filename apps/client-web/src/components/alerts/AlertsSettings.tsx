import React, { useState } from 'react';
import { Input } from '../../atoms/Input';
import { Switch } from '../../atoms/Switch';
import { Button } from '../../atoms/Button';
import { useTheme } from '../../../../packages/shared-ui/themes/useTheme';

const AlertsSettings = () => {
  const { colors, spacing, radii, typography, shadows } = useTheme();
  const [form, setForm] = useState({ email: '', push: true, sound: false });
  return (
    <form style={{ background: colors.surface, borderRadius: radii.lg, boxShadow: shadows.md, padding: spacing.lg, minWidth: 320, display: 'flex', flexDirection: 'column', gap: spacing.md }}>
      <div style={{ ...typography.h3, color: colors.primary }}>Alert Settings</div>
      <label style={{ ...typography.body }}>
        Email
        <Input value={form.email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, email: e.target.value }))} placeholder="your@email.com" style={{ marginLeft: spacing.sm }} />
      </label>
      <label style={{ ...typography.body, display: 'flex', alignItems: 'center', gap: spacing.sm }}>
        Push Notifications
        <Switch checked={form.push} onChange={(v: boolean) => setForm(f => ({ ...f, push: v }))} />
      </label>
      <label style={{ ...typography.body, display: 'flex', alignItems: 'center', gap: spacing.sm }}>
        Sound
        <Switch checked={form.sound} onChange={(v: boolean) => setForm(f => ({ ...f, sound: v }))} />
      </label>
      <Button type="submit" variant="primary">Save Settings</Button>
    </form>
  );
};

export default AlertsSettings; 