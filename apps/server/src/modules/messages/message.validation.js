const config = require('../../config');
const { decodeCursor } = require('./message.cursor');

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

module.exports = { normalizeMessagePayload, parsePagination };
