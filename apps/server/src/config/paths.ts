import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverSourceDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(serverSourceDirectory, '../../../..');
const webRoot = path.join(repositoryRoot, 'apps/web');
const webDistPath = path.join(repositoryRoot, 'dist/client');

export default Object.freeze({
  repositoryRoot,
  webRoot,
  webPublicPath: path.join(webRoot, 'public'),
  webDistPath,
  webIndexPath: path.join(webDistPath, 'index.html'),
  legacyCspManifestPath: path.join(repositoryRoot, 'dist/legacy-csp.json'),
});
