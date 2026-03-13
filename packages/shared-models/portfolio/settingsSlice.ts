import { createSlice, createEntityAdapter, createAsyncThunk, PayloadAction, EntityState, Draft, ActionReducerMapBuilder } from '@reduxjs/toolkit';

export type Settings = { id: string; theme: string; layout: string; notifications: boolean; language: string };
const settingsAdapter = createEntityAdapter<Settings, string>();

export const fetchSettings = createAsyncThunk<Settings[], string>('settings/fetchSettings', async (userId: string) => {
  const { fetchJson } = await import('./api');
  try {
    const data = await fetchJson<Settings | Settings[] | { data?: Settings[] }>('/api/settings/user');
    const list = Array.isArray(data) ? data : (data as { data?: Settings[] })?.data ?? [data as Settings];
    return Array.isArray(list) ? list : [{ id: userId, theme: 'dark', layout: 'grid', notifications: true, language: 'en' }];
  } catch {
    return [{ id: userId, theme: 'dark', layout: 'grid', notifications: true, language: 'en' }];
  }
});

interface SettingsState extends EntityState<Settings, string> {
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: SettingsState = settingsAdapter.getInitialState({
  status: 'idle',
  error: null,
});

export const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    addSettings: settingsAdapter.addOne,
    removeSettings: settingsAdapter.removeOne,
    updateSettings: settingsAdapter.updateOne,
    setAllSettings: settingsAdapter.setAll,
  },
  extraReducers: (builder: ActionReducerMapBuilder<SettingsState>) => {
    builder
      .addCase(fetchSettings.pending, (state: Draft<SettingsState>) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchSettings.fulfilled, (state: Draft<SettingsState>, action: PayloadAction<Settings[]>) => {
        state.status = 'succeeded';
        settingsAdapter.setAll(state, action.payload);
      })
      .addCase(fetchSettings.rejected, (state: Draft<SettingsState>, action) => {
        state.status = 'failed';
        state.error = action.error?.message || 'Failed to fetch settings';
      });
  },
});

const getSettingsEntityState = (state: { settings: SettingsState }) => {
  const { status, error, ...entityState } = state.settings;
  return entityState as EntityState<Settings, string>;
};

export const {
  selectAll: selectAllSettings,
  selectById: selectSettingsById,
  selectIds: selectSettingsIds,
} = settingsAdapter.getSelectors(getSettingsEntityState);

export const { addSettings, removeSettings, updateSettings, setAllSettings } = settingsSlice.actions;
export default settingsSlice.reducer; 