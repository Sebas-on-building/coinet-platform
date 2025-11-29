import React, { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

export default function VideoCollab({ videoId }) {
  const { tokens } = useTheme();
  const [annotations, setAnnotations] = useState([]);
  const [input, setInput] = useState('');

  function addAnnotation() {
    setAnnotations([...annotations, { text: input, time: Date.now() }]);
    setInput('');
  }

  return (
    <div style={{ marginTop: 24 }} aria-label="Collaborative Annotations" role="region">
      <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 8 }}>Collaborative Annotations</div>
      <div>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          style={{
            padding: 8,
            borderRadius: tokens.borderRadius.sm,
            border: `1px solid ${tokens.colors.primary}`,
            marginRight: 8,
            fontSize: 16,
          }}
          placeholder="Add annotation…"
          aria-label="Add annotation"
        />
        <button
          onClick={addAnnotation}
          style={{
            background: tokens.colors.primary,
            color: '#fff',
            border: 'none',
            borderRadius: tokens.borderRadius.sm,
            padding: '8px 16px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
          aria-label="Add annotation button"
        >
          Add
        </button>
      </div>
      <ul style={{ marginTop: 16 }}>
        {annotations.map((a, i) => (
          <li key={i} style={{ marginBottom: 8, color: tokens.colors.text }}>
            <span style={{ fontWeight: 500 }}>{new Date(a.time).toLocaleTimeString()}:</span> {a.text}
          </li>
        ))}
      </ul>
    </div>
  );
} 