import { createSlice, createAsyncThunk, createEntityAdapter } from '@reduxjs/toolkit';
import api from '@/api';

const portfolioAdapter = createEntityAdapter();
export const fetchPortfolio = createAsyncThunk('portfolio/fetch', async (userId) => api.getPortfolio(userId));

const portfolioSlice = createSlice({
  name: 'portfolio',
  initialState: portfolioAdapter.getInitialState({ status: 'idle', error: null }),
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPortfolio.pending, (state) => { state.status = 'loading'; })
      .addCase(fetchPortfolio.fulfilled, (state, action) => { portfolioAdapter.setAll(state, action.payload); state.status = 'succeeded'; })
      .addCase(fetchPortfolio.rejected, (state, action) => { state.status = 'failed'; state.error = action.error.message; });
  }
});
export default portfolioSlice.reducer; 