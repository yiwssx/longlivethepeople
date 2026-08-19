const express = require('express');
const request = require('supertest');

const { createRateLimit } = require('../src/middleware/rate-limit');

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
});
