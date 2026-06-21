import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:1225',
        changeOrigin: true,
        secure: false,
        timeout: 120000,
        proxyTimeout: 120000,
      },
      '/docs': {
        target: 'http://localhost:1225',
        changeOrigin: true,
        secure: false,
      },
      '/logs': {
        target: 'http://localhost:1225',
        changeOrigin: true,
        secure: false,
      }
    }
  }
});
