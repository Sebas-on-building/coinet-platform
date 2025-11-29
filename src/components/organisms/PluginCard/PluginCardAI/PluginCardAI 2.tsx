import React, { useState } from 'react';
import styles from './PluginCardAI.module.css';

const PluginCardAI: React.FC<{ plugin: any }> = ({ plugin }) => {
  const [aiResponse, setAIResponse] = useState<string | null>(null);
  // Mock AI features
  const aiFeatures = plugin.aiFeatures || [
    'AI-powered trading signals',
    'Explainable AI risk analysis',
    'Natural language plugin Q&A',
  ];
  const askAI = () => {
    setAIResponse('This plugin uses advanced AI to optimize trading strategies and explain its decisions in plain English.');
  };
  return (
    <div className={styles.root}>
      <div className={styles.features}>
        {aiFeatures.map((f, i) => (
          <span key={i} className={styles.feature}>{f}</span>
        ))}
      </div>
      <button className={styles.askAI} onClick={askAI} aria-label="Ask AI about this plugin">Ask AI</button>
      {aiResponse && <div className={styles.aiResponse}>{aiResponse}</div>}
    </div>
  );
};

export default PluginCardAI; 