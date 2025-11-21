import React, { useRef, useState } from 'react';
import { Button } from 'shared-ui/atoms/Button';
import { VideoTimeline } from './VideoTimeline';
import { VideoPluginsPanel } from './VideoPluginsPanel';
import { VideoAIOverlay } from './VideoAIOverlay';
import { VideoCollabSidebar } from './VideoCollabSidebar';

export const VideoEditor = () => {
  const videoRef = useRef(null);
  const [plugins, setPlugins] = useState([]);
  const [aiOverlay, setAIOverlay] = useState(false);

  return (
    <div className="video-editor-root" style={{
      display: 'flex',
      flexDirection: 'row',
      height: '100vh',
      background: 'linear-gradient(120deg, #F9F9F9 0%, #E5E5EA 100%)'
    }}>
      <VideoCollabSidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, position: 'relative', background: '#000', borderRadius: 24, margin: 24, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
          <video ref={videoRef} controls style={{ width: '100%', borderRadius: 24 }} />
          {aiOverlay && <VideoAIOverlay videoRef={videoRef} />}
        </div>
        <VideoTimeline videoRef={videoRef} />
        <div style={{ display: 'flex', justifyContent: 'space-between', margin: 24 }}>
          <Button onClick={() => setAIOverlay(!aiOverlay)}>
            {aiOverlay ? 'Hide AI Overlay' : 'Show AI Overlay'}
          </Button>
          <VideoPluginsPanel plugins={plugins} setPlugins={setPlugins} />
        </div>
      </div>
    </div>
  );
}; 