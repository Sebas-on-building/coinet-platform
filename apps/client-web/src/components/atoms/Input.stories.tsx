import React from 'react';
import { Input, InputProps } from './Input';
import { Meta, StoryObj } from '@storybook/react';

const meta: Meta<InputProps> = {
  title: 'Atoms/Input',
  component: Input,
  argTypes: {
    error: { control: 'boolean' },
    helperText: { control: 'text' },
    value: { control: 'text' },
    placeholder: { control: 'text' },
    type: { control: 'text' },
  },
  parameters: {
    docs: {
      description: {
        component: 'Pixel-perfect, atomic Input inspired by Apple, Canva, TradingView, Solana. Accessible, themeable, extensible.'
      }
    },
    a11y: { element: '#root' },
    design: [
      { type: 'figma', url: 'https://www.figma.com/file/xyz/Input-Design' },
      { type: 'link', url: 'https://developer.apple.com/design/human-interface-guidelines/text-input' },
      { type: 'link', url: 'https://www.canva.com/colors/color-palettes/' },
      { type: 'link', url: 'https://www.tradingview.com/chart/' },
      { type: 'link', url: 'https://solana.com/' }
    ]
  }
};
export default meta;

type Story = StoryObj<InputProps>;

export const Default: Story = {
  args: { placeholder: 'Enter value', helperText: 'Helper text' }
};
export const Error: Story = {
  args: { placeholder: 'Error', error: true, helperText: 'Error message' }
}; 