// Atomic CQRS command types for User Experience Context

export interface PersonalizeUser {
  type: 'PersonalizeUser';
  userId: string;
  personalizationDetails: any;
}

export interface UpdatePreference {
  type: 'UpdatePreference';
  userId: string;
  preferenceKey: string;
  newValue: any;
}

export interface CompleteOnboarding {
  type: 'CompleteOnboarding';
  userId: string;
  onboardingStep: string;
}

export interface RecordInteractionPattern {
  type: 'RecordInteractionPattern';
  userId: string;
  patternType: string;
  details: any;
} 