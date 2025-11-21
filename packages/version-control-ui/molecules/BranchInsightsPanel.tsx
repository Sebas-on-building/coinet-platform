import React, { useEffect, useState } from 'react';
export function BranchInsightsPanel({ branch }) {
  const [insights, setInsights] = useState({ lastCommit: '', contributors: 0, ciStatus: '' });
  useEffect(() => {
    fetch(`/api/branches/insights?branch=${branch}`)
      .then(res => res.json())
      .then(setInsights);
  }, [branch]);
  return (
    <div className="rounded-xl bg-[rgba(30,34,90,0.85)] p-4 shadow-inner text-blue-200 flex flex-col gap-2">
      <div className="font-bold text-lg mb-2">Branch Insights</div>
      <div className="flex gap-4">
        <div>
          <div className="text-xs text-gray-400">Last Commit</div>
          <div className="font-mono">{insights.lastCommit}</div>
        </div>
        <div>
          <div className="text-xs text-gray-400">Contributors</div>
          <div className="font-mono">{insights.contributors}</div>
        </div>
        <div>
          <div className="text-xs text-gray-400">CI Status</div>
          <div className={`font-mono ${insights.ciStatus === 'passing' ? 'text-green-400' : 'text-red-400'}`}>{insights.ciStatus}</div>
        </div>
      </div>
    </div>
  );
} 