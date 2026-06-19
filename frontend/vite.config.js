import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],

    // Dev server proxy — routes /api calls to FastAPI on port 8000
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
        },
        '/uploads': {
          target: 'http://localhost:8000',
          changeOrigin: true,
        },
        '/reports': {
          target: 'http://localhost:8000',
          changeOrigin: true,
        },
      },
    },

    build: {
      outDir: 'dist',
      sourcemap: false,
      // Chunk splitting for better caching
      rollupOptions: {
        output: {
          manualChunks: {
            vendor:  ['react', 'react-dom', 'react-router-dom'],
            charts:  ['chart.js', 'react-chartjs-2'],
            ui:      ['react-icons', 'react-hot-toast', 'clsx'],
            forms:   ['react-hook-form', '@hookform/resolvers', 'yup'],
            http:    ['axios'],
          },
        },
      },
    },
  };
});
