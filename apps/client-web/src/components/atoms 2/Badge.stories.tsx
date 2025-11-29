import React from 'react';
import { Badge, BadgeProps } from './Badge';
import { Meta, StoryObj } from '@storybook/react';

const meta: Meta<BadgeProps> = {
  title: 'Atoms/Badge',
  component: Badge,
  argTypes: {
    color: { control: 'select', options: ['primary', 'success', 'warning', 'danger', 'info'] },
    children: { control: 'text' },
  },
  parameters: {
    docs: {
      description: {
        component: 'Pixel-perfect, atomic Badge inspired by Apple, Canva, TradingView, Solana. Accessible, themeable, extensible.'
      }
    },
    a11y: { element: '#root' },
    design: [
      { type: 'figma', url: 'https://www.figma.com/file/xyz/Badge-Design' },
      { type: 'link', url: 'https://developer.apple.com/design/human-interface-guidelines/labels' },
      { type: 'link', url: 'https://www.canva.com/colors/color-palettes/' },
      { type: 'link', url: 'https://www.tradingview.com/chart/' },
      { type: 'link', url: 'https://solana.com/' }
    ]
  }
};
export default meta;

type Story = StoryObj<BadgeProps>;

export const Primary: Story = {
  args: { children: 'Primary', color: 'primary' }
};
export const Success: Story = {
  args: { children: 'Success', color: 'success' }
};
export const Warning: Story = {
  args: { children: 'Warning', color: 'warning' }
};
export const Danger: Story = {
  args: { children: 'Danger', color: 'danger' }
};
export const Info: Story = {
  args: { children: 'Info', color: 'info' }
}; 