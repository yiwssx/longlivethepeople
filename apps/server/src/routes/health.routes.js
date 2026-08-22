const crypto = require('crypto');
const express = require('express');

const config = require('../config');
const database = require('../infrastructure/database');
const metrics = require('../observability/metrics');

const router = express.Router();

const safeTokenEquals = (provided, expected) => {
    if (typeof provided !== 'string' || typeof expected !== 'string') {
        return false;
    }

    const providedBuffer = Buffer.from(provided);
    const expectedBuffer = Buffer.from(expected);
    if (providedBuffer.length !== expectedBuffer.length) {
        return false;
    }

    return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
};

router.get('/healthz', (req, res) => res.status(200).json({
    status: 'ok',
    uptimeSeconds: Math.floor(process.uptime()),
    requestId: req.id,
}));

router.get('/readyz', (req, res) => {
    const databaseReady = database.isConnected();
    return res.status(databaseReady ? 200 : 503).json({
        status: databaseReady ? 'ready' : 'not_ready',
        database: databaseReady ? 'up' : 'down',
        requestId: req.id,
    });
});

router.get('/metrics', (req, res) => {
    if (!config.metrics.token) {
        return res.sendStatus(404);
    }

    const authorization = req.get('authorization') || '';
    const provided = authorization.startsWith('Bearer ')
        ? authorization.slice('Bearer '.length)
        : '';

    if (!safeTokenEquals(provided, config.metrics.token)) {
        return res.sendStatus(401);
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(metrics.snapshot());
});

module.exports = router;
