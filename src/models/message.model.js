const mongoose = require('mongoose');

const messageLimits = require('../config/message-limits');

const Schema = mongoose.Schema;

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
        // Archive moderation is deliberately operational rather than user-facing.
        // Existing rows without this field remain visible; operators can mark a
        // row hidden directly if the archive ever needs content takedown.
        status: {
            type: String,
            enum: ['published', 'hidden'],
            default: 'published',
        },
        hiddenAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
        collection: 'messages',
        bufferCommands: false,
    },
);

mSchema.index({ status: 1, createdAt: -1, _id: -1 });

const Message = mongoose.model('Messages', mSchema);

module.exports = Message;
