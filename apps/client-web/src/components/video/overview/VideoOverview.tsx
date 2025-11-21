import React from 'react';
import RecentVideos from './RecentVideos';
import TopPerformer from './TopPerformer';
import UploadButton from './UploadButton';
import { useTheme } from '../../../../../../packages/shared-ui/themes/useTheme';

const VideoOverview = () => {
  const { spacing } = useTheme();
  return (
    <div style={{ display: 'flex', gap: spacing.lg }}>
      <RecentVideos />
      <TopPerformer />
      <UploadButton />
    </div>
  );
};
export default VideoOverview; 