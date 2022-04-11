const Message = require('../models/message.model');
const io = require('../services/socketio.service');

const getMessage = async () => {
    let data;
    try {
        data = await Message.find({}).select(['codename', 'affiliation', 'message', '-_id']);
    } catch(error) {
        console.log(error);
    }
    return data;
}

const postMessage = async (req, res) => {
    let data;
    try {
        data = new Message(req.body);
        await data.save();
        io.emit('message', req.body);
    } catch(error) {
        console.log(error);
    }
    return res.status(201).json(data);
}

const controllers = {getMessage, postMessage}
module.exports = controllers;