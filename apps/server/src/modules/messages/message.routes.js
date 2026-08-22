const express = require('express');

const config = require('../../config');
const { handleApiError } = require('../../http/errors');
const { sendApiError } = require('../../http/response');
const { createRateLimit } = require('../../middleware/rate-limit');
const metrics = require('../../observability/metrics');
const messageService = require('./message.service');
const { normalizeMessagePayload, parsePagination } = require('./message.validation');

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

        const result = await messageService.getMessages(pagination);
        return res.status(200).json(result);
    } catch (error) {
        return handleApiError(error, req, res, { event: 'message_api_error' });
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

            const created = await messageService.createMessage(payload);
            return res.status(201).json(created);
        } catch (error) {
            return handleApiError(error, req, res, { event: 'message_api_error' });
        }
    },
);

module.exports = router;
