import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('/node_modules/')) return undefined;
          const packageName = id.split('/node_modules/')[1]?.split('/')[0];
          if (['react', 'react-dom', 'scheduler'].includes(packageName ?? '')) return 'react';
          if (['react-router', 'react-router-dom'].includes(packageName ?? '')) return 'router';
          if (packageName === 'recharts' || packageName?.startsWith('d3-')) return 'recharts';
          return undefined;
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    proxy: { '/api': 'http://localhost:8787' },
  },
});
