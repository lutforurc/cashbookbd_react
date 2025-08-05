import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['jquery'], // Ensure jQuery is pre-bundled
  },
  resolve: {
    alias: {
      'jsvectormap': path.resolve(__dirname, 'node_modules/jsvectormap'),
    },
  },
  server: {
    sourcemapIgnoreList: () => true, // Ignore missing source maps
  },
  build: {
    chunkSizeWarningLimit: 1500, // Increases the chunk size warning limit
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react')) {
              return 'react-vendors'; // Separate React-related libraries
            }
            if (id.includes('jquery')) {
              return 'jquery'; // Separate jQuery
            }
            return 'vendor'; // All other vendor libraries
          }
        },
      },
    },
    assetsInlineLimit: 4096, // Inline assets smaller than 4 KB
    cssCodeSplit: true, // Split CSS into separate files
    minify: 'esbuild', // Minify assets using esbuild
  },
});
