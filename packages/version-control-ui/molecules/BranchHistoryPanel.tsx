import React, { useEffect, useState } from 'react';
export function BranchHistoryPanel({ branch }) {
  const [history, setHistory] = useState([]);
  useEffect(() => {
    fetch(`/api/branches/history?branch=${branch}`)
      .then(res => res.json())
      .then(setHistory);
  }, [branch]);
  return (
    <div className="rounded-xl bg-[rgba(30,34,90,0.85)] p-4 shadow-inner text-blue-200 flex flex-col gap-2">
      <div className="font-bold text-lg mb-2">Branch History</div>
      <ul className="text-xs">
        {history.map((event, i) => (
          <li key={i} className="mb-1">
            <span className="font-mono">{event.date}</span> — {event.action}
          </li>
        ))}
      </ul>
    </div>
  );
} 