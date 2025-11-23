import React from 'react';
export function PRList({ prs, onSelect }) {
  return (
    <ul>
      {prs.map(pr => (
        <li key={pr.id}>
          <button onClick={() => onSelect(pr)}>{pr.title}</button>
        </li>
      ))}
    </ul>
  );
} 