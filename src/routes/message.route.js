// API routes responsible for retrieving and posting messages.
const express = require('express');

const config = require('../config/config');
const controllers = require('../controllers/message.controller');
const { createRateLimit } = require('../middleware/rate-limit');

const router = express.Router();

const messageRateLimit = createRateLimit({
    windowMs: config.messages.rateLimitWindowMs,
    max: config.messages.rateLimitMax,
});

const parseIntegerQuery = (value, fallback) => {
    if (value === undefined) {
        return fallback;
    }

    if (typeof value !== 'string' || !/^\d+$/.test(value)) {
        return null;
    }

    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

const parsePagination = (query) => {
    const page = parseIntegerQuery(query.page, 1);
    const defaultLimit = Math.min(config.messages.defaultPageSize, config.messages.maxPageSize);
    const limit = parseIntegerQuery(query.limit, defaultLimit);

    if (page === null || limit === null || limit > config.messages.maxPageSize) {
        return null;
    }

    const skip = (page - 1) * limit;
    if (!Number.isSafeInteger(skip)) {
        return null;
    }

    return { page, limit, skip };
};

const normalizeMessagePayload = (body) => {
    if (!body || typeof body !== 'object') {
        return null;
    }

    const rules = [
        ['codename', config.messages.codenameMaxLength],
        ['affiliation', config.messages.affiliationMaxLength],
        ['message', config.messages.messageMaxLength],
    ];
    const payload = {};

    for (const [field, maxLength] of rules) {
        const value = body[field];
        if (typeof value !== 'string') {
            return null;
        }

        const normalized = value.trim();
        if (normalized.length === 0 || normalized.length > maxLength) {
            return null;
        }

        payload[field] = normalized;
    }

    return payload;
};

// Retrieve messages in reverse chronological order.
router.get('/messages', async (req, res) => {
    try {
        const pagination = parsePagination(req.query);
        if (!pagination) {
            return res.sendStatus(400);
        }

        const result = await controllers.getMessage(pagination);
        if (result === null) {
            return res.sendStatus(503);
        }

        res.setHeader('X-Page', String(pagination.page));
        res.setHeader('X-Limit', String(pagination.limit));

        if (result.length === 0) {
            return res.sendStatus(204);
        }

        return res.status(200).json(result);
    } catch (error) {
        console.error(error.message);
        return res.sendStatus(500);
    }
});

// Validate, rate-limit, and store new messages coming from clients.
router.post('/messages', messageRateLimit, async (req, res) => {
    try {
        const payload = normalizeMessagePayload(req.body);
        if (!payload) {
            return res.sendStatus(400);
        }

        return controllers.postMessage(payload, res);
    } catch (error) {
        console.error(error.message);
        return res.sendStatus(500);
    }
});

module.exports = router;
