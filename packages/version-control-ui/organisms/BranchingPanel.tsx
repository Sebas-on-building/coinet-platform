import React, { useState } from 'react';
import { BranchList } from '../molecules/BranchList';
import { BranchCreateForm } from '../molecules/BranchCreateForm';
import { BranchGraph } from '../molecules/BranchGraph';
import { BranchInsightsPanel } from '../molecules/BranchInsightsPanel';
import { BranchPermissionsPanel } from '../molecules/BranchPermissionsPanel';
import { BranchTemplatesPanel } from '../molecules/BranchTemplatesPanel';
import { BranchAutomationPanel } from '../molecules/BranchAutomationPanel';
import { BranchHistoryPanel } from '../molecules/BranchHistoryPanel';
import { BranchCollabPanel } from '../molecules/BranchCollabPanel';
import { BranchAIAssistantPanel } from '../molecules/BranchAIAssistantPanel';

const initialBranches = [
  { name: 'main', status: 'active' },
  { name: 'develop', status: 'active' },
  { name: 'feature/awesome-ui', status: 'merged' },
  { name: 'hotfix/urgent', status: 'protected' },
];

export function BranchingPanel() {
  const [branches, setBranches] = useState(initialBranches);
  const [insights] = useState({ lastCommit: 'a1b2c3d', contributors: 3, ciStatus: 'passing' });
  const [permissions, setPermissions] = useState({ protected: true, requireReview: true });
  const [templates] = useState([
    { label: 'Feature', value: 'feature/' },
    { label: 'Hotfix', value: 'hotfix/' },
    { label: 'Release', value: 'release/' },
  ]);
  const [automation, setAutomation] = useState({ autoDeleteMerged: true, autoProtect: false });
  const [history] = useState([
    { date: '2024-06-01', action: 'Created branch main' },
    { date: '2024-06-02', action: 'Merged feature/awesome-ui' },
  ]);
  const [comments, setComments] = useState([
    { user: 'Alice', text: 'Great work!' },
    { user: 'Bob', text: 'Needs review.' },
  ]);
  const [aiSuggestion, setAISuggestion] = useState('No issues detected. Ready to merge.');
  const [selectedBranch, setSelectedBranch] = useState(branches[0]?.name || 'main');

  function handleCreate(name) {
    setBranches([...branches, { name, status: 'active' }]);
  }
  function handleDelete(branch) {
    setBranches(branches.filter(b => b.name !== branch.name));
  }
  function handleRename(branch) {
    const newName = prompt('Rename branch', branch.name);
    if (newName && newName !== branch.name) {
      setBranches(branches.map(b => b.name === branch.name ? { ...b, name: newName } : b));
    }
  }
  function handleSelect(branch) {
    setSelectedBranch(branch.name);
    alert(`Selected branch: ${branch.name}`);
  }
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1">
          <BranchCreateForm onCreate={handleCreate} />
          <div className="mt-4">
            <BranchList
              branches={branches}
              onSelect={handleSelect}
              onDelete={handleDelete}
              onRename={handleRename}
            />
          </div>
        </div>
        <div className="flex-1">
          <BranchGraph branches={branches} />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <BranchInsightsPanel branch={selectedBranch} />
        <BranchPermissionsPanel branch={selectedBranch} />
        <BranchTemplatesPanel onSelect={v => alert('Selected template: ' + v)} />
        <BranchAutomationPanel branch={selectedBranch} />
        <BranchHistoryPanel branch={selectedBranch} />
        <BranchCollabPanel branch={selectedBranch} />
        <BranchAIAssistantPanel branch={selectedBranch} />
        <div className="rounded-xl bg-[rgba(30,34,90,0.85)] p-4 shadow-inner text-blue-200">Accessibility, Theming, API, Tests</div>
      </div>
    </div>
  );
} 