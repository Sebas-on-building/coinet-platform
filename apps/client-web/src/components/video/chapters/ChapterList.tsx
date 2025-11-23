import React from 'react';
import { useTheme } from '../../../../../../packages/shared-ui/themes/useTheme';
import ChapterEditor from './ChapterEditor';

const chapters = [
  { id: 1, title: 'Introduction', time: '00:00' },
  { id: 2, title: 'Main Content', time: '03:15' },
  { id: 3, title: 'Q&A', time: '18:40' },
];

const ChapterList = () => {
  const { typography, spacing } = useTheme();
  return (
    <div style={{ margin: `${spacing.lg}px 0 ${spacing.md}px` }}>
      <div style={{ ...typography.h4, marginBottom: spacing.sm }}>Chapters</div>
      {chapters.map(c => (
        <div key={c.id} style={{ ...typography.body, marginBottom: spacing.xs }}>{c.time} — {c.title}</div>
      ))}
      <ChapterEditor />
    </div>
  );
};
export default ChapterList; 