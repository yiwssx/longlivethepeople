import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';

let app;
let database;
let mongo;

describe('health and operations routes', () => {
  before(async () => {
    mongo = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongo.getUri();
    process.env.NODE_ENV = 'test';
    process.env.METRICS_TOKEN = 'test-metrics-token';
    ({ default: app } = await import('../../apps/server/src/app.ts'));
    ({ default: database } = await import('../../apps/server/src/infrastructure/database.ts'));
    await database.connect(process.env.MONGODB_URI, {});
  });

  after(async () => {
    await database.disconnect();
    await mongo.stop();
  });

  it('reports process liveness independently from the database', async () => {
    await database.disconnect();
    const response = await request(app).get('/healthz');
    assert.equal(response.status, 200);
    assert.equal(response.body.status, 'ok');
    assert.ok(response.headers['x-request-id']);
    await database.connect(process.env.MONGODB_URI, {});
  });

  it('reports readiness from the database connection state', async () => {
    const ready = await request(app).get('/readyz');
    assert.equal(ready.status, 200);
    assert.equal(ready.body.database, 'up');

    await database.disconnect();
    const notReady = await request(app).get('/readyz');
    assert.equal(notReady.status, 503);
    assert.equal(notReady.body.database, 'down');
    await database.connect(process.env.MONGODB_URI, {});
  });

  it('protects runtime metrics with a bearer token', async () => {
    assert.equal((await request(app).get('/metrics')).status, 401);
    const response = await request(app)
      .get('/metrics')
      .set('Authorization', 'Bearer test-metrics-token');
    assert.equal(response.status, 200);
    assert.equal(typeof response.body.httpRequestsTotal, 'number');
    assert.equal(typeof response.body.uptimeSeconds, 'number');
  });
});
