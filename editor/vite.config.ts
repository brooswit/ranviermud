import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  root: 'src/client',
  build: {
    outDir: '../../public',
    emptyOutDir: false,
    rollupOptions: {
      input: resolve(__dirname, 'src/client/index.html'),
      external: ['vis-network'],
      output: {
        globals: {
          'vis-network': 'vis'
        }
      }
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
