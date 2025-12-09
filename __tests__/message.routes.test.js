// Integration tests that validate the message API endpoints
const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const Message = require('../src/models/message.model');
const databaseService = require('../src/services/database.service');

let app;
let mongo;

describe('message routes', () => {
    beforeAll(async () => {
        mongo = await MongoMemoryServer.create();
        process.env.MONGODB_URI = mongo.getUri();
        process.env.NODE_ENV = 'test';
        // App import triggers DB connection using env above
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
});
