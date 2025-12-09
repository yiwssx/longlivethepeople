// Centralized configuration object that reads from environment variables
const DEFAULT_MONGODB_URI = 'mongodb://localhost:27017/test';

const config = {
    env: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 3000,
    session: {
        secret: process.env.SESSION_SECRET || 'longlivethepeople',
        maxAgeMs: 1000 * 60 * 60 * 6,
    },
    mongodb: {
        uri: process.env.MONGODB_URI || DEFAULT_MONGODB_URI,
        options: {},
    },
    // Explicit content security policy that limits external resources
    cspRule: {
        contentSecurityPolicy: {
            directives: {
                connectSrc: ["'self'"],
                defaultSrc: ["'self'"],
                fontSrc: ["'self'", 'https://fonts.googleapis.com', 'https://fonts.gstatic.com'],
                imgSrc: ["'self'"],
                objectSrc: ["'none'"],
                scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'],
                styleSrc: ["'self'", 'https://fonts.googleapis.com', 'https://cdn.jsdelivr.net'],
                frameSrc: ["'self'"],
                mediaSrc: ["'self'"],
            },
        },
    },
};

module.exports = config;
