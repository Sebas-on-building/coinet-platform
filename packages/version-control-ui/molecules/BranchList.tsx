import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BranchStatusBadge } from '../atoms/BranchStatusBadge';
import { BranchActionButton } from '../atoms/BranchActionButton';

export function BranchList({ branches, onSelect, onDelete, onRename }) {
  const [search, setSearch] = useState('');
  const filtered = branches.filter(b => b.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <div>
      <input
        className="mb-3 px-3 py-2 rounded-lg bg-[rgba(30,34,90,0.85)] border border-blue-300 text-white w-full"
        placeholder="Search branches..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        aria-label="Search branches"
      />
      <motion.ul initial="hidden" animate="visible" variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.05 } }
      }}>
        {filtered.map(branch => (
          <motion.li key={branch.name} whileHover={{ scale: 1.03 }} className="flex items-center gap-3 mb-2">
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-glass hover:bg-blue-900/30 transition font-semibold text-lg text-white"
              onClick={() => onSelect(branch)}
              aria-label={`Select branch ${branch.name}`}
            >
              <BranchStatusBadge status={branch.status} />
              <span>{branch.name}</span>
            </button>
            <BranchActionButton icon="✏️" label="Rename" onClick={() => onRename(branch)} />
            <BranchActionButton icon="🗑️" label="Delete" onClick={() => onDelete(branch)} />
          </motion.li>
        ))}
      </motion.ul>
    </div>
  );
} 