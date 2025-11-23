import React from 'react';
import { Button } from 'packages/shared-ui/atoms/Button';

interface VideoToolbarProps {
  aiOverlay: boolean;
  setAIOverlay: React.Dispatch<React.SetStateAction<boolean>>;
  onExport: () => void;
}

export const VideoToolbar: React.FC<VideoToolbarProps> = ({ aiOverlay, setAIOverlay, onExport }) => (
  <div style={{
    display: 'flex', alignItems: 'center', padding: 16, background: '#fff',
    borderBottom: '1px solid #E5E5EA', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
  }}>
    <Button onClick={() => setAIOverlay(!aiOverlay)}>
      {aiOverlay ? 'Hide AI Overlay' : 'Show AI Overlay'}
    </Button>
    <Button variant="secondary" style={{ marginLeft: 16 }} onClick={onExport}>
      Export
    </Button>
    {/* Add more toolbar actions here */}
  </div>
); 