const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const uSchema = new Schema(
    {
       ipaddr : {type : String, required : true}, 
    },
    {
        timestamps : true,
        collection : 'users'
    }
);

const User = mongoose.model('Users', uSchema);
module.exports = User;