import React from 'react';
import { DocsStatus } from './DocsStatus';

export default {
  title: 'Docs/Docs/DocsStatus',
  component: DocsStatus,
};

export const Active = () => <DocsStatus status="active" />;
export const Inactive = () => <DocsStatus status="inactive" />;
