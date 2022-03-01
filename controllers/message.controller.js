const Message = require('../models/message.model');

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
    } catch(error) {
        console.log(error);
    }
    return res.status(201).json(data);
}

const controllers = {getMessage, postMessage}
module.exports = controllers;