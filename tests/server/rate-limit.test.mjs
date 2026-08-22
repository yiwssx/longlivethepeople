import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import express from 'express';
import request from 'supertest';
import { createRateLimit } from '../../apps/server/src/middleware/rate-limit.ts';

describe('rate limit middleware', () => {
  it('returns 429 after the configured request budget is exhausted', async () => {
    const app = express();
    app.use(createRateLimit({ windowMs: 60_000, max: 2 }));
    app.get('/', (_req, res) => res.sendStatus(204));

    assert.equal((await request(app).get('/')).status, 204);
    assert.equal((await request(app).get('/')).status, 204);
    const third = await request(app).get('/');
    assert.equal(third.status, 429);
    assert.ok(third.headers['retry-after']);
    assert.equal(third.headers['ratelimit-limit'], '2');
    assert.equal(third.headers['ratelimit-remaining'], '0');
  });

  it('keeps the bucket store bounded by evicting the least recently used key', async () => {
    const app = express();
    app.use(createRateLimit({
      windowMs: 60_000,
      max: 1,
      maxBuckets: 2,
      keyFn: (req) => req.get('x-client-id'),
    }));
    app.get('/', (_req, res) => res.sendStatus(204));

    assert.equal((await request(app).get('/').set('x-client-id', 'a')).status, 204);
    assert.equal((await request(app).get('/').set('x-client-id', 'b')).status, 204);
    assert.equal((await request(app).get('/').set('x-client-id', 'b')).status, 429);
    assert.equal((await request(app).get('/').set('x-client-id', 'c')).status, 204);
    assert.equal((await request(app).get('/').set('x-client-id', 'a')).status, 204);
  });
});
