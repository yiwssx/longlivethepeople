import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createEnvironment } from '../../apps/server/src/config/env.ts';

describe('production configuration', () => {
  it('throws when the production database URI is missing', () => {
    assert.throws(
      () => createEnvironment({ NODE_ENV: 'production' }),
      /Missing required production environment variable: MONGODB_URI/,
    );
  });

  it('does not require session configuration and does not trust proxy headers by default', () => {
    const config = createEnvironment({
      NODE_ENV: 'production',
      MONGODB_URI: 'mongodb://example.invalid/app',
    });
    assert.equal(config.mongodb.uri, 'mongodb://example.invalid/app');
    assert.equal('session' in config, false);
    assert.equal(config.trustProxy, false);
  });

  it('supports explicitly trusting one reverse-proxy hop', () => {
    const config = createEnvironment({
      NODE_ENV: 'production',
      MONGODB_URI: 'mongodb://example.invalid/app',
      TRUST_PROXY: '1',
    });
    assert.equal(config.trustProxy, 1);
  });

  it('keeps metrics disabled unless a token is configured', () => {
    const config = createEnvironment({ NODE_ENV: 'development' });
    assert.equal(config.metrics.token, '');
  });
});
