const DEFAULT_MONGODB_URI = 'mongodb://localhost:27017/test';

const parsePositiveInteger = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const parseOrigins = (value, env) => {
    if (!value) {
        return env === 'development'
            ? [
                'http://localhost:3000',
                'http://127.0.0.1:3000',
                'http://localhost:5173',
                'http://127.0.0.1:5173',
            ]
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

const env = process.env.NODE_ENV || 'development';

if (env === 'production' && !process.env.MONGODB_URI) {
    throw new Error('Missing required production environment variable: MONGODB_URI');
}

const environment = Object.freeze({
    env,
    port: process.env.PORT || 3000,
    trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
    cors: {
        origins: parseOrigins(process.env.CORS_ORIGINS, env),
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
    socket: {
        maxHttpBufferSize: parsePositiveInteger(process.env.SOCKET_MAX_HTTP_BUFFER_SIZE, 64 * 1024),
        recoveryWindowMs: parsePositiveInteger(process.env.SOCKET_RECOVERY_WINDOW_MS, 120_000),
    },
    metrics: {
        token: process.env.METRICS_TOKEN || '',
    },
});

module.exports = { environment, parsePositiveInteger };
