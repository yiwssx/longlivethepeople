import assert from 'node:assert/strict';
import { after, afterEach, before, describe, it } from 'node:test';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';

let app;
let database;
let Message;
let messageLimits;
let mongo;

describe('message API', () => {
  before(async () => {
    mongo = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongo.getUri();
    process.env.NODE_ENV = 'test';
    process.env.MESSAGE_RATE_LIMIT_MAX = '1000';
    process.env.MESSAGE_READ_RATE_LIMIT_MAX = '1000';

    ({ default: app } = await import('../../apps/server/src/app.ts'));
    ({ default: database } = await import('../../apps/server/src/infrastructure/database.ts'));
    ({ default: Message } = await import('../../apps/server/src/modules/messages/message.model.ts'));
    ({ default: messageLimits } = await import('../../apps/server/src/modules/messages/message.constants.ts'));
    await database.connect(process.env.MONGODB_URI, {});
  });

  afterEach(async () => Message.deleteMany({}));

  after(async () => {
    await database.disconnect();
    await mongo.stop();
  });

  it('returns an empty cursor page when there are no messages', async () => {
    const response = await request(app).get('/api/v1/messages');
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, {
      data: [],
      pagination: { limit: 20, hasMore: false, nextCursor: null },
    });
    assert.ok(response.headers['x-request-id']);
  });

  it('rejects invalid submissions with structured errors', async () => {
    const invalidPayloads = [
      {},
      { codename: 'a', affiliation: 'b' },
      { codename: 'a', affiliation: 'b', message: '' },
      { codename: ' ', affiliation: 'b', message: 'hi' },
    ];
    for (const payload of invalidPayloads) {
      const response = await request(app).post('/api/v1/messages').send(payload);
      assert.equal(response.status, 400);
      assert.equal(response.body.error.code, 'INVALID_MESSAGE');
      assert.ok(response.body.error.requestId);
    }
  });

  it('requires JSON for message creation', async () => {
    const response = await request(app)
      .post('/api/v1/messages')
      .type('form')
      .send({ codename: 'a', affiliation: 'b', message: 'c' });
    assert.equal(response.status, 415);
    assert.equal(response.body.error.code, 'JSON_REQUIRED');
  });

  it('normalizes malformed JSON parser failures', async () => {
    const response = await request(app)
      .post('/api/v1/messages')
      .set('Content-Type', 'application/json')
      .send('{"codename":"broken"');
    assert.equal(response.status, 400);
    assert.equal(response.body.error.code, 'MALFORMED_JSON');
    assert.equal(response.body.error.message, 'Request body contains malformed JSON');
    assert.ok(response.body.error.requestId);
  });

  it('rejects fields that exceed configured length limits', async () => {
    const response = await request(app).post('/api/v1/messages').send({
      codename: 'a'.repeat(messageLimits.codenameMaxLength + 1),
      affiliation: 'test',
      message: 'hello',
    });
    assert.equal(response.status, 400);
  });

  it('rejects request bodies above the configured parser limit', async () => {
    const response = await request(app).post('/api/v1/messages').send({
      codename: 'test',
      affiliation: 'test',
      message: 'x'.repeat(20 * 1024),
    });
    assert.equal(response.status, 413);
    assert.equal(response.body.error.code, 'PAYLOAD_TOO_LARGE');
    assert.ok(response.body.error.requestId);
  });

  it('creates a normalized public message with stable identity metadata', async () => {
    const response = await request(app).post('/api/v1/messages').send({
      codename: '  test-codename  ',
      affiliation: '  earth  ',
      message: '  hello there  ',
    });
    assert.equal(response.status, 201);
    assert.equal(response.body.codename, 'test-codename');
    assert.equal(response.body.affiliation, 'earth');
    assert.equal(response.body.message, 'hello there');
    assert.match(response.body.id, /^[a-f\d]{24}$/);
    assert.equal(Number.isNaN(Date.parse(response.body.createdAt)), false);
    assert.equal(response.body._id, undefined);
  });

  it('returns published and legacy rows but excludes hidden moderation rows', async () => {
    const legacy = await Message.collection.insertOne({
      codename: 'legacy', affiliation: 'archive', message: 'legacy row',
      createdAt: new Date('2026-01-01T00:00:00.000Z'), updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    const published = await Message.create({ codename: 'published', affiliation: 'archive', message: 'visible row' });
    await Message.create({
      codename: 'hidden', affiliation: 'archive', message: 'hidden row', status: 'hidden', hiddenAt: new Date(),
    });

    const response = await request(app).get('/api/v1/messages');
    assert.equal(response.status, 200);
    assert.deepEqual(response.body.data.map((item) => item.codename), ['published', 'legacy']);
    assert.equal(response.body.data[0].id, String(published._id));
    assert.equal(response.body.data[1].id, String(legacy.insertedId));
  });

  it('paginates with a stable cursor while preserving deterministic order', async () => {
    await Message.create([
      { codename: 'first', affiliation: 'one', message: 'one', createdAt: new Date('2026-01-01T00:00:00.000Z') },
      { codename: 'second', affiliation: 'two', message: 'two', createdAt: new Date('2026-01-02T00:00:00.000Z') },
      { codename: 'third', affiliation: 'three', message: 'three', createdAt: new Date('2026-01-03T00:00:00.000Z') },
    ]);

    const firstPage = await request(app).get('/api/v1/messages?limit=2');
    assert.equal(firstPage.status, 200);
    assert.deepEqual(firstPage.body.data.map((item) => item.codename), ['third', 'second']);
    assert.equal(firstPage.body.pagination.hasMore, true);
    assert.equal(typeof firstPage.body.pagination.nextCursor, 'string');

    const secondPage = await request(app)
      .get(`/api/v1/messages?limit=2&before=${encodeURIComponent(firstPage.body.pagination.nextCursor)}`);
    assert.equal(secondPage.status, 200);
    assert.deepEqual(secondPage.body.data.map((item) => item.codename), ['first']);
    assert.equal(secondPage.body.pagination.hasMore, false);
    assert.equal(secondPage.body.pagination.nextCursor, null);
  });

  it('rejects invalid cursor pagination parameters', async () => {
    for (const query of ['?limit=0', '?limit=101', '?before=not-a-cursor']) {
      const response = await request(app).get(`/api/v1/messages${query}`);
      assert.equal(response.status, 400);
      assert.equal(response.body.error.code, 'INVALID_PAGINATION');
    }
  });

  it('returns 503 quickly when the database is disconnected', async () => {
    await database.disconnect();
    try {
      const startedAt = Date.now();
      const response = await request(app).get('/api/v1/messages');
      assert.equal(response.status, 503);
      assert.equal(response.body.error.code, 'DATABASE_UNAVAILABLE');
      assert.ok(Date.now() - startedAt < 2000);
    } finally {
      await database.connect(process.env.MONGODB_URI, {});
    }
  });

  it('returns a JSON 404 for unknown API routes', async () => {
    const response = await request(app).get('/api/v1/missing');
    assert.equal(response.status, 404);
    assert.equal(response.body.error.code, 'API_NOT_FOUND');
  });

  it('redirects unknown web routes to the archive landing page', async () => {
    const response = await request(app).get('/missing-route');
    assert.equal(response.status, 302);
    assert.equal(response.headers.location, '/');
  });
});
