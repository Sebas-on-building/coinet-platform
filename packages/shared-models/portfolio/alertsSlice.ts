import { createSlice, createEntityAdapter, createAsyncThunk, PayloadAction, EntityState, Draft, ActionReducerMapBuilder } from '@reduxjs/toolkit';

export type Alert = { id: string; type: string; message: string; read: boolean; createdAt: string };
const alertsAdapter = createEntityAdapter<Alert, string>();

export const fetchAlerts = createAsyncThunk<Alert[], string>('alerts/fetchAlerts', async (_userId: string) => {
  const { fetchJson } = await import('./api');
  try {
    const data = await fetchJson<{ data?: Alert[]; alerts?: Alert[] } | Alert[]>('/api/v1/alerts');
    const list = Array.isArray(data) ? data : (data as { data?: Alert[] })?.data ?? (data as { alerts?: Alert[] })?.alerts ?? [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
});

interface AlertsState extends EntityState<Alert, string> {
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: AlertsState = alertsAdapter.getInitialState({
  status: 'idle',
  error: null,
});

export const alertsSlice = createSlice({
  name: 'alerts',
  initialState,
  reducers: {
    addAlert: alertsAdapter.addOne,
    removeAlert: alertsAdapter.removeOne,
    updateAlert: alertsAdapter.updateOne,
    markAlertRead: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      if (state.entities[id]) {
        state.entities[id]!.read = true;
      }
    },
    setAllAlerts: alertsAdapter.setAll,
  },
  extraReducers: (builder: ActionReducerMapBuilder<AlertsState>) => {
    builder
      .addCase(fetchAlerts.pending, (state: Draft<AlertsState>) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchAlerts.fulfilled, (state: Draft<AlertsState>, action: PayloadAction<Alert[]>) => {
        state.status = 'succeeded';
        alertsAdapter.setAll(state, action.payload);
      })
      .addCase(fetchAlerts.rejected, (state: Draft<AlertsState>, action) => {
        state.status = 'failed';
        state.error = action.error?.message || 'Failed to fetch alerts';
      });
  },
});

// Selector to extract only the entity state for adapter selectors
const getAlertsEntityState = (state: { alerts: AlertsState }) => {
  const { status, error, ...entityState } = state.alerts;
  return entityState as EntityState<Alert, string>;
};

export const {
  selectAll: selectAllAlerts,
  selectById: selectAlertById,
  selectIds: selectAlertIds,
} = alertsAdapter.getSelectors(getAlertsEntityState);

export const { addAlert, removeAlert, updateAlert, markAlertRead, setAllAlerts } = alertsSlice.actions;
export default alertsSlice.reducer; 