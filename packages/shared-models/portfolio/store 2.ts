import { configureStore, combineReducers } from '@reduxjs/toolkit';
import portfolioReducer from './portfolioSlice';
import alertsReducer from './alertsSlice';
import chartReducer from './chartSlice';
import userReducer from './userSlice';
import settingsReducer from './settingsSlice';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import storage from 'redux-persist/lib/storage';

const rootReducer = combineReducers({
  portfolio: portfolioReducer,
  alerts: alertsReducer,
  charts: chartReducer,
  user: userReducer,
  settings: persistReducer({ key: 'settings', storage }, settingsReducer),
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 