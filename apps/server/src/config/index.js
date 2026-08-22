const { environment, parsePositiveInteger } = require('./env');
const paths = require('./paths');
const { createCspRule } = require('./security');
const messageLimits = require('../modules/messages/message.constants');

module.exports = Object.freeze({
    ...environment,
    frontend: {
        distPath: paths.webDistPath,
        indexPath: paths.webIndexPath,
        publicPath: paths.webPublicPath,
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
    cspRule: createCspRule(),
});
