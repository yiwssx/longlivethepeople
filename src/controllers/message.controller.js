const Message = require('../models/message.model');
const io = require('../services/socketio.service');

const getMessage = async () => {
    const data = await Message.find({}).select(['codename', 'affiliation', 'message', '-_id']);
    return data;
};

const postMessage = async (req, res) => {
    try {
        const data = new Message(req.body);
        await data.save();
        io.emit('message', req.body);
        return res.status(201).json(data);
    } catch (error) {
        console.error(error);
        return res.sendStatus(500);
    }
};

module.exports = { getMessage, postMessage };
