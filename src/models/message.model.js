// Schema and model definition for storing visitor messages.
const mongoose = require('mongoose');

const messageLimits = require('../config/message-limits');

const Schema = mongoose.Schema;

// Keep database-level validation aligned with the public API validation.
const mSchema = new Schema(
    {
        codename: {
            type: String,
            required: true,
            trim: true,
            maxlength: messageLimits.codenameMaxLength,
        },
        affiliation: {
            type: String,
            required: true,
            trim: true,
            maxlength: messageLimits.affiliationMaxLength,
        },
        message: {
            type: String,
            required: true,
            trim: true,
            maxlength: messageLimits.messageMaxLength,
        },
    },
    {
        timestamps: true,
        collection: 'messages',
        bufferCommands: false,
    },
);

mSchema.index({ createdAt: -1 });

const Message = mongoose.model('Messages', mSchema);

module.exports = Message;
