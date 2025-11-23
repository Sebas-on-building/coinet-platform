import React, { useEffect, useState } from 'react';
export function BranchCollabPanel({ branch }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  useEffect(() => {
    fetch(`/api/branches/collab?branch=${branch}`)
      .then(res => res.json())
      .then(setComments);
  }, [branch]);
  function addComment() {
    if (!text) return;
    fetch(`/api/branches/collab?branch=${branch}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: 'You', text }),
    })
      .then(res => res.json())
      .then(c => setComments([...comments, c]));
    setText('');
  }
  return (
    <div className="rounded-xl bg-[rgba(30,34,90,0.85)] p-4 shadow-inner text-blue-200 flex flex-col gap-2">
      <div className="font-bold text-lg mb-2">Branch Collaboration</div>
      <ul className="mb-2">
        {comments.map((c, i) => (
          <li key={i} className="mb-1">
            <span className="font-bold">{c.user}:</span> {c.text}
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input
          className="flex-1 px-2 py-1 rounded bg-blue-900/30 text-white"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Add a comment..."
        />
        <button
          className="px-3 py-1 rounded bg-blue-500 text-white font-semibold"
          onClick={addComment}
        >
          Send
        </button>
      </div>
    </div>
  );
} 