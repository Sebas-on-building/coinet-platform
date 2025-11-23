import React from 'react';
import { OrganismsStatus } from './OrganismsStatus';

export default {
  title: 'Shared-ui/Organisms/OrganismsStatus',
  component: OrganismsStatus,
};

export const Active = () => <OrganismsStatus status="active" />;
export const Inactive = () => <OrganismsStatus status="inactive" />;
