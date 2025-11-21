import React from 'react';
import { MoleculesStatus } from './MoleculesStatus';

export default {
  title: 'Shared-ui/Molecules/MoleculesStatus',
  component: MoleculesStatus,
};

export const Active = () => <MoleculesStatus status="active" />;
export const Inactive = () => <MoleculesStatus status="inactive" />;
