describe('production configuration', () => {
    const originalEnv = process.env;

    afterEach(() => {
        process.env = originalEnv;
        jest.resetModules();
    });

    it('throws when the production database URI is missing', () => {
        process.env = {
            ...originalEnv,
            NODE_ENV: 'production',
        };
        delete process.env.MONGODB_URI;
        delete process.env.TRUST_PROXY;

        expect(() => require('../src/config/config')).toThrow(
            /Missing required production environment variable: MONGODB_URI/,
        );
    });

    it('does not require session configuration and does not trust proxy headers by default', () => {
        process.env = {
            ...originalEnv,
            NODE_ENV: 'production',
            MONGODB_URI: 'mongodb://example.invalid/app',
        };
        delete process.env.SESSION_SECRET;
        delete process.env.TRUST_PROXY;

        const config = require('../src/config/config');

        expect(config.mongodb.uri).toBe('mongodb://example.invalid/app');
        expect(config.session).toBeUndefined();
        expect(config.trustProxy).toBe(false);
    });

    it('supports explicitly trusting one reverse-proxy hop', () => {
        process.env = {
            ...originalEnv,
            NODE_ENV: 'production',
            MONGODB_URI: 'mongodb://example.invalid/app',
            TRUST_PROXY: '1',
        };

        const config = require('../src/config/config');

        expect(config.trustProxy).toBe(1);
    });

    it('keeps metrics disabled unless a token is configured', () => {
        process.env = {
            ...originalEnv,
            NODE_ENV: 'development',
        };
        delete process.env.METRICS_TOKEN;

        const config = require('../src/config/config');
        expect(config.metrics.token).toBe('');
    });
});
