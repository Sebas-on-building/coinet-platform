import { createSlice, createAsyncThunk, createEntityAdapter } from '@reduxjs/toolkit';
import api from '@/api';

const chartAdapter = createEntityAdapter();
export const fetchChart = createAsyncThunk('chart/fetch', async (symbol) => api.getChart(symbol));

const chartSlice = createSlice({
  name: 'chart',
  initialState: chartAdapter.getInitialState({ status: 'idle', error: null }),
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchChart.pending, (state) => { state.status = 'loading'; })
      .addCase(fetchChart.fulfilled, (state, action) => { chartAdapter.setAll(state, action.payload); state.status = 'succeeded'; })
      .addCase(fetchChart.rejected, (state, action) => { state.status = 'failed'; state.error = action.error.message; });
  }
});
export default chartSlice.reducer; 