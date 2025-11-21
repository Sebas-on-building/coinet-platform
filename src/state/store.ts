import { configureStore } from '@reduxjs/toolkit';
import { persistReducer, persistStore } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import settingsReducer from './settingsSlice';
// Import other feature slices as needed
import portfolioReducer from './portfolioSlice';
import alertsReducer from './alertsSlice';
import chartReducer from './chartSlice';

const persistedSettings = persistReducer({ key: 'settings', storage }, settingsReducer);

export const store = configureStore({
  reducer: {
    settings: persistedSettings,
    portfolio: portfolioReducer,
    alerts: alertsReducer,
    chart: chartReducer,
    // ...add more slices here
  }
});
export const persistor = persistStore(store); 