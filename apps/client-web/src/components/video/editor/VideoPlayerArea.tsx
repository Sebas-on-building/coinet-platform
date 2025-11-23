import React from 'react';
import { VideoAIOverlay } from './VideoAIOverlay';
// import { Button } from '../../../../../packages/shared-ui/atoms/Button'; // For future use

interface VideoPlayerAreaProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  aiOverlay: boolean;
}

export const VideoPlayerArea: React.FC<VideoPlayerAreaProps> = ({ videoRef, aiOverlay }) => (
  <div style={{
    flex: 1, position: 'relative', background: '#000', borderRadius: 24, margin: 24,
    boxShadow: '0 8px 32px rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center'
  }}>
    <video ref={videoRef} controls style={{ width: '100%', borderRadius: 24, maxHeight: 600 }} />
    {aiOverlay && <VideoAIOverlay videoRef={videoRef} />}
  </div>
); 