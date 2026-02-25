import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { enforcePersistenceBlock } from './lib/no-persist';
import './index.css';

// Activate persistence blocking before anything else
enforcePersistenceBlock();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
