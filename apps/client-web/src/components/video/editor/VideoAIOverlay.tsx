import React from 'react';

interface VideoAIOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement>;
}

export const VideoAIOverlay: React.FC<VideoAIOverlayProps> = ({ videoRef }) => {
  return (
    <div style={{
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      pointerEvents: 'none',
      zIndex: 10
    }}>
      <div style={{
        position: 'absolute',
        top: 32, left: 32,
        background: 'rgba(10,132,255,0.8)',
        color: '#fff',
        borderRadius: 12,
        padding: '8px 16px',
        fontWeight: 600
      }}>
        AI: Scene Analysis Active
      </div>
    </div>
  );
}; 