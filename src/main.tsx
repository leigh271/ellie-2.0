import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { DemoStoreProvider } from './state/DemoStore';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <DemoStoreProvider>
        <App />
      </DemoStoreProvider>
    </HashRouter>
  </React.StrictMode>,
);
