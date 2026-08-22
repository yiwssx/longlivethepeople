const path = require('path');

const repositoryRoot = path.resolve(__dirname, '../../../..');
const webRoot = path.join(repositoryRoot, 'apps/web');
const webDistPath = path.join(repositoryRoot, 'dist/client');

module.exports = Object.freeze({
    repositoryRoot,
    webRoot,
    webPublicPath: path.join(webRoot, 'public'),
    webDistPath,
    webIndexPath: path.join(webDistPath, 'index.html'),
    legacyCspManifestPath: path.join(repositoryRoot, 'dist/legacy-csp.json'),
});
