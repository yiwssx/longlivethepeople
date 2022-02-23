const Message = require('../models/message.model');

const getMessage = async () => {
    let data;
    try {
        data = await Message.find({});
    } catch(error) {
        console.log(error);
    }
    return data;
}

const postMessage = async (req) => {
    let data;
    try {
        data = new Message(req.body);
    } catch(error) {
        console.log(error);
    }
    return await data.save();
}

const controllers = {getMessage, postMessage}
module.exports = controllers;