import React from 'react';
import { SrcStatus } from './SrcStatus';

export default {
  title: 'Server/Src/SrcStatus',
  component: SrcStatus,
};

export const Active = () => <SrcStatus status="active" />;
export const Inactive = () => <SrcStatus status="inactive" />;
