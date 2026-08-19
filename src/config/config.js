// Centralized configuration object that reads from environment variables.
const messageLimits = require('./message-limits');

const DEFAULT_MONGODB_URI = 'mongodb://localhost:27017/test';
const DEFAULT_DEV_SECRET = 'development-only-longlivethepeople';
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
    if (value === undefined) {
        return isProduction ? 1 : false;
    }

    if (value === 'true') {
        return 1;
    }
    if (value === 'false') {
        return false;
    }

    const numeric = Number.parseInt(value, 10);
    return Number.isInteger(numeric) && numeric >= 0 ? numeric : value;
};

if (isProduction) {
    const missing = ['MONGODB_URI', 'SESSION_SECRET']
        .filter((name) => !process.env[name]);

    if (missing.length > 0) {
        throw new Error(`Missing required production environment variables: ${missing.join(', ')}`);
    }
}

const config = {
    env,
    port: process.env.PORT || 3000,
    trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
    cors: {
        origins: parseOrigins(process.env.CORS_ORIGINS),
    },
    session: {
        secret: process.env.SESSION_SECRET || DEFAULT_DEV_SECRET,
        maxAgeMs: 1000 * 60 * 60 * 6,
    },
    mongodb: {
        uri: process.env.MONGODB_URI || DEFAULT_MONGODB_URI,
        options: {},
    },
    http: {
        bodyLimit: process.env.BODY_LIMIT || '16kb',
    },
    messages: {
        ...messageLimits,
        defaultPageSize: parsePositiveInteger(process.env.MESSAGE_PAGE_SIZE, 50),
        maxPageSize: 100,
        rateLimitWindowMs: parsePositiveInteger(process.env.MESSAGE_RATE_LIMIT_WINDOW_MS, 60_000),
        rateLimitMax: parsePositiveInteger(process.env.MESSAGE_RATE_LIMIT_MAX, 10),
    },
    socket: {
        maxHttpBufferSize: parsePositiveInteger(process.env.SOCKET_MAX_HTTP_BUFFER_SIZE, 64 * 1024),
    },
    // Explicit content security policy that limits external resources.
    cspRule: {
        contentSecurityPolicy: {
            directives: {
                connectSrc: ["'self'", 'https://cdn.jsdelivr.net'],
                defaultSrc: ["'self'"],
                fontSrc: ["'self'", 'https://fonts.googleapis.com', 'https://fonts.gstatic.com'],
                imgSrc: ["'self'"],
                objectSrc: ["'none'"],
                scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'],
                styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdn.jsdelivr.net'],
                frameSrc: ["'self'"],
                mediaSrc: ["'self'"],
            },
        },
    },
};

module.exports = config;
