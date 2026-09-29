import { defineConfig } from 'vite';

/**
 * Bundle the throw-away reducer check for Node, so it can run the real slice.
 *
 *     npx vite build --config vite.check.config.js && node dist-check/_row_approval_check.js
 */
export default defineConfig({
  logLevel: 'warn',
  build: {
    ssr: '_row_approval_check.ts',
    outDir: 'dist-check',
    emptyOutDir: true,
    minify: false,
  },
});
