import { createSlice, createAsyncThunk, createEntityAdapter } from '@reduxjs/toolkit';
import api from '@/api';

const alertsAdapter = createEntityAdapter();
export const fetchAlerts = createAsyncThunk('alerts/fetch', async () => api.getAlerts());

const alertsSlice = createSlice({
  name: 'alerts',
  initialState: alertsAdapter.getInitialState({ status: 'idle', error: null }),
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAlerts.pending, (state) => { state.status = 'loading'; })
      .addCase(fetchAlerts.fulfilled, (state, action) => { alertsAdapter.setAll(state, action.payload); state.status = 'succeeded'; })
      .addCase(fetchAlerts.rejected, (state, action) => { state.status = 'failed'; state.error = action.error.message; });
  }
});
export default alertsSlice.reducer; 