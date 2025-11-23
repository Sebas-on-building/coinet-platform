import React from 'react';
import { Button } from 'packages/shared-ui/atoms/Button';

interface VideoExportPanelProps {
  onClose: () => void;
  videoRef: React.RefObject<HTMLVideoElement>;
}

export const VideoExportPanel: React.FC<VideoExportPanelProps> = ({ onClose, videoRef }) => (
  <div style={{
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.3)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
  }}>
    <div style={{
      background: '#fff', borderRadius: 24, padding: 32, minWidth: 400, boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
    }}>
      <h2>Export Video</h2>
      <p>Choose format, resolution, and export your masterpiece.</p>
      {/* Export options, progress, etc. */}
      <Button onClick={onClose} style={{ marginTop: 24 }}>Close</Button>
    </div>
  </div>
); 