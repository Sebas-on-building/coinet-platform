import { SharedModelsStatus } from './SharedModelsStatus';
import { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: 'Shared-models/SharedModels/SharedModelsStatus',
  component: SharedModelsStatus,
  tags: ['autodocs'],
} satisfies Meta<typeof SharedModelsStatus>;

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
