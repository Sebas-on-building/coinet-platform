import React from 'react';
import { TokenContrastCheckDetailsContrast } from './TokenContrastCheckDetailsContrast';

export default {
  title: 'Widgets/TokenContrastCheckDetailsContrast',
  component: TokenContrastCheckDetailsContrast,
  argTypes: {
    contrast: { control: 'number' },
  },
};

const Template = (args: any) => <TokenContrastCheckDetailsContrast {...args} />;

export const Default = Template.bind({});
Default.args = {
  contrast: 4.5,
}; 