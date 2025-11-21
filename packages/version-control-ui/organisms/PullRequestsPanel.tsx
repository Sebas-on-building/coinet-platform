import React, { useState, useEffect } from 'react';
import { PRList } from '../molecules/PRList';
// import { PRCreateForm } from '../molecules/PRCreateForm';
// import { PRDiffViewer } from '../molecules/PRDiffViewer';
// import { PRChecksPanel } from '../molecules/PRChecksPanel';
// import { PRReviewPanel } from '../molecules/PRReviewPanel';
// import { PRMergePanel } from '../molecules/PRMergePanel';
// import { PRAIAssistantPanel } from '../molecules/PRAIAssistantPanel';

export function PullRequestsPanel() {
  const [prs, setPRs] = useState([]);
  const [selectedPR, setSelectedPR] = useState(null);

  useEffect(() => {
    fetch('/api/pull-requests').then(res => res.json()).then(setPRs);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {/* <PRCreateForm onCreate={pr => {}} /> */}
      <PRList prs={prs} onSelect={setSelectedPR} />
      {selectedPR && (
        <>
          {/* <PRDiffViewer pr={selectedPR} />
          <PRChecksPanel pr={selectedPR} />
          <PRReviewPanel pr={selectedPR} />
          <PRMergePanel pr={selectedPR} />
          <PRAIAssistantPanel pr={selectedPR} /> */}
          <div>PR Details and Sub-Features Coming Soon...</div>
        </>
      )}
    </div>
  );
} 