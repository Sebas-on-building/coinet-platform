import { MarketIntelligenceStatus } from './MarketIntelligenceStatus';
import { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: 'Market-intelligence/MarketIntelligence/MarketIntelligenceStatus',
  component: MarketIntelligenceStatus,
  tags: ['autodocs'],
} satisfies Meta<typeof MarketIntelligenceStatus>;

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
