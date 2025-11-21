import React from 'react';
import { AtomsStatus } from './AtomsStatus';

export default {
  title: 'Client-web/Atoms/AtomsStatus',
  component: AtomsStatus,
};

export const Active = () => <AtomsStatus status="active" />;
export const Inactive = () => <AtomsStatus status="inactive" />;
