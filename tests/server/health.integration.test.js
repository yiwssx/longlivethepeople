const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const database = require('../../apps/server/src/infrastructure/database');

let app;
let mongo;

describe('health and operations routes', () => {
    beforeAll(async () => {
        mongo = await MongoMemoryServer.create();
        process.env.MONGODB_URI = mongo.getUri();
        process.env.NODE_ENV = 'test';
        process.env.METRICS_TOKEN = 'test-metrics-token';
        // eslint-disable-next-line global-require
        app = require('../../apps/server/src/app');
        await database.connect(process.env.MONGODB_URI, {});
    });

    afterAll(async () => {
        await database.disconnect();
        await mongo.stop();
    });

    it('reports process liveness independently from the database', async () => {
        await database.disconnect();
        const response = await request(app).get('/healthz');

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('ok');
        expect(response.headers['x-request-id']).toBeDefined();

        await database.connect(process.env.MONGODB_URI, {});
    });

    it('reports readiness from the database connection state', async () => {
        const ready = await request(app).get('/readyz');
        expect(ready.status).toBe(200);
        expect(ready.body.database).toBe('up');

        await database.disconnect();
        const notReady = await request(app).get('/readyz');
        expect(notReady.status).toBe(503);
        expect(notReady.body.database).toBe('down');

        await database.connect(process.env.MONGODB_URI, {});
    });

    it('protects runtime metrics with a bearer token', async () => {
        const unauthorized = await request(app).get('/metrics');
        expect(unauthorized.status).toBe(401);

        const response = await request(app)
            .get('/metrics')
            .set('Authorization', 'Bearer test-metrics-token');

        expect(response.status).toBe(200);
        expect(response.body.httpRequestsTotal).toEqual(expect.any(Number));
        expect(response.body.uptimeSeconds).toEqual(expect.any(Number));
    });
});
