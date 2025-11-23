import React from 'react';
import { ReviewDashboard } from '../molecules/ReviewDashboard';

export function CodeReviewPanel() {
  return (
    <div className="flex flex-col gap-6">
      <ReviewDashboard />
      {/* More sub-feature panels coming soon */}
    </div>
  );
} 