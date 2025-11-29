import React, { useState } from 'react';
import styles from './design.module.css';

const steps = [
  {
    title: 'Meet Your AI Assistant',
    desc: 'Get smart, actionable insights and automate chart actions with a single click.',
  },
  {
    title: 'Real-Time Collaboration',
    desc: 'See what your teammates are asking and doing in real time.',
  },
  {
    title: 'Personalize Your Experience',
    desc: 'Set your preferred tone, verbosity, and theme for the assistant.',
  },
  {
    title: 'Click-to-Apply Actions',
    desc: 'Apply AI suggestions to your chart instantly and see the results live.',
  },
];

export const AssistantOnboarding: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [step, setStep] = useState(0);
  return (
    <div className={styles['assistant-onboarding-overlay']}>
      <div className={styles['assistant-onboarding-modal']}>
        <h2 className={styles['assistant-onboarding-title']}>{steps[step].title}</h2>
        <p className={styles['assistant-onboarding-desc']}>{steps[step].desc}</p>
        <div className={styles['assistant-onboarding-controls']}>
          {step < steps.length - 1 ? (
            <button className={styles['assistant-onboarding-next']} onClick={() => setStep(s => s + 1)}>Next</button>
          ) : (
            <button className={styles['assistant-onboarding-finish']} onClick={onClose}>Finish</button>
          )}
        </div>
      </div>
    </div>
  );
}; 