import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteMockPlugin } from './src/mocks/viteMockPlugin';

const useMock = process.env.VITE_USE_MOCK !== 'false';

export default defineConfig({
  plugins: [react(), useMock ? viteMockPlugin() : null].filter(Boolean),
  resolve: {
    preserveSymlinks: true,
  },
  server: {
    port: 5173,
    proxy: useMock
      ? undefined
      : {
          '/api': {
            target: 'http://localhost:5001',
            changeOrigin: true,
          },
          // Chi proxy endpoint khoi tao OAuth2; '/oauth2/callback' la route SPA do Vite phuc vu
          '/oauth2/authorization': {
            target: 'http://localhost:5001',
            changeOrigin: true,
          },
          '/login/oauth2': {
            target: 'http://localhost:5001',
            changeOrigin: true,
          },
        },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom', 'zustand', 'axios', 'lucide-react'],
        },
      },
    },
  },
});
