const { MongoMemoryServer } = require('mongodb-memory-server');

let mongo;
let runtime;

describe('server lifecycle', () => {
    beforeAll(async () => {
        mongo = await MongoMemoryServer.create();
        process.env.MONGODB_URI = mongo.getUri();
        process.env.NODE_ENV = 'test';
        process.env.PORT = '0';

        // Require after environment configuration so the startup contract reads
        // the in-memory Mongo URI and ephemeral port.
        // eslint-disable-next-line global-require
        const { startServer } = require('../src/server');
        runtime = await startServer({ port: 0, registerSignalHandlers: false });
    });

    afterAll(async () => {
        if (runtime) {
            await runtime.shutdown('test');
        }
        if (mongo) {
            await mongo.stop();
        }
    });

    it('listens on an ephemeral port after MongoDB is ready', () => {
        expect(runtime.server.listening).toBe(true);
        expect(runtime.port).toEqual(expect.any(Number));
        expect(runtime.port).toBeGreaterThan(0);
    });
});
