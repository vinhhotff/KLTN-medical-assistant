import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteMockPlugin } from './src/mocks/viteMockPlugin';

const useMock = process.env.VITE_USE_MOCK === 'true';

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
  preview: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
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
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('/recharts/') || id.includes('\\recharts\\') || id.includes('/d3-') || id.includes('\\d3-')) {
              return 'charts';
            }
            if (
              id.includes('/react/') || id.includes('\\react\\') ||
              id.includes('/react-dom/') || id.includes('\\react-dom\\') ||
              id.includes('/react-router-dom/') || id.includes('\\react-router-dom\\') ||
              id.includes('/zustand/') || id.includes('\\zustand\\') ||
              id.includes('/axios/') || id.includes('\\axios\\') ||
              id.includes('/lucide-react/') || id.includes('\\lucide-react\\')
            ) {
              return 'vendor';
            }
          }
        },
      },
    },
  },
});
