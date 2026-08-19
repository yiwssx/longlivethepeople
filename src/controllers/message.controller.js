// Controller helpers for working with message documents and broadcasting updates.
const Message = require('../models/message.model');
const databaseService = require('../services/database.service');
const io = require('../services/socketio.service');

const MESSAGE_FIELDS = ['codename', 'affiliation', 'message'];
const DATABASE_WAIT_MS = 1000;

// Remove database metadata before returning responses to clients.
const toSanitizedMessage = (message) =>
    MESSAGE_FIELDS.reduce((acc, field) => {
        acc[field] = message[field];
        return acc;
    }, {});

// Fetch messages ordered from newest to oldest. A null result means the database
// is unavailable; an empty array means the database is healthy but has no rows.
const getMessage = async ({ limit, skip }) => {
    const databaseReady = await databaseService.waitForConnection(DATABASE_WAIT_MS);
    if (!databaseReady) {
        return null;
    }

    return Message.find({})
        .select([...MESSAGE_FIELDS, '-_id'])
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
};

// Persist a new message then notify connected Socket.IO clients.
const postMessage = async (payload, res) => {
    try {
        const databaseReady = await databaseService.waitForConnection(DATABASE_WAIT_MS);
        if (!databaseReady) {
            return res.sendStatus(503);
        }

        const data = new Message(payload);
        const saved = await data.save();
        const sanitized = toSanitizedMessage(saved);

        io.emit('message', sanitized);
        return res.status(201).json(sanitized);
    } catch (error) {
        if (error?.name === 'ValidationError') {
            return res.sendStatus(400);
        }

        console.error(error);
        return res.sendStatus(500);
    }
};

module.exports = { getMessage, postMessage };
