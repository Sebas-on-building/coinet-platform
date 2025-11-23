import React from 'react';
import { OnboardingStatus } from './OnboardingStatus';

export default {
  title: 'User-experience/Onboarding/OnboardingStatus',
  component: OnboardingStatus,
};

export const Active = () => <OnboardingStatus status="active" />;
export const Inactive = () => <OnboardingStatus status="inactive" />;
