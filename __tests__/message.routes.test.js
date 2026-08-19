// Integration tests that validate the message API endpoints.
const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const messageLimits = require('../src/config/message-limits');
const Message = require('../src/models/message.model');
const databaseService = require('../src/services/database.service');

let app;
let mongo;

describe('message routes', () => {
    beforeAll(async () => {
        mongo = await MongoMemoryServer.create();
        process.env.MONGODB_URI = mongo.getUri();
        process.env.NODE_ENV = 'test';
        process.env.MESSAGE_RATE_LIMIT_MAX = '1000';
        // App import triggers DB connection using env above.
        // eslint-disable-next-line global-require
        app = require('../src/app');
        await mongoose.connection.asPromise();
    });

    afterEach(async () => {
        await Message.deleteMany({});
    });

    afterAll(async () => {
        await databaseService.disconnect();
        await mongo.stop();
    });

    it('returns 204 when there are no messages', async () => {
        const response = await request(app).get('/api/v1/messages');
        expect(response.status).toBe(204);
        expect(response.headers['x-page']).toBe('1');
        expect(response.headers['x-limit']).toBe('50');
    });

    it('rejects invalid submissions with status 400', async () => {
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
        }
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
    });

    it('creates a message and trims fields before saving', async () => {
        const payload = {
            codename: '  test-codename  ',
            affiliation: '  earth  ',
            message: '  hello there  ',
        };

        const response = await request(app)
            .post('/api/v1/messages')
            .send(payload);

        expect(response.status).toBe(201);
        expect(response.body.codename).toBe('test-codename');
        expect(response.body.affiliation).toBe('earth');
        expect(response.body.message).toBe('hello there');
    });

    it('retrieves messages in reverse chronological order without database metadata', async () => {
        const first = await Message.create({
            codename: 'first',
            affiliation: 'one',
            message: 'message one',
            createdAt: new Date(Date.now() - 1000),
            updatedAt: new Date(Date.now() - 1000),
        });
        const second = await Message.create({
            codename: 'second',
            affiliation: 'two',
            message: 'message two',
        });

        const response = await request(app).get('/api/v1/messages');

        expect(response.status).toBe(200);
        expect(response.body.length).toBe(2);
        expect(response.body[0].codename).toBe(second.codename);
        expect(response.body[1].codename).toBe(first.codename);
        expect(response.body.every((item) => !Object.prototype.hasOwnProperty.call(item, '_id'))).toBe(true);
    });

    it('paginates messages while preserving reverse chronological order', async () => {
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

        const firstPage = await request(app).get('/api/v1/messages?page=1&limit=2');
        const secondPage = await request(app).get('/api/v1/messages?page=2&limit=2');

        expect(firstPage.status).toBe(200);
        expect(firstPage.body.map((item) => item.codename)).toEqual(['third', 'second']);
        expect(firstPage.headers['x-page']).toBe('1');
        expect(firstPage.headers['x-limit']).toBe('2');

        expect(secondPage.status).toBe(200);
        expect(secondPage.body.map((item) => item.codename)).toEqual(['first']);
        expect(secondPage.headers['x-page']).toBe('2');
    });

    it('rejects invalid pagination parameters', async () => {
        const invalidQueries = [
            '?page=0',
            '?page=abc',
            '?limit=0',
            '?limit=101',
        ];

        for (const query of invalidQueries) {
            const response = await request(app).get(`/api/v1/messages${query}`);
            expect(response.status).toBe(400);
        }
    });

    it('returns 503 when the database is disconnected', async () => {
        await databaseService.disconnect();

        try {
            const startedAt = Date.now();
            const response = await request(app).get('/api/v1/messages');

            expect(response.status).toBe(503);
            expect(Date.now() - startedAt).toBeLessThan(2000);
        } finally {
            await databaseService.connect(process.env.MONGODB_URI, {});
            await mongoose.connection.asPromise();
        }
    });

    it('returns 503 instead of buffering submissions when the database is disconnected', async () => {
        await databaseService.disconnect();

        try {
            const startedAt = Date.now();
            const response = await request(app)
                .post('/api/v1/messages')
                .send({
                    codename: 'offline',
                    affiliation: 'test',
                    message: 'database unavailable',
                });

            expect(response.status).toBe(503);
            expect(Date.now() - startedAt).toBeLessThan(2000);
        } finally {
            await databaseService.connect(process.env.MONGODB_URI, {});
            await mongoose.connection.asPromise();
        }
    });

    it('redirects unknown routes without logging a 404 error', async () => {
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

        try {
            const response = await request(app).get('/missing-route');

            expect(response.status).toBe(302);
            expect(response.headers.location).toBe('/');
            expect(consoleError).not.toHaveBeenCalled();
        } finally {
            consoleError.mockRestore();
        }
    });
});
