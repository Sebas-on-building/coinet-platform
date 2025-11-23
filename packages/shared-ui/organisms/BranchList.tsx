import React from 'react';
import { BranchListItem } from '../molecules/BranchListItem';

interface Branch {
  id: string;
  name: string;
  status: 'active' | 'merged' | 'stale' | 'protected';
}

interface BranchListProps {
  branches: Branch[];
  onAction: (action: string, branch: Branch) => void;
}

export const BranchList: React.FC<BranchListProps> = ({ branches, onAction }) => (
  <div>
    {branches.map((branch: Branch) => (
      <BranchListItem key={branch.id} branch={branch} onAction={onAction} />
    ))}
  </div>
); 