import React from 'react';
import { TokenContrastCheckDetailsSwatch } from './TokenContrastCheckDetailsSwatch';

export default {
  title: 'Widgets/TokenContrastCheckDetailsSwatch',
  component: TokenContrastCheckDetailsSwatch,
  argTypes: {
    color: { control: 'color' },
  },
};

const Template = (args: any) => <TokenContrastCheckDetailsSwatch {...args} />;

export const Default = Template.bind({});
Default.args = {
  color: '#0057FF',
}; 