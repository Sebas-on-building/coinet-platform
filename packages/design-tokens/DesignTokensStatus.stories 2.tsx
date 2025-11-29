import { DesignTokensStatus } from './DesignTokensStatus';
import { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: 'Design-tokens/DesignTokens/DesignTokensStatus',
  component: DesignTokensStatus,
  tags: ['autodocs'],
} satisfies Meta<typeof DesignTokensStatus>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Active: Story = {
  args: {
    status: "active",
  },
};

export const Inactive: Story = {
  args: {
    status: "inactive",
  },
};
