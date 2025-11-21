// Atomic event types for User Experience Context

export interface UserPersonalized {
  type: 'UserPersonalized';
  userId: string;
  personalizationDetails: any;
  timestamp: string;
}

export interface PreferenceUpdated {
  type: 'PreferenceUpdated';
  userId: string;
  preferenceKey: string;
  newValue: any;
  timestamp: string;
}

export interface OnboardingCompleted {
  type: 'OnboardingCompleted';
  userId: string;
  onboardingStep: string;
  timestamp: string;
}

export interface InteractionPatternRecorded {
  type: 'InteractionPatternRecorded';
  userId: string;
  patternType: string;
  details: any;
  timestamp: string;
} 