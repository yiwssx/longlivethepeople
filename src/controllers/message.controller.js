const Message = require('../models/message.model');
const io = require('../services/socketio.service');

const getMessage = async () => {
    const data = await Message.find({})
        .select(['codename', 'affiliation', 'message', '-_id'])
        .sort({ createdAt: -1 })
        .lean();
    return data;
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
        await data.save();
        io.emit('message', payload);
        return res.status(201).json(data);
    } catch (error) {
        console.error(error);
        return res.sendStatus(500);
    }
};

module.exports = { getMessage, postMessage };
