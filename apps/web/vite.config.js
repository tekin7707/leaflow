import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const hmrClientPort = process.env.VITE_HMR_CLIENT_PORT
  ? Number(process.env.VITE_HMR_CLIENT_PORT)
  : undefined;

export default defineConfig({
  plugins: [react()],
  server: {
    port: 7052,
    host: true,
    strictPort: true,
    proxy: {
      '/api': 'http://localhost:7051',
    },
    hmr: hmrClientPort ? { clientPort: hmrClientPort } : undefined,
  },
});
