import React, { useState } from 'react';
import { Card } from '../../../../../../src/components/ui/Card/Card';
import { Button } from '../../../../../../src/components/ui/Button/Button';
import { useTheme } from '../../../../../../packages/shared-ui/themes/useTheme';

const emojis = ['👍', '🔥', '😂', '🚀', '💡'];

const LiveReactions = () => {
  const { spacing, radii, shadows, typography } = useTheme();
  const [reactions, setReactions] = useState<{ emoji: string, count: number }[]>(emojis.map(e => ({ emoji: e, count: 0 })));
  const handleReact = (emoji: string) => {
    setReactions(reactions.map(r => r.emoji === emoji ? { ...r, count: r.count + 1 } : r));
  };
  return (
    <Card style={{ borderRadius: radii.md, boxShadow: shadows.sm, padding: spacing.md, minWidth: 220, background: '#fffbe7' }}>
      <div style={{ ...typography.h4, marginBottom: spacing.sm }}>Live Reactions</div>
      <div style={{ display: 'flex', gap: spacing.sm }}>
        {reactions.map(r => (
          <Button key={r.emoji} size="sm" variant="ghost" onClick={() => handleReact(r.emoji)}>
            {r.emoji} <span style={{ fontWeight: 700 }}>{r.count}</span>
          </Button>
        ))}
      </div>
    </Card>
  );
};
export default LiveReactions; 