import React from 'react';
import { BranchStatusBadge } from '../atoms/BranchStatusBadge';
// import other atoms as needed

interface Branch {
  id: string;
  name: string;
  status: 'active' | 'merged' | 'stale' | 'protected';
  // owner?: any;
}

interface BranchListItemProps {
  branch: Branch;
  onAction: (action: string, branch: Branch) => void;
}

export const BranchListItem: React.FC<BranchListItemProps> = ({ branch, onAction }) => (
  <div className="flex items-center justify-between py-2 px-4 hover:bg-gray-50 rounded-lg transition">
    <div className="flex items-center gap-3">
      {/* <BranchAvatar user={branch.owner} /> */}
      <span className="font-medium">{branch.name}</span>
      <BranchStatusBadge status={branch.status} />
    </div>
    <div className="flex gap-2">
      {/* <BranchActionButton action="merge" onClick={() => onAction('merge', branch)} /> */}
      {/* <BranchActionButton action="delete" onClick={() => onAction('delete', branch)} /> */}
      {/* <BranchActionButton action="protect" onClick={() => onAction('protect', branch)} /> */}
      {/* ...more actions */}
    </div>
  </div>
); 