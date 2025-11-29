import React from 'react';

interface VideoTimelineProps {
  videoRef: React.RefObject<HTMLVideoElement>;
}

export const VideoTimeline: React.FC<VideoTimelineProps> = ({ videoRef }) => {
  return (
    <div style={{
      height: 64,
      background: '#fff',
      borderRadius: 16,
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      margin: '0 24px',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px'
    }}>
      <div style={{ flex: 1, height: 4, background: '#E5E5EA', borderRadius: 2 }} />
    </div>
  );
}; 