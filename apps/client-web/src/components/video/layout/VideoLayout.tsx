import React from 'react';
import { useTheme } from '../../../../packages/shared-ui/themes/useTheme';
import VideoSidebar from '../layout/VideoSidebar';
import VideoMain from '../layout/VideoMain';

const VideoLayout = ({ children }: { children?: React.ReactNode }) => {
  const { colors, spacing } = useTheme();
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '260px 1fr 340px',
      gap: spacing.lg,
      background: `linear-gradient(120deg, ${colors.surface} 60%, ${colors.primary}10 100%)`,
      minHeight: '100vh',
      padding: spacing.xl,
      transition: 'all 0.3s cubic-bezier(.4,2,.6,1)',
    }}>
      <VideoSidebar />
      <VideoMain />
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
        {children}
      </div>
    </div>
  );
};
export default VideoLayout; 