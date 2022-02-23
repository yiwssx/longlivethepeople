const mongoose = require('mongoose');

mongoose.Promise = Promise;

mongoose.connection.on('connected', () => {
    console.log('Connection Established');
});

mongoose.connection.on('reconnected', () => {
    console.log('Connection Reestablished');
});

mongoose.connection.on('disconnected', () => {
    console.log('Connection Disconnected');
});

mongoose.connection.on('close', () => {
    console.log('Connection Closed');
});

mongoose.connection.on('error', (error) => {
    console.log('ERROR: ' + error);
});

const service = async (URI, options) => {
    return mongoose.connect(URI, options);
}

module.exports = service;