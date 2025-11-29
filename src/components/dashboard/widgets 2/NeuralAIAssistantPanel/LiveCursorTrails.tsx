import React, { useEffect, useRef } from 'react';
import { useOthers } from '@liveblocks/react';
import styles from './design.module.css';

// Each user has a cursor position and a trail of previous positions
interface CursorTrail {
  userId: string;
  color: string;
  positions: { x: number; y: number }[];
  name?: string;
  avatarUrl?: string;
}

export const LiveCursorTrails: React.FC = () => {
  const others = useOthers();
  // For demo, generate random positions for each user
  // In production, sync cursor positions via Liveblocks presence
  const trails = others.map((user, i) => {
    const info = user.info || {};
    // Generate a fake trail for demo
    const positions = Array.from({ length: 8 }, (_, j) => ({
      x: 40 + i * 40 + Math.sin(j + i) * 12,
      y: 60 + j * 8 + Math.cos(j + i) * 6,
    }));
    return {
      userId: user.connectionId || `user-${i}`,
      color: info.color || '#00ffe7',
      positions,
      name: info.name,
      avatarUrl: info.avatarUrl,
    };
  });

  return (
    <svg className={styles['live-cursor-trails']} width="100%" height="80" style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 1 }}>
      {trails.map(trail => (
        <g key={trail.userId}>
          {trail.positions.map((pos, idx) => (
            <circle
              key={idx}
              cx={pos.x}
              cy={pos.y}
              r={10 - idx}
              fill={trail.color}
              opacity={0.18 + 0.08 * (8 - idx)}
              style={{ filter: `blur(${idx}px)` }}
            />
          ))}
        </g>
      ))}
    </svg>
  );
}; 