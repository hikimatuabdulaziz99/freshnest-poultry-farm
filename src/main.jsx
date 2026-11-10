import { createRoot } from 'react-dom/client';
import App from './app/App.jsx';
import { registerServiceWorker } from './services/serviceWorkerRegistration.js';
import './index.css';

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(<App />);
}

// Initialize Service Worker for PWA offline shell caching
registerServiceWorker();

