import React, { useState } from 'react';
export function BranchAIAssistantPanel({ branch }) {
  const [suggestion, setSuggestion] = useState('No issues detected. Ready to merge.');
  const [question, setQuestion] = useState('');
  function askAI() {
    fetch('/api/branches/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ branch, question }),
    })
      .then(res => res.json())
      .then(data => setSuggestion(data.suggestion));
    setQuestion('');
  }
  return (
    <div className="rounded-xl bg-gradient-to-br from-blue-800 to-purple-900 p-4 shadow-inner text-blue-100 flex flex-col gap-2">
      <div className="font-bold text-lg mb-2">AI Assistant</div>
      <div className="mb-2">{suggestion}</div>
      <div className="flex gap-2">
        <input
          className="flex-1 px-2 py-1 rounded bg-blue-900/30 text-white"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder="Ask AI about this branch..."
        />
        <button
          className="px-3 py-1 rounded bg-purple-500 text-white font-semibold"
          onClick={askAI}
        >
          Ask
        </button>
      </div>
    </div>
  );
} 