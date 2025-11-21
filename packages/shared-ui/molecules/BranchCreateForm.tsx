import React, { useState } from 'react';
import { BranchActionButton } from '../atoms/BranchActionButton';

export const BranchCreateForm = ({ onCreate }: { onCreate: (name: string) => void }) => {
  const [name, setName] = useState('');
  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        if (name) onCreate(name);
      }}
      className="flex gap-2"
    >
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="New branch name"
        className="border rounded px-2 py-1"
      />
      <BranchActionButton action="create" onClick={() => onCreate(name)} disabled={!name} />
    </form>
  );
}; 