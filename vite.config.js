import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// Not `__dirname`: this package is "type": "module", and from Vite 5 the
// config is loaded as real ESM, where `__dirname` does not exist. Vite 4 only
// tolerated it by bundling the config to CJS first. `import.meta.dirname`
// needs Node 20.11+, which Vite 8 requires anyway.
const projectRoot = import.meta.dirname;

export default defineConfig({
    plugins: [react(), tailwindcss()],
    optimizeDeps: {
        include: ['jquery'], // Ensure jQuery is pre-bundled
    },
    resolve: {
        alias: {
            'jsvectormap': path.resolve(projectRoot, 'node_modules/jsvectormap'),
        },
    },
    server: {
      sourcemapIgnoreList: () => true, // Ignore missing source maps
    }, 
    build: {
      chunkSizeWarningLimit: 1500,
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
      },
});