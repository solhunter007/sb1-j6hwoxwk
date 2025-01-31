import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Set security headers
if (import.meta.env.PROD) {
  const meta = document.createElement('meta');
  meta.httpEquiv = 'Cross-Origin-Embedder-Policy';
  meta.content = 'require-corp';
  document.head.appendChild(meta);

  const metaCSP = document.createElement('meta');
  metaCSP.httpEquiv = 'Content-Security-Policy';
  metaCSP.content = "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; connect-src 'self' https:;";
  document.head.appendChild(metaCSP);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);