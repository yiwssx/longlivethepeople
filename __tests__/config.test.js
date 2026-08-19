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

        expect(() => require('../src/config/config')).toThrow(
            /Missing required production environment variables/,
        );
    });

    it('loads when required production values are provided', () => {
        process.env = {
            ...originalEnv,
            NODE_ENV: 'production',
            MONGODB_URI: 'mongodb://example.invalid/app',
            SESSION_SECRET: 'test-production-secret',
        };

        const config = require('../src/config/config');

        expect(config.mongodb.uri).toBe('mongodb://example.invalid/app');
        expect(config.session.secret).toBe('test-production-secret');
        expect(config.trustProxy).toBe(1);
    });
});
