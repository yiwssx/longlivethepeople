import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cspHashes } from '@vitejs/plugin-legacy';

const root = resolve(import.meta.dirname, '..');
const indexHtml = readFileSync(resolve(root, 'dist/client/index.html'), 'utf8');
const cspManifest = JSON.parse(readFileSync(resolve(root, 'dist/legacy-csp.json'), 'utf8'));

if (!indexHtml.includes('type="module"')) {
  throw new Error('Modern frontend module bundle is missing');
}

if (!indexHtml.includes('nomodule')) {
  throw new Error('Legacy frontend bundle is missing');
}

const expectedHashes = cspHashes.map((hash) => `'sha256-${hash}'`);
if (JSON.stringify(cspManifest.scriptSrc) !== JSON.stringify(expectedHashes)) {
  throw new Error('Legacy CSP manifest does not match @vitejs/plugin-legacy');
}

console.log('Frontend build contains modern and legacy bundles with matching CSP hashes.');
