const mongoose = require('mongoose');

let listenersRegistered = false;
const CONNECTED_STATE = 1;
const CONNECTING_STATE = 2;

const shouldLog = () => process.env.NODE_ENV !== 'test';

const log = (level, event, extra = {}) => {
    if (!shouldLog()) {
        return;
    }

    const entry = { level, event, ...extra };
    const method = level === 'error' ? 'error' : 'log';
    console[method](JSON.stringify(entry));
};

const registerEvents = () => {
    if (listenersRegistered) {
        return;
    }

    const connection = mongoose.connection;
    connection.on('connected', () => log('info', 'mongodb_connected'));
    connection.on('reconnected', () => log('info', 'mongodb_reconnected'));
    connection.on('disconnected', () => log('info', 'mongodb_disconnected'));
    connection.on('close', () => log('info', 'mongodb_closed'));
    connection.on('error', (error) => log('error', 'mongodb_error', { message: error.message }));

    listenersRegistered = true;
};

const connect = async (uri, options = {}) => {
    registerEvents();

    if (mongoose.connection.readyState === CONNECTED_STATE) {
        return mongoose.connection;
    }

    if (mongoose.connection.readyState === CONNECTING_STATE) {
        await mongoose.connection.asPromise();
        return mongoose.connection;
    }

    await mongoose.connect(uri, options);
    return mongoose.connection;
};

const isConnected = () => mongoose.connection.readyState === CONNECTED_STATE;

const waitForConnection = async (timeoutMs = 1000) => {
    if (isConnected()) {
        return true;
    }

    if (mongoose.connection.readyState !== CONNECTING_STATE) {
        return false;
    }

    return Promise.race([
        mongoose.connection.asPromise()
            .then(() => true)
            .catch(() => false),
        new Promise((resolve) => {
            setTimeout(() => resolve(isConnected()), timeoutMs);
        }),
    ]);
};

const disconnect = async () => {
    if (mongoose.connection.readyState === 0) {
        return;
    }
    await mongoose.connection.close();
};

module.exports = { connect, disconnect, isConnected, waitForConnection };
