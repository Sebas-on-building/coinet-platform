import { createSlice, createEntityAdapter, createAsyncThunk, PayloadAction, EntityState, Draft, ActionReducerMapBuilder } from '@reduxjs/toolkit';
import { fetchJson } from './api';

// Entity adapter for normalized state
const assetsAdapter = createEntityAdapter<{ id: string; symbol: string; amount: number }>();

export const fetchPortfolio = createAsyncThunk<
  { id: string; symbol: string; amount: number }[],
  string
>('portfolio/fetchPortfolio', async (_userId: string) => {
  try {
    const portfolios = await fetchJson<unknown>('/api/v1/portfolios');
    const assets: { id: string; symbol: string; amount: number }[] = [];
    for (const p of Array.isArray(portfolios) ? portfolios : []) {
      for (const h of p.holdings || []) {
        assets.push({
          id: h.id || `${p.id}-${h.symbol}`,
          symbol: h.symbol,
          amount: Number(h.quantity) || 0,
        });
      }
    }
    return assets.length > 0 ? assets : [];
  } catch {
    return [];
  }
});

interface PortfolioState extends EntityState<{ id: string; symbol: string; amount: number }> {
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: PortfolioState = assetsAdapter.getInitialState({
  status: 'idle',
  error: null,
});

export const portfolioSlice = createSlice({
  name: 'portfolio',
  initialState,
  reducers: {
    addAsset: assetsAdapter.addOne,
    removeAsset: assetsAdapter.removeOne,
    updateAsset: assetsAdapter.updateOne,
    setAllAssets: assetsAdapter.setAll,
    // ...add more reducers as needed
  },
  extraReducers: (builder: ActionReducerMapBuilder<PortfolioState>) => {
    builder
      .addCase(fetchPortfolio.pending, (state: Draft<PortfolioState>) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchPortfolio.fulfilled, (state: Draft<PortfolioState>, action: PayloadAction<{ id: string; symbol: string; amount: number }[]>) => {
        state.status = 'succeeded';
        assetsAdapter.setAll(state, action.payload);
      })
      .addCase(fetchPortfolio.rejected, (state: Draft<PortfolioState>, action: ReturnType<typeof fetchPortfolio.rejected>) => {
        state.status = 'failed';
        state.error = action.error?.message || 'Failed to fetch portfolio';
      });
  },
});

// Selectors
export const {
  selectAll: selectAllAssets,
  selectById: selectAssetById,
  selectIds: selectAssetIds,
} = assetsAdapter.getSelectors((state: { portfolio: PortfolioState }) => state.portfolio);

export const { addAsset, removeAsset, updateAsset, setAllAssets } = portfolioSlice.actions;
export default portfolioSlice.reducer;
// This slice is a template: replicate for alerts, chart, user, settings, etc. with their own entity adapters and async thunks. 