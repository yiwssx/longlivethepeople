const Message = require('../models/message.model');
const io = require('../services/socketio.service');

const MESSAGE_FIELDS = ['codename', 'affiliation', 'message'];

const toSanitizedMessage = (message) =>
    MESSAGE_FIELDS.reduce((acc, field) => {
        acc[field] = message[field];
        return acc;
    }, {});

const getMessage = async () => {
    return Message.find({})
        .select([...MESSAGE_FIELDS, '-_id'])
        .sort({ createdAt: -1 })
        .lean();
};

const postMessage = async (req, res) => {
    try {
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
