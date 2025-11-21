import { FeatureStoreStatus } from './FeatureStoreStatus';
import { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: 'Ai-analytics/FeatureStore/FeatureStoreStatus',
  component: FeatureStoreStatus,
  tags: ['autodocs'],
} satisfies Meta<typeof FeatureStoreStatus>;

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
