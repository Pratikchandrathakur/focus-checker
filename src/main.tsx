import { createRoot } from 'react-dom/client';
import App from './app/App';
import { initPwa } from './app/services/pwa';
import './styles/index.css';

// Offline support, update prompts and "Install app" (service worker registers in production builds only).
initPwa();

createRoot(document.getElementById('root')!).render(<App />);
