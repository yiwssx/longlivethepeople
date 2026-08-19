const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const messageLimits = require('../src/config/message-limits');
const Message = require('../src/models/message.model');
const databaseService = require('../src/services/database.service');

let app;
let mongo;

describe('message API', () => {
    beforeAll(async () => {
        mongo = await MongoMemoryServer.create();
        process.env.MONGODB_URI = mongo.getUri();
        process.env.NODE_ENV = 'test';
        process.env.MESSAGE_RATE_LIMIT_MAX = '1000';
        process.env.MESSAGE_READ_RATE_LIMIT_MAX = '1000';

        // eslint-disable-next-line global-require
        app = require('../src/app');
        await databaseService.connect(process.env.MONGODB_URI, {});
    });

    afterEach(async () => {
        await Message.deleteMany({});
    });

    afterAll(async () => {
        await databaseService.disconnect();
        await mongo.stop();
    });

    it('returns an empty cursor page when there are no messages', async () => {
        const response = await request(app).get('/api/v1/messages');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            data: [],
            pagination: {
                limit: 20,
                hasMore: false,
                nextCursor: null,
            },
        });
        expect(response.headers['x-request-id']).toBeDefined();
    });

    it('rejects invalid submissions with structured errors', async () => {
        const invalidPayloads = [
            {},
            { codename: 'a', affiliation: 'b' },
            { codename: 'a', affiliation: 'b', message: '' },
            { codename: ' ', affiliation: 'b', message: 'hi' },
        ];

        for (const payload of invalidPayloads) {
            const response = await request(app)
                .post('/api/v1/messages')
                .send(payload);

            expect(response.status).toBe(400);
            expect(response.body.error.code).toBe('INVALID_MESSAGE');
            expect(response.body.error.requestId).toBeDefined();
        }
    });

    it('requires JSON for message creation', async () => {
        const response = await request(app)
            .post('/api/v1/messages')
            .type('form')
            .send({ codename: 'a', affiliation: 'b', message: 'c' });

        expect(response.status).toBe(415);
        expect(response.body.error.code).toBe('JSON_REQUIRED');
    });

    it('normalizes malformed JSON parser failures', async () => {
        const response = await request(app)
            .post('/api/v1/messages')
            .set('Content-Type', 'application/json')
            .send('{"codename":"broken"');

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('MALFORMED_JSON');
        expect(response.body.error.message).toBe('Request body contains malformed JSON');
        expect(response.body.error.requestId).toBeDefined();
    });

    it('rejects fields that exceed configured length limits', async () => {
        const response = await request(app)
            .post('/api/v1/messages')
            .send({
                codename: 'a'.repeat(messageLimits.codenameMaxLength + 1),
                affiliation: 'test',
                message: 'hello',
            });

        expect(response.status).toBe(400);
    });

    it('rejects request bodies above the configured parser limit', async () => {
        const response = await request(app)
            .post('/api/v1/messages')
            .send({
                codename: 'test',
                affiliation: 'test',
                message: 'x'.repeat(20 * 1024),
            });

        expect(response.status).toBe(413);
        expect(response.body.error.code).toBe('PAYLOAD_TOO_LARGE');
        expect(response.body.error.requestId).toBeDefined();
    });

    it('creates a normalized public message with stable identity metadata', async () => {
        const response = await request(app)
            .post('/api/v1/messages')
            .send({
                codename: '  test-codename  ',
                affiliation: '  earth  ',
                message: '  hello there  ',
            });

        expect(response.status).toBe(201);
        expect(response.body.codename).toBe('test-codename');
        expect(response.body.affiliation).toBe('earth');
        expect(response.body.message).toBe('hello there');
        expect(response.body.id).toMatch(/^[a-f\d]{24}$/);
        expect(Number.isNaN(Date.parse(response.body.createdAt))).toBe(false);
        expect(response.body._id).toBeUndefined();
    });

    it('returns published and legacy rows but excludes hidden moderation rows', async () => {
        const legacy = await Message.collection.insertOne({
            codename: 'legacy',
            affiliation: 'archive',
            message: 'legacy row',
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        });
        const published = await Message.create({
            codename: 'published',
            affiliation: 'archive',
            message: 'visible row',
        });
        await Message.create({
            codename: 'hidden',
            affiliation: 'archive',
            message: 'hidden row',
            status: 'hidden',
            hiddenAt: new Date(),
        });

        const response = await request(app).get('/api/v1/messages');

        expect(response.status).toBe(200);
        expect(response.body.data.map((item) => item.codename)).toEqual(['published', 'legacy']);
        expect(response.body.data[0].id).toBe(String(published._id));
        expect(response.body.data[1].id).toBe(String(legacy.insertedId));
    });

    it('paginates with a stable cursor while preserving deterministic order', async () => {
        await Message.create([
            {
                codename: 'first',
                affiliation: 'one',
                message: 'one',
                createdAt: new Date('2026-01-01T00:00:00.000Z'),
            },
            {
                codename: 'second',
                affiliation: 'two',
                message: 'two',
                createdAt: new Date('2026-01-02T00:00:00.000Z'),
            },
            {
                codename: 'third',
                affiliation: 'three',
                message: 'three',
                createdAt: new Date('2026-01-03T00:00:00.000Z'),
            },
        ]);

        const firstPage = await request(app).get('/api/v1/messages?limit=2');
        expect(firstPage.status).toBe(200);
        expect(firstPage.body.data.map((item) => item.codename)).toEqual(['third', 'second']);
        expect(firstPage.body.pagination.hasMore).toBe(true);
        expect(firstPage.body.pagination.nextCursor).toEqual(expect.any(String));

        const secondPage = await request(app)
            .get(`/api/v1/messages?limit=2&before=${encodeURIComponent(firstPage.body.pagination.nextCursor)}`);

        expect(secondPage.status).toBe(200);
        expect(secondPage.body.data.map((item) => item.codename)).toEqual(['first']);
        expect(secondPage.body.pagination.hasMore).toBe(false);
        expect(secondPage.body.pagination.nextCursor).toBeNull();
    });

    it('rejects invalid cursor pagination parameters', async () => {
        const invalidQueries = [
            '?limit=0',
            '?limit=101',
            '?before=not-a-cursor',
        ];

        for (const query of invalidQueries) {
            const response = await request(app).get(`/api/v1/messages${query}`);
            expect(response.status).toBe(400);
            expect(response.body.error.code).toBe('INVALID_PAGINATION');
        }
    });

    it('returns 503 quickly when the database is disconnected', async () => {
        await databaseService.disconnect();

        try {
            const startedAt = Date.now();
            const response = await request(app).get('/api/v1/messages');

            expect(response.status).toBe(503);
            expect(response.body.error.code).toBe('DATABASE_UNAVAILABLE');
            expect(Date.now() - startedAt).toBeLessThan(2000);
        } finally {
            await databaseService.connect(process.env.MONGODB_URI, {});
        }
    });

    it('returns a JSON 404 for unknown API routes', async () => {
        const response = await request(app).get('/api/v1/missing');

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe('API_NOT_FOUND');
    });

    it('redirects unknown web routes to the archive landing page', async () => {
        const response = await request(app).get('/missing-route');

        expect(response.status).toBe(302);
        expect(response.headers.location).toBe('/');
    });
});
