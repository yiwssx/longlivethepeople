const express = require('express');

const config = require('../config/config');
const controllers = require('../controllers/message.controller');
const { sendApiError } = require('../http/api-response');
const { createRateLimit } = require('../middleware/rate-limit');
const metrics = require('../services/metrics.service');
const { decodeCursor } = require('../utils/message-cursor');

const router = express.Router();

const onRateLimit = (req, res) => {
    metrics.increment('rateLimitedTotal');
    return sendApiError(res, {
        status: 429,
        code: 'RATE_LIMITED',
        message: 'Too many requests; retry after the advertised delay',
        requestId: req.id,
    });
};

const messageReadRateLimit = createRateLimit({
    windowMs: config.messages.readRateLimitWindowMs,
    max: config.messages.readRateLimitMax,
    onLimit: onRateLimit,
});

const messageWriteRateLimit = createRateLimit({
    windowMs: config.messages.rateLimitWindowMs,
    max: config.messages.rateLimitMax,
    onLimit: onRateLimit,
});

const parsePositiveInteger = (value, fallback) => {
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
    const defaultLimit = Math.min(config.messages.defaultPageSize, config.messages.maxPageSize);
    const limit = parsePositiveInteger(query.limit, defaultLimit);
    if (limit === null || limit > config.messages.maxPageSize) {
        return null;
    }

    if (query.before === undefined) {
        return { limit, cursor: null };
    }

    const cursor = decodeCursor(query.before);
    return cursor ? { limit, cursor } : null;
};

const normalizeMessagePayload = (body) => {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
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

const handleApiError = (error, req, res) => {
    if ((error.status || 500) >= 500) {
        console.error(JSON.stringify({
            level: 'error',
            event: 'message_api_error',
            requestId: req.id,
            code: error.code || 'INTERNAL_ERROR',
            message: error.message,
        }));
    }

    return sendApiError(res, {
        status: error.status || 500,
        code: error.code || 'INTERNAL_ERROR',
        message: error.expose === false ? undefined : error.message,
        requestId: req.id,
    });
};

router.get('/messages', messageReadRateLimit, async (req, res) => {
    try {
        const pagination = parsePagination(req.query);
        if (!pagination) {
            return sendApiError(res, {
                status: 400,
                code: 'INVALID_PAGINATION',
                message: 'limit or before cursor is invalid',
                requestId: req.id,
            });
        }

        const result = await controllers.getMessages(pagination);
        return res.status(200).json(result);
    } catch (error) {
        return handleApiError(error, req, res);
    }
});

router.post(
    '/messages',
    messageWriteRateLimit,
    (req, res, next) => {
        if (!req.is('application/json')) {
            return sendApiError(res, {
                status: 415,
                code: 'JSON_REQUIRED',
                message: 'POST /messages accepts application/json only',
                requestId: req.id,
            });
        }
        return next();
    },
    express.json({ limit: config.http.bodyLimit }),
    async (req, res) => {
        try {
            const payload = normalizeMessagePayload(req.body);
            if (!payload) {
                return sendApiError(res, {
                    status: 400,
                    code: 'INVALID_MESSAGE',
                    message: 'codename, affiliation, and message are required strings within their limits',
                    requestId: req.id,
                });
            }

            const created = await controllers.createMessage(payload);
            return res.status(201).json(created);
        } catch (error) {
            return handleApiError(error, req, res);
        }
    },
);

module.exports = router;
