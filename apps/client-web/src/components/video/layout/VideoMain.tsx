import React from 'react';
import { useTheme } from '../../../../packages/shared-ui/themes/useTheme';
import VideoPlayer from '../player/VideoPlayer';
import VideoOverview from '../overview/VideoOverview';
import VideoAnalytics from '../analytics/VideoAnalytics';
import VideoAI from '../ai/VideoAI';
import VideoCollab from '../collab/VideoCollab';
import VideoNotifications from '../notifications/VideoNotifications';
import VideoPluginPanel from '../plugins/VideoPluginPanel';
// New in-depth sub-features
import ChapterReorder from '../chapters/ChapterReorder';
import ResourceAdd from '../resources/ResourceAdd';
import LiveChat from '../collab/LiveChat';
import RealTimeViewers from '../analytics/RealTimeViewers';
import AISmartChapters from '../ai/AISmartChapters';
import PluginMarketplace from '../plugins/PluginMarketplace';
import LiveReactions from '../overlays/LiveReactions';
import SubtitlesPanel from '../accessibility/SubtitlesPanel';
import TrimTool from '../editor/TrimTool';
import AutoTranscribe from '../automation/AutoTranscribe';

const mockVideo = {
  id: 'btc-101',
  streamUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
  thumbnail: 'https://placehold.co/600x400/png',
};

const VideoMain = () => {
  const { spacing } = useTheme();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
      <VideoPlayer video={mockVideo} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: spacing.lg }}>
        <VideoOverview />
        <VideoAnalytics />
        <VideoAI />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: spacing.lg }}>
        <VideoCollab />
        <VideoNotifications />
        <VideoPluginPanel />
      </div>
      {/* New in-depth sub-features row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: spacing.lg }}>
        <ChapterReorder />
        <ResourceAdd />
        <LiveChat />
        <RealTimeViewers />
        <AISmartChapters />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: spacing.lg }}>
        <PluginMarketplace />
        <LiveReactions />
        <SubtitlesPanel />
        <TrimTool />
        <AutoTranscribe />
      </div>
    </div>
  );
};
export default VideoMain; 