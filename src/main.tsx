import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { testConnection } from './lib/firebase';
import { ThemeProvider } from './components/ThemeProvider';

// Test Firebase connection on boot as per requirement
testConnection();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);
