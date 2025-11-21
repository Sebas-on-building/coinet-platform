import React from 'react';
import { TokensStatus } from './TokensStatus';

export default {
  title: 'Design-tokens/Tokens/TokensStatus',
  component: TokensStatus,
};

export const Active = () => <TokensStatus status="active" />;
export const Inactive = () => <TokensStatus status="inactive" />;
