import React from 'react';
import { BranchList } from './BranchList';
import { BranchCreateForm } from '../molecules/BranchCreateForm';
// import { BranchGraph } from '../molecules/BranchGraph';

interface Branch {
  id: string;
  name: string;
  status: 'active' | 'merged' | 'stale' | 'protected';
}

interface BranchingPanelProps {
  branches: Branch[];
  onAction: (action: string, branch: Branch) => void;
  onCreate: (name: string) => void;
}

export const BranchingPanel: React.FC<BranchingPanelProps> = ({ branches, onAction, onCreate }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
    <div>
      <h2 className="text-xl font-bold mb-4">Branches</h2>
      <BranchCreateForm onCreate={onCreate} />
      <BranchList branches={branches} onAction={onAction} />
    </div>
    <div>
      <h2 className="text-xl font-bold mb-4">Branch Graph</h2>
      {/* <BranchGraph branches={branches} /> */}
    </div>
  </div>
); 