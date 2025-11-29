import React from 'react';

interface VideoHeaderProps {
  video: any;
}

export const VideoHeader = ({ video }: VideoHeaderProps) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
    <div>
      <div style={{ fontSize: 28, fontWeight: 700 }}>{video?.title || 'Untitled Video'}</div>
      <div style={{ color: '#888', fontSize: 16 }}>{video?.author || 'Unknown Author'}</div>
    </div>
    <div>
      <button style={{ marginRight: 12, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#0A84FF', color: '#fff', fontWeight: 500, cursor: 'pointer' }}>Share</button>
      <button style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#30D158', color: '#fff', fontWeight: 500, cursor: 'pointer' }}>Favorite</button>
    </div>
  </div>
); 