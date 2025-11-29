import { UserExperienceStatus } from './UserExperienceStatus';
import { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: 'Shared-models/UserExperience/UserExperienceStatus',
  component: UserExperienceStatus,
  tags: ['autodocs'],
} satisfies Meta<typeof UserExperienceStatus>;

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
