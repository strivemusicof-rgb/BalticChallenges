import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const apiOrigin = 'https://vps-1a18ee51.vps.ovh.net';

export default defineConfig({
  base: '/admin/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/v1': { target: apiOrigin, changeOrigin: true, secure: true },
      '/uploads': { target: apiOrigin, changeOrigin: true, secure: true },
    },
  },
});
