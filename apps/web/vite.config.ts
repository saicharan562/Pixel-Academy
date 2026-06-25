import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// Dev server runs on :5173 — the backend CORS WEB_ORIGIN default allows this origin.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    chunkSizeWarningLimit: 900, // the three.js vendor chunk is lazy-loaded, never in the initial path
    rollupOptions: {
      output: {
        // Stable long-term-cacheable vendor chunks; three.js stays isolated and lazy.
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'data-vendor': ['@tanstack/react-query'],
          'motion-vendor': ['motion', '@react-spring/web'],
        },
      },
    },
  },
});
