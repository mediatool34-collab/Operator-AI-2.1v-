import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { testConnection } from './lib/firebase';

// Test Firebase connection on boot as per requirement
testConnection();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
