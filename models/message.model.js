const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const mSchema = new Schema(
    {
        codename : {type : String, required : true},
        affiliation : {type : String, required : true},
        message : {type : String, required : true}
    },
    {
        timestamps : true,
        collection : 'messages'
    }
);

const Message = mongoose.model('Messages', mSchema);
module.exports = Message;