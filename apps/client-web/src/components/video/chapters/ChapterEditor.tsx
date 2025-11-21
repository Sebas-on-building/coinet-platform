import React, { useState } from 'react';
import { Input } from '../../../../../../src/components/ui/Input/Input';
import { Button } from '../../../../../../src/components/ui/Button/Button';
import { useTheme } from '../../../../../../packages/shared-ui/themes/useTheme';

const ChapterEditor = () => {
  const { spacing } = useTheme();
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');
  return (
    <div style={{ display: 'flex', gap: spacing.xs, marginTop: spacing.sm }}>
      <Input
        value={time}
        onChange={e => setTime(e.target.value)}
        placeholder="00:00"
        style={{ width: 60 }}
        aria-label="Chapter time"
      />
      <Input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Title"
        style={{ flex: 1 }}
        aria-label="Chapter title"
      />
      <Button variant="primary" size="sm" aria-label="Add chapter" disabled={!title || !time}>
        +
      </Button>
    </div>
  );
};
export default ChapterEditor; 