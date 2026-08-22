const fs = require('fs');

const paths = require('./paths');

const loadLegacyCspHashes = () => {
    try {
        const manifest = JSON.parse(fs.readFileSync(paths.legacyCspManifestPath, 'utf8'));
        return Array.isArray(manifest.scriptSrc)
            ? manifest.scriptSrc.filter((value) => typeof value === 'string' && value.startsWith("'sha256-"))
            : [];
    } catch {
        return [];
    }
};

const createCspRule = () => ({
    contentSecurityPolicy: {
        directives: {
            connectSrc: ["'self'"],
            defaultSrc: ["'self'"],
            fontSrc: ["'self'", 'https://fonts.gstatic.com'],
            imgSrc: ["'self'"],
            objectSrc: ["'none'"],
            scriptSrc: ["'self'", ...loadLegacyCspHashes()],
            styleSrc: ["'self'", 'https://fonts.googleapis.com'],
            frameSrc: ["'none'"],
            mediaSrc: ["'self'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
        },
    },
});

module.exports = { createCspRule, loadLegacyCspHashes };
