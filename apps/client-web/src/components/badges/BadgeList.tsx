import React, { useEffect, useState } from 'react';

export function BadgeList({ userId }: { userId: string }) {
  const [badges, setBadges] = useState<any[]>([]);
  useEffect(() => {
    fetch(`/badges?userId=${userId}`)
      .then(res => res.json())
      .then(data => setBadges(data.badges));
  }, [userId]);
  return (
    <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
      {badges.map(b => (
        <div key={b.id} title={b.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img src={b.icon} alt={b.name} style={{ width: 40, height: 40 }} />
          <span style={{ fontSize: 12 }}>{b.name}</span>
        </div>
      ))}
    </div>
  );
} 