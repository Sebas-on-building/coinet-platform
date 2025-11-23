import React from 'react';
import VideoLayout from './layout/VideoLayout';
import VideoNotifications from './notifications/VideoNotifications';
import VideoPluginPanel from './plugins/VideoPluginPanel';

const VideoPage = () => {
  return (
    <VideoLayout>
      <VideoNotifications />
      <VideoPluginPanel />
      {/* Add more right-panel features here for infinite expansion */}
    </VideoLayout>
  );
};
export default VideoPage; 