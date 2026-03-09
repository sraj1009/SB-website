import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
// @ts-ignore
import { registerSW } from 'virtual:pwa-register';

// Register Service Worker for PWA
if (typeof window !== 'undefined') {
  registerSW({
    onNeedRefresh() {
      // Automatic update or show a prompt. For premium feel, we could use a custom toast.
      // But for now, simple reload is fine.
      window.location.reload();
    },
    onOfflineReady() {
      console.log('App is ready for offline use.');
    },
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
