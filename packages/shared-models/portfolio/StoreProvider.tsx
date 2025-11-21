import React, { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './store';

const Spinner = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'linear-gradient(135deg, #0f2027, #2c5364 80%)' }}>
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="28" stroke="#fff" strokeWidth="8" opacity="0.2" />
      <path d="M60 32c0-15.464-12.536-28-28-28" stroke="#00FFA3" strokeWidth="8" strokeLinecap="round">
        <animateTransform attributeName="transform" type="rotate" from="0 32 32" to="360 32 32" dur="1s" repeatCount="indefinite" />
      </path>
    </svg>
  </div>
);

export const StoreProvider = ({ children }: { children: ReactNode }) => (
  <Provider store={store}>
    <PersistGate loading={<Spinner />} persistor={persistor}>
      {children}
    </PersistGate>
  </Provider>
); 