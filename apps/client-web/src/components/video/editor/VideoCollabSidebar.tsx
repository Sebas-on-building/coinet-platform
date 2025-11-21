import React from 'react';

export const VideoCollabSidebar = () => (
  <aside style={{
    width: 320,
    background: '#fff',
    borderRight: '1px solid #E5E5EA',
    display: 'flex',
    flexDirection: 'column',
    padding: 24,
    boxShadow: '2px 0 8px rgba(0,0,0,0.04)'
  }}>
    <h3 style={{ marginBottom: 16 }}>Collaboration</h3>
    <div style={{ flex: 1 }}>
      <div>User 1 (editing)</div>
      <div>User 2 (viewing)</div>
    </div>
    <input placeholder="Type a message..." style={{
      marginTop: 16,
      borderRadius: 8,
      border: '1px solid #E5E5EA',
      padding: 8
    }} />
  </aside>
); 