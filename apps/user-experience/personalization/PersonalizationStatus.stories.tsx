import React from 'react';
import { PersonalizationStatus } from './PersonalizationStatus';

export default {
  title: 'User-experience/Personalization/PersonalizationStatus',
  component: PersonalizationStatus,
};

export const Active = () => <PersonalizationStatus status="active" />;
export const Inactive = () => <PersonalizationStatus status="inactive" />;
