import React from 'react';
import { TokenExport } from './TokenExport';

export default {
  title: 'Widgets/TokenExport',
  component: TokenExport,
  argTypes: {
    tokens: { control: 'object' },
  },
};

const Template = (args: any) => <TokenExport {...args} />;

export const Default = Template.bind({});
Default.args = {
  tokens: {
    colors: { primary: '#0057FF', error: '#EF4444' },
    spacing: { md: 16 },
  },
}; 