import React, { useState } from 'react';
import { Card, Button } from 'shared-ui';
import { motion } from 'framer-motion';

export const OnboardingAssistant = () => {
  const [step, setStep] = useState(0);
  const steps = [
    `Welcome to Coinet! Let's personalize your dashboard.`,
    `Connect your first exchange account.`,
    `Enable AI-powered insights.`,
    `You're ready to explore!`,
  ];
  return (
    <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
      <Card>
        <h2>Onboarding Assistant</h2>
        <p>{steps[step]}</p>
        <Button onClick={() => setStep((s) => Math.min(s + 1, steps.length - 1))}>
          {step < steps.length - 1 ? 'Next' : 'Finish'}
        </Button>
      </Card>
    </motion.div>
  );
}; 