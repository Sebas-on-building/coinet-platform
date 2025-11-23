import React from 'react';
import { TokenContrastCheckDetailsWCAG } from './TokenContrastCheckDetailsWCAG';

export default {
  title: 'Widgets/TokenContrastCheckDetailsWCAG',
  component: TokenContrastCheckDetailsWCAG,
  argTypes: {
    wcag: { control: 'text' },
  },
};

const Template = (args: any) => <TokenContrastCheckDetailsWCAG {...args} />;

export const Default = Template.bind({});
Default.args = {
  wcag: 'AA',
}; 