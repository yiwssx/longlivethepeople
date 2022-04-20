const Message = require('../models/message.model');
const io = require('../services/socketio.service');

const getMessage = async () => {
    try {
       let data = await Message.find({}).select(['codename', 'affiliation', 'message', '-_id']);
       return data;
    } catch(error) {
        console.log(error);
    }
}

const postMessage = async (req, res) => {
    try {
        let data = new Message(req.body);
        await data.save();
        io.emit('message', req.body);
        return res.status(201).json(data);
    } catch(error) {
        console.log(error);
    }  
}

const controllers = {getMessage, postMessage}
module.exports = controllers;