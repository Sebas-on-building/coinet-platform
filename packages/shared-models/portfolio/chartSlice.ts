import { createSlice, createEntityAdapter, createAsyncThunk, PayloadAction, EntityState, Draft, ActionReducerMapBuilder } from '@reduxjs/toolkit';

export type Chart = { id: string; symbol: string; type: string; data: any; createdAt: string };
const chartsAdapter = createEntityAdapter<Chart, string>();

export const fetchCharts = createAsyncThunk<Chart[], string>('charts/fetchCharts', async (_userId: string) => {
  try {
    const res = await fetch('/api/charts');
    if (!res.ok) {
      if (res.status === 401) return [];
      throw new Error(`Failed to fetch charts: ${res.status}`);
    }
    const data = await res.json();
    const charts = Array.isArray(data) ? data : data?.charts ?? data?.data ?? [];
    return charts.map((c: any) => ({
      id: c.id || `chart-${c.symbol || Date.now()}`,
      symbol: c.symbol || 'BTC',
      type: c.type || 'line',
      data: c.data || {},
      createdAt: c.createdAt || new Date().toISOString(),
    }));
  } catch {
    return [];
  }
});

interface ChartsState extends EntityState<Chart, string> {
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: ChartsState = chartsAdapter.getInitialState({
  status: 'idle',
  error: null,
});

export const chartSlice = createSlice({
  name: 'charts',
  initialState,
  reducers: {
    addChart: chartsAdapter.addOne,
    removeChart: chartsAdapter.removeOne,
    updateChart: chartsAdapter.updateOne,
    setAllCharts: chartsAdapter.setAll,
  },
  extraReducers: (builder: ActionReducerMapBuilder<ChartsState>) => {
    builder
      .addCase(fetchCharts.pending, (state: Draft<ChartsState>) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchCharts.fulfilled, (state: Draft<ChartsState>, action: PayloadAction<Chart[]>) => {
        state.status = 'succeeded';
        chartsAdapter.setAll(state, action.payload);
      })
      .addCase(fetchCharts.rejected, (state: Draft<ChartsState>, action) => {
        state.status = 'failed';
        state.error = action.error?.message || 'Failed to fetch charts';
      });
  },
});

const getChartsEntityState = (state: { charts: ChartsState }) => {
  const { status, error, ...entityState } = state.charts;
  return entityState as EntityState<Chart, string>;
};

export const {
  selectAll: selectAllCharts,
  selectById: selectChartById,
  selectIds: selectChartIds,
} = chartsAdapter.getSelectors(getChartsEntityState);

export const { addChart, removeChart, updateChart, setAllCharts } = chartSlice.actions;
export default chartSlice.reducer;
