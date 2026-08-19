// Centralized configuration object that reads from environment variables.
const messageLimits = require('./message-limits');

const DEFAULT_MONGODB_URI = 'mongodb://localhost:27017/test';
const env = process.env.NODE_ENV || 'development';
const isProduction = env === 'production';

const parsePositiveInteger = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const parseOrigins = (value) => {
    if (!value) {
        return env === 'development'
            ? ['http://localhost:3000', 'http://127.0.0.1:3000']
            : [];
    }

    return value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);
};

const parseTrustProxy = (value) => {
    if (value === undefined || value === 'false') {
        return false;
    }

    if (value === 'true') {
        return 1;
    }

    const numeric = Number.parseInt(value, 10);
    return Number.isInteger(numeric) && numeric >= 0 ? numeric : value;
};

if (isProduction && !process.env.MONGODB_URI) {
    throw new Error('Missing required production environment variable: MONGODB_URI');
}

const config = {
    env,
    port: process.env.PORT || 3000,
    trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
    cors: {
        origins: parseOrigins(process.env.CORS_ORIGINS),
    },
    mongodb: {
        uri: process.env.MONGODB_URI || DEFAULT_MONGODB_URI,
        options: {
            serverSelectionTimeoutMS: parsePositiveInteger(
                process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS,
                5_000,
            ),
        },
    },
    http: {
        bodyLimit: process.env.BODY_LIMIT || '16kb',
        shutdownTimeoutMs: parsePositiveInteger(process.env.SHUTDOWN_TIMEOUT_MS, 10_000),
    },
    messages: {
        ...messageLimits,
        defaultPageSize: parsePositiveInteger(process.env.MESSAGE_PAGE_SIZE, 20),
        maxPageSize: 100,
        readRateLimitWindowMs: parsePositiveInteger(
            process.env.MESSAGE_READ_RATE_LIMIT_WINDOW_MS,
            60_000,
        ),
        readRateLimitMax: parsePositiveInteger(process.env.MESSAGE_READ_RATE_LIMIT_MAX, 300),
        rateLimitWindowMs: parsePositiveInteger(process.env.MESSAGE_RATE_LIMIT_WINDOW_MS, 60_000),
        rateLimitMax: parsePositiveInteger(process.env.MESSAGE_RATE_LIMIT_MAX, 10),
    },
    socket: {
        maxHttpBufferSize: parsePositiveInteger(process.env.SOCKET_MAX_HTTP_BUFFER_SIZE, 64 * 1024),
        recoveryWindowMs: parsePositiveInteger(process.env.SOCKET_RECOVERY_WINDOW_MS, 120_000),
    },
    metrics: {
        token: process.env.METRICS_TOKEN || '',
    },
    // Keep the CSP intentionally narrow. The only third-party frontend resource
    // retained by the archive is the Google Fonts stylesheet/font files.
    cspRule: {
        contentSecurityPolicy: {
            directives: {
                connectSrc: ["'self'"],
                defaultSrc: ["'self'"],
                fontSrc: ["'self'", 'https://fonts.gstatic.com'],
                imgSrc: ["'self'"],
                objectSrc: ["'none'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'", 'https://fonts.googleapis.com'],
                frameSrc: ["'none'"],
                mediaSrc: ["'self'"],
                baseUri: ["'self'"],
                formAction: ["'self'"],
            },
        },
    },
};

module.exports = config;
