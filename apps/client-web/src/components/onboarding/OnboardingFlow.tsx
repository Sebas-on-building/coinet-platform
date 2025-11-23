import React, { useEffect, useState } from 'react';
import { Card } from '../design-system/Card';
import { Button } from '../design-system/Button';
import { ProgressBar } from './ProgressBar';
import { Confetti } from '../ui/Confetti';
import { BadgeList } from '../badges/BadgeList';

const steps = [
  { key: 'welcome', label: 'Welcome to Coinet!' },
  { key: 'profile', label: 'Complete your profile' },
  { key: 'security', label: 'Set up 2FA' },
  { key: 'explore', label: 'Explore the dashboard' }
];

export function OnboardingFlow({ userId }) {
  const [progress, setProgress] = useState({});
  const [current, setCurrent] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    // Fetch onboarding progress and badges from backend
    // setProgress(...)
  }, []);

  const handleComplete = async () => {
    // Mark step complete in backend, award badge if last step
    if (current === steps.length - 1) setShowConfetti(true);
    setCurrent(c => c + 1);
    // Optionally call /badges/award if last step
  };

  return (
    <Card>
      <ProgressBar percent={((current + 1) / steps.length) * 100} />
      <h2>{steps[current].label}</h2>
      {/* Render step-specific UI here */}
      <Button onClick={handleComplete}>Continue</Button>
      <BadgeList userId={userId} />
      {showConfetti && <Confetti />}
    </Card>
  );
} 