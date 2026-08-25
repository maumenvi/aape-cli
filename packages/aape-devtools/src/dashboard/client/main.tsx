import { createRoot } from 'react-dom/client';
import { ReactFlowProvider } from 'reactflow';
import { App } from './app.tsx';
import type { DevtoolsEndpoints } from './types.ts';

declare global {
  interface Window {
    __AAPE_DEVTOOLS_ENDPOINTS__?: DevtoolsEndpoints;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found');
}

const endpoints = window.__AAPE_DEVTOOLS_ENDPOINTS__;
if (!endpoints) {
  throw new Error('Devtools endpoint config not found');
}

const root = createRoot(rootElement);
root.render(
  <ReactFlowProvider>
    <App endpoints={endpoints} />
  </ReactFlowProvider>,
);
