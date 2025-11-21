import React, { useState } from 'react';
import { RedisSuiteButton } from 'src/design-system/components/Button/RedisSuiteButton';

const mockUser = {
  name: 'Alice Example',
  email: 'alice@coinnet.com',
  role: 'admin',
  twoFA: true,
  plugins: ['Advanced Alerting', 'Cache Visualizer'],
};

export const UserProfilePanel = () => {
  const [user, setUser] = useState(mockUser);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);

  const handleSave = () => {
    setUser({ ...user, name, email });
    setEditing(false);
  };

  return (
    <div style={{ background: '#23272F', borderRadius: 16, padding: 24, marginTop: 32, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>User Profile</h2>
      {editing ? (
        <div style={{ marginBottom: 16 }}>
          <input style={{ width: '100%', marginBottom: 8, padding: 8, borderRadius: 8, background: '#18181b', color: '#00FFA3' }} value={name} onChange={e => setName(e.target.value)} />
          <input style={{ width: '100%', marginBottom: 8, padding: 8, borderRadius: 8, background: '#18181b', color: '#00FFA3' }} value={email} onChange={e => setEmail(e.target.value)} />
          <RedisSuiteButton style={{ fontSize: 12, padding: '4px 12px', marginRight: 8 }} onClick={handleSave}>Save</RedisSuiteButton>
          <RedisSuiteButton style={{ fontSize: 12, padding: '4px 12px' }} onClick={() => setEditing(false)}>Cancel</RedisSuiteButton>
        </div>
      ) : (
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: '#00FFA3', fontWeight: 600, fontSize: 18 }}>{user.name}</div>
          <div style={{ color: '#fff', fontSize: 14 }}>{user.email}</div>
          <div style={{ color: '#FFD60A', fontSize: 13 }}>Role: {user.role}</div>
          <div style={{ color: user.twoFA ? '#30D158' : '#FF453A', fontSize: 13 }}>2FA: {user.twoFA ? 'Enabled' : 'Disabled'}</div>
          <div style={{ color: '#00FFA3', fontSize: 13, marginTop: 8 }}>Plugins: {user.plugins.join(', ')}</div>
          <RedisSuiteButton style={{ fontSize: 12, padding: '4px 12px', marginTop: 8 }} onClick={() => setEditing(true)}>Edit</RedisSuiteButton>
        </div>
      )}
    </div>
  );
}; 