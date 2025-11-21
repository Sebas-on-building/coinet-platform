import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SettingsState {
  theme: 'light' | 'dark';
  layout: 'default' | 'compact';
  isAuthenticated: boolean;
}

const initialState: SettingsState = {
  theme: 'light',
  layout: 'default',
  isAuthenticated: false,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setTheme(state, action: PayloadAction<'light' | 'dark'>) {
      state.theme = action.payload;
    },
    setLayout(state, action: PayloadAction<'default' | 'compact'>) {
      state.layout = action.payload;
    },
    setAuthenticated(state, action: PayloadAction<boolean>) {
      state.isAuthenticated = action.payload;
    },
  },
});

export const { setTheme, setLayout, setAuthenticated } = settingsSlice.actions;
export default settingsSlice.reducer; 