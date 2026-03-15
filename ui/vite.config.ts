import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/ws': {
        target: 'ws://localhost:19666',
        ws: true,
      },
      // Si tienes otros endpoints de API, agrégalos aquí
      '/health': 'http://localhost:19666',
      '/api': 'http://localhost:19666',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
