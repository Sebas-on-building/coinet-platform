import React from 'react';
import { useOthers, useSelf } from '@liveblocks/react';
import styles from './design.module.css';

export const LivePresenceCursors: React.FC = () => {
  const others = useOthers();
  const self = useSelf();

  return (
    <div className={styles['live-cursors-bar']} aria-label="Live AI Presence">
      {[self, ...others].map((user, i) => {
        if (!user) return null;
        const info = user.info || {};
        return (
          <div
            key={user.connectionId || i}
            className={styles['live-cursor-avatar']}
            style={{ background: info.color || '#00ffe7', boxShadow: info.color ? `0 0 0 3px ${info.color}44` : undefined }}
            aria-label={info.name || 'User'}
          >
            {info.avatarUrl ? (
              <img src={info.avatarUrl} alt={info.name} />
            ) : (
              <span>{(info.name || '?')[0]}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}; 