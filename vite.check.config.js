import { defineConfig } from 'vite';

/**
 * Bundle the throw-away reducer check for Node, so it can run the real slice.
 *
 *     npx vite build --config vite.check.config.js && node dist-check/_row_approval_check.js
 *
 * CHECK_ENTRY picks which entry to bundle, so a second check can be run without
 * a second config:
 *
 *     set CHECK_ENTRY=_ledger_product_label_check.ts
 *     npx vite build --config vite.check.config.js && node dist-check/_ledger_product_label_check.js
 */
export default defineConfig({
  logLevel: 'warn',
  build: {
    ssr: process.env.CHECK_ENTRY || '_row_approval_check.ts',
    outDir: 'dist-check',
    emptyOutDir: true,
    minify: false,
  },
});
