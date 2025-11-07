import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/ai-town',
  plugins: [react()],
  build: {
    target: 'esnext',
  },
  server: {
    host: true,
    open: '/ai-town/test.html',
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('development'),
  },
  root: '.',
  optimizeDeps: {
    entries: ['./src/test-main.tsx'],
  },
});