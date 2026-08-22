const { randomUUID } = require('crypto');

const metrics = require('../observability/metrics');

const shouldLog = () => process.env.NODE_ENV !== 'test';

const requestContext = (req, res, next) => {
    const startedAt = process.hrtime.bigint();
    const requestId = randomUUID();

    req.id = requestId;
    res.setHeader('X-Request-Id', requestId);

    res.on('finish', () => {
        metrics.recordHttpStatus(res.statusCode);

        if (!shouldLog()) {
            return;
        }

        const durationNs = process.hrtime.bigint() - startedAt;
        const durationMs = Number(durationNs) / 1_000_000;
        const entry = {
            level: res.statusCode >= 500 ? 'error' : 'info',
            event: 'http_request',
            requestId,
            method: req.method,
            path: req.originalUrl,
            status: res.statusCode,
            durationMs: Number(durationMs.toFixed(2)),
        };

        // Raw visitor IPs are intentionally not persisted in application logs.
        // The rate limiter can still use req.ip transiently in memory.
        console.log(JSON.stringify(entry));
    });

    next();
};

module.exports = { requestContext };
