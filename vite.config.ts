import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import legacy, { cspHashes } from '@vitejs/plugin-legacy';

const projectRoot = import.meta.dirname;
const clientOutDir = resolve(projectRoot, 'dist/client');
const legacyCspPath = resolve(projectRoot, 'dist/legacy-csp.json');

const writeLegacyCspManifest = () => ({
  name: 'write-legacy-csp-manifest',
  apply: 'build' as const,
  closeBundle() {
    mkdirSync(resolve(projectRoot, 'dist'), { recursive: true });
    writeFileSync(
      legacyCspPath,
      `${JSON.stringify({ scriptSrc: cspHashes.map((hash) => `'sha256-${hash}'`) }, null, 2)}\n`,
      'utf8',
    );
  },
});

export default defineConfig({
  root: resolve(projectRoot, 'frontend'),
  publicDir: resolve(projectRoot, 'public'),
  plugins: [
    react(),
    legacy({
      targets: [
        'Chrome >= 80',
        'Edge >= 80',
        'Firefox >= 78',
        'Safari >= 13',
        'iOS >= 13',
      ],
    }),
    writeLegacyCspManifest(),
  ],
  build: {
    outDir: clientOutDir,
    emptyOutDir: true,
    sourcemap: true,
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': 'http://127.0.0.1:3000',
      '/healthz': 'http://127.0.0.1:3000',
      '/readyz': 'http://127.0.0.1:3000',
      '/metrics': 'http://127.0.0.1:3000',
      '/socket.io': {
        target: 'http://127.0.0.1:3000',
        ws: true,
      },
    },
  },
});
