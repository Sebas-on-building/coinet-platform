import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSettings, updateSettings } from '../api';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorMessage from '../components/ui/ErrorMessage';
import SettingsSkeleton from '../components/ui/SettingsSkeleton';
import { useTheme } from '../../packages/shared-ui/themes/useTheme';

const userId = 'demo-user'; // Replace with real user ID from auth

const SettingsPage = () => {
  const { colors, spacing, radii, typography, shadows } = useTheme();
  const queryClient = useQueryClient();
  const {
    data: settingsData,
    error,
    isLoading,
    refetch,
    isFetching,
  } = useQuery(['settings', userId], () => getSettings(userId));

  const mutation = useMutation(
    (newSettings: any) => updateSettings(userId, newSettings),
    {
      onMutate: async (newSettings) => {
        await queryClient.cancelQueries(['settings', userId]);
        const previous = queryClient.getQueryData(['settings', userId]);
        queryClient.setQueryData(['settings', userId], { data: newSettings });
        return { previous };
      },
      onError: (err, newSettings, context) => {
        if (context?.previous) queryClient.setQueryData(['settings', userId], context.previous);
      },
      onSettled: () => {
        queryClient.invalidateQueries(['settings', userId]);
      },
    }
  );

  if (isLoading || isFetching) {
    return <SettingsSkeleton />;
  }
  if (error) {
    return <ErrorMessage message={error.message || 'Failed to load settings.'} onRetry={refetch} details={error.stack} onReport={() => alert('Reported!')} />;
  }
  const settings = settingsData?.data || {};
  const [form, setForm] = useState(settings);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };
  const handleToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.checked });
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  return (
    <form onSubmit={handleSubmit} style={{
      background: colors.surface,
      borderRadius: radii.lg,
      boxShadow: shadows.md,
      padding: spacing.lg,
      maxWidth: 480,
      margin: '40px auto',
      display: 'flex',
      flexDirection: 'column',
      gap: spacing.md,
    }}>
      <div style={{ ...typography.h3, color: colors.primary }}>Settings</div>
      <label style={{ ...typography.body }}>
        Theme
        <select name="theme" value={form.theme} onChange={handleChange} style={{ marginLeft: spacing.sm, borderRadius: radii.sm, padding: spacing.xs }}>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </label>
      <label style={{ ...typography.body }}>
        Layout
        <select name="layout" value={form.layout} onChange={handleChange} style={{ marginLeft: spacing.sm, borderRadius: radii.sm, padding: spacing.xs }}>
          <option value="grid">Grid</option>
          <option value="list">List</option>
        </select>
      </label>
      <label style={{ ...typography.body }}>
        Notifications
        <input type="checkbox" name="notifications" checked={form.notifications} onChange={handleToggle} style={{ marginLeft: spacing.sm }} />
      </label>
      <label style={{ ...typography.body }}>
        Language
        <select name="language" value={form.language} onChange={handleChange} style={{ marginLeft: spacing.sm, borderRadius: radii.sm, padding: spacing.xs }}>
          <option value="en">English</option>
          <option value="de">Deutsch</option>
          <option value="es">Español</option>
        </select>
      </label>
      <button type="submit" style={{
        background: colors.primary,
        color: colors.text,
        border: 'none',
        borderRadius: radii.md,
        padding: `${spacing.sm}px ${spacing.lg}px`,
        fontWeight: typography.fontWeightBold,
        fontSize: typography.body.fontSize,
        cursor: 'pointer',
        marginTop: spacing.md,
        boxShadow: shadows.sm,
        transition: 'background 0.2s',
      }}>
        {mutation.isLoading ? 'Saving…' : 'Save Settings'}
      </button>
      {mutation.isError && (
        <ErrorMessage message={mutation.error?.message || 'Failed to save settings.'} onRetry={() => mutation.mutate(form)} details={mutation.error?.stack} onReport={() => alert('Reported!')} />
      )}
      {mutation.isSuccess && <div style={{ color: colors.success, ...typography.body }}>Settings saved!</div>}
    </form>
  );
};

export default SettingsPage; 