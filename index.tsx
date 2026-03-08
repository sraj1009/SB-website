import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';

// Google Analytics - set VITE_GA_ID in .env (e.g. VITE_GA_ID=G-XXXXXXXXXX)
const gaId = (import.meta as any).env?.VITE_GA_ID;
if (gaId && gaId !== 'G-XXXXXXXXXX') {
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
  document.head.appendChild(s);
  (window as any).dataLayer = (window as any).dataLayer || [];
  (window as any).gtag = function () { (window as any).dataLayer.push(arguments); };
  (window as any).gtag('js', new Date());
  (window as any).gtag('config', gaId);
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
