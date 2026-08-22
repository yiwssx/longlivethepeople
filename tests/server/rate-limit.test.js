const express = require('express');
const request = require('supertest');

const { createRateLimit } = require('../../apps/server/src/middleware/rate-limit');

describe('rate limit middleware', () => {
    it('returns 429 after the configured request budget is exhausted', async () => {
        const app = express();
        app.use(createRateLimit({ windowMs: 60_000, max: 2 }));
        app.get('/', (req, res) => res.sendStatus(204));

        const first = await request(app).get('/');
        const second = await request(app).get('/');
        const third = await request(app).get('/');

        expect(first.status).toBe(204);
        expect(second.status).toBe(204);
        expect(third.status).toBe(429);
        expect(third.headers['retry-after']).toBeDefined();
        expect(third.headers['ratelimit-limit']).toBe('2');
        expect(third.headers['ratelimit-remaining']).toBe('0');
    });

    it('keeps the bucket store bounded by evicting the least recently used key', async () => {
        const app = express();
        app.use(createRateLimit({
            windowMs: 60_000,
            max: 1,
            maxBuckets: 2,
            keyFn: (req) => req.get('x-client-id'),
        }));
        app.get('/', (req, res) => res.sendStatus(204));

        expect((await request(app).get('/').set('x-client-id', 'a')).status).toBe(204);
        expect((await request(app).get('/').set('x-client-id', 'b')).status).toBe(204);

        // Touch B, making A the least-recently-used entry.
        expect((await request(app).get('/').set('x-client-id', 'b')).status).toBe(429);

        // Creating C evicts A because the store is capped at two buckets.
        expect((await request(app).get('/').set('x-client-id', 'c')).status).toBe(204);

        // A receives a fresh bucket instead of retaining its original exhausted state.
        expect((await request(app).get('/').set('x-client-id', 'a')).status).toBe(204);
    });
});
