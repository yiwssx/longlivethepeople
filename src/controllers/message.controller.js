// Controller helpers for working with message documents and broadcasting updates
const Message = require('../models/message.model');
const databaseService = require('../services/database.service');
const io = require('../services/socketio.service');

const MESSAGE_FIELDS = ['codename', 'affiliation', 'message'];
const DATABASE_WAIT_MS = 1000;

// Remove database metadata before returning responses to clients
const toSanitizedMessage = (message) =>
    MESSAGE_FIELDS.reduce((acc, field) => {
        acc[field] = message[field];
        return acc;
    }, {});

// Fetch messages ordered from newest to oldest
const getMessage = async () => {
    const databaseReady = await databaseService.waitForConnection(DATABASE_WAIT_MS);
    if (!databaseReady) {
        return [];
    }

    return Message.find({})
        .select([...MESSAGE_FIELDS, '-_id'])
        .sort({ createdAt: -1 })
        .lean();
};

// Persist a new message then notify connected Socket.IO clients
const postMessage = async (req, res) => {
    try {
        const databaseReady = await databaseService.waitForConnection(DATABASE_WAIT_MS);
        if (!databaseReady) {
            return res.sendStatus(503);
        }

        const { codename, affiliation, message } = req.body;
        const payload = {
            codename: codename.trim(),
            affiliation: affiliation.trim(),
            message: message.trim(),
        };

        const data = new Message(payload);
        const saved = await data.save();
        const sanitized = toSanitizedMessage(saved);

        io.emit('message', sanitized);
        return res.status(201).json(sanitized);
    } catch (error) {
        console.error(error);
        return res.sendStatus(500);
    }
};

module.exports = { getMessage, postMessage };
