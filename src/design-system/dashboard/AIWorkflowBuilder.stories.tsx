import React from 'react';
import { Card } from '../components/Card';

export default {
  title: 'Dashboard/AIWorkflowBuilder',
  parameters: {
    docs: {
      description: {
        component: 'A drag-and-drop node-based workflow builder for AI trading/analytics automations, inspired by Canva and Apple.',
      },
    },
  },
};

// Placeholder for a node-based workflow editor
const mockNodes = [
  { id: 1, label: 'Market Data', x: 80, y: 120 },
  { id: 2, label: 'AI Signal', x: 320, y: 120 },
  { id: 3, label: 'Trade Action', x: 560, y: 120 },
];

export const AIWorkflowBuilder = () => (
  <div style={{ padding: 32, background: 'linear-gradient(120deg, #f8fafc 0%, #e0e7ff 100%)', minHeight: '100vh' }}>
    <Card>
      <h3>AI Workflow Builder</h3>
      <svg width={700} height={300} style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 12px 0 rgba(0,0,0,0.10)' }}>
        {/* Edges */}
        <line x1={120} y1={140} x2={360} y2={140} stroke="#00ffa3" strokeWidth={3} markerEnd="url(#arrow)" />
        <line x1={360} y1={140} x2={600} y2={140} stroke="#0057ff" strokeWidth={3} markerEnd="url(#arrow)" />
        {/* Nodes */}
        {mockNodes.map(node => (
          <g key={node.id}>
            <rect x={node.x} y={node.y} width={120} height={48} rx={16} fill="#f1f5f9" stroke="#e0e7ff" strokeWidth={2} />
            <text x={node.x + 60} y={node.y + 28} textAnchor="middle" fontSize={18} fill="#18192b" fontWeight={700}>{node.label}</text>
          </g>
        ))}
        <defs>
          <marker id="arrow" markerWidth="12" markerHeight="12" refX="6" refY="6" orient="auto" markerUnits="strokeWidth">
            <path d="M2,2 L10,6 L2,10 L6,6 L2,2" fill="#00ffa3" />
          </marker>
        </defs>
      </svg>
    </Card>
  </div>
);
