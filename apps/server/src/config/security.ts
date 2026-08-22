import fs from 'node:fs';
import paths from './paths.ts';

export const loadLegacyCspHashes = (): string[] => {
  try {
    const manifest = JSON.parse(fs.readFileSync(paths.legacyCspManifestPath, 'utf8')) as { scriptSrc?: unknown };
    return Array.isArray(manifest.scriptSrc)
      ? manifest.scriptSrc.filter(
          (value): value is string => typeof value === 'string' && value.startsWith("'sha256-"),
        )
      : [];
  } catch {
    return [];
  }
};

export const createCspRule = () => ({
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
