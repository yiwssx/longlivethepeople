const Message = require('../models/message.model');
const databaseService = require('../services/database.service');
const metrics = require('../services/metrics.service');
const io = require('../services/socketio.service');
const {
    DatabaseUnavailableError,
    ValidationAppError,
} = require('../errors/app-error');
const { encodeCursor } = require('../utils/message-cursor');

const DATABASE_WAIT_MS = 1000;

const toPublicMessage = (message) => ({
    id: String(message._id),
    codename: message.codename,
    affiliation: message.affiliation,
    message: message.message,
    createdAt: new Date(message.createdAt).toISOString(),
});

const buildCursorFilter = (cursor) => {
    const visibilityFilter = {
        status: { $in: ['published', null] },
    };

    if (!cursor) {
        return visibilityFilter;
    }

    return {
        ...visibilityFilter,
        $or: [
            { createdAt: { $lt: cursor.createdAt } },
            {
                createdAt: cursor.createdAt,
                _id: { $lt: cursor.id },
            },
        ],
    };
};

const getMessages = async ({ limit, cursor }) => {
    const databaseReady = await databaseService.waitForConnection(DATABASE_WAIT_MS);
    if (!databaseReady) {
        throw new DatabaseUnavailableError();
    }

    const documents = await Message.find(buildCursorFilter(cursor))
        .select(['codename', 'affiliation', 'message', 'createdAt'])
        .sort({ createdAt: -1, _id: -1 })
        .limit(limit + 1)
        .lean();

    const hasMore = documents.length > limit;
    const visibleDocuments = hasMore ? documents.slice(0, limit) : documents;
    const data = visibleDocuments.map(toPublicMessage);
    const last = visibleDocuments.at(-1);
    const nextCursor = hasMore && last
        ? encodeCursor({ createdAt: last.createdAt, id: last._id })
        : null;

    return {
        data,
        pagination: {
            limit,
            hasMore,
            nextCursor,
        },
    };
};

const createMessage = async (payload) => {
    const databaseReady = await databaseService.waitForConnection(DATABASE_WAIT_MS);
    if (!databaseReady) {
        throw new DatabaseUnavailableError();
    }

    try {
        const saved = await Message.create({
            ...payload,
            status: 'published',
        });
        const publicMessage = toPublicMessage(saved);

        metrics.increment('messagesCreatedTotal');
        io.emit('message', publicMessage);
        return publicMessage;
    } catch (error) {
        if (error?.name === 'ValidationError') {
            throw new ValidationAppError('Message fields failed validation');
        }
        throw error;
    }
};

module.exports = {
    getMessages,
    createMessage,
    toPublicMessage,
};
