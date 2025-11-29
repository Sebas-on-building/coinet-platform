import React from 'react';
import { TokenAudit } from './TokenAudit';

export default {
  title: 'Widgets/TokenAudit',
  component: TokenAudit,
  argTypes: {
    tokens: { control: 'object' },
  },
};

const Template = (args: any) => <TokenAudit {...args} />;

export const Default = Template.bind({});
Default.args = {
  tokens: {
    colors: { primary: '#0057FF', error: '#EF4444' },
    spacing: { md: 16 },
  },
}; 