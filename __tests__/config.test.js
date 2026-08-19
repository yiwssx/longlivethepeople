describe('production configuration', () => {
    const originalEnv = process.env;

    afterEach(() => {
        process.env = originalEnv;
        jest.resetModules();
    });

    it('throws when required production secrets are missing', () => {
        process.env = {
            ...originalEnv,
            NODE_ENV: 'production',
        };
        delete process.env.MONGODB_URI;
        delete process.env.SESSION_SECRET;
        delete process.env.TRUST_PROXY;

        expect(() => require('../src/config/config')).toThrow(
            /Missing required production environment variables/,
        );
    });

    it('does not trust proxy headers by default', () => {
        process.env = {
            ...originalEnv,
            NODE_ENV: 'production',
            MONGODB_URI: 'mongodb://example.invalid/app',
            SESSION_SECRET: 'test-production-secret',
        };
        delete process.env.TRUST_PROXY;

        const config = require('../src/config/config');

        expect(config.mongodb.uri).toBe('mongodb://example.invalid/app');
        expect(config.session.secret).toBe('test-production-secret');
        expect(config.trustProxy).toBe(false);
    });

    it('supports explicitly trusting one reverse-proxy hop', () => {
        process.env = {
            ...originalEnv,
            NODE_ENV: 'production',
            MONGODB_URI: 'mongodb://example.invalid/app',
            SESSION_SECRET: 'test-production-secret',
            TRUST_PROXY: '1',
        };

        const config = require('../src/config/config');

        expect(config.trustProxy).toBe(1);
    });
});
