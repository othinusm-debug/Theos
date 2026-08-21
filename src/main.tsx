import { createRoot } from 'react-dom/client';

import App from './App';

import './index.css';

createRoot(document.getElementById('root')!).render(<App />);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const base = import.meta.env.BASE_URL || '/';
    const swUrl = `${base.replace(/\/$/, '')}/sw.js`;
    navigator.serviceWorker.register(swUrl, { scope: base }).catch(() => {
      // Si falla el registro (ej. navegador viejo), la app sigue funcionando normal, solo sin modo offline instalable.
    });
  });
}
